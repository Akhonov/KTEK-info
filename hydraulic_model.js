(function () {
    "use strict";

    const WATER_DENSITY = 971.8; // kg/m³ near 80 °C
    const WATER_HEAT_CAPACITY = 4180; // J/(kg·K)
    const WATER_VISCOSITY = 0.000355; // Pa·s near 80 °C

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function swameeJain(reynolds, roughnessM, diameterM) {
        if (reynolds < 2300) return 64 / Math.max(1, reynolds);
        const term = roughnessM / (3.7 * diameterM) + 5.74 / Math.pow(reynolds, 0.9);
        return 0.25 / Math.pow(Math.log10(term), 2);
    }

    class HydraulicThermalModel {
        constructor(mapData, assets) {
            this.mapData = mapData;
            this.assets = new Map(assets.map(asset => [asset.id, asset]));
            this.controls = this.readControls();
            this.assignments = this.buildTopologyAssignments();
            this.results = new Map();
            this.solve();
        }

        readControls() {
            try { return JSON.parse(localStorage.getItem("ktek_hydraulic_source_controls_v1") || "{}"); }
            catch (_) { return {}; }
        }

        saveControls() {
            localStorage.setItem("ktek_hydraulic_source_controls_v1", JSON.stringify(this.controls));
        }

        buildTopologyAssignments() {
            const assignments = new Map();
            (this.mapData.heatSources || []).forEach(source => {
                assignments.set(source.id, { sourceId: source.id, level: 0 });
                (source.downstreamObjects || []).forEach(item => {
                    const current = assignments.get(item.id);
                    const level = Number(item.level || 1);
                    if (!current || level < current.level) assignments.set(item.id, { sourceId: source.id, level });
                });
            });
            this.assets.forEach(asset => {
                if (!assignments.has(asset.id)) assignments.set(asset.id, { sourceId: asset.heatSourceId, level: 1 });
            });
            return assignments;
        }

        getSourceControls(sourceId) {
            const asset = this.assets.get(sourceId);
            const passport = asset?.passport || {};
            const defaults = {
                pressureBar: Number(passport.designPressureBar || 9.5),
                supplyTemperatureC: Number(passport.designSupplyTemperatureC || 105),
                thermalPowerMW: Number(passport.designPowerMW || 80),
                returnTemperatureC: 58
            };
            return { ...defaults, ...(this.controls[sourceId] || {}) };
        }

        updateSource(sourceId, changes) {
            const current = this.getSourceControls(sourceId);
            this.controls[sourceId] = {
                pressureBar: clamp(Number(changes.pressureBar ?? current.pressureBar), 1, 20),
                supplyTemperatureC: clamp(Number(changes.supplyTemperatureC ?? current.supplyTemperatureC), 40, 160),
                thermalPowerMW: clamp(Number(changes.thermalPowerMW ?? current.thermalPowerMW), 0.2, 1000),
                returnTemperatureC: clamp(Number(changes.returnTemperatureC ?? current.returnTemperatureC), 20, 100)
            };
            this.saveControls();
            return this.solve();
        }

        resetSource(sourceId) {
            delete this.controls[sourceId];
            this.saveControls();
            return this.solve();
        }

        solve() {
            const grouped = new Map();
            this.assignments.forEach((assignment, assetId) => {
                if (!grouped.has(assignment.sourceId)) grouped.set(assignment.sourceId, []);
                grouped.get(assignment.sourceId).push({ assetId, level: assignment.level });
            });
            const results = new Map();
            grouped.forEach((members, sourceId) => {
                const sourceControls = this.getSourceControls(sourceId);
                const deltaT = Math.max(5, sourceControls.supplyTemperatureC - sourceControls.returnTemperatureC);
                const totalMassFlowKgS = sourceControls.thermalPowerMW * 1e6 / (WATER_HEAT_CAPACITY * deltaT);
                const consumers = Math.max(1, members.filter(item => item.assetId !== sourceId).length);
                members.forEach(({ assetId, level }) => {
                    const asset = this.assets.get(assetId);
                    if (!asset) return;
                    if (asset.assetType === "source") {
                        results.set(assetId, {
                            assetId, sourceId, level: 0,
                            pressureBar: sourceControls.pressureBar,
                            supplyTemperatureC: sourceControls.supplyTemperatureC,
                            returnTemperatureC: sourceControls.returnTemperatureC,
                            massFlowKgS: totalMassFlowKgS,
                            flowM3h: totalMassFlowKgS / WATER_DENSITY * 3600,
                            thermalPowerMW: sourceControls.thermalPowerMW,
                            pressureLossBar: 0, heatLossKW: 0, velocityMS: 0, reynolds: 0,
                            formula: "Q̇ = ṁ·cp·(Tп−Tоб)", dataOrigin: "calculated"
                        });
                        return;
                    }
                    const passport = asset.passport || {};
                    const diameterM = Math.max(0.05, Number(passport.outerDiameterMm || 219) / 1000);
                    const area = Math.PI * diameterM * diameterM / 4;
                    const branchWeight = clamp(Math.pow(diameterM / 0.219, 2), 0.12, 7);
                    const massFlow = totalMassFlowKgS * branchWeight / (consumers * 0.74 + branchWeight);
                    const velocity = massFlow / (WATER_DENSITY * area);
                    const reynolds = WATER_DENSITY * velocity * diameterM / WATER_VISCOSITY;
                    const roughnessM = Number(passport.roughnessMm || 0.2) / 1000;
                    const friction = swameeJain(reynolds, roughnessM, diameterM);
                    const localLength = Number(passport.lengthM || (asset.assetType === "chamber" ? 8 : 30));
                    const equivalentLength = localLength + Math.max(0, level - 1) * Math.min(42, localLength * 0.22 + 8);
                    const localK = asset.assetType === "chamber" ? 2.2 + Number(passport.valves || 2) * 0.35 : 0.6;
                    const dynamicPressure = WATER_DENSITY * velocity * velocity / 2;
                    const pressureLossPa = (friction * equivalentLength / diameterM + localK) * dynamicPressure;
                    const pressureLossBar = pressureLossPa / 100000;
                    const pressure = clamp(sourceControls.pressureBar - pressureLossBar, 0.15, 20);
                    const heatTransfer = Number(passport.heatTransferWm2K || 0.72);
                    const groundTemperature = 8;
                    const exponent = -heatTransfer * Math.PI * diameterM * equivalentLength / Math.max(1, massFlow * WATER_HEAT_CAPACITY);
                    const supplyTemperature = groundTemperature + (sourceControls.supplyTemperatureC - groundTemperature) * Math.exp(exponent);
                    const returnTemperature = clamp(sourceControls.returnTemperatureC - level * 0.05, 20, supplyTemperature - 3);
                    const thermalPowerMW = massFlow * WATER_HEAT_CAPACITY * (supplyTemperature - returnTemperature) / 1e6;
                    const heatLossKW = massFlow * WATER_HEAT_CAPACITY * (sourceControls.supplyTemperatureC - supplyTemperature) / 1000;
                    results.set(assetId, {
                        assetId, sourceId, level,
                        pressureBar: Number(pressure.toFixed(3)),
                        supplyTemperatureC: Number(supplyTemperature.toFixed(2)),
                        returnTemperatureC: Number(returnTemperature.toFixed(2)),
                        massFlowKgS: Number(massFlow.toFixed(2)),
                        flowM3h: Number((massFlow / WATER_DENSITY * 3600).toFixed(1)),
                        thermalPowerMW: Number(thermalPowerMW.toFixed(3)),
                        pressureLossBar: Number(pressureLossBar.toFixed(3)),
                        heatLossKW: Number(heatLossKW.toFixed(2)),
                        velocityMS: Number(velocity.toFixed(2)),
                        reynolds: Math.round(reynolds),
                        frictionFactor: Number(friction.toFixed(5)),
                        formula: "ΔP=f·(L/D)·ρv²/2 + ΣK·ρv²/2; T(L)=Tгр+(T0−Tгр)e^(−UπDL/(ṁcp))",
                        dataOrigin: "calculated"
                    });
                });
            });
            this.results = results;
            return results;
        }

        get(assetId) { return this.results.get(assetId) || null; }
    }

    window.HydraulicThermalModel = HydraulicThermalModel;
})();
