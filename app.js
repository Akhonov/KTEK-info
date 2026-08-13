/**
 * KTEK SCADA Digital Twin 2.0 - Main Application Logic
 * Integrates GIS Map (Apple Light), Pipe Passports, Building Digital Passports,
 * Interactive Chamber Valve Cut-off Engine, District Heat Meter Analytics, and Equipment Fleet.
 */

window.KTEKApp = {
    map: null,
    layers: {
        sources: null,
        chambers: null,
        pipelines: null,
        houses: null,
        vehicles: null,
        utilities: null,
        outageHighlight: null
    },
    activeTab: "map",
    isScenarioMode: false,
    selectedIncident: null,
    vehicleAnimationTimer: null,

    async init() {
        console.log("🚀 [KTEK App] Starting KTEK SCADA Digital Twin 2.0...");
        
        // 1. Initialize dataset
        await window.KTEKData.init();
        
        // 2. Initialize engines
        window.KTEKTopology.init();
        window.KTEKScada.init();
        if (window.KTEKFieldTablet) window.KTEKFieldTablet.init();
        if (window.KTEKAdminNoCode) window.KTEKAdminNoCode.init();

        // 3. Initialize Light GIS Map (Apple Light aesthetic style)
        this.initMap();

        // 4. Render GIS Layers
        this.renderAllLayers();

        // 5. Setup UI Event Listeners & Flow Triggers
        this.setupEventListeners();

        // 6. Refresh summary KPI badges
        this.refreshDataViews();

        // 7. Start live vehicle simulation
        this.startVehicleAnimation();

        console.log("✨ [KTEK App] System fully operational!");
    },

    initMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Centered around Kostanay city center
        this.map = L.map('map', {
            center: [53.205, 63.615],
            zoom: 13,
            zoomControl: true
        });

        // CartoDB Voyager Tile Layer (Ultra-clean Light Apple Maps style)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; ГКП «КТЭК» SCADA Digital Twin | Apple Maps Light Style',
            maxZoom: 19
        }).addTo(this.map);

        // Create Layer Groups
        this.layers.sources = L.layerGroup().addTo(this.map);
        this.layers.pipelines = L.layerGroup().addTo(this.map);
        this.layers.chambers = L.layerGroup().addTo(this.map);
        this.layers.houses = L.layerGroup().addTo(this.map);
        this.layers.vehicles = L.layerGroup().addTo(this.map);
        this.layers.utilities = L.layerGroup(); // hidden by default, toggleable
        this.layers.outageHighlight = L.layerGroup().addTo(this.map);
    },

    renderAllLayers() {
        const data = window.KTEKData;
        if (!data || !this.map) return;

        // Clear existing layers
        Object.values(this.layers).forEach(layer => layer && layer.clearLayers());

        // 1. Render Pipelines (Dynamic Flow & Cut-off States)
        data.pipelines.forEach(pipe => {
            const fromNode = data.sources.find(s => s.id === pipe.from) || data.chambers.find(c => c.id === pipe.from);
            const toNode = data.chambers.find(c => c.id === pipe.to) || data.sources.find(s => s.id === pipe.to);

            if (fromNode && toNode) {
                let color = pipe.isMagistral ? "#0284c7" : "#0284c7";
                let dashArray = pipe.isMagistral ? null : "6, 6";
                let className = "pipe-flow-active";

                if (pipe.isCutOff) {
                    color = "#64748b";
                    dashArray = "8, 8";
                    className = "pipe-cutoff";
                } else if (pipe.status === "emergency") {
                    color = "#ef4444";
                    className = "";
                } else if (pipe.status === "warning") {
                    color = "#f59e0b";
                }

                const line = L.polyline([[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]], {
                    color: color,
                    weight: pipe.isMagistral ? 7 : 4,
                    opacity: pipe.isCutOff ? 0.5 : 0.9,
                    dashArray: dashArray,
                    className: className
                });

                // Pipe Passport Click Event
                line.on('click', () => {
                    this.openPipePassportDrawer(pipe.id);
                });

                const risk = window.KTEKTopology.calculatePredictiveRiskScore(pipe);

                line.bindPopup(`
                    <div class="ktek-popup">
                        <h4><i class="fa fa-pipeline"></i> ${pipe.name}</h4>
                        <p><strong>Статус потока:</strong> ${pipe.isCutOff ? '<span class="status-tag danger">❌ НЕТ ПОТОКА (ПЕРЕКРЫТО)</span>' : '<span class="status-tag ok">🟢 ГОРЯЧИЙ ПОТОК</span>'}</p>
                        <p><strong>Тип:</strong> ${pipe.isMagistral ? 'Тепловая Магистраль' : 'Внутриквартальная'}</p>
                        <p><strong>Диаметр:</strong> ф${pipe.diameter} мм | <strong>Длина:</strong> ${pipe.lengthM} м</p>
                        <p><strong>Год прокладки:</strong> ${pipe.year} (${2026 - pipe.year} лет)</p>
                        <hr/>
                        <button class="btn btn-primary btn-sm" onclick="window.KTEKApp.openPipePassportDrawer('${pipe.id}')">
                            📜 Открыть Паспорт Трубы
                        </button>
                    </div>
                `);

                this.layers.pipelines.addLayer(line);
            }
        });

        // 2. Render Heat Sources (ТЭЦ / БМК)
        data.sources.forEach(src => {
            // SVG icons per type — NO FontAwesome (renders as shuriken in divIcon!)
            const svgByType = {
                tets: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 22V12l8-8 8 8v10H4zm2-2h12V13l-6-6-6 6v7zm3-5h2v5H9v-5zm4 0h2v5h-2v-5zm-4-3h6v2H9v-2z"/></svg>`,
                rk:   `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
                bmk:  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 8C8 10 5.9 16.2 5 20l1.5.5c.5-1.9 2.5-6.3 9.5-7.5L14 17h7l-4-9z"/></svg>`
            };
            const svgHtml = svgByType[src.type] || svgByType.rk;
            const shortId = src.id.replace('BMK','').replace('TETs','T-').replace('RK','RK');

            const icon = L.divIcon({
                className: 'custom-source-icon',
                html: `<div class="source-pin ${src.type}">${svgHtml}<span>${shortId}</span></div>`,
                iconSize: [52, 52],
                iconAnchor: [26, 26],
                popupAnchor: [0, -28]
            });

            const marker = L.marker([src.lat, src.lng], { icon: icon });
            marker.bindPopup(`
                <div class="ktek-popup">
                    <h3><i class="fa fa-fire"></i> ${src.name}</h3>
                    <p><strong>Установленная мощность:</strong> ${src.powerGcal} Гкал/ч</p>
                    <hr/>
                    <div class="telemetry-grid">
                        <div><span>P1 (Подача):</span> <strong>${src.p1} бар</strong></div>
                        <div><span>P2 (Обратка):</span> <strong>${src.p2} бар</strong></div>
                        <div><span>T1 (Подача):</span> <strong>${src.t1} °C</strong></div>
                        <div><span>T2 (Обратка):</span> <strong>${src.t2} °C</strong></div>
                        <div><span>Расход G:</span> <strong>${src.flowG} т/ч</strong></div>
                    </div>
                </div>
            `);
            this.layers.sources.addLayer(marker);
        });


        // 3. Render Thermal Chambers (ТК) with Valve Controls
        data.chambers.forEach(c => {
            let badgeClass = c.isClosed ? "danger" : "ok";
            if (c.status === "warning") badgeClass = "warn";
            if (c.status === "emergency") badgeClass = "danger";
            if (c.status === "repair") badgeClass = "purple";

            const icon = L.divIcon({
                className: 'custom-chamber-icon',
                html: `<div class="chamber-pin ${badgeClass}" title="${c.name}">${c.isClosed ? '&#128274; ' + c.id : c.id}</div>`,
                iconSize: [42, 24],
                iconAnchor: [21, 12],
                popupAnchor: [0, -14]
            });

            const marker = L.marker([c.lat, c.lng], { icon: icon });
            
            // Click Handler -> Opens Chamber Card Drawer
            marker.on('click', () => {
                this.openChamberCardDrawer(c.id);
            });

            marker.bindPopup(`
                <div class="ktek-popup">
                    <h4><i class="fa fa-cubes"></i> ${c.name}</h4>
                    <p><strong>Состояние задвижек:</strong> ${c.isClosed ? '<span class="status-tag danger">🔒 ЗАКРЫТА (ПЕРЕКРЫТА)</span>' : '<span class="status-tag ok">🟢 ОТКРЫТА</span>'}</p>
                    <p><strong>P1:</strong> ${c.p1} бар | <strong>P2:</strong> ${c.p2} бар | <strong>T1:</strong> ${c.t1} °C</p>
                    <hr/>
                    <button class="btn btn-warning btn-sm" onclick="window.KTEKApp.toggleChamberValve('${c.id}')">
                        ${c.isClosed ? '🟢 Открыть задвижку' : '❌ Перекрыть камеру'}
                    </button>
                    <button class="btn btn-primary btn-sm" style="margin-top:6px;" onclick="window.KTEKApp.openChamberCardDrawer('${c.id}')">
                        📑 Карточка ТК и Осмотры
                    </button>
                </div>
            `);
            this.layers.chambers.addLayer(marker);
        });


        // 4. Render Consumer Buildings
        const displayHouses = data.houses.slice(0, 500);
        displayHouses.forEach(h => {
            let color = "#10b981";
            if (h.isDisconnected) color = "#64748b"; // Cut off
            else if (h.status === "emergency") color = "#ef4444";
            else if (h.meter && h.meter.status === "anomaly_overheat") color = "#f59e0b";

            const circle = L.circleMarker([h.lat, h.lng], {
                radius: h.isDisconnected ? 3 : 5,
                color: color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 1
            });

            circle.on('click', () => {
                this.openHousePassportDrawer(h.id);
            });

            circle.bindPopup(`
                <div class="ktek-popup">
                    <h5><i class="fa fa-building"></i> Ул. ${h.street}, д. ${h.house}</h5>
                    <p><strong>Статус тепла:</strong> ${h.isDisconnected ? '<span class="status-tag danger">❌ ОТКЛЮЧЕНО</span>' : '<span class="status-tag ok">🟢 ОТАПЛИВАЕТСЯ</span>'}</p>
                    <p><strong>ТК / Район:</strong> ${h.tk || 'ТК-1'} | ${h.district}</p>
                    <p><strong>УУТЭ:</strong> ${h.meter ? h.meter.model : 'Без прибора'}</p>
                    <hr/>
                    <button class="btn btn-primary btn-sm" onclick="window.KTEKApp.openHousePassportDrawer('${h.id}')">
                        🏢 Цифровой Паспорт Дома
                    </button>
                </div>
            `);
            this.layers.houses.addLayer(circle);
        });

        // 5. Render Emergency Vehicle Fleet
        data.vehicles.forEach(v => {
            const icon = L.divIcon({
                className: 'custom-vehicle-icon',
                html: `<div class="vehicle-pin"><i class="fa fa-truck-medical"></i></div>`,
                iconSize: [28, 28]
            });
            const marker = L.marker([v.lat, v.lng], { icon: icon });
            marker.bindPopup(`
                <div class="ktek-popup">
                    <h4><i class="fa fa-truck"></i> ${v.name}</h4>
                    <p><strong>Экипаж / Мастер:</strong> ${v.driver}</p>
                    <p><strong>Статус:</strong> ${v.status === 'en_route' ? 'Спешит на объект 🚨' : 'В работе 🛠️'}</p>
                    <p><strong>Направление:</strong> ${v.target}</p>
                </div>
            `);
            this.layers.vehicles.addLayer(marker);
        });
    },

    /**
     * Open Pipe Passport Slide-Over Drawer
     */
    openPipePassportDrawer(pipeId) {
        const data = window.KTEKData;
        const pipe = data.pipelines.find(p => p.id === pipeId) || data.pipelines[0];
        const drawer = document.getElementById('pipePassportDrawer');
        const container = document.getElementById('pipePassportContent');
        if (!drawer || !container) return;

        const risk = window.KTEKTopology.calculatePredictiveRiskScore(pipe);

        container.innerHTML = `
            <div class="passport-card-item" style="background:#e0f2fe; border-color:#7dd3fc;">
                <h4 style="margin:0; color:#0369a1;"><i class="fa fa-pipeline"></i> ${pipe.name}</h4>
                <p style="margin:4px 0 0 0; font-size:12px; color:#0284c7;">Идентификатор: ${pipe.id} | Тип: ${pipe.isMagistral ? 'Магистраль' : 'Внутриквартальная'}</p>
            </div>

            <div class="passport-grid">
                <div class="passport-card-item">
                    <label>Диаметр трубы</label>
                    <span>ф${pipe.diameter} мм</span>
                </div>
                <div class="passport-card-item">
                    <label>Длина участка</label>
                    <span>${pipe.lengthM} метров</span>
                </div>
                <div class="passport-card-item">
                    <label>Год прокладки</label>
                    <span>${pipe.year} г. (${2026 - pipe.year} лет)</span>
                </div>
                <div class="passport-card-item">
                    <label>Глубина заложения</label>
                    <span>${pipe.depthM || 2.2} м</span>
                </div>
                <div class="passport-card-item">
                    <label>Материал & Изоляция</label>
                    <span>${pipe.material || 'Сталь 20 ППУ'}</span>
                </div>
                <div class="passport-card-item">
                    <label>Износ изоляции</label>
                    <span style="color:${pipe.wearPct > 60 ? '#ef4444' : '#10b981'}">${pipe.wearPct}%</span>
                </div>
            </div>

            <div class="passport-card-item">
                <label>AI Индекс риска порывов</label>
                <div class="risk-bar-wrapper" style="margin-top:6px;">
                    <div class="risk-bar" style="width:${risk.score}%; background:${risk.color};"></div>
                    <span>${risk.score}% (${risk.category.toUpperCase()})</span>
                </div>
                <p style="font-size:11px; margin-top:6px; color:#64748b;">${risk.recommendedAction}</p>
            </div>

            <h4 style="margin-top:10px; font-size:13px;"><i class="fa fa-history"></i> Журнал аварийных порывов на участке:</h4>
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr><th>Дата</th><th>Описание дефекта</th><th>Статус</th></tr>
                    </thead>
                    <tbody>
                        ${(pipe.historyLeaks || []).map(l => `
                            <tr>
                                <td>${l.date}</td>
                                <td>${l.description}</td>
                                <td><span class="status-tag ok">${l.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="display:flex; gap:10px; margin-top:auto;">
                <button class="btn btn-danger" style="flex:1;" onclick="window.KTEKApp.triggerOutageAnalysis('${pipe.id}')">
                    🚨 Моделировать порыв
                </button>
            </div>
        `;

        drawer.classList.add('active');
    },

    /**
     * Open Building Digital Passport Drawer
     */
    openHousePassportDrawer(houseId) {
        const data = window.KTEKData;
        const h = data.houses.find(item => item.id === houseId || item.id === parseInt(houseId)) || data.houses[0];
        const drawer = document.getElementById('housePassportDrawer');
        const container = document.getElementById('housePassportContent');
        if (!drawer || !container) return;

        const t = h.telemetry || {};

        container.innerHTML = `
            <div class="passport-card-item" style="background:#f0fdf4; border-color:#86efac;">
                <h4 style="margin:0; color:#15803d;"><i class="fa fa-building"></i> Ул. ${h.street}, дом ${h.house}</h4>
                <p style="margin:4px 0 0 0; font-size:12px; color:#166534;">Район: ${h.district} | Привязка к узлу: ${h.tk || 'ТК-1'}</p>
            </div>

            <div class="passport-grid">
                <div class="passport-card-item">
                    <label>Год постройки</label>
                    <span>${h.buildYear || 1978} г.</span>
                </div>
                <div class="passport-card-item">
                    <label>Этажность / Квартир</label>
                    <span>${h.floors || 5} эт. / ${h.flats || 40} кв.</span>
                </div>
                <div class="passport-card-item">
                    <label>Отапливаемая площадь</label>
                    <span>${h.areaM2 || 3200} м²</span>
                </div>
                <div class="passport-card-item">
                    <label>Жителей в доме</label>
                    <span>${h.residents || 120} человек</span>
                </div>
            </div>

            <div class="passport-card-item">
                <label>Прибор Учета Тепловой Энергии (УУТЭ)</label>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <strong>Модель: ${h.meter ? h.meter.model : '—'}</strong>
                    <span class="status-tag ${h.meter && h.meter.hasMeter ? 'ok' : 'danger'}">${h.meter && h.meter.hasMeter ? 'ПОВЕРЕН' : 'БЕЗ УУТЭ'}</span>
                </div>
                <p style="font-size:11px; margin-top:4px; color:#64748b;">Дата поверки: ${h.meter ? h.meter.verifyDate : '—'}</p>
            </div>

            <h4 style="margin-top:8px; font-size:13px;"><i class="fa fa-gauge"></i> Телеметрия СКАДА (Текущий режим):</h4>
            <div class="passport-grid">
                <div class="passport-card-item">
                    <label>T1 (Подача)</label>
                    <span style="color:#0284c7;">${t.t1 || 88} °C</span>
                </div>
                <div class="passport-card-item">
                    <label>T2 (Обратка)</label>
                    <span style="color:${t.t2 > 64 ? '#ef4444' : '#10b981'};">${t.t2 || 54} °C</span>
                </div>
                <div class="passport-card-item">
                    <label>Давление P1 / P2</label>
                    <span>${t.p1 || 7.5} / ${t.p2 || 3.1} бар</span>
                </div>
                <div class="passport-card-item">
                    <label>Нагрузка Q</label>
                    <span style="color:#f59e0b;">${t.qGcal || h.load || 0.2} Гкал/ч</span>
                </div>
            </div>

            <h4 style="margin-top:10px; font-size:13px;"><i class="fa fa-clock-rotate-left"></i> История аварий и отключений по дому:</h4>
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr><th>Дата</th><th>Тип события</th><th>Причина / Статус</th></tr>
                    </thead>
                    <tbody>
                        ${(h.incidentsHistory || []).map(inc => `
                            <tr>
                                <td>${inc.date}</td>
                                <td>${inc.type}</td>
                                <td>${inc.cause}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        drawer.classList.add('active');
    },

    /**
     * Open Thermal Chamber Card & Interactive Valve Cut-off Switch Drawer
     */
    openChamberCardDrawer(chamberId) {
        const data = window.KTEKData;
        const c = data.chambers.find(item => item.id === chamberId) || data.chambers[0];
        const drawer = document.getElementById('chamberCardDrawer');
        const container = document.getElementById('chamberCardContent');
        if (!drawer || !container) return;

        container.innerHTML = `
            <div class="passport-card-item" style="background:#fef3c7; border-color:#fde047;">
                <h4 style="margin:0; color:#92400e;"><i class="fa fa-cubes"></i> ${c.name}</h4>
                <p style="margin:4px 0 0 0; font-size:12px; color:#b45309;">Район: ${c.district} | Источник: ${c.source}</p>
            </div>

            <!-- INTERACTIVE HYDRAULIC VALVE CUT-OFF BOX -->
            <div class="valve-control-box ${c.isClosed ? 'closed' : ''}">
                <div class="valve-status-banner">
                    <span>ГИДРАВЛИЧЕСКИЙ РЕЖИМ:</span>
                    <span class="status-tag ${c.isClosed ? 'danger' : 'ok'}">
                        ${c.isClosed ? '❌ ПЕРЕКРЫТО (ЗАКРЫТА)' : '🟢 ОТКРЫТО (ПОТОК)'}
                    </span>
                </div>
                <p style="font-size:12px; color:#64748b;">
                    ${c.isClosed 
                        ? 'Задвижка перекрыта. Вода дальше по трубам НЕ ПОЙДЕТ. Подключенные дома обесточены.' 
                        : 'Задвижки открыты. Горячий теплоноситель циркулирует в штатном режиме.'}
                </p>

                <button class="valve-toggle-btn ${c.isClosed ? 'btn-open-valve' : 'btn-close-valve'}" 
                        onclick="window.KTEKApp.toggleChamberValve('${c.id}')">
                    ${c.isClosed 
                        ? '<i class="fa fa-lock-open"></i> ОТКРЫТЬ КАМЕРУ (ПОДАТЬ ВОДУ ДАЛЬШЕ)' 
                        : '<i class="fa fa-power-off"></i> ПЕРЕКРЫТЬ КАМЕРУ (ЗАКРЫТЬ ЗАДВИЖКУ)'}
                </button>
            </div>

            <h4 style="margin-top:10px; font-size:13px;"><i class="fa fa-list-check"></i> Запорная арматура в камере:</h4>
            <ul>
                ${(c.valves || []).map(v => `
                    <li style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                        <span>${v.name}</span>
                        <strong style="color:${v.isClosed ? '#ef4444' : '#10b981'};">${v.isClosed ? 'ЗАКРЫТА' : 'ОТКРЫТА'}</strong>
                    </li>
                `).join('')}
            </ul>

            <h4 style="margin-top:10px; font-size:13px;"><i class="fa fa-clipboard-check"></i> История технического осмотра камеры:</h4>
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr><th>Дата</th><th>Инспектор</th><th>Результат / Замечания</th></tr>
                    </thead>
                    <tbody>
                        ${(c.inspections || []).map(insp => `
                            <tr>
                                <td>${insp.date}</td>
                                <td>${insp.inspector}</td>
                                <td>${insp.notes}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        drawer.classList.add('active');
    },

    /**
     * Interactive Chamber Valve Cut-off Toggle Action
     */
    toggleChamberValve(chamberId) {
        const summary = window.KTEKTopology.toggleChamberCutoff(chamberId);
        if (!summary) return;

        // Re-render Chamber Drawer if open
        const chamber = window.KTEKData.chambers.find(c => c.id === chamberId);
        if (chamber) {
            this.openChamberCardDrawer(chamberId);
        }

        // Show Notification Toast
        this.showNotification(
            chamber.isClosed 
                ? `❌ Камера ${chamberId} ПЕРЕКРЫТА! Вода дальше не идет. Отключено домов: ${summary.disconnectedHousesCount}` 
                : `🟢 Камера ${chamberId} ОТКРЫТА! Возобновлена циркуляция воды.`,
            chamber.isClosed ? "danger" : "success"
        );
    },

    startVehicleAnimation() {
        if (this.vehicleAnimationTimer) clearInterval(this.vehicleAnimationTimer);
        this.vehicleAnimationTimer = setInterval(() => {
            const data = window.KTEKData;
            if (!data || !data.vehicles) return;

            data.vehicles.forEach(v => {
                if (v.status === "en_route" || v.status === "patrol") {
                    v.lat += (Math.random() - 0.48) * 0.0003;
                    v.lng += (Math.random() - 0.48) * 0.0003;
                }
            });
            this.renderAllLayers();
        }, 5000);
    },

    triggerOutageAnalysis(targetId) {
        const result = window.KTEKTopology.traceOutageZone(targetId, this.isScenarioMode);
        this.renderOutageDrawer(result);
    },

    renderOutageDrawer(result) {
        const drawer = document.getElementById('outageDrawer');
        if (!drawer) return;

        drawer.classList.add('open');
        drawer.innerHTML = `
            <div class="drawer-header">
                <h3>🚨 Зона Порыва / Аварии: ${result.targetId}</h3>
                <button class="btn-close" onclick="document.getElementById('outageDrawer').classList.remove('open')">&times;</button>
            </div>
            <div class="drawer-body">
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <span class="kpi-label">Отключено домов</span>
                        <span class="kpi-val danger">${result.totalHousesCount}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Потеря калорий энергии</span>
                        <span class="kpi-val warning">${result.totalLostHeatGcal} Гкал/ч</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Затронуто жильцов</span>
                        <span class="kpi-val">${result.totalPopulation} чел.</span>
                    </div>
                </div>

                <h4><i class="fa fa-list-ol"></i> Список затронутых объектов:</h4>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr><th>Адрес</th><th>ТК</th><th>Нагрузка (Гкал/ч)</th></tr>
                        </thead>
                        <tbody>
                            ${result.affectedHouses.slice(0, 25).map(h => `
                                <tr>
                                    <td>Ул. ${h.street}, д. ${h.house}</td>
                                    <td>${h.tk}</td>
                                    <td>${h.load || 0.2} Гкал/ч</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        // Tab routing
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.tab;
                this.switchTab(target);
            });
        });

        // Search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });
        }

        // Global Event for Hydraulic Flow Updates
        window.addEventListener('ktek-flow-updated', (e) => {
            const summary = e.detail;
            this.renderAllLayers();
            
            const closedChambersEl = document.getElementById('closedChambersCount');
            if (closedChambersEl) closedChambersEl.innerText = summary.closedChambersCount;

            const totalDefectsEl = document.getElementById('totalDefectsCount');
            if (totalDefectsEl) totalDefectsEl.innerText = summary.disconnectedHousesCount;

            const totalLostHeatEl = document.getElementById('totalLostHeatCount');
            if (totalLostHeatEl) totalLostHeatEl.innerText = summary.lostGcalH.toFixed(3);
        });
    },

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));

        const activeBtn = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        const activePanel = document.getElementById(`tab-${tabName}`);

        if (activeBtn) activeBtn.classList.add('active');
        if (activePanel) activePanel.classList.add('active');

        if (tabName === "map" && this.map) {
            setTimeout(() => this.map.invalidateSize(), 200);
        } else if (tabName === "mnemo") {
            this.renderMnemoschemaTab();
        } else if (tabName === "passports") {
            this.renderPassportsTab();
        } else if (tabName === "analytics") {
            this.renderAnalyticsTab();
        } else if (tabName === "equipment") {
            this.renderEquipmentTab();
        } else if (tabName === "predictive") {
            this.renderPredictiveAnalyticsView();
        }
    },

    /**
     * THERMOTRACE-style Mnemoschema — Heat Network Tree Viewer
     * Shows hierarchical heat flow: Source -> TM -> TK groups -> Buildings
     * Right panel: active anomaly details, balance, causes, actions.
     * Bottom: 24h timeline with anomaly markers.
     */
    renderMnemoschemaTab() {
        const container = document.getElementById('mnemoschemaContent');
        if (!container) return;

        // Live clock updater
        const now = new Date();
        const timeStr = now.toTimeString().slice(0,8);
        const dateStr = now.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });

        // Build timeline bars (24h, mark anomaly at ~06:37)
        const timelineBars = Array.from({length: 96}, (_, i) => {
            // Anomaly zone: index 25-28 (06:15-07:00)
            const isAnomaly = i >= 25 && i <= 28;
            const height = isAnomaly ? 75 + Math.random() * 20 : 15 + Math.random() * 35;
            return `<div class="mnemo-timeline-bar${isAnomaly ? ' anomaly' : ''}" style="height:${height}%" title="${String(Math.floor(i/4)).padStart(2,'0')}:${String((i%4)*15).padStart(2,'0')}"></div>`;
        }).join('');

        // Anomaly marker position (at ~06:37 = index 26.5 of 96 bars)
        const anomalyPct = ((26.5 / 96) * 100).toFixed(1);

        container.innerHTML = `
        <div class="mnemo-layout">

            <!-- LEFT SIDEBAR -->
            <nav class="mnemo-sidebar">
                <div style="padding:12px 16px; border-bottom:1px solid #1e3a5f; margin-bottom:8px;">
                    <div style="font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:1px; font-weight:700;">THERMOTRACE</div>
                    <div style="font-size:12px; color:#94a3b8; margin-top:2px;">Центр управления</div>
                </div>

                <div class="mnemo-sidebar-item active">
                    <i class="fa fa-sitemap" style="width:16px;"></i>
                    <span>Обзор сети</span>
                </div>
                <div class="mnemo-sidebar-item" onclick="window.KTEKApp.switchTab('map')">
                    <i class="fa fa-map" style="width:16px;"></i>
                    <span>Мнемосхема</span>
                </div>
                <div class="mnemo-sidebar-item" onclick="window.KTEKApp.switchTab('analytics')">
                    <i class="fa fa-triangle-exclamation" style="width:16px;"></i>
                    <span>Аномалии</span>
                    <span class="badge">12</span>
                </div>
                <div class="mnemo-sidebar-item" onclick="window.KTEKApp.switchTab('passports')">
                    <i class="fa fa-power-off" style="width:16px;"></i>
                    <span>Отключения</span>
                    <span class="warn-badge">3</span>
                </div>
                <div class="mnemo-sidebar-item">
                    <i class="fa fa-building" style="width:16px;"></i>
                    <span>Объекты</span>
                </div>
                <div class="mnemo-sidebar-item">
                    <i class="fa fa-book" style="width:16px;"></i>
                    <span>Паспорт сети</span>
                </div>
                <div class="mnemo-sidebar-item">
                    <i class="fa fa-users" style="width:16px;"></i>
                    <span>Бригады</span>
                    <span class="warn-badge">5</span>
                </div>
                <div class="mnemo-sidebar-item" onclick="window.KTEKApp.switchTab('analytics')">
                    <i class="fa fa-chart-line" style="width:16px;"></i>
                    <span>Отчёты</span>
                </div>
                <div class="mnemo-sidebar-item">
                    <i class="fa fa-gear" style="width:16px;"></i>
                    <span>Настройки</span>
                </div>
            </nav>

            <!-- MAIN CANVAS -->
            <div class="mnemo-canvas" style="flex-direction:column;">

                <!-- Top Stats Bar -->
                <div class="mnemo-stats-bar" style="width:100%; margin:-24px -24px 20px -24px; padding: 0 20px;">
                    <!-- Weather -->
                    <div class="mnemo-stat-item">
                        <div class="mnemo-stat-label">Погода</div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-size:22px;">&#9729;&#65039;</span>
                            <div>
                                <div class="mnemo-stat-val white">-12°C</div>
                                <div class="mnemo-stat-sub">ветер 4 м/с</div>
                            </div>
                        </div>
                    </div>
                    <!-- Heat Balance -->
                    <div class="mnemo-stat-item">
                        <div class="mnemo-stat-label">Тепловой баланс сети</div>
                        <div class="mnemo-stat-val green">93.4%</div>
                        <div class="mnemo-stat-sub ok">потока объяснено</div>
                    </div>
                    <!-- Unlocalized -->
                    <div class="mnemo-stat-item">
                        <div class="mnemo-stat-label">Не локализовано</div>
                        <div class="mnemo-stat-val red">8.2 <span style="font-size:12px;font-weight:600;">Гкал/ч</span></div>
                        <div class="mnemo-stat-sub warn">дисбаланс</div>
                    </div>
                    <!-- Active Anomalies -->
                    <div class="mnemo-stat-item">
                        <div class="mnemo-stat-label">Активные аномалии</div>
                        <div class="mnemo-stat-val red">12</div>
                        <div class="mnemo-stat-sub" style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:30px;height:2px;background:linear-gradient(to right,#ef4444,#f87171);border-radius:1px;"></span> <span style="color:#f87171;">&#9650;</span></div>
                    </div>
                    <!-- Clock -->
                    <div class="mnemo-time-display">
                        <div class="mnemo-clock" id="mnemoClock">${timeStr}</div>
                        <div class="mnemo-date">${dateStr}</div>
                        <div class="mnemo-sys-status">СИСТЕМА В НОРМЕ</div>
                    </div>
                </div>

                <!-- Network Tree -->
                <div class="mnemo-nodes-layer" style="min-width:700px;">

                    <!-- ROW 1: Source (ТЭЦ-1) -->
                    <div class="mnemo-row">
                        <div class="mnemo-source-node" onclick="window.KTEKApp.switchTab('map')">
                            <span class="node-icon">🏭</span>
                            <div class="node-title">ТЭЦ-1</div>
                            <div class="node-power">125.4</div>
                            <div class="node-power-unit">Гкал/ч</div>
                            <div class="node-params">
                                <span class="arrow-down">&#8595;</span> <span>92°C</span>
                                &nbsp;&bull;&nbsp;
                                <span>5.8 бар</span>
                            </div>
                        </div>
                    </div>

                    <!-- Connector 1 -->
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div class="mnemo-flow-badge">⇓ 124.1 Гкал/ч</div>
                        <div class="mnemo-connector-v flow-animated"></div>
                    </div>

                    <!-- ROW 2: TM-13 -->
                    <div class="mnemo-row">
                        <div class="mnemo-tm-node">
                            <div style="margin-bottom:4px;">
                                <span class="node-status-dot ok"></span>
                                <span class="tm-title">TM-13</span>
                            </div>
                            <div class="tm-params">
                                <span style="color:#f87171;">ПОДАЧА 91°C</span>
                                &nbsp;&nbsp;
                                <span style="color:#60a5fa;">ОБРАТКА 63°C</span>
                            </div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">5.5 бар &bull; 91°C</div>
                        </div>
                    </div>

                    <!-- Fork connector -->
                    <div class="mnemo-row" style="justify-content:center; gap:0; margin:0;">
                        <!-- Left branch -->
                        <div style="display:flex; flex-direction:column; align-items:center; width:200px;">
                            <div class="mnemo-flow-badge" style="font-size:10px;">62.4 Гкал/ч</div>
                            <div style="width:100%; height:2px; background:linear-gradient(to right, #0284c7, #1e4d77); margin: 6px 0;"></div>
                            <div class="mnemo-connector-v"></div>
                        </div>
                        <!-- Right branch -->
                        <div style="display:flex; flex-direction:column; align-items:center; width:200px;">
                            <div class="mnemo-flow-badge red" style="font-size:10px;">61.7 Гкал/ч</div>
                            <div style="width:100%; height:2px; background:linear-gradient(to right, #1e4d77, #ef4444); margin: 6px 0;"></div>
                            <div class="mnemo-connector-v" style="background:linear-gradient(to bottom,#ef4444,#dc2626);"></div>
                        </div>
                    </div>

                    <!-- ROW 3: TK13.01 & TK13.06 -->
                    <div class="mnemo-row" style="gap:80px;">
                        <!-- TK13.01 - Normal -->
                        <div class="mnemo-tk-node">
                            <div class="tk-id"><span class="node-status-dot ok" style="width:7px;height:7px;"></span> ТК13.01</div>
                            <div class="tk-row">P <span class="val hot">90°C</span></div>
                            <div class="tk-row">O <span class="val cool">63°C</span></div>
                            <div class="tk-row"><span>5.1 бар</span><span style="margin-left:auto;font-size:10px;color:#64748b;">4.2 бар</span></div>
                            <div class="tk-flow">Расход 62.4 т/ч</div>
                        </div>
                        <!-- TK13.06 - ANOMALY -->
                        <div class="mnemo-tk-node anomaly" onclick="">
                            <div class="tk-id"><span class="node-status-dot danger" style="width:7px;height:7px;"></span> ТК13.06</div>
                            <div class="tk-row">P <span class="val hot">89°C</span></div>
                            <div class="tk-row">O <span class="val cool">64°C</span></div>
                            <div class="tk-row"><span>5.0 бар</span><span style="margin-left:auto;font-size:10px;color:#64748b;">4.0 бар</span></div>
                            <div class="tk-flow">Расход 61.7 т/ч</div>
                            <div class="delta-badge">ΔQ +12.8 Гкал/ч (21.9%)</div>
                        </div>
                    </div>

                    <!-- Sub-fork connectors -->
                    <div class="mnemo-row" style="gap:80px; margin:0;">
                        <!-- Left: TK13.01 -> TK13.02 & TK13.03 -->
                        <div style="display:flex; gap:0;">
                            <div style="display:flex; flex-direction:column; align-items:center; width:100px;">
                                <div class="mnemo-flow-badge" style="font-size:9px;">28.9</div>
                                <div class="mnemo-connector-v" style="height:20px;"></div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center; width:100px;">
                                <div class="mnemo-flow-badge" style="font-size:9px;">33.5</div>
                                <div class="mnemo-connector-v" style="height:20px;"></div>
                            </div>
                        </div>
                        <!-- Right: TK13.06 -> TK13.07 & TK13.08 -->
                        <div style="display:flex; gap:0;">
                            <div style="display:flex; flex-direction:column; align-items:center; width:100px;">
                                <div class="mnemo-flow-badge red" style="font-size:9px;">24.2</div>
                                <div class="mnemo-connector-v" style="height:20px; background:linear-gradient(to bottom,#ef4444,#dc2626);"></div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center; width:100px;">
                                <div class="mnemo-flow-badge red" style="font-size:9px;">25.5</div>
                                <div class="mnemo-connector-v" style="height:20px; background:linear-gradient(to bottom,#ef4444,#dc2626);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- ROW 4: Sub-chambers -->
                    <div class="mnemo-row" style="gap:12px; flex-wrap:wrap; justify-content:center;">
                        <!-- TK13.02 -->
                        <div class="mnemo-tk-node">
                            <div class="tk-id"><span class="node-status-dot ok" style="width:7px;height:7px;"></span> ТК13.02</div>
                            <div class="tk-row">P <span class="val hot">90°C</span></div>
                            <div class="tk-row">O <span class="val cool">63°C</span></div>
                            <div class="tk-row"><span>5.2 / 4.2 бар</span></div>
                            <div class="tk-flow">28.9 т/ч</div>
                        </div>
                        <!-- TK13.03 -->
                        <div class="mnemo-tk-node">
                            <div class="tk-id"><span class="node-status-dot ok" style="width:7px;height:7px;"></span> ТК13.03</div>
                            <div class="tk-row">P <span class="val hot">89°C</span></div>
                            <div class="tk-row">O <span class="val cool">63°C</span></div>
                            <div class="tk-row"><span>5.1 / 4.1 бар</span></div>
                            <div class="tk-flow">33.5 т/ч</div>
                        </div>
                        <!-- TK13.07 -->
                        <div class="mnemo-tk-node">
                            <div class="tk-id"><span class="node-status-dot warn" style="width:7px;height:7px;"></span> ТК13.07</div>
                            <div class="tk-row">P <span class="val hot">88°C</span></div>
                            <div class="tk-row">O <span class="val" style="color:#fcd34d;">64°C</span></div>
                            <div class="tk-row"><span>4.8 / 3.9 бар</span></div>
                            <div class="tk-flow">24.2 т/ч</div>
                        </div>
                        <!-- TK13.08 ANOMALY -->
                        <div class="mnemo-anomaly-box">
                            <div class="anom-label">ПОДОЗРЕНИЕ НА<br>НЕУЧТЁННОЕ ОТБОР</div>
                            <div class="anom-val">2.8 Гкал/ч</div>
                            <div class="anom-unit">(4.7%)</div>
                            <div style="font-size:9px; color:#64748b; margin-top:4px;">ТК13.08 | 25.5 т/ч</div>
                        </div>
                    </div>

                    <!-- Sub-connectors to buildings -->
                    <div class="mnemo-row" style="gap:12px; margin:4px 0;">
                        <div class="mnemo-connector-v" style="height:16px;"></div>
                        <div class="mnemo-connector-v" style="height:16px;"></div>
                        <div class="mnemo-connector-v" style="height:16px;"></div>
                        <div class="mnemo-connector-v" style="height:16px;"></div>
                        <div class="mnemo-connector-v" style="height:16px; background:linear-gradient(to bottom,#ef4444,#dc2626);"></div>
                    </div>

                    <!-- ROW 5: Consumer Buildings -->
                    <div class="mnemo-row" style="gap:8px; flex-wrap:wrap; justify-content:center;">
                        <div class="mnemo-building-node">
                            <span class="bld-icon">🏢</span>
                            <div class="bld-name">ДОМ 15</div>
                            <div class="bld-val">4.1 Гкал/ч</div>
                            <div class="bld-status">норма</div>
                        </div>
                        <div class="mnemo-building-node">
                            <span class="bld-icon">🏢</span>
                            <div class="bld-name">ДОМ 17</div>
                            <div class="bld-val">5.3 Гкал/ч</div>
                            <div class="bld-status">норма</div>
                        </div>
                        <div class="mnemo-building-node">
                            <span class="bld-icon">🏫</span>
                            <div class="bld-name">ШКОЛА №7</div>
                            <div class="bld-val">3.8 Гкал/ч</div>
                            <div class="bld-status">норма</div>
                        </div>
                        <div class="mnemo-building-node">
                            <span class="bld-icon">🏢</span>
                            <div class="bld-name">ДОМ 19</div>
                            <div class="bld-val">4.8 Гкал/ч</div>
                            <div class="bld-status">норма</div>
                        </div>
                        <div class="mnemo-building-node" style="border-color:#ef4444; background:rgba(239,68,68,0.08);">
                            <span class="bld-icon">❓</span>
                            <div class="bld-name" style="color:#f87171;">ДОМ 25</div>
                            <div class="bld-val" style="color:#f87171;">4.9 Гкал/ч</div>
                            <div class="bld-status" style="color:#ef4444;">аномалия</div>
                        </div>
                    </div>

                </div><!-- end mnemo-nodes-layer -->
            </div><!-- end mnemo-canvas -->

            <!-- RIGHT DETAIL PANEL -->
            <div class="mnemo-detail-panel">

                <!-- Anomaly Header -->
                <div class="mnemo-detail-section">
                    <div class="mnemo-detail-title">Активная аномалия</div>
                    <div class="mnemo-anomaly-header">
                        <div class="mnemo-anomaly-id">АНОМАЛИЯ А-1038</div>
                        <div class="mnemo-confidence">94%</div>
                    </div>
                    <div style="font-size:9px; color:#64748b; margin-bottom:10px;">Уверенность</div>
                </div>

                <!-- Details -->
                <div class="mnemo-detail-section">
                    <div class="mnemo-detail-title">ДЕТАЛИ</div>
                    <div class="mnemo-detail-row"><span class="dr-label">Участок</span><span class="dr-val">ТК13.06 – ТК13.08</span></div>
                    <div class="mnemo-detail-row"><span class="dr-label">Обнаружено</span><span class="dr-val">10.08.2026 06:37</span></div>
                    <div class="mnemo-detail-row"><span class="dr-label">Длительность</span><span class="dr-val red">17 ч 42 мин</span></div>
                    <div class="mnemo-detail-row"><span class="dr-label">Источник</span><span class="dr-val">ТЭЦ-1</span></div>
                </div>

                <!-- Balance -->
                <div class="mnemo-detail-section">
                    <div class="mnemo-detail-title">БАЛАНС УЧАСТКА</div>
                    <div class="mnemo-balance-row"><span class="br-label">Ожидаемый расход</span><span class="br-val">58.9 Гкал/ч</span></div>
                    <div class="mnemo-balance-row"><span class="br-label">Фактический расход</span><span class="br-val">71.7 Гкал/ч</span></div>
                    <div class="mnemo-balance-row"><span class="br-label">Дисбаланс</span><span class="br-val anomaly">+12.8 Гкал/ч</span></div>
                    <div class="mnemo-balance-row"><span class="br-label">Отклонение</span><span class="br-val anomaly">+21.9%</span></div>
                </div>

                <!-- Causes -->
                <div class="mnemo-detail-section">
                    <div class="mnemo-detail-title">ВОЗМОЖНЫЕ ПРИЧИНЫ</div>
                    <div class="mnemo-cause-bar">
                        <span class="mnemo-cause-name">Неучтённый потребитель</span>
                        <div class="mnemo-cause-pct"><div class="mnemo-cause-pct-fill" style="width:72%;"></div></div>
                        <span class="mnemo-cause-num">72%</span>
                    </div>
                    <div class="mnemo-cause-bar">
                        <span class="mnemo-cause-name">Ошибка приборов учёта</span>
                        <div class="mnemo-cause-pct"><div class="mnemo-cause-pct-fill" style="width:18%;background:linear-gradient(to right,#f59e0b,#fbbf24);"></div></div>
                        <span class="mnemo-cause-num">18%</span>
                    </div>
                    <div class="mnemo-cause-bar">
                        <span class="mnemo-cause-name">Утечка теплоносителя</span>
                        <div class="mnemo-cause-pct"><div class="mnemo-cause-pct-fill" style="width:10%;background:linear-gradient(to right,#ef4444,#f87171);"></div></div>
                        <span class="mnemo-cause-num">10%</span>
                    </div>
                </div>

                <!-- Actions -->
                <div class="mnemo-detail-section">
                    <div class="mnemo-detail-title">ДЕЙСТВИЯ</div>
                    <button class="mnemo-action-btn danger-btn" onclick="window.KTEKApp.switchTab('tablet')">
                        <i class="fa fa-users"></i> Создать задание бригаде
                    </button>
                    <button class="mnemo-action-btn secondary-btn">
                        <i class="fa fa-vial"></i> Смоделировать отключение
                    </button>
                    <button class="mnemo-action-btn map-btn" onclick="window.KTEKApp.switchTab('map')">
                        <i class="fa fa-map-location-dot"></i> Открыть на карте
                    </button>
                </div>

            </div><!-- end mnemo-detail-panel -->

            <!-- TIMELINE -->
            <div class="mnemo-timeline">
                <div class="mnemo-timeline-header">
                    <div>
                        <span style="color:#e2e8f0; font-weight:700;">10 августа 2026</span>
                        &nbsp;—&nbsp;
                        <span style="color:#ef4444;">06:37 Аномалия обнаружена</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <span style="font-size:11px; color:#64748b;">Параметр:</span>
                        <select style="background:#131c33; border:1px solid #1e3a5f; color:#e2e8f0; font-size:11px; padding:3px 8px; border-radius:4px;">
                            <option>Дисбаланс</option>
                            <option>Температура T1</option>
                            <option>Температура T2</option>
                            <option>Давление P1</option>
                        </select>
                        <button style="background:rgba(2,132,199,0.15);border:1px solid #0284c7;color:#38bdf8;font-size:11px;padding:3px 10px;border-radius:4px;cursor:pointer;">1ч</button>
                        <button style="background:rgba(2,132,199,0.15);border:1px solid #0284c7;color:#38bdf8;font-size:11px;padding:3px 10px;border-radius:4px;cursor:pointer;">6ч</button>
                        <button style="background:#0284c7;border:none;color:#fff;font-size:11px;padding:3px 10px;border-radius:4px;cursor:pointer;">24ч</button>
                        <button style="background:rgba(2,132,199,0.15);border:1px solid #0284c7;color:#38bdf8;font-size:11px;padding:3px 10px;border-radius:4px;cursor:pointer;">7д</button>
                    </div>
                </div>
                <div class="mnemo-timeline-chart" id="mnemoTimelineChart">
                    ${timelineBars}
                    <div class="mnemo-anomaly-marker" style="left:${anomalyPct}%;">
                        <div class="mnemo-anomaly-tooltip">06:37</div>
                    </div>
                </div>
                <div class="mnemo-timeline-labels">
                    <span>00:00</span><span>02:00</span><span>04:00</span>
                    <span style="color:#ef4444; font-weight:700;">06:37</span>
                    <span>08:00</span><span>10:00</span><span>12:00</span>
                    <span>14:00</span><span>16:00</span><span>18:00</span>
                    <span>20:00</span><span>22:00</span><span>24:00</span>
                </div>
            </div><!-- end mnemo-timeline -->

        </div><!-- end mnemo-layout -->
        `;

        // Live clock update
        if (this._mnemoClockInterval) clearInterval(this._mnemoClockInterval);
        this._mnemoClockInterval = setInterval(() => {
            const el = document.getElementById('mnemoClock');
            if (el) el.textContent = new Date().toTimeString().slice(0,8);
        }, 1000);
    },

    renderPassportsTab() {
        const container = document.getElementById('passportsContent');
        if (!container) return;

        const data = window.KTEKData;
        container.innerHTML = `
            <div class="panel-header">
                <h2>🏢 Реестр Цифровых Паспортов Объектов и Участков Теплотрасс</h2>
                <p>База данных ГКП «КТЭК»: паспорта труб, строений и камерных узлов.</p>
            </div>

            <div class="equipment-header-grid">
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon blue"><i class="fa fa-building"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Паспортов Домов</h4>
                        <span>${data.houses.length}</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon green"><i class="fa fa-pipeline"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Паспортов Магистралей</h4>
                        <span>${data.pipelines.length}</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon amber"><i class="fa fa-cubes"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Тепловых Камер</h4>
                        <span>${data.chambers.length}</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon purple"><i class="fa fa-fire"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Источников Тепла</h4>
                        <span>${data.sources.length}</span>
                    </div>
                </div>
            </div>

            <h3 style="margin-bottom:12px;">Паспорта Труб и Участков Теплотрасс:</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Наименование участка</th>
                        <th>Диаметр</th>
                        <th>Длина</th>
                        <th>Год прокладки</th>
                        <th>Изоляция</th>
                        <th>Износ %</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.pipelines.map(p => `
                        <tr>
                            <td><strong>${p.name}</strong></td>
                            <td>ф${p.diameter} мм</td>
                            <td>${p.lengthM} м</td>
                            <td>${p.year} г.</td>
                            <td>${p.material}</td>
                            <td><strong style="color:${p.wearPct > 60 ? '#ef4444' : '#10b981'}">${p.wearPct}%</strong></td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="window.KTEKApp.switchTab('map'); window.KTEKApp.openPipePassportDrawer('${p.id}');">
                                    📜 Паспорт
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderAnalyticsTab() {
        const container = document.getElementById('analyticsContent');
        if (!container) return;

        const analytics = window.KTEKScada.getDistrictAnalytics("all");

        container.innerHTML = `
            <div class="panel-header">
                <h2>📊 Аналитика Потребления Энергии через УУТЭ и Аномалии по Районам</h2>
                <p>Выявление перегревов обратной воды (T2), утечек во внутреннем контуре и объектов без приборов учета.</p>
            </div>

            <div class="equipment-header-grid">
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon blue"><i class="fa fa-chart-line"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Оснащенность УУТЭ</h4>
                        <span>${analytics.meterCoveragePct}%</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon green"><i class="fa fa-gauge"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Суммарный расход</h4>
                        <span>${analytics.totalHeatGcalH} Гкал/ч</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon amber"><i class="fa fa-triangle-exclamation"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Выявлено Перегревов</h4>
                        <span>${analytics.anomalies.overheats.length}</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon purple"><i class="fa fa-droplet"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Внутренних Утечек</h4>
                        <span>${analytics.anomalies.leaks.length}</span>
                    </div>
                </div>
            </div>

            <h3 style="margin-bottom:12px;">Выявленные Аномалии на Приборах Учета:</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Адрес дома</th>
                        <th>Район</th>
                        <th>Характер аномалии</th>
                        <th>Показания УУТЭ</th>
                        <th>Рекомендуемое действие инспектора</th>
                    </tr>
                </thead>
                <tbody>
                    ${[...analytics.anomalies.overheats, ...analytics.anomalies.leaks].slice(0, 20).map(a => `
                        <tr>
                            <td><strong>Ул. ${a.house.street}, д. ${a.house.house}</strong></td>
                            <td>${a.house.district}</td>
                            <td><span class="status-tag danger">${a.type}</span></td>
                            <td>${a.val}</td>
                            <td><em>${a.action}</em></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderEquipmentTab() {
        const container = document.getElementById('equipmentContent');
        if (!container) return;

        const inv = window.KTEKData.getEquipmentInventory("all");

        container.innerHTML = `
            <div class="panel-header">
                <h2>🚜 Учет Оборудования, Арматуры и Спецтехники ГКП «КТЭК»</h2>
                <p>Полный реестр приборов учета, запорных задвижек, насосов и парка автотехники.</p>
            </div>

            <div class="equipment-header-grid">
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon blue"><i class="fa fa-gauge-high"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Всего УУТЭ</h4>
                        <span>${inv.meters.total} шт.</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon green"><i class="fa fa-circle-dot"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Запорных Задвижек</h4>
                        <span>${inv.valves.total} шт.</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon amber"><i class="fa fa-gears"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Насосных систем</h4>
                        <span>${inv.pumps.total} шт.</span>
                    </div>
                </div>
                <div class="equipment-kpi-card">
                    <div class="equipment-kpi-icon purple"><i class="fa fa-truck"></i></div>
                    <div class="equipment-kpi-info">
                        <h4>Спецтехники ГКП</h4>
                        <span>${inv.vehicles.length} ед.</span>
                    </div>
                </div>
            </div>

            <h3 style="margin-bottom:12px;">Парк Спецтехники и Аварийных Бригад:</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Борт ID / Наименование</th>
                        <th>Мастер / Водитель</th>
                        <th>Статус</th>
                        <th>Направление</th>
                    </tr>
                </thead>
                <tbody>
                    ${inv.vehicles.map(v => `
                        <tr>
                            <td><strong>${v.name}</strong> (${v.id})</td>
                            <td>${v.driver}</td>
                            <td><span class="status-tag ok">${v.status === 'en_route' ? 'В пути' : 'На объекте'}</span></td>
                            <td>${v.target}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderPredictiveAnalyticsView() {
        const container = document.getElementById('predictiveContent');
        if (!container) return;

        const report = window.KTEKTopology.getGlobalPredictiveReport();
        container.innerHTML = `
            <div class="panel-header">
                <h2>🧠 AI Предиктивная Аналитика и Оценка Риска Аварийности</h2>
                <p>Ранжирование теплотрасс Костаная по математическому индексу риска аварий в 2026 г.</p>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Участок теплотрассы</th>
                        <th>Диаметр</th>
                        <th>Возраст</th>
                        <th>Индекс риска AI</th>
                        <th>Рекомендация</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.map(item => `
                        <tr>
                            <td><strong>${item.pipe.name}</strong></td>
                            <td>ф${item.pipe.diameter} мм</td>
                            <td>${item.risk.age} лет</td>
                            <td>
                                <div class="risk-bar-wrapper">
                                    <div class="risk-bar" style="width:${item.risk.score}%; background:${item.risk.color};"></div>
                                    <span>${item.risk.score}%</span>
                                </div>
                            </td>
                            <td><em>${item.risk.recommendedAction}</em></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    refreshDataViews() {
        const data = window.KTEKData;
        if (!data) return;

        const totalHousesEl = document.getElementById('totalHousesCount');
        if (totalHousesEl) totalHousesEl.innerText = data.houses.length || 6455;
    },

    handleGlobalSearch(query) {
        if (!query || query.length < 2) return;
        const q = query.toLowerCase();

        const matchChamber = window.KTEKData.chambers.find(c => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
        if (matchChamber && this.map) {
            this.map.flyTo([matchChamber.lat, matchChamber.lng], 16);
            this.openChamberCardDrawer(matchChamber.id);
            return;
        }

        const matchHouse = window.KTEKData.houses.find(h => h.street.toLowerCase().includes(q) || h.house.toLowerCase().includes(q));
        if (matchHouse && this.map) {
            this.map.flyTo([matchHouse.lat, matchHouse.lng], 17);
            this.openHousePassportDrawer(matchHouse.id);
        }
    },

    showNotification(text, type = "info") {
        const notifContainer = document.getElementById('toastContainer');
        if (!notifContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fa fa-bell"></i> ${text}`;
        notifContainer.appendChild(toast);

        setTimeout(() => toast.remove(), 4000);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.KTEKApp.init();
});
