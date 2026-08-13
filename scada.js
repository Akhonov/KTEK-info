/**
 * KTEK SCADA Digital Twin 2.0 - Telemetry & Threshold Alarm Engine
 * Simulates hydraulic/thermal parameters and triggers threshold alerts.
 */

window.KTEKScada = {
    thresholds: {
        t1Min: 75.0,
        t1Max: 110.0,
        p1Min: 6.5,
        p1Max: 10.0,
        deltaPMin: 3.2,
        maxLossGcal: 5.0
    },

    activeAlerts: [],
    timerId: null,

    init() {
        console.log("⚡ [SCADA Engine] Initializing SCADA Telemetry Engine...");
        this.startTelemetryLoop();
    },

    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log("⚙️ SCADA Thresholds updated:", this.thresholds);
        this.evaluateAllParameters();
    },

    startTelemetryLoop() {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => {
            this.simulateLiveTelemetryJitter();
            this.evaluateAllParameters();
        }, 4000);
    },

    simulateLiveTelemetryJitter() {
        const data = window.KTEKData;
        if (!data) return;

        // Jitter heat sources
        data.sources.forEach(src => {
            const jitterP1 = (Math.random() - 0.5) * 0.15;
            const jitterT1 = (Math.random() - 0.5) * 0.4;
            src.p1 = parseFloat(Math.max(5.0, Math.min(11.0, src.p1 + jitterP1)).toFixed(2));
            src.t1 = parseFloat(Math.max(65.0, Math.min(115.0, src.t1 + jitterT1)).toFixed(1));
        });

        // Jitter chambers
        data.chambers.forEach(c => {
            const jitterP = (Math.random() - 0.48) * 0.12;
            c.p1 = parseFloat(Math.max(4.0, Math.min(10.0, c.p1 + jitterP)).toFixed(2));
            if (c.status === "emergency") {
                c.p1 = parseFloat((4.2 + (Math.random() * 0.4)).toFixed(2)); // pressure drop during leak
            }
        });

        // Broadcast telemetry update event
        window.dispatchEvent(new CustomEvent('ktek-telemetry-update', { detail: { timestamp: new Date() } }));
    },

    evaluateAllParameters() {
        const data = window.KTEKData;
        if (!data) return;

        this.activeAlerts = [];

        // Check Sources
        data.sources.forEach(src => {
            if (src.p1 < this.thresholds.p1Min) {
                this.activeAlerts.push({
                    id: `alert-src-p-${src.id}`,
                    sourceId: src.id,
                    name: src.name,
                    parameter: "Давление P1",
                    value: `${src.p1} бар`,
                    threshold: `< ${this.thresholds.p1Min} бар`,
                    severity: "critical",
                    msg: `Критическое падение давления на выходе ${src.name}!`
                });
            }
            if (src.t1 < this.thresholds.t1Min) {
                this.activeAlerts.push({
                    id: `alert-src-t-${src.id}`,
                    sourceId: src.id,
                    name: src.name,
                    parameter: "Температура T1",
                    value: `${src.t1} °C`,
                    threshold: `< ${this.thresholds.t1Min} °C`,
                    severity: "warning",
                    msg: `Отклонение температуры подающей воды на ${src.name}`
                });
            }
        });

        // Check Chambers
        data.chambers.forEach(c => {
            if (c.status === "emergency" || c.p1 < 5.0) {
                this.activeAlerts.push({
                    id: `alert-ch-${c.id}`,
                    sourceId: c.id,
                    name: c.name,
                    parameter: "Гидравлический режим",
                    value: `${c.p1} бар`,
                    threshold: `< 5.0 бар`,
                    severity: "critical",
                    msg: `Аварийное падение давления в ТК ${c.id}! Возможен порыв!`
                });
            }
        });

        // Render SCADA Alert Ticker / Badge if UI present
        const alertBadge = document.getElementById('scadaAlertCount');
        if (alertBadge) {
            alertBadge.innerText = this.activeAlerts.length;
            alertBadge.className = this.activeAlerts.length > 0 ? "badge badge-red pulse" : "badge badge-ok";
        }
    },

    /**
     * Get District Consumption Analytics & Heat Meter Anomaly Detection
     */
    getDistrictAnalytics(districtFilter = "all") {
        const data = window.KTEKData;
        if (!data || !data.houses) return null;

        const filteredHouses = districtFilter === "all" ? data.houses : data.houses.filter(h => h.district === districtFilter);

        let totalHeatGcalH = 0;
        let totalWaterFlowTн = 0;
        let meteredHouses = 0;
        let unmeteredHouses = 0;

        const anomalies = {
            overheats: [],
            underheats: [],
            leaks: [],
            unmeteredList: []
        };

        filteredHouses.forEach(h => {
            const t = h.telemetry || {};
            const q = t.qGcal || h.load || 0.15;
            totalHeatGcalH += q;
            totalWaterFlowTн += (t.g1 || 10.0);

            if (h.meter && h.meter.hasMeter) {
                meteredHouses++;
                // Check Overheat Anomaly (T2 > 65°C)
                if (t.t2 && t.t2 >= 64.0) {
                    anomalies.overheats.push({
                        house: h,
                        type: "Перегрев обратки (T2)",
                        val: `${t.t2} °C (Норма < 55°C)`,
                        severity: "high",
                        action: "Настройка элеваторного узла / дросселирование"
                    });
                }
                // Check Internal Leak (G1 - G2 > 1.2 t/h)
                if (t.g1 && t.g2 && (t.g1 - t.g2) >= 1.2) {
                    anomalies.leaks.push({
                        house: h,
                        type: "Утечка во внутреннем контуре",
                        val: `ΔG = ${(t.g1 - t.g2).toFixed(2)} т/ч`,
                        severity: "critical",
                        action: "Срочный выезд инспектора КТЭК"
                    });
                }
                // Check Underheat (T1 < 78°C)
                if (t.t1 && t.t1 < 78.0) {
                    anomalies.underheats.push({
                        house: h,
                        type: "Занижение температуры (Т1)",
                        val: `${t.t1} °C (Норма > 85°C)`,
                        severity: "medium",
                        action: "Проверка гидравлических параметров магистрали"
                    });
                }
            } else {
                unmeteredHouses++;
                anomalies.unmeteredList.push(h);
            }
        });

        const totalAnomalyCount = anomalies.overheats.length + anomalies.leaks.length + anomalies.underheats.length;

        return {
            district: districtFilter,
            totalHouses: filteredHouses.length,
            meteredHouses: meteredHouses,
            unmeteredHouses: unmeteredHouses,
            meterCoveragePct: filteredHouses.length ? Math.round((meteredHouses / filteredHouses.length) * 100) : 0,
            totalHeatGcalH: parseFloat(totalHeatGcalH.toFixed(3)),
            totalWaterFlowTн: parseFloat(totalWaterFlowTн.toFixed(1)),
            totalAnomalyCount: totalAnomalyCount,
            anomalies: anomalies
        };
    }
};

