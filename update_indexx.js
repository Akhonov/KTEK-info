const fs = require('fs');

let html = fs.readFileSync('indexx.html', 'utf8');

// 1. UPDATE CSS IN indexx.html
const extraCss = `
        /* Стили для подключенных домов */
        .connected-house-glow {
            animation: house-glow 1.5s infinite alternate;
        }
        @keyframes house-glow {
            from { box-shadow: 0 0 4px #38bdf8; }
            to { box-shadow: 0 0 16px #38bdf8, 0 0 24px #38bdf8; }
        }

        /* Индикатор режима привязки */
        .snap-target-source {
            animation: snap-pulse 1.2s infinite;
        }
        @keyframes snap-pulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 4px #eab308); }
            50% { transform: scale(1.15); filter: drop-shadow(0 0 16px #eab308); }
            100% { transform: scale(1); filter: drop-shadow(0 0 4px #eab308); }
        }
`;
html = html.replace('</style>', extraCss + '\n    </style>');

// 2. UPDATE DRAWING TOOLBAR HTML
const oldToolbar = `<div id="pipeDrawingToolbar" class="hidden absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border-2 border-amber-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md">
                <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                    <div>
                        <div class="text-xs font-bold text-amber-300" id="drawingModeTitle">✏️ Режим проектирования теплотрассы</div>
                        <div class="text-[11px] text-slate-300" id="drawingStats">Кликайте по улицам для прокладки пути. Точек: 0 | Длина: 0 м</div>
                    </div>
                </div>
                <div class="flex items-center gap-2 border-l border-slate-700 pl-3">
                    <button onclick="undoLastDrawingPoint()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-200 border border-slate-700" title="Отменить последнюю точку">
                        ↩️ Шаг назад
                    </button>
                    <button onclick="finishPipeDrawing()" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-lg text-white shadow-lg shadow-emerald-600/30">
                        💾 Сохранить трассу
                    </button>
                    <button onclick="cancelPipeDrawing()" class="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-xs rounded-lg text-white">
                        ✕ Отмена
                    </button>
                </div>
            </div>`;

const newToolbar = `<div id="pipeDrawingToolbar" class="hidden absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border-2 border-amber-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex flex-col gap-2 backdrop-blur-md max-w-2xl">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2.5">
                        <span class="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                        <div>
                            <div class="text-xs font-bold text-amber-300 flex items-center gap-2" id="drawingModeTitle">
                                ✏️ Трассировка: <span id="drawingConnectionBadge" class="text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-700/50">Старт не выбран</span>
                            </div>
                            <div class="text-[11px] text-slate-300" id="drawingStats">Кликните на стартовую ТЭЦ или сразу на карту. Длина: 0 м | Домов: 0</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 border-l border-slate-700 pl-3">
                        <button onclick="undoLastDrawingPoint()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-200 border border-slate-700" title="Отменить последнюю точку">
                            ↩️ Шаг назад
                        </button>
                        <button onclick="finishPipeDrawing()" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-lg text-white shadow-lg shadow-emerald-600/30">
                            💾 Завершить трассу
                        </button>
                        <button onclick="cancelPipeDrawing()" class="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-xs rounded-lg text-white">
                            ✕
                        </button>
                    </div>
                </div>
                <!-- Нижняя панель действий с домами и подсказками -->
                <div class="flex items-center justify-between border-t border-slate-800 pt-1.5 text-[11px]">
                    <div class="flex items-center gap-2">
                        <span class="text-slate-400">💡 Кликните на конечную ТЭЦ для авто-завершения пути</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="autoCaptureHousesAlongRoute()" class="px-2 py-0.5 bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 rounded flex items-center gap-1">
                            ⚡ Автозахват домов (150м)
                        </button>
                        <button type="button" id="btnToggleHousePicker" onclick="toggleHouseSelectionMode()" class="px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded flex items-center gap-1">
                            🏠 Выбрать дома кликом (<span id="selectedHousesBadge">0</span>)
                        </button>
                    </div>
                </div>
            </div>`;

html = html.replace(oldToolbar, newToolbar);

// 3. UPDATE SAVE PIPELINE MODAL HTML
const oldSaveModal = `<div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <div class="flex justify-between text-slate-400">
                        <span>Источник отправления:</span>
                        <span id="pipeSourceLabel" class="text-amber-300 font-semibold">—</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Общая длина пути:</span>
                        <span id="pipeLengthLabel" class="text-emerald-400 font-bold">0 м</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Количество поворотов (точек):</span>
                        <span id="pipePointsLabel" class="text-slate-200">0</span>
                    </div>
                </div>`;

const newSaveModal = `<div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                    <div class="flex justify-between text-slate-400">
                        <span>Начало трассы (Источник):</span>
                        <span id="pipeSourceLabel" class="text-amber-300 font-semibold">—</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Конец трассы (Приёмник / ТЭЦ):</span>
                        <span id="pipeTargetLabel" class="text-sky-300 font-semibold">—</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Общая длина пути:</span>
                        <span id="pipeLengthLabel" class="text-emerald-400 font-bold">0 м</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Количество поворотов:</span>
                        <span id="pipePointsLabel" class="text-slate-200">0</span>
                    </div>
                    <div class="pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-xs">
                        <span class="text-purple-300 font-medium">🏠 Отапливаемых домов:</span>
                        <span id="pipeHousesCountLabel" class="text-purple-300 font-bold">0 зданий (0 квартир)</span>
                    </div>
                    <div class="flex justify-between text-slate-400 text-[11px]">
                        <span>Расчётная тепловая нагрузка:</span>
                        <span id="pipeLoadLabel" class="text-amber-400 font-semibold">0.0 Гкал/ч</span>
                    </div>
                </div>

                <!-- Список подключенных домов -->
                <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 max-h-24 overflow-y-auto">
                    <div class="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex justify-between">
                        <span>Подключенные потребители</span>
                        <button type="button" onclick="autoCaptureHousesAlongRoute()" class="text-sky-400 hover:underline">Пересчитать</button>
                    </div>
                    <div id="connectedHousesTagList" class="flex flex-wrap gap-1 text-[10px]">
                        <span class="text-slate-500">Нет выбранных домов</span>
                    </div>
                </div>`;

html = html.replace(oldSaveModal, newSaveModal);

// 4. WRITE REFINED JAVASCRIPT LOGIC
const jsTarget = `        // ── 3. ИНСТРУМЕНТ ИНТЕРАКТИВНОГО РИСОВАНИЯ ТРАССЫ ТРУБ ✏️ ──`;

const newJsCode = `        // ── ХРАНИЛИЩЕ ПОДКЛЮЧЕННЫХ ДОМОВ И СНАППИНГА ──
        let drawingDestinationInfo = { id: null, name: "Конечный узел сети", lat: null, lng: null };
        let selectedHousesForPipe = new Map(); // key: houseKey -> { house, marker }
        let isSelectingHousesMode = false;
        let connectedHouseHighlightGroup = null;

        // Расчет расстояния от точки до отрезка в метрах
        function getDistanceToSegmentM(p, v, w) {
            const pPt = map.latLngToLayerPoint(p);
            const vPt = map.latLngToLayerPoint(v);
            const wPt = map.latLngToLayerPoint(w);
            const l2 = vPt.distanceTo(wPt) ** 2;
            if (l2 === 0) return map.distance(p, v);
            let t = ((pPt.x - vPt.x) * (wPt.x - vPt.x) + (pPt.y - vPt.y) * (wPt.y - vPt.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projPt = L.point(vPt.x + t * (wPt.x - vPt.x), vPt.y + t * (wPt.y - vPt.y));
            const projLatLng = map.layerPointToLatLng(projPt);
            return map.distance(p, projLatLng);
        }

        // Автозахват домов вдоль проложенной полилинии
        window.autoCaptureHousesAlongRoute = function(radiusM = 150) {
            if (currentDrawnPoints.length < 2) {
                alert("Сначала проложите линию трассы на карте!");
                return;
            }
            if (!window.KTEKData || !window.KTEKData.houses) return;

            selectedHousesForPipe.clear();
            if (connectedHouseHighlightGroup) connectedHouseHighlightGroup.clearLayers();

            window.KTEKData.houses.forEach(h => {
                if (!h.lat || !h.lng) return;
                const hLatLng = [h.lat, h.lng];
                let minDistance = Infinity;

                for (let i = 0; i < currentDrawnPoints.length - 1; i++) {
                    const d = getDistanceToSegmentM(hLatLng, currentDrawnPoints[i], currentDrawnPoints[i + 1]);
                    if (d < minDistance) minDistance = d;
                }

                if (minDistance <= radiusM) {
                    const houseKey = (h.street || '') + '_' + (h.house || '');
                    selectedHousesForPipe.set(houseKey, {
                        street: h.street,
                        house: h.house,
                        flats: h.flats || 1,
                        floors: h.floors || 1,
                        lat: h.lat,
                        lng: h.lng
                    });
                }
            });

            renderConnectedHousesHighlights();
            updateDrawingStatsUI();
        };

        window.toggleHouseSelectionMode = function() {
            isSelectingHousesMode = !isSelectingHousesMode;
            const btn = document.getElementById('btnToggleHousePicker');
            if (btn) {
                btn.className = isSelectingHousesMode
                    ? "px-2 py-0.5 bg-purple-600 text-white font-bold border border-purple-400 rounded flex items-center gap-1 animate-pulse"
                    : "px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded flex items-center gap-1";
            }
            if (isSelectingHousesMode) {
                alert("Режим выбора домов активен! Кликайте по зеленым точкам домов на карте, чтобы подключить их к этой трассе.");
            }
        };

        function toggleHouseSelection(h) {
            const houseKey = (h.street || '') + '_' + (h.house || '');
            if (selectedHousesForPipe.has(houseKey)) {
                selectedHousesForPipe.delete(houseKey);
            } else {
                selectedHousesForPipe.set(houseKey, {
                    street: h.street,
                    house: h.house,
                    flats: h.flats || 1,
                    floors: h.floors || 1,
                    lat: h.lat,
                    lng: h.lng
                });
            }
            renderConnectedHousesHighlights();
            updateDrawingStatsUI();
        }

        function renderConnectedHousesHighlights() {
            if (!connectedHouseHighlightGroup) {
                connectedHouseHighlightGroup = L.layerGroup().addTo(map);
            }
            connectedHouseHighlightGroup.clearLayers();

            selectedHousesForPipe.forEach(h => {
                const glowCircle = L.circleMarker([h.lat, h.lng], {
                    radius: 7,
                    color: '#c084fc',
                    fillColor: '#a855f7',
                    fillOpacity: 0.85,
                    weight: 2
                });
                glowCircle.bindTooltip(\`🏠 ул. \${h.street}, д. \${h.house} (\${h.flats} кв.)\`, { direction: 'top' });
                connectedHouseHighlightGroup.addLayer(glowCircle);
            });
        }

        function updateDrawingStatsUI() {
            const badge = document.getElementById('selectedHousesBadge');
            if (badge) badge.textContent = selectedHousesForPipe.size;

            const totalLength = calculatePolylineLengthM(currentDrawnPoints);
            let totalFlats = 0;
            selectedHousesForPipe.forEach(h => totalFlats += (h.flats || 1));
            const totalLoad = (totalFlats * 0.0035).toFixed(2);

            const statsEl = document.getElementById('drawingStats');
            if (statsEl) {
                statsEl.innerHTML = \`Точек: <b>\${currentDrawnPoints.length}</b> | Длина: <b class="text-emerald-400">\${totalLength} м</b> | Домов: <b class="text-purple-300">\${selectedHousesForPipe.size}</b> (\${totalFlats} кв., \${totalLoad} Гкал/ч)\`;
            }

            const hCountLabel = document.getElementById('pipeHousesCountLabel');
            if (hCountLabel) hCountLabel.textContent = \`\${selectedHousesForPipe.size} зданий (\${totalFlats} кв.)\`;

            const loadLabel = document.getElementById('pipeLoadLabel');
            if (loadLabel) loadLabel.textContent = \`\${totalLoad} Гкал/ч\`;

            const tagList = document.getElementById('connectedHousesTagList');
            if (tagList) {
                if (selectedHousesForPipe.size === 0) {
                    tagList.innerHTML = '<span class="text-slate-500">Нет выбранных домов</span>';
                } else {
                    let tags = [];
                    selectedHousesForPipe.forEach(h => {
                        tags.push(\`<span class="bg-purple-950 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800/60">\${h.street} \${h.house}</span>\`);
                    });
                    tagList.innerHTML = tags.slice(0, 15).join('') + (tags.length > 15 ? \`<span class="text-slate-400">+ ещё \${tags.length - 15}</span>\` : '');
                }
            }
        }

        // ── ОБРАБОТКА КЛИКА НА ИСТОЧНИК / ТЭЦ В РЕЖИМЕ РИСОВАНИЯ (SNAP TO SOURCE) ──
        window.handleSourceClickInDrawing = function(id, name, lat, lng) {
            if (!isDrawingPipe) {
                startPipeDrawingFromSource(id, name, lat, lng);
                return;
            }

            // Если это старт трассы
            if (currentDrawnPoints.length === 0) {
                drawingSourceInfo = { id, name, lat, lng };
                currentDrawnPoints = [[lat, lng]];
                document.getElementById('drawingConnectionBadge').textContent = \`Старт: \${name}\`;
                document.getElementById('drawingConnectionBadge').className = "text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50";
                renderDrawingPreview();
                return;
            }

            // Если трасса уже строится и нажали на другой (или тот же) котел -> ЗАВЕРШАЕМ В ЭТОЙ ТОЧКЕ!
            drawingDestinationInfo = { id, name, lat, lng };
            currentDrawnPoints.push([lat, lng]);
            document.getElementById('drawingConnectionBadge').textContent = \`\${drawingSourceInfo.name} ➔ \${name}\`;
            document.getElementById('drawingConnectionBadge').className = "text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50";

            renderDrawingPreview();
            autoCaptureHousesAlongRoute(150);

            setTimeout(() => {
                finishPipeDrawing();
            }, 300);
        };

        // ── 3. ИНСТРУМЕНТ ИНТЕРАКТИВНОГО РИСОВАНИЯ ТРАССЫ ТРУБ ✏️ ──`;

html = html.replace(jsTarget, newJsCode);

// 5. UPDATE startPipeDrawingFromSource & finishPipeDrawing
const oldStartSource = `window.startPipeDrawingFromSource = function(id, name, lat, lng) {
            map.closePopup();
            isDrawingPipe = true;
            currentDrawnPoints = [[lat, lng]];
            drawingSourceInfo = { id, name, lat, lng };

            document.getElementById('drawingModeTitle').textContent = \`✏️ Проектирование трассы от: \${name}\`;
            document.getElementById('pipeDrawingToolbar').classList.remove('hidden');
            renderDrawingPreview();
        };

        window.startFreePipeDrawing = function() {
            isDrawingPipe = true;
            currentDrawnPoints = [];
            drawingSourceInfo = { id: null, name: "Спроектированная трасса", lat: null, lng: null };

            document.getElementById('drawingModeTitle').textContent = \`✏️ Режим рисования: кликайте по карте\`;
            document.getElementById('pipeDrawingToolbar').classList.remove('hidden');
            renderDrawingPreview();
        };`;

const newStartSource = `window.startPipeDrawingFromSource = function(id, name, lat, lng) {
            map.closePopup();
            isDrawingPipe = true;
            currentDrawnPoints = [[lat, lng]];
            drawingSourceInfo = { id, name, lat, lng };
            drawingDestinationInfo = { id: null, name: "Свободная врезка", lat: null, lng: null };
            selectedHousesForPipe.clear();
            if (connectedHouseHighlightGroup) connectedHouseHighlightGroup.clearLayers();

            const badge = document.getElementById('drawingConnectionBadge');
            if (badge) {
                badge.textContent = \`Старт: \${name}\`;
                badge.className = "text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50";
            }
            document.getElementById('pipeDrawingToolbar').classList.remove('hidden');
            renderDrawingPreview();
        };

        window.startFreePipeDrawing = function() {
            isDrawingPipe = true;
            currentDrawnPoints = [];
            drawingSourceInfo = { id: null, name: "Спроектированный ввод", lat: null, lng: null };
            drawingDestinationInfo = { id: null, name: "Конечный узел сети", lat: null, lng: null };
            selectedHousesForPipe.clear();
            if (connectedHouseHighlightGroup) connectedHouseHighlightGroup.clearLayers();

            const badge = document.getElementById('drawingConnectionBadge');
            if (badge) {
                badge.textContent = "Кликните на стартовую ТЭЦ или по карте";
                badge.className = "text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-700/50";
            }
            document.getElementById('pipeDrawingToolbar').classList.remove('hidden');
            renderDrawingPreview();
        };`;

html = html.replace(oldStartSource, newStartSource);

// 6. UPDATE finishPipeDrawing and cancelPipeDrawing
const oldFinishDrawing = `window.finishPipeDrawing = function() {
            if (currentDrawnPoints.length < 2) {
                alert("Для создания трассы необходимо поставить как минимум 2 точки на карте!");
                return;
            }

            const totalLength = calculatePolylineLengthM(currentDrawnPoints);
            document.getElementById('pipeSourceLabel').textContent = drawingSourceInfo.name;
            document.getElementById('pipeLengthLabel').textContent = \`\${totalLength} м\`;
            document.getElementById('pipePointsLabel').textContent = currentDrawnPoints.length;
            document.getElementById('pipeName').value = \`Трасса от \${drawingSourceInfo.name}\`;

            openModal('savePipelineModal');
        };`;

const newFinishDrawing = `window.finishPipeDrawing = function() {
            if (currentDrawnPoints.length < 2) {
                alert("Для создания трассы необходимо поставить как минимум 2 точки на карте!");
                return;
            }

            const totalLength = calculatePolylineLengthM(currentDrawnPoints);
            document.getElementById('pipeSourceLabel').textContent = drawingSourceInfo.name;
            document.getElementById('pipeTargetLabel').textContent = drawingDestinationInfo.name;
            document.getElementById('pipeLengthLabel').textContent = \`\${totalLength} м\`;
            document.getElementById('pipePointsLabel').textContent = currentDrawnPoints.length;

            if (selectedHousesForPipe.size === 0) {
                autoCaptureHousesAlongRoute(150);
            }
            updateDrawingStatsUI();

            const defaultTitle = drawingDestinationInfo.id
                ? \`Связка: \${drawingSourceInfo.name} ➔ \${drawingDestinationInfo.name}\`
                : \`Трасса от \${drawingSourceInfo.name}\`;
            document.getElementById('pipeName').value = defaultTitle;

            openModal('savePipelineModal');
        };`;

html = html.replace(oldFinishDrawing, newFinishDrawing);

// 7. UPDATE submitDrawnPipeline to save connectedHouses
const oldSubmitPipeline = `window.submitDrawnPipeline = async function(e) {
            e.preventDefault();
            const totalLength = calculatePolylineLengthM(currentDrawnPoints);

            const newPipe = {
                name: document.getElementById('pipeName').value,
                sourceName: drawingSourceInfo.name,
                sourceId: drawingSourceInfo.id || null,
                diameter: parseInt(document.getElementById('pipeDiameter').value) || 325,
                status: document.getElementById('pipeStatus').value, // 'planned' or 'active'
                lengthM: totalLength,
                waypoints: currentDrawnPoints,
                createdAt: new Date().toISOString(),
                author: currentUserProfile.email || 'Admin'
            };

            await push(ref(db, 'custom_pipelines'), newPipe);
            closeModal('savePipelineModal');
            cancelPipeDrawing();
        };`;

const newSubmitPipeline = `window.submitDrawnPipeline = async function(e) {
            e.preventDefault();
            const totalLength = calculatePolylineLengthM(currentDrawnPoints);

            const connectedHousesArray = [];
            selectedHousesForPipe.forEach(h => connectedHousesArray.push(h));

            let totalFlats = 0;
            connectedHousesArray.forEach(h => totalFlats += (h.flats || 1));
            const totalLoadGcal = parseFloat((totalFlats * 0.0035).toFixed(2));

            const newPipe = {
                name: document.getElementById('pipeName').value,
                sourceName: drawingSourceInfo.name,
                sourceId: drawingSourceInfo.id || null,
                destinationName: drawingDestinationInfo.name,
                destinationId: drawingDestinationInfo.id || null,
                diameter: parseInt(document.getElementById('pipeDiameter').value) || 325,
                status: document.getElementById('pipeStatus').value, // 'planned' or 'active'
                lengthM: totalLength,
                waypoints: currentDrawnPoints,
                connectedHouses: connectedHousesArray,
                connectedHousesCount: connectedHousesArray.length,
                totalFlats: totalFlats,
                totalLoadGcal: totalLoadGcal,
                createdAt: new Date().toISOString(),
                author: currentUserProfile?.email || 'Admin'
            };

            await push(ref(db, 'custom_pipelines'), newPipe);
            closeModal('savePipelineModal');
            cancelPipeDrawing();
        };`;

html = html.replace(oldSubmitPipeline, newSubmitPipeline);

// 8. UPDATE SOURCE AND HOUSE CLICK LISTENERS IN initRealFullMap
const oldSourceInit = `                        const m = L.marker([src.lat, src.lng], { icon: icon });
                        m.bindPopup(\`
                            <div class="text-xs">
                                <h3 class="font-bold text-orange-400 mb-1">🏭 \${src.name}</h3>
                                <p><strong>Тип:</strong> \${src.type.toUpperCase()}</p>
                                <p><strong>Мощность:</strong> \${src.powerGcal || '120'} Гкал/ч</p>
                                <p><strong>P1 (Подача):</strong> \${src.p1 || 9.0} бар | <strong>T1:</strong> \${src.t1 || 95} °C</p>
                                <button onclick="startPipeDrawingFromSource('\${src.id}', '\${src.name}', \${src.lat}, \${src.lng})" class="mt-2 w-full py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[11px]">
                                    ✏️ Нарисовать трассу от этого источника
                                </button>
                            </div>
                        \`);
                        mapLayers.sources.addLayer(m);`;

const newSourceInit = `                        const m = L.marker([src.lat, src.lng], { icon: icon });
                        m.on('click', (ev) => {
                            if (isDrawingPipe) {
                                L.DomEvent.stopPropagation(ev);
                                handleSourceClickInDrawing(src.id, src.name, src.lat, src.lng);
                                return;
                            }
                        });
                        m.bindPopup(\`
                            <div class="text-xs">
                                <h3 class="font-bold text-orange-400 mb-1">🏭 \${src.name}</h3>
                                <p><strong>Тип:</strong> \${src.type.toUpperCase()}</p>
                                <p><strong>Мощность:</strong> \${src.powerGcal || '120'} Гкал/ч</p>
                                <p><strong>P1 (Подача):</strong> \${src.p1 || 9.0} бар | <strong>T1:</strong> \${src.t1 || 95} °C</p>
                                <button onclick="startPipeDrawingFromSource('\${src.id}', '\${src.name}', \${src.lat}, \${src.lng})" class="mt-2 w-full py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[11px]">
                                    ✏️ Нарисовать трассу от этого источника
                                </button>
                            </div>
                        \`);
                        mapLayers.sources.addLayer(m);`;

html = html.replace(oldSourceInit, newSourceInit);

// 9. UPDATE HOUSE CLICK IN MAP
const oldHouseInit = `                        const circle = L.circleMarker([h.lat, h.lng], {
                            radius: 3,
                            color: '#10b981',
                            fillColor: '#10b981',
                            fillOpacity: 0.7,
                            weight: 1
                        });`;

const newHouseInit = `                        const circle = L.circleMarker([h.lat, h.lng], {
                            radius: 3,
                            color: '#10b981',
                            fillColor: '#10b981',
                            fillOpacity: 0.7,
                            weight: 1
                        });
                        circle.on('click', (ev) => {
                            if (isSelectingHousesMode) {
                                L.DomEvent.stopPropagation(ev);
                                toggleHouseSelection(h);
                                return;
                            }
                        });`;

html = html.replace(oldHouseInit, newHouseInit);

// 10. UPDATE CUSTOM OBJECT RENDER TO SUPPORT SNAP-TO-SOURCE
const oldCustomObjMarker = `                    const marker = L.marker([obj.lat, obj.lng], { icon })
                        .addTo(mapLayers.customObjects)
                        .bindPopup(\``;

const newCustomObjMarker = `                    const marker = L.marker([obj.lat, obj.lng], { icon })
                        .addTo(mapLayers.customObjects);
                    marker.on('click', (ev) => {
                        if (isDrawingPipe) {
                            L.DomEvent.stopPropagation(ev);
                            handleSourceClickInDrawing('custom_' + id, obj.name, obj.lat, obj.lng);
                            return;
                        }
                    });
                    marker.bindPopup(\``;

html = html.replace(oldCustomObjMarker, newCustomObjMarker);

// 11. UPDATE CUSTOM PIPELINE POPUP TO SHOW CONNECTED HOUSES
const oldPipePopup = `                    line.bindPopup(\`
                        <div class="text-xs">
                            <h4 class="font-bold \${isPlanned ? 'text-amber-400' : 'text-purple-400'} mb-1">📐 \${p.name}</h4>
                            <p><strong>Источник:</strong> \${p.sourceName || 'Спроектированный ввод'}</p>
                            <p><strong>Диаметр:</strong> ф\${p.diameter} мм</p>
                            <p><strong>Длина трассы:</strong> \${p.lengthM} м</p>
                            <p><strong>Статус:</strong> \${isPlanned ? '🟡 Проектируемая (Аналитика)' : '🟢 В работе'}</p>
                            <p><strong>Точек поворота:</strong> \${p.waypoints.length}</p>
                            \${canDelete ? \`<button onclick="window.deleteCustomPipeline('\${id}')" class="mt-2 w-full py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold">Удалить трассу ✕</button>\` : ''}
                        </div>
                    \`);`;

const newPipePopup = `                    const hCount = p.connectedHousesCount || (p.connectedHouses ? p.connectedHouses.length : 0);
                    const fCount = p.totalFlats || 0;
                    const loadGcal = p.totalLoadGcal || 0;
                    line.bindPopup(\`
                        <div class="text-xs">
                            <h4 class="font-bold \${isPlanned ? 'text-amber-400' : 'text-purple-400'} mb-1">📐 \${p.name}</h4>
                            <p><strong>Маршрут:</strong> \${p.sourceName || 'ТЭЦ'} ➔ \${p.destinationName || 'Сеть'}</p>
                            <p><strong>Диаметр:</strong> ф\${p.diameter} мм | <strong>Длина:</strong> \${p.lengthM} м</p>
                            <p><strong>Статус:</strong> \${isPlanned ? '🟡 Проектируемая (Аналитика)' : '🟢 В работе'}</p>
                            <div class="my-1.5 p-1.5 bg-purple-950/60 rounded border border-purple-800/50 text-[11px]">
                                <div class="text-purple-300 font-bold">🏠 Отапливаемых домов: \${hCount}</div>
                                <div class="text-slate-300">Квартир: \${fCount} | Нагрузка: \${loadGcal} Гкал/ч</div>
                            </div>
                            \${hCount > 0 ? \`<button onclick="window.highlightPipelineHouses('\${id}')" class="w-full py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold mb-1">💡 Подсветить отапливаемые дома</button>\` : ''}
                            \${canDelete ? \`<button onclick="window.deleteCustomPipeline('\${id}')" class="mt-1 w-full py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold">Удалить трассу ✕</button>\` : ''}
                        </div>
                    \`);`;

html = html.replace(oldPipePopup, newPipePopup);

// Helper to highlight pipeline houses
const highlightHelper = `
        window.highlightPipelineHouses = function(pipeId) {
            const p = customPipeLinesData ? customPipeLinesData[pipeId] : null;
            if (!p || !p.connectedHouses || !p.connectedHouses.length) return;
            if (connectedHouseHighlightGroup) connectedHouseHighlightGroup.clearLayers();
            else connectedHouseHighlightGroup = L.layerGroup().addTo(map);

            p.connectedHouses.forEach(h => {
                const glowCircle = L.circleMarker([h.lat, h.lng], {
                    radius: 8,
                    color: '#fbbf24',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.9,
                    weight: 2
                });
                glowCircle.bindTooltip(\`🔥 Запитано от \${p.name}: ул. \${h.street}, д. \${h.house}\`, { direction: 'top' });
                connectedHouseHighlightGroup.addLayer(glowCircle);
            });
        };
        let customPipeLinesData = {};
`;

html = html.replace('function renderCustomPipelines(pipelines) {', 'function renderCustomPipelines(pipelines) {\n            customPipeLinesData = pipelines;');
html = html.replace('// ── 7. UI MODAL UTILS ──', highlightHelper + '\n        // ── 7. UI MODAL UTILS ──');

fs.writeFileSync('indexx.html', html, 'utf8');
console.log('Successfully updated indexx.html with snap-to-source and heated houses selection!');
