(function () {
    "use strict";

    class KtekOperationsDatabase {
        constructor(seedUrl) {
            this.seedUrl = seedUrl;
            this.name = "ktek-operations-v1";
            this.db = null;
            this.cache = { metadata: {}, crews: [], assets: [], defects: [], telemetry: {} };
        }

        openIndexedDb() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.name, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains("records")) db.createObjectStore("records");
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        readRecord(key) {
            return new Promise((resolve, reject) => {
                const request = this.db.transaction("records", "readonly").objectStore("records").get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        writeRecord(key, value) {
            return new Promise((resolve, reject) => {
                const request = this.db.transaction("records", "readwrite").objectStore("records").put(value, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async initialize() {
            this.db = await this.openIndexedDb();
            const response = await fetch(this.seedUrl, { cache: "no-store" });
            if (!response.ok) throw new Error(`Не удалось загрузить БД: HTTP ${response.status}`);
            const seed = await response.json();
            const saved = await this.readRecord("database");
            if (!saved || saved.metadata?.schemaVersion !== seed.metadata?.schemaVersion) {
                this.cache = seed;
                await this.persist();
            } else {
                this.cache = saved;
            }
            return this.cache;
        }

        async persist() { await this.writeRecord("database", this.cache); }
        getAsset(id) { return this.cache.assets.find(item => item.id === id) || null; }
        getDefects(id) { return this.cache.defects.filter(item => item.assetId === id); }
        getTelemetry(id) { return this.cache.telemetry[id] || []; }

        async updateAsset(id, changes) {
            const asset = this.getAsset(id);
            if (!asset) throw new Error("Объект не найден");
            const previousPassport = asset.passport || {};
            const previousProfile = asset.regularProfile || {};
            Object.assign(asset, changes, { updatedAt: new Date().toISOString() });
            if (changes.passport) asset.passport = { ...previousPassport, ...changes.passport };
            if (changes.regularProfile) asset.regularProfile = { ...previousProfile, ...changes.regularProfile };
            await this.persist();
            return asset;
        }

        async upsertDefect(defect) {
            const index = this.cache.defects.findIndex(item => item.id === defect.id);
            const record = { ...defect, updatedAt: new Date().toISOString() };
            if (index >= 0) this.cache.defects[index] = record;
            else this.cache.defects.push(record);
            await this.persist();
            return record;
        }

        calculateRisks() {
            const now = Date.now();
            return this.cache.assets.map(asset => {
                const defects = this.getDefects(asset.id);
                const active = defects.filter(item => item.status === "active").length;
                const recent = defects.filter(item => now - Date.parse(item.detectedAt || 0) < 90 * 86400000).length;
                const durations = defects.map(item => Number(item.repairDurationHours)).filter(Number.isFinite);
                const meanRepair = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
                const lastTelemetry = this.getTelemetry(asset.id).slice(-6);
                const anomalies = lastTelemetry.filter(item => item.anomaly).length;
                const age = new Date().getFullYear() - Number(asset.commissionedYear || 2005);
                const z = -3.65 + defects.length * 0.22 + recent * 0.46 + active * 0.92 + age * 0.025 + meanRepair * 0.007 + anomalies * 0.58;
                const probability = 1 / (1 + Math.exp(-z));
                return { assetId: asset.id, name: asset.name, type: asset.assetType, district: asset.district, probability, defects: defects.length, active, anomalies };
            }).sort((a, b) => b.probability - a.probability);
        }

        monthlyBacktest() {
            const months = [];
            const end = new Date(this.cache.metadata.historyEnd);
            for (let offset = 5; offset >= 0; offset -= 1) {
                const start = new Date(end.getFullYear(), end.getMonth() - offset, 1);
                const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
                const preceding = new Date(start.getFullYear(), start.getMonth() - 2, 1);
                let predictedSum = 0, actual = 0, assets = 0;
                this.cache.assets.forEach(asset => {
                    const records = this.getDefects(asset.id);
                    const prior = records.filter(item => { const t = Date.parse(item.detectedAt); return t >= preceding && t < start; }).length;
                    const probability = 1 / (1 + Math.exp(-(-2.8 + prior * 0.82 + (2026 - asset.commissionedYear) * 0.018)));
                    predictedSum += probability;
                    if (records.some(item => { const t = Date.parse(item.detectedAt); return t >= start && t < next; })) actual += 1;
                    assets += 1;
                });
                months.push({ label: start.toLocaleDateString("ru-RU", { month: "short" }), forecast: predictedSum / assets * 100, actual: actual / assets * 100 });
            }
            return months;
        }
    }

    window.KtekOperationsDatabase = KtekOperationsDatabase;
})();
