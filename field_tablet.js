/**
 * KTEK SCADA Digital Twin 2.0 - Field Crew Tablet ARM Module (Мобильное решение)
 * Tablet-optimized interface for field inspectors, defect entry, offline sync, & GIS editing.
 */

window.KTEKFieldTablet = {
    isOnline: true,
    offlineQueue: [],

    init() {
        console.log("⚡ [Field Tablet] Initializing Field Mobile ARM Module...");
        this.loadOfflineQueue();

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleNetworkStatusChange(true));
        window.addEventListener('offline', () => this.handleNetworkStatusChange(false));
    },

    loadOfflineQueue() {
        const saved = localStorage.getItem('ktek_offline_queue');
        if (saved) {
            try {
                this.offlineQueue = JSON.parse(saved);
            } catch (e) {
                this.offlineQueue = [];
            }
        }
        this.updateSyncBadge();
    },

    saveOfflineQueue() {
        localStorage.setItem('ktek_offline_queue', JSON.stringify(this.offlineQueue));
        this.updateSyncBadge();
    },

    handleNetworkStatusChange(onlineStatus) {
        this.isOnline = onlineStatus;
        const statusElem = document.getElementById('tabletNetStatus');
        if (statusElem) {
            statusElem.innerText = this.isOnline ? "🟢 ОНЛАЙН (Синхронизировано)" : "🔴 ОФЛАЙН (Локальный режим)";
            statusElem.className = this.isOnline ? "net-badge online" : "net-badge offline";
        }

        if (this.isOnline && this.offlineQueue.length > 0) {
            this.syncOfflineQueue();
        }
    },

    syncOfflineQueue() {
        console.log(`🔄 Syncing ${this.offlineQueue.length} offline records to KTEK server...`);
        const count = this.offlineQueue.length;
        
        // Push offline queue records into window.KTEKData
        this.offlineQueue.forEach(item => {
            if (item.type === 'defect') {
                window.KTEKData.defects.unshift(item.payload);
            } else if (item.type === 'topology_add') {
                window.KTEKData.chambers.push(item.payload);
            }
        });

        this.offlineQueue = [];
        this.saveOfflineQueue();

        if (window.KTEKApp) {
            window.KTEKApp.showNotification(`✅ Успешно синхронизировано ${count} записей с сервером!`, "success");
            window.KTEKApp.refreshDataViews();
        }
    },

    /**
     * Submit defect from Tablet ARM
     */
    addDefectFromTablet(defectForm) {
        const newDefect = {
            id: Date.now(),
            source: defectForm.source || "РК-3",
            dateObserved: new Date().toISOString().slice(0, 16),
            tk: defectForm.tk || "ТК15.02",
            address: defectForm.address || "Адрес не указан",
            defectType: defectForm.defectType || "Визуальная течь",
            networkType: defectForm.networkType || "Внутриквартальная",
            priority: parseInt(defectForm.priority) || 3,
            note: defectForm.note || "",
            detectedBy: defectForm.detectedBy || "Полевой Инженер",
            photos: defectForm.photos || ["attachment_sample.jpg"],
            resolved: false,
            resolveDate: null
        };

        if (this.isOnline) {
            window.KTEKData.defects.unshift(newDefect);
            if (window.KTEKApp) {
                window.KTEKApp.showNotification(`Дефект на ${newDefect.tk} внесен в базу КТЭК!`, "success");
                window.KTEKApp.refreshDataViews();
            }
        } else {
            this.offlineQueue.push({ type: 'defect', payload: newDefect, timestamp: new Date() });
            this.saveOfflineQueue();
            if (window.KTEKApp) {
                window.KTEKApp.showNotification(`Сохранено локально! Будет отправлено при появлении сети.`, "warning");
            }
        }
    },

    /**
     * Field GIS Topology Correction
     */
    addChamberFromTablet(chamberForm) {
        const newChamber = {
            id: chamberForm.id || `ТК-${Math.floor(10 + Math.random() * 90)}`,
            name: chamberForm.name || "Новая ТК (Полевая съёмка)",
            lat: parseFloat(chamberForm.lat) || 53.205,
            lng: parseFloat(chamberForm.lng) || 63.615,
            source: chamberForm.source || "TETs1",
            type: chamberForm.type || "chamber",
            p1: 8.0,
            p2: 3.5,
            t1: 90.0,
            t2: 54.0,
            status: "normal"
        };

        if (this.isOnline) {
            window.KTEKData.chambers.push(newChamber);
            if (window.KTEKApp) {
                window.KTEKApp.showNotification(`Новый объект ${newChamber.id} добавлен на карту КТЭК!`, "success");
                window.KTEKApp.refreshDataViews();
            }
        } else {
            this.offlineQueue.push({ type: 'topology_add', payload: newChamber, timestamp: new Date() });
            this.saveOfflineQueue();
            if (window.KTEKApp) {
                window.KTEKApp.showNotification(`Топология сохранена локально в планшете!`, "warning");
            }
        }
    },

    updateSyncBadge() {
        const syncBadge = document.getElementById('tabletSyncCount');
        if (syncBadge) {
            syncBadge.innerText = this.offlineQueue.length;
        }
    }
};
