(function () {
    "use strict";

    function hash(value) {
        let result = 2166136261;
        for (const char of String(value || "")) {
            result ^= char.charCodeAt(0);
            result = Math.imul(result, 16777619);
        }
        return result >>> 0;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    class DigitalTwinEngine {
        constructor(options = {}) {
            this.intervalMs = options.intervalMs || 1500;
            this.models = new Map();
            this.listeners = new Set();
            this.scenario = "normal";
            this.focusId = null;
            this.running = false;
            this.timer = null;
            this.lastSnapshot = null;
        }

        register(objects) {
            this.models.clear();
            objects.forEach(object => this.registerObject(object, false));
            this.rebuildTopology();
            this.tick();
        }

        registerObject(object, triggerTick = true) {
            const seed = hash(object.id || object.name);
            const source = Boolean(object.isHeatSource) || object.type === "Теплоисточник";
            this.models.set(object.id, {
                ...object,
                seed,
                source,
                connected: object.connected !== false,
                upstreamId: object.upstreamId || null,
                connectionDistanceM: Number(object.connectionDistanceM || 0),
                phase: (seed % 628) / 100,
                baseSupply: source ? 86 + (seed % 70) / 10 : 66 + (seed % 150) / 10,
                basePressure: source ? 8.1 + (seed % 15) / 10 : 5.1 + (seed % 22) / 10,
                baseFlow: source ? 520 + seed % 1450 : 18 + seed % 380,
                history: [],
                downstreamLevels: new Map(
                    (object.downstreamObjects || []).map(item => [item.id, Number(item.level || 0)])
                )
            });
            if (triggerTick) {
                this.rebuildTopology();
                this.tick();
            }
        }

        unregisterObject(id) {
            this.models.delete(id);
            this.rebuildTopology();
            this.tick();
        }

        rebuildTopology() {
            this.models.forEach(model => {
                model.resolvedUpstreamId = model.upstreamId || null;
                model.topologyLevel = model.source ? 0 : Infinity;
                model.rootDistance = model.source ? 0 : Infinity;
            });

            // Multi-source relaxation builds an actual upstream chain through
            // pipes and chambers instead of assigning every node an isolated baseline.
            for (let pass = 0; pass < this.models.size; pass += 1) {
                let changed = false;
                this.models.forEach(parent => {
                    if (!Number.isFinite(parent.rootDistance)) return;
                    parent.downstreamLevels.forEach((rawLevel, targetId) => {
                        const target = this.models.get(targetId);
                        if (!target || target.source || target.upstreamId) return;
                        const edgeLevel = Math.max(1, Number(rawLevel || 1));
                        const candidate = parent.rootDistance + edgeLevel;
                        if (candidate < target.rootDistance) {
                            target.rootDistance = candidate;
                            target.topologyLevel = edgeLevel;
                            target.resolvedUpstreamId = parent.id;
                            changed = true;
                        }
                    });
                });
                if (!changed) break;
            }

            // Explicitly linked custom objects inherit reachability from their parent.
            for (let pass = 0; pass < this.models.size; pass += 1) {
                let changed = false;
                this.models.forEach(model => {
                    if (!model.upstreamId || Number.isFinite(model.rootDistance)) return;
                    const upstream = this.models.get(model.upstreamId)
                        || this.models.get(`custom_${model.upstreamId}`)
                        || this.models.get(`custom_pipe_${model.upstreamId}`);
                    if (upstream && Number.isFinite(upstream.rootDistance)) {
                        model.resolvedUpstreamId = upstream.id;
                        model.topologyLevel = Math.max(1, model.connectionDistanceM / 180);
                        model.rootDistance = upstream.rootDistance + model.topologyLevel;
                        changed = true;
                    }
                });
                if (!changed) break;
            }

            this.models.forEach(model => {
                if (!model.resolvedUpstreamId || this.models.has(model.resolvedUpstreamId)) return;
                const aliases = [`custom_${model.resolvedUpstreamId}`, `custom_pipe_${model.resolvedUpstreamId}`];
                model.resolvedUpstreamId = aliases.find(id => this.models.has(id)) || model.resolvedUpstreamId;
            });
        }

        subscribe(listener) {
            this.listeners.add(listener);
            if (this.lastSnapshot) listener(this.lastSnapshot);
            return () => this.listeners.delete(listener);
        }

        start() {
            if (this.running) return;
            this.running = true;
            this.tick();
            this.timer = window.setInterval(() => this.tick(), this.intervalMs);
        }

        pause() {
            this.running = false;
            if (this.timer !== null) window.clearInterval(this.timer);
            this.timer = null;
            this.emit();
        }

        setScenario(scenario, focusId = null) {
            this.scenario = ["normal", "leak", "frost"].includes(scenario) ? scenario : "normal";
            this.focusId = focusId;
            this.tick();
        }

        get(id) {
            return this.lastSnapshot?.objects.get(id) || null;
        }

        tick() {
            const timestamp = Date.now();
            const seconds = timestamp / 1000;
            const values = new Map();
            let supplySum = 0;
            let pressureSum = 0;
            let totalFlow = 0;
            let totalPower = 0;
            let sourcePower = 0;
            let warnings = 0;
            let critical = 0;
            let affected = 0;
            const leakOrigin = this.scenario === "leak" ? this.models.get(this.focusId) : null;
            let connectedCount = 0;

            const disconnectedTelemetry = model => ({
                id: model.id,
                name: model.name,
                type: model.type,
                timestamp,
                supply: null,
                returnTemperature: null,
                pressure: null,
                flow: null,
                power: null,
                status: "disconnected",
                connected: false,
                upstreamId: model.resolvedUpstreamId || null,
                leakAffected: false,
                impactLevel: null,
                impactPercent: 0,
                history: []
            });

            const calculateModel = (model, visiting = new Set()) => {
                if (values.has(model.id)) return values.get(model.id);
                if (visiting.has(model.id) || model.connected === false) {
                    const telemetry = disconnectedTelemetry(model);
                    values.set(model.id, telemetry);
                    return telemetry;
                }

                let upstream = null;
                if (!model.source) {
                    const upstreamModel = this.models.get(model.resolvedUpstreamId);
                    if (!upstreamModel) {
                        const telemetry = disconnectedTelemetry(model);
                        values.set(model.id, telemetry);
                        return telemetry;
                    }
                    const nextVisiting = new Set(visiting);
                    nextVisiting.add(model.id);
                    upstream = calculateModel(upstreamModel, nextVisiting);
                    if (!upstream.connected) {
                        const telemetry = disconnectedTelemetry(model);
                        values.set(model.id, telemetry);
                        return telemetry;
                    }
                }

                const wave = Math.sin(seconds / 9 + model.phase);
                const slowWave = Math.sin(seconds / 31 + model.phase * 0.47);
                const isLeakTarget = this.scenario === "leak" && model.id === this.focusId;
                const downstreamLevel = leakOrigin?.downstreamLevels.get(model.id);
                const isDownstreamAffected = Number.isFinite(downstreamLevel);
                const leakAttenuation = isLeakTarget
                    ? 1
                    : (isDownstreamAffected ? Math.max(0.18, Math.exp(-downstreamLevel / 4.5)) : 0);
                const frostBoost = this.scenario === "frost" ? 10 : 0;
                const defectPenalty = model.hasActiveDefect ? 3.2 : 0;

                const topologyLevel = Number.isFinite(model.topologyLevel)
                    ? Math.max(1, model.topologyLevel)
                    : Math.max(1, model.connectionDistanceM / 180);
                let supply = model.source
                    ? model.baseSupply + wave * 1.5 + slowWave * 0.8 + frostBoost - defectPenalty
                    : upstream.supply - Math.min(16, 0.35 + topologyLevel * 0.42) + wave * 0.18 - defectPenalty;
                let pressure = model.source
                    ? model.basePressure + wave * 0.12 - defectPenalty * 0.08
                    : upstream.pressure - Math.min(3.8, 0.06 + topologyLevel * 0.055) + wave * 0.025 - defectPenalty * 0.08;
                const requestedFlow = model.baseFlow * (1 + slowWave * 0.035 + (this.scenario === "frost" ? 0.24 : 0));
                let flow = model.source ? requestedFlow : Math.min(upstream.flow * 0.94, requestedFlow);
                let deltaT = 21 + (model.seed % 75) / 10 + (this.scenario === "frost" ? 5 : 0);

                if (isLeakTarget) {
                    pressure -= 3.4;
                    flow *= 1.72;
                    supply -= 12;
                    deltaT += 7;
                } else if (isDownstreamAffected) {
                    pressure -= 2.75 * leakAttenuation;
                    flow *= 1 - 0.42 * leakAttenuation;
                    supply -= 9 * leakAttenuation;
                    deltaT += 5 * leakAttenuation;
                }

                supply = clamp(supply, 35, 108);
                pressure = clamp(pressure, 0.4, 12);
                flow = Math.max(0, flow);
                const returnTemperature = clamp(supply - deltaT, 24, 82);
                const power = flow * (supply - returnTemperature) * 1.163 / 1000;
                let status = "normal";
                if (isLeakTarget || (isDownstreamAffected && leakAttenuation >= 0.72) || pressure < 2.7 || supply < 48) status = "critical";
                else if (isDownstreamAffected || model.hasActiveDefect || pressure < 4.3 || supply < 58) status = "warning";

                const telemetry = {
                    id: model.id,
                    name: model.name,
                    type: model.type,
                    timestamp,
                    supply: Number(supply.toFixed(1)),
                    returnTemperature: Number(returnTemperature.toFixed(1)),
                    pressure: Number(pressure.toFixed(2)),
                    flow: Number(flow.toFixed(1)),
                    power: Number(power.toFixed(2)),
                    status,
                    connected: true,
                    upstreamId: model.resolvedUpstreamId || null,
                    leakAffected: isLeakTarget || isDownstreamAffected,
                    impactLevel: isLeakTarget ? 0 : (isDownstreamAffected ? downstreamLevel : null),
                    impactPercent: Math.round(leakAttenuation * 100)
                };
                model.history.push({
                    timestamp,
                    supply: telemetry.supply,
                    pressure: telemetry.pressure,
                    flow: telemetry.flow
                });
                if (model.history.length > 40) model.history.shift();
                telemetry.history = model.history.slice();
                values.set(model.id, telemetry);
                connectedCount += 1;
                supplySum += telemetry.supply;
                pressureSum += telemetry.pressure;
                totalFlow += telemetry.flow;
                totalPower += telemetry.power;
                if (model.type === "Теплоисточник") sourcePower += telemetry.power;
                if (status === "warning") warnings += 1;
                if (status === "critical") critical += 1;
                if (telemetry.leakAffected) affected += 1;
                return telemetry;
            };

            this.models.forEach(model => calculateModel(model));

            const count = Math.max(1, connectedCount);
            this.lastSnapshot = {
                timestamp,
                running: this.running,
                scenario: this.scenario,
                focusId: this.focusId,
                objects: values,
                aggregate: {
                    count: values.size,
                    connected: connectedCount,
                    disconnected: values.size - connectedCount,
                    averageSupply: Number((supplySum / count).toFixed(1)),
                    averagePressure: Number((pressureSum / count).toFixed(2)),
                    totalFlow: Number(totalFlow.toFixed(0)),
                    totalPower: Number((sourcePower || totalPower).toFixed(1)),
                    warnings,
                    critical,
                    affected
                }
            };
            this.emit();
        }

        emit() {
            if (!this.lastSnapshot) return;
            this.lastSnapshot.running = this.running;
            this.listeners.forEach(listener => listener(this.lastSnapshot));
        }

        connectWebSocket(url) {
            const socket = new WebSocket(url);
            socket.addEventListener("message", event => {
                const payload = JSON.parse(event.data);
                if (!payload?.id || !this.models.has(payload.id)) return;
                const model = this.models.get(payload.id);
                model.external = payload;
            });
            return socket;
        }
    }

    window.DigitalTwinEngine = DigitalTwinEngine;
})();
