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
            this.tick();
        }

        registerObject(object, triggerTick = true) {
            const seed = hash(object.id || object.name);
            const source = object.type === "Теплоисточник";
            this.models.set(object.id, {
                ...object,
                seed,
                phase: (seed % 628) / 100,
                baseSupply: source ? 86 + (seed % 70) / 10 : 66 + (seed % 150) / 10,
                basePressure: source ? 8.1 + (seed % 15) / 10 : 5.1 + (seed % 22) / 10,
                baseFlow: source ? 520 + seed % 1450 : 18 + seed % 380,
                history: [],
                downstreamLevels: new Map(
                    (object.downstreamObjects || []).map(item => [item.id, Number(item.level || 0)])
                )
            });
            if (triggerTick) this.tick();
        }

        unregisterObject(id) {
            this.models.delete(id);
            this.tick();
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

            this.models.forEach(model => {
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

                let supply = model.baseSupply + wave * 1.5 + slowWave * 0.8 + frostBoost - defectPenalty;
                let pressure = model.basePressure + wave * 0.12 - defectPenalty * 0.08;
                let flow = model.baseFlow * (1 + slowWave * 0.035 + (this.scenario === "frost" ? 0.24 : 0));
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
                supplySum += telemetry.supply;
                pressureSum += telemetry.pressure;
                totalFlow += telemetry.flow;
                totalPower += telemetry.power;
                if (model.type === "Теплоисточник") sourcePower += telemetry.power;
                if (status === "warning") warnings += 1;
                if (status === "critical") critical += 1;
                if (telemetry.leakAffected) affected += 1;
            });

            const count = Math.max(1, values.size);
            this.lastSnapshot = {
                timestamp,
                running: this.running,
                scenario: this.scenario,
                focusId: this.focusId,
                objects: values,
                aggregate: {
                    count: values.size,
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
