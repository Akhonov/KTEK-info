/**
 * KTEK SCADA Digital Twin 2.0 - Telemetry, Alarm Engine & THERMOTRACE Mnemoschema
 * Реализует мнемосхему в стиле THERMOTRACE: дерево ТЭЦ → ТМ → ТК → Дома
 * с живой телеметрией, балансом участков и детектором аномалий.
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
    mnemoTimerId: null,
    selectedAnomaly: null,

    // Топология мнемосхемы: дерево от ТЭЦ-1
    mnemoTree: {
        source: {
            id: "TETs1", name: "ТЭЦ-1", icon: "🏭",
            gcal: 125.4, t1: 92, p1: 5.8, t2: 63,
            children: [{
                id: "TM13", name: "ТМ-13", gcalIn: 124.1, t1: 91, p1: 5.5, t2: 63, gcalOut: 124.1,
                children: [
                    {
                        id: "ТК13.01", name: "ТК13.01", p1: 90, p2: 63, p1bar: 5.1, p2bar: 4.2, flow: 62.4, status: "ok",
                        consumers: ["Дом 15 (4.1)", "Дом 17 (5.3)"]
                    },
                    {
                        id: "ТК13.02", name: "ТК13.02", p1: 90, p2: 63, p1bar: 5.2, p2bar: 4.2, flow: 28.9, status: "ok",
                        consumers: ["Школа №7 (3.8)"]
                    },
                    {
                        id: "ТК13.03", name: "ТК13.03", p1: 89, p2: 63, p1bar: 5.1, p2bar: 4.1, flow: 33.5, status: "ok",
                        consumers: ["Дом 19 (4.8)"]
                    },
                    {
                        id: "ТК13.06", name: "ТК13.06", p1: 89, p2: 64, p1bar: 5.0, p2bar: 4.0, flow: 61.7, status: "anomaly",
                        anomalyDQ: "+12.8 Гкал/ч", anomalyPct: "21.9%",
                        consumers: ["Дом 21 (3.9)", "Дом 23 (4.8)"]
                    },
                    {
                        id: "ТК13.07", name: "ТК13.07", p1: 88, p2: 64, p1bar: 4.8, p2bar: 3.9, flow: 24.2, status: "ok",
                        consumers: []
                    },
                    {
                        id: "ТК13.08", name: "ТК13.08", p1: 88, p2: 64, p1bar: 4.9, p2bar: 3.0, flow: 25.5, status: "suspect",
                        gcalLoss: 2.8, lossPct: "4.7%",
                        consumers: ["Дом 25 (4.9)"]
                    }
                ]
            }]
        }
    },

    // История балансов (для временной шкалы)
    balanceHistory: [],

    // ThermoTrace 12 Active Anomalies Dataset (Matching Image 2)
    anomaliesList: [
        { id: "A-1038", segment: "ул. Ленина, 45 – ул. Ленина, 67", pipeId: "pipe-4", chamberId: "ТК7.01", imbalanceGcal: 18.5, imbalancePct: 78.9, risk: "high", status: "Новая", detected: "09:31", expected: 23.4, actual: 41.9, desc: "Повышенный тепловой отбор на участке. Возможен неучтённый отбор (нелегальная врезка) или скрытый свищ в камере." },
        { id: "A-1021", segment: "ул. Мира, 12 – ул. Мира, 48", pipeId: "pipe-7", chamberId: "ТК5", imbalanceGcal: 11.2, imbalancePct: 45.2, risk: "high", status: "В работе", detected: "08:47", expected: 24.8, actual: 36.0, desc: "Дисбаланс расхода по магистральной ветке 2-2. Повышенные утечки по обратной линии." },
        { id: "A-0987", segment: "ул. Гагарина, 33 – ул. Гагарина, 71", pipeId: "pipe-9", chamberId: "ТК8", imbalanceGcal: 7.6, imbalancePct: 31.4, risk: "med", status: "Новая", detected: "07:52", expected: 24.2, actual: 31.8, desc: "Отклонение гидрорежима в квартальной сети ТК-8." },
        { id: "A-0972", segment: "ул. Кирова, 101 – ул. Кирова, 135", pipeId: "pipe-8", chamberId: "ТК6", imbalanceGcal: 5.3, imbalancePct: 22.1, risk: "med", status: "Подтверждена", detected: "Вчера 22:13", expected: 24.0, actual: 29.3, desc: "Падение давления подачи на концевом фрагменте." },
        { id: "A-0945", segment: "пр. Победы, 5 – пр. Победы, 29", pipeId: "pipe-10", chamberId: "ТК9", imbalanceGcal: 4.8, imbalancePct: 18.7, risk: "low", status: "В работе", detected: "Вчера 19:41", expected: 25.6, actual: 30.4, desc: "Шум в элеваторном узле д. 15, превышение гидравлического сопротивления." },
        { id: "A-0912", segment: "5 микрорайон, д. 3 - д. 18", pipeId: "pipe-13", chamberId: "ТК15.02", imbalanceGcal: 4.2, imbalancePct: 15.4, risk: "med", status: "В работе", detected: "Вчера 16:15", expected: 27.2, actual: 31.4, desc: "Падение давления подачи P1 в подвальной части." },
        { id: "A-0890", segment: "ул. Быковского, 1А - 12", pipeId: "pipe-12", chamberId: "ТК23.08", imbalanceGcal: 3.9, imbalancePct: 12.8, risk: "low", status: "Подтверждена", detected: "Вчера 12:04", expected: 30.5, actual: 34.4, desc: "Незначительный свищ по сварному шву теплотрассы." },
        { id: "A-0865", segment: "мкр. Юбилейный, д. 1 - 9", pipeId: "pipe-11", chamberId: "ТК23.09", imbalanceGcal: 3.5, imbalancePct: 11.2, risk: "low", status: "В работе", detected: "Вчера 09:30", expected: 31.2, actual: 34.7, desc: "Перепады расхода теплоносителя в часы пик." },
        { id: "A-0840", segment: "ул. Строительная, д. 2 - 14", pipeId: "pipe-5", chamberId: "ТК13.02пр", imbalanceGcal: 3.1, imbalancePct: 9.8, risk: "low", status: "Новая", detected: "Вчера 07:15", expected: 31.6, actual: 34.7, desc: "Зафиксировано завоздушивание стояков." },
        { id: "A-0815", segment: "ул. 1 Мая, д. 88 - 110", pipeId: "pipe-16", chamberId: "ТК6.01л", imbalanceGcal: 2.8, imbalancePct: 8.5, risk: "low", status: "Подтверждена", detected: "Вчера 04:10", expected: 32.9, actual: 35.7, desc: "Засор грязевика в теплопункте." },
        { id: "A-0790", segment: "ул. Киевская (КСК), д. 1 - 25", pipeId: "pipe-15", chamberId: "ТК22.02.01", imbalanceGcal: 2.4, imbalancePct: 7.2, risk: "low", status: "В работе", detected: "Вчера 01:20", expected: 33.3, actual: 35.7, desc: "Капитальный ремонт компенсатора." },
        { id: "A-0760", segment: "ул. Щорса, д. 10 - 24", pipeId: "pipe-1", chamberId: "ТК1", imbalanceGcal: 1.9, imbalancePct: 5.8, risk: "low", status: "Новая", detected: "09.08 22:00", expected: 32.8, actual: 34.7, desc: "Плановый контроль вибрации арматуры." }
    ],

    init() {
        console.log("⚡ [SCADA Engine] Initializing THERMOTRACE SCADA Engine...");
        this._initBalanceHistory();
        this.startTelemetryLoop();
        this.renderAnomaliesTable();
    },

    renderAnomaliesTable(sortKey = "risk") {
        const tbody = document.getElementById("anomaliesTableBody");
        if (!tbody) return;

        let list = [...this.anomaliesList];
        if (sortKey === "risk") {
            const riskWeight = { high: 3, med: 2, low: 1 };
            list.sort((a, b) => riskWeight[b.risk] - riskWeight[a.risk]);
        } else if (sortKey === "imbalance") {
            list.sort((a, b) => b.imbalanceGcal - a.imbalanceGcal);
        }

        tbody.innerHTML = list.map(item => {
            let riskBadge = `<span class="tt-badge-risk high">Высокий</span>`;
            if (item.risk === "med") riskBadge = `<span class="tt-badge-risk med">Средний</span>`;
            if (item.risk === "low") riskBadge = `<span class="tt-badge-risk low">Низкий</span>`;

            let statusDot = `<span class="tt-status-dot"><i class="fa-solid fa-circle text-danger" style="font-size:8px;"></i> ${item.status}</span>`;
            if (item.status === "Подтверждена") {
                statusDot = `<span class="tt-status-dot"><i class="fa-solid fa-circle text-warning" style="font-size:8px;"></i> ${item.status}</span>`;
            } else if (item.status === "В работе") {
                statusDot = `<span class="tt-status-dot"><i class="fa-solid fa-circle text-primary" style="font-size:8px;"></i> ${item.status}</span>`;
            }

            const isSelected = this.selectedAnomaly && this.selectedAnomaly.id === item.id;

            return `
                <tr class="${isSelected ? 'selected' : ''}" onclick="window.KTEKScada.selectAnomaly('${item.id}')">
                    <td><strong>${item.id}</strong></td>
                    <td>${item.segment}</td>
                    <td class="text-danger font-bold">${item.imbalanceGcal}</td>
                    <td class="text-danger">+${item.imbalancePct}%</td>
                    <td>${riskBadge}</td>
                    <td>${statusDot}</td>
                    <td>${item.detected}</td>
                </tr>
            `;
        }).join('');
    },

    selectAnomaly(anomalyId) {
        const item = this.anomaliesList.find(a => a.id === anomalyId) || this.anomaliesList[0];
        this.selectedAnomaly = item;

        // Populate Side Drawer
        const titleEl = document.getElementById("drawerAnomalyTitle");
        const riskTag = document.getElementById("drawerAnomalyRiskTag");
        const locEl = document.getElementById("drawerAnomalyLocation");
        const descEl = document.getElementById("drawerAnomalyDesc");
        const expEl = document.getElementById("balExpected");
        const actEl = document.getElementById("balActual");
        const diffEl = document.getElementById("balDiff");

        if (titleEl) titleEl.textContent = `Аномалия ${item.id}`;
        if (riskTag) {
            riskTag.textContent = item.risk === 'high' ? 'Высокий риск' : (item.risk === 'med' ? 'Средний риск' : 'Низкий риск');
            riskTag.className = `tt-tag ${item.risk === 'high' ? 'danger' : 'warn'}`;
        }
        if (locEl) locEl.textContent = `${item.segment} | Магистраль ${item.pipeId}`;
        if (descEl) descEl.textContent = item.desc;
        if (expEl) expEl.innerHTML = `${item.expected} <small>Гкал/ч</small>`;
        if (actEl) actEl.innerHTML = `${item.actual} <small>Гкал/ч</small>`;
        if (diffEl) diffEl.innerHTML = `${item.imbalanceGcal} <small>Гкал/ч</small> (+${item.imbalancePct}%)`;

        // Open Side Drawer
        const drawer = document.getElementById("anomalyDrawer");
        if (drawer) drawer.classList.add("active");

        // Refresh Table Row Highlights
        this.renderAnomaliesTable();

        // Draw Trend Line Chart
        this.renderAnomalyChart(item);

        // Highlight pipe on Leaflet Map
        if (window.KTEKApp && window.KTEKApp.highlightAnomalyPipe) {
            window.KTEKApp.highlightAnomalyPipe(item.pipeId, item.chamberId);
        }
    },

    renderAnomalyChart(anomaly) {
        const canvas = document.getElementById("anomalyTrendCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.offsetWidth || 350;
        const h = canvas.offsetHeight || 110;
        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);

        // Draw background grid lines
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 0.5;
        for (let y = 20; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Generate synthetic hourly readings for 24 hours
        const pts = [];
        const baseVal = anomaly.expected || 23.4;
        const peakVal = anomaly.actual || 41.9;

        for (let i = 0; i <= 24; i++) {
            const x = (i / 24) * w;
            let val = baseVal + Math.sin(i / 2) * 2;
            if (i >= 9 && i <= 15) {
                // Peak anomaly wave
                val = baseVal + (peakVal - baseVal) * Math.sin(((i - 9) / 6) * Math.PI);
            }
            const y = h - ((val / (peakVal * 1.2)) * h);
            pts.push({ x, y, val });
        }

        // Fill area gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
        grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");

        ctx.beginPath();
        pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Highlight Peak Marker (index 12 ~ 09:40)
        const peakPt = pts[12];
        ctx.beginPath();
        ctx.arc(peakPt.x, peakPt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Peak Tooltip Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(`${anomaly.imbalanceGcal} Гкал/ч`, peakPt.x - 20, peakPt.y - 10);
    },

    _initBalanceHistory() {
        // Генерируем 24ч истории для временной шкалы
        const now = Date.now();
        for (let i = 0; i < 144; i++) {
            const t = now - (143 - i) * 600000; // 10мин интервал
            const isAnomaly = i > 64 && i < 80;
            this.balanceHistory.push({
                ts: t,
                balance: isAnomaly ? 78 + Math.random() * 8 : 90 + Math.random() * 6,
                gcal: isAnomaly ? 8.5 + Math.random() * 4 : 0.5 + Math.random() * 1.5
            });
        }
    },

    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        this.evaluateAllParameters();
    },

    startTelemetryLoop() {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => {
            this.simulateLiveTelemetryJitter();
            this.evaluateAllParameters();
            this._updateMnemoLive();
        }, 4000);
    },

    simulateLiveTelemetryJitter() {
        const data = window.KTEKData;
        if (!data) return;

        data.sources.forEach(src => {
            src.p1 = parseFloat(Math.max(5.0, Math.min(11.0, src.p1 + (Math.random() - 0.5) * 0.15)).toFixed(2));
            src.t1 = parseFloat(Math.max(65.0, Math.min(115.0, src.t1 + (Math.random() - 0.5) * 0.4)).toFixed(1));
        });

        data.chambers.forEach(c => {
            c.p1 = parseFloat(Math.max(4.0, Math.min(10.0, c.p1 + (Math.random() - 0.48) * 0.12)).toFixed(2));
            if (c.status === "emergency") {
                c.p1 = parseFloat((4.2 + Math.random() * 0.4).toFixed(2));
            }
        });

        // Jitter мнемосхема параметры
        const tree = this.mnemoTree.source;
        tree.gcal = parseFloat((125 + (Math.random() - 0.5) * 2).toFixed(1));
        tree.t1 = parseFloat((92 + (Math.random() - 0.5) * 0.5).toFixed(1));
        tree.p1 = parseFloat((5.8 + (Math.random() - 0.5) * 0.1).toFixed(1));
        if (tree.children[0]) {
            tree.children[0].gcalIn = parseFloat((124 + (Math.random() - 0.5) * 1.5).toFixed(1));
            tree.children[0].t1 = parseFloat((91 + (Math.random() - 0.5) * 0.4).toFixed(1));
        }

        window.dispatchEvent(new CustomEvent('ktek-telemetry-update', { detail: { timestamp: new Date() } }));
    },

    evaluateAllParameters() {
        const data = window.KTEKData;
        if (!data) return;
        this.activeAlerts = [];

        data.sources.forEach(src => {
            if (src.p1 < this.thresholds.p1Min) {
                this.activeAlerts.push({
                    id: `alert-src-p-${src.id}`, sourceId: src.id, name: src.name,
                    parameter: "Давление P1", value: `${src.p1} бар`,
                    threshold: `< ${this.thresholds.p1Min} бар`, severity: "critical",
                    msg: `Критическое падение давления на ${src.name}!`
                });
            }
            if (src.t1 < this.thresholds.t1Min) {
                this.activeAlerts.push({
                    id: `alert-src-t-${src.id}`, sourceId: src.id, name: src.name,
                    parameter: "Температура T1", value: `${src.t1} °C`,
                    threshold: `< ${this.thresholds.t1Min} °C`, severity: "warning",
                    msg: `Отклонение T1 на ${src.name}`
                });
            }
        });

        data.chambers.forEach(c => {
            if (c.status === "emergency" || c.p1 < 5.0) {
                this.activeAlerts.push({
                    id: `alert-ch-${c.id}`, sourceId: c.id, name: c.name,
                    parameter: "Гидрорежим", value: `${c.p1} бар`,
                    threshold: `< 5.0 бар`, severity: "critical",
                    msg: `Аварийный режим в ${c.id}!`
                });
            }
        });

        const alertBadge = document.getElementById('scadaAlertCount');
        if (alertBadge) {
            alertBadge.innerText = this.activeAlerts.length;
            alertBadge.className = this.activeAlerts.length > 0 ? "badge badge-red pulse" : "badge badge-ok";
        }
    },

    // =====================================================================
    // THERMOTRACE МНЕМОСХЕМА — рендер
    // =====================================================================
    renderMnemoschema() {
        const container = document.getElementById('mnemoschemaContent');
        if (!container) return;

        const data = window.KTEKData;
        const tree = this.mnemoTree.source;
        const tms = tree.children[0];
        const chambers = tms ? tms.children : [];

        // Считаем общий баланс
        const totalIn = tms ? tms.gcalIn : 0;
        const totalAnomalies = chambers.filter(c => c.status === 'anomaly' || c.status === 'suspect').length;
        const unlocated = chambers.find(c => c.status === 'anomaly') ? 8.2 : 0;
        const balancePct = (((totalIn - unlocated) / totalIn) * 100).toFixed(1);

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

        container.innerHTML = `
        <div class="thermotrace-wrap">

            <!-- TOP STATUS BAR -->
            <div class="tt-header">
                <div class="tt-brand">
                    <div class="tt-brand-logo">⊙</div>
                    <div>
                        <div class="tt-brand-name">THERMOTRACE</div>
                        <div class="tt-brand-sub">ЦЕНТР УПРАВЛЕНИЯ ТЕПЛОВЫМИ СЕТЯМИ</div>
                    </div>
                </div>

                <div class="tt-kpi-bar">
                    <div class="tt-kpi-card">
                        <div class="tt-kpi-label">ПОГОДА</div>
                        <div class="tt-kpi-main weather">☁ −12°C</div>
                        <div class="tt-kpi-sub">ветер 4 м/с</div>
                    </div>
                    <div class="tt-kpi-card">
                        <div class="tt-kpi-label">ТЕПЛОВОЙ БАЛАНС СЕТИ</div>
                        <div class="tt-kpi-main ok" id="tt-balance-pct">${balancePct}<span style="font-size:20px">%</span></div>
                        <div class="tt-kpi-sub">потока объяснено</div>
                    </div>
                    <div class="tt-kpi-card">
                        <div class="tt-kpi-label">НЕ ЛОКАЛИЗОВАНО</div>
                        <div class="tt-kpi-main danger" id="tt-unlocated">${unlocated} <span style="font-size:20px">Гкал/ч</span></div>
                        <div class="tt-kpi-sub-sparkline">
                            <svg width="80" height="20" id="tt-sparkline">
                                <polyline points="0,18 15,14 30,16 45,10 60,12 80,8" fill="none" stroke="#ef4444" stroke-width="1.5"/>
                            </svg>
                        </div>
                    </div>
                    <div class="tt-kpi-card">
                        <div class="tt-kpi-label">АКТИВНЫЕ АНОМАЛИИ</div>
                        <div class="tt-kpi-main danger" id="tt-anomaly-count">${totalAnomalies + this.activeAlerts.length}</div>
                        <div class="tt-kpi-sub-sparkline">
                            <svg width="80" height="20">
                                <polyline points="0,15 20,15 20,8 40,8 40,15 60,15 60,10 80,10" fill="none" stroke="#ef4444" stroke-width="1.5"/>
                            </svg>
                        </div>
                    </div>
                    <div class="tt-kpi-card tt-kpi-time">
                        <div class="tt-time" id="tt-clock">${timeStr}</div>
                        <div class="tt-date">${dateStr}</div>
                        <div class="tt-status-ok">● СИСТЕМА В НОРМЕ</div>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENT: TREE + ANOMALY DETAIL -->
            <div class="tt-main">

                <!-- LEFT: NAVIGATION SIDEBAR -->
                <div class="tt-sidebar">
                    <div class="tt-nav-item active" onclick="window.KTEKScada._switchMnemoView('network')">
                        <span class="tt-nav-icon">⊞</span> Обзор сети
                    </div>
                    <div class="tt-nav-item" onclick="window.KTEKScada._switchMnemoView('mnemo')">
                        <span class="tt-nav-icon">◫</span> Мнемосхема
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">△</span> Аномалии
                        <span class="tt-nav-badge danger">${totalAnomalies + this.activeAlerts.length}</span>
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">⚡</span> Отключения
                        <span class="tt-nav-badge warn">3</span>
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">▣</span> Объекты
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">📋</span> Паспорт сети
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">👷</span> Бригады
                        <span class="tt-nav-badge ok">5</span>
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">📊</span> Отчёты
                    </div>
                    <div class="tt-nav-item">
                        <span class="tt-nav-icon">⚙</span> Настройки
                    </div>
                </div>

                <!-- CENTER: NETWORK TREE DIAGRAM -->
                <div class="tt-diagram">

                    <!-- SOURCE: ТЭЦ-1 -->
                    <div class="tt-source-node" id="tt-src-node">
                        <div class="tt-source-icon">🏭</div>
                        <div class="tt-source-label">${tree.name}</div>
                        <div class="tt-source-val" id="tt-src-gcal">${tree.gcal} Гкал/ч</div>
                        <div class="tt-param-row">
                            <span id="tt-src-t1">↑ ${tree.t1}°C</span>
                            <span id="tt-src-p1">${tree.p1} bar</span>
                        </div>
                    </div>

                    <!-- ARROW DOWN -->
                    <div class="tt-flow-arrow-v" id="tt-flow-main">
                        <div class="tt-arrow-label" id="tt-main-gcal">${tms ? tms.gcalIn : '—'} Гкал/ч</div>
                        <div class="tt-flow-pipe-v supply"></div>
                    </div>

                    <!-- МАГИСТРАЛЬ ТМ-13 -->
                    <div class="tt-tm-node ${tms ? '' : 'hidden'}">
                        <div class="tt-tm-label">${tms ? tms.name : ''}</div>
                        <div class="tt-param-row">
                            <span class="tt-param-dot ok"></span>
                            <span id="tt-tm-t1">${tms ? tms.t1 : '—'}°C</span>
                            <span id="tt-tm-p1">${tms ? tms.p1 : '—'} bar</span>
                        </div>
                        <!-- Labels supply / return -->
                        <div class="tt-flow-labels">
                            <span class="tt-fl-supply">ПОДАЧА <span id="tt-tm-supply-t">${tms ? tms.t1 : '—'}°C</span></span>
                            <span class="tt-fl-return">ОБРАТКА <span>${tms ? tms.t2 : '—'}°C</span></span>
                        </div>
                    </div>

                    <!-- HORIZONTAL PIPE WITH CHAMBERS BELOW -->
                    <div class="tt-chambers-layout">
                        <!-- HORIZONTAL MAIN PIPE -->
                        <div class="tt-h-pipe-row">
                            <div class="tt-pipe-h supply" style="width:100%"></div>
                        </div>

                        <!-- CHAMBERS ROW -->
                        <div class="tt-chambers-row">
                            ${chambers.map(ch => this._renderChamber(ch)).join('')}
                        </div>

                        <!-- CONSUMERS ROW -->
                        <div class="tt-consumers-row">
                            ${chambers.map(ch => this._renderConsumers(ch)).join('')}
                        </div>
                    </div>

                </div>

                <!-- RIGHT: ANOMALY DETAIL PANEL -->
                <div class="tt-anomaly-panel" id="tt-anomaly-panel">
                    ${this._renderAnomalyDetail()}
                </div>
            </div>

            <!-- BOTTOM: TIMELINE -->
            <div class="tt-timeline">
                <div class="tt-timeline-header">
                    <span class="tt-timeline-date">${dateStr.split('.').slice(0,2).join(' августа 20')} 2026</span>
                    <div class="tt-timeline-controls">
                        <span>Параметр:</span>
                        <select class="tt-select" id="tt-timeline-param">
                            <option>Дисбаланс</option>
                            <option>T1 подача</option>
                            <option>P1 давление</option>
                        </select>
                        <button class="tt-tl-btn">1ч</button>
                        <button class="tt-tl-btn">6ч</button>
                        <button class="tt-tl-btn active">24ч</button>
                        <button class="tt-tl-btn">7д</button>
                    </div>
                </div>
                <div class="tt-timeline-chart">
                    <canvas id="tt-timeline-canvas" height="60"></canvas>
                </div>
            </div>

        </div>`;

        // Запускаем рендер графика и часы
        this._renderTimelineChart();
        this._startClock();
        this._attachChamberClicks();
    },

    _renderChamber(ch) {
        const statusClass = ch.status === 'anomaly' ? 'danger' : ch.status === 'suspect' ? 'warn-pulse' : ch.status === 'ok' ? 'ok' : 'ok';
        const dotColor = ch.status === 'anomaly' ? '#ef4444' : ch.status === 'suspect' ? '#f59e0b' : '#10b981';

        let anomalyBadge = '';
        if (ch.status === 'anomaly' && ch.anomalyDQ) {
            anomalyBadge = `<div class="tt-ch-anomaly">ΔQ ${ch.anomalyDQ}<br>(${ch.anomalyPct})</div>`;
        }
        if (ch.status === 'suspect' && ch.gcalLoss) {
            anomalyBadge = `<div class="tt-ch-suspect">
                <div style="font-size:22px; margin-bottom:4px;">❓❓❓</div>
                ПОДОЗРЕНИЕ НА<br>НЕУЧТЁННОЕ<br>ОТВЕТВЛЕНИЕ<br>
                <strong>${ch.gcalLoss} Гкал/ч<br>(${ch.lossPct})</strong>
            </div>`;
        }

        return `
        <div class="tt-chamber" onclick="window.KTEKScada._selectChamber('${ch.id}')" id="tt-ch-${ch.id.replace(/\./g,'_')}">
            <div class="tt-ch-v-pipe"></div>
            <div class="tt-ch-card ${ch.status}">
                <div class="tt-ch-header">
                    <span class="tt-ch-dot" style="background:${dotColor}"></span>
                    <span class="tt-ch-name">${ch.name}</span>
                </div>
                <div class="tt-ch-params">
                    <div>P <span class="val">${ch.p1}°C</span></div>
                    <div>⬆ <span class="val">${ch.p1bar} bar</span></div>
                    <div>O <span class="val">${ch.p2}°C</span></div>
                    <div>⬇ <span class="val">${ch.p2bar} bar</span></div>
                </div>
                <div class="tt-ch-flow">Расход <span class="val">${ch.flow} т/ч</span></div>
                ${anomalyBadge}
            </div>
        </div>`;
    },

    _renderConsumers(ch) {
        if (!ch.consumers || ch.consumers.length === 0) {
            return `<div class="tt-consumers-col"></div>`;
        }
        return `
        <div class="tt-consumers-col">
            ${ch.consumers.map(c => `
                <div class="tt-consumer">
                    <div class="tt-consumer-v-pipe"></div>
                    <div class="tt-consumer-icon">🏢</div>
                    <div class="tt-consumer-label">${c} Гкал/ч</div>
                    <div class="tt-consumer-status">норма</div>
                </div>
            `).join('')}
        </div>`;
    },

    _renderAnomalyDetail() {
        const anomalyFound = this.mnemoTree.source.children[0]?.children.find(c => c.status === 'anomaly');
        if (!anomalyFound) return `<div class="tt-no-anomaly">✅ Аномалий не обнаружено</div>`;

        return `
        <div class="tt-anomaly-badge">
            <span class="tt-anomaly-dot"></span> АНОМАЛИЯ А-1038
            <span class="tt-confidence">94% <span style="font-size:10px">Уверенность</span></span>
        </div>

        <div class="tt-anomaly-section">
            <div class="tt-anomaly-title">ДЕТАЛИ</div>
            <table class="tt-detail-table">
                <tr><td>Участок</td><td class="accent">ТК13.06 – ТК13.08</td></tr>
                <tr><td>Обнаружено</td><td>10.08.2026 06:37</td></tr>
                <tr><td>Длительность</td><td>17 ч 42 мин</td></tr>
                <tr><td>Источник</td><td>ТЭЦ-1</td></tr>
            </table>
        </div>

        <div class="tt-anomaly-section">
            <div class="tt-anomaly-title">БАЛАНС УЧАСТКА</div>
            <table class="tt-detail-table">
                <tr><td>Ожидаемый расход</td><td>58.9 Гкал/ч</td></tr>
                <tr><td>Фактический расход</td><td>71.7 Гкал/ч</td></tr>
                <tr><td>Дисбаланс</td><td class="danger">+12.8 Гкал/ч</td></tr>
                <tr><td>Отклонение</td><td class="danger">+21.9%</td></tr>
            </table>
        </div>

        <div class="tt-anomaly-section">
            <div class="tt-anomaly-title">ВОЗМОЖНЫЕ ПРИЧИНЫ</div>
            <div class="tt-cause-bar"><div class="tt-cause-fill" style="width:72%"></div><span>Неучтённый потребитель</span><span class="cause-pct">72%</span></div>
            <div class="tt-cause-bar"><div class="tt-cause-fill warn" style="width:18%"></div><span>Ошибка приборов учёта</span><span class="cause-pct">18%</span></div>
            <div class="tt-cause-bar"><div class="tt-cause-fill ok" style="width:10%"></div><span>Утечка теплоносителя</span><span class="cause-pct">10%</span></div>
        </div>

        <div class="tt-anomaly-section">
            <div class="tt-anomaly-title">ДЕЙСТВИЯ</div>
            <button class="tt-action-btn danger" onclick="window.KTEKApp && window.KTEKApp.showToast && window.KTEKApp.showToast('Задание создано бригаде!', 'ok')">
                ⚡ Создать задание бригаде
            </button>
            <button class="tt-action-btn warn" style="margin-top:8px">
                ◻ Смоделировать отключение
            </button>
            <button class="tt-action-btn ghost" style="margin-top:8px" onclick="document.querySelector('[data-tab=map]')?.click()">
                📍 Открыть на карте
            </button>
        </div>`;
    },

    _renderTimelineChart() {
        const canvas = document.getElementById('tt-timeline-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.offsetWidth || 900;
        const h = 60;
        canvas.width = w;
        canvas.height = h;

        const data = this.balanceHistory;
        const maxVal = 100;
        const pts = data.map((d, i) => [
            (i / (data.length - 1)) * w,
            h - (d.balance / maxVal) * h
        ]);

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(2, 132, 199, 0.3)');
        grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

        ctx.beginPath();
        pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Anomaly marker at 06:37 (≈ index 40)
        const anomalyX = (40 / data.length) * w;
        ctx.beginPath();
        ctx.moveTo(anomalyX, 0); ctx.lineTo(anomalyX, h);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('06:37', anomalyX + 3, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Аномалия обнаружена', anomalyX + 3, 24);
    },

    _startClock() {
        if (this._clockTimer) clearInterval(this._clockTimer);
        this._clockTimer = setInterval(() => {
            const el = document.getElementById('tt-clock');
            if (el) el.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            else clearInterval(this._clockTimer);
        }, 1000);
    },

    _updateMnemoLive() {
        const tree = this.mnemoTree.source;
        const tms = tree.children[0];
        const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        safeSet('tt-src-gcal', `${tree.gcal} Гкал/ч`);
        safeSet('tt-src-t1', `↑ ${tree.t1}°C`);
        safeSet('tt-src-p1', `${tree.p1} bar`);
        if (tms) {
            safeSet('tt-main-gcal', `${tms.gcalIn} Гкал/ч`);
            safeSet('tt-tm-t1', `${tms.t1}°C`);
            safeSet('tt-tm-supply-t', `${tms.t1}°C`);
        }
    },

    _selectChamber(id) {
        document.querySelectorAll('.tt-chamber').forEach(el => el.classList.remove('selected'));
        const el = document.getElementById(`tt-ch-${id.replace(/\./g,'_')}`);
        if (el) el.classList.add('selected');
    },

    _switchMnemoView(view) {
        document.querySelectorAll('.tt-nav-item').forEach(el => el.classList.remove('active'));
    },

    _attachChamberClicks() {},

    // =====================================================================
    // Analytics Helper
    // =====================================================================
    getDistrictAnalytics(districtFilter = "all") {
        const data = window.KTEKData;
        if (!data || !data.houses) return null;

        const filteredHouses = districtFilter === "all" ? data.houses : data.houses.filter(h => h.district === districtFilter);
        let totalHeatGcalH = 0, totalWaterFlowTн = 0, meteredHouses = 0, unmeteredHouses = 0;
        const anomalies = { overheats: [], underheats: [], leaks: [], unmeteredList: [] };

        filteredHouses.forEach(h => {
            const t = h.telemetry || {};
            totalHeatGcalH += (t.qGcal || h.load || 0.15);
            totalWaterFlowTн += (t.g1 || 10.0);

            if (h.meter && h.meter.hasMeter) {
                meteredHouses++;
                if (t.t2 && t.t2 >= 64.0) anomalies.overheats.push({ house: h, type: "Перегрев", val: `${t.t2} °C`, severity: "high", action: "Настройка элеватора" });
                if (t.g1 && t.g2 && (t.g1 - t.g2) >= 1.2) anomalies.leaks.push({ house: h, type: "Утечка", val: `ΔG = ${(t.g1 - t.g2).toFixed(2)} т/ч`, severity: "critical", action: "Срочный выезд" });
                if (t.t1 && t.t1 < 78.0) anomalies.underheats.push({ house: h, type: "Недогрев", val: `${t.t1} °C`, severity: "medium", action: "Проверка гидравлики" });
            } else {
                unmeteredHouses++;
                anomalies.unmeteredList.push(h);
            }
        });

        return {
            district: districtFilter, totalHouses: filteredHouses.length,
            meteredHouses, unmeteredHouses,
            meterCoveragePct: filteredHouses.length ? Math.round((meteredHouses / filteredHouses.length) * 100) : 0,
            totalHeatGcalH: parseFloat(totalHeatGcalH.toFixed(3)),
            totalWaterFlowTн: parseFloat(totalWaterFlowTн.toFixed(1)),
            totalAnomalyCount: anomalies.overheats.length + anomalies.leaks.length + anomalies.underheats.length,
            anomalies
        };
    }
};
