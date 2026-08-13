const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. UPDATE CSS FOR GLOWING HOUSES IN index.html
const extraCss = `
        /* Стили для подключенных домов */
        .connected-house-glow {
            animation: house-glow 1.5s infinite alternate;
        }
        @keyframes house-glow {
            from { box-shadow: 0 0 4px #38bdf8; }
            to { box-shadow: 0 0 16px #38bdf8, 0 0 24px #38bdf8; }
        }
`;
html = html.replace('</style>', extraCss + '\n    </style>');

// 2. UPDATE DRAWING TOOLBAR IN index.html
const oldToolbar = `<div id="pipeDrawingToolbar" class="pipe-drawing-toolbar hidden">
        <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div>
            <div>
                <div style="font-size:12px;font-weight:800;color:#fbbf24;" id="drawingToolbarTitle">Трассировка трубопровода</div>
                <div style="font-size:11px;color:#cbd5e1;" id="drawingToolbarStats">Кликайте по карте вдоль улиц для прокладки. Точек: 0 | Длина: 0 м</div>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;border-left:1px solid #334155;padding-left:12px;">
            <button id="btnUndoDrawPoint" style="padding:6px 10px;background:#334155;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">Шаг назад</button>
            <button id="btnFinishDrawPipe" style="padding:6px 12px;background:#10b981;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;">Завершить</button>
            <button id="btnCancelDrawPipe" style="padding:6px 10px;background:#ef4444;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">Отмена</button>
        </div>
    </div>`;

const newToolbar = `<div id="pipeDrawingToolbar" class="pipe-drawing-toolbar hidden" style="flex-direction:column;align-items:stretch;max-width:580px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div>
                <div>
                    <div style="font-size:12px;font-weight:800;color:#fbbf24;display:flex;align-items:center;gap:6px;" id="drawingToolbarTitle">
                        <span>Трассировка:</span>
                        <span id="drawingConnectionBadge" style="background:#0f172a;color:#38bdf8;padding:2px 8px;border-radius:6px;border:1px solid #334155;font-size:11px;">Кликните на стартовую ТЭЦ</span>
                    </div>
                    <div style="font-size:11px;color:#cbd5e1;" id="drawingToolbarStats">Кликайте по карте вдоль улиц для прокладки. Точек: 0 | Длина: 0 м</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;border-left:1px solid #334155;padding-left:12px;">
                <button id="btnUndoDrawPoint" style="padding:6px 10px;background:#334155;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">Шаг назад</button>
                <button id="btnFinishDrawPipe" style="padding:6px 12px;background:#10b981;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;">Завершить</button>
                <button id="btnCancelDrawPipe" style="padding:6px 10px;background:#ef4444;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">✕</button>
            </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #334155;padding-top:6px;margin-top:4px;font-size:11px;">
            <span style="color:#94a3b8;">💡 Кликните на конечную ТЭЦ для авто-завершения пути</span>
            <div style="display:flex;align-items:center;gap:6px;">
                <button type="button" id="btnAutoCaptureHouses" style="padding:3px 8px;background:rgba(2,132,199,0.25);color:#38bdf8;border:1px solid rgba(2,132,199,0.5);border-radius:6px;font-size:11px;cursor:pointer;">
                    Автозахват домов (150м)
                </button>
                <button type="button" id="btnToggleHousePicker" style="padding:3px 8px;background:rgba(147,51,234,0.25);color:#c084fc;border:1px solid rgba(147,51,234,0.5);border-radius:6px;font-size:11px;cursor:pointer;">
                    Выбрать дома (<span id="selectedHousesBadge">0</span>)
                </button>
            </div>
        </div>
    </div>`;

html = html.replace(oldToolbar, newToolbar);

// 3. UPDATE SAVE MODAL IN index.html
const oldSaveModal = `<div style="background:#0f172a;padding:10px;border-radius:9px;border:1px solid #334155;margin-bottom:12px;font-size:11px;line-height:1.6;">
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Источник:</span><span id="pipeSourceSpan" style="color:#fbbf24;font-weight:700;">—</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Длина участка:</span><span id="pipeLengthSpan" style="color:#34d399;font-weight:800;">0 м</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Точек поворота:</span><span id="pipePointsSpan" style="color:#f1f5f9;font-weight:700;">0</span></div>
                </div>`;

const newSaveModal = `<div style="background:#0f172a;padding:10px;border-radius:9px;border:1px solid #334155;margin-bottom:12px;font-size:11px;line-height:1.6;">
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Начало (Источник):</span><span id="pipeSourceSpan" style="color:#fbbf24;font-weight:700;">—</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Конец (Приёмник):</span><span id="pipeTargetSpan" style="color:#38bdf8;font-weight:700;">—</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Длина участка:</span><span id="pipeLengthSpan" style="color:#34d399;font-weight:800;">0 м</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Точек поворота:</span><span id="pipePointsSpan" style="color:#f1f5f9;font-weight:700;">0</span></div>
                    <div style="display:flex;justify-content:space-between;color:#c084fc;padding-top:4px;border-top:1px solid #1e293b;font-weight:700;"><span>Отапливаемых домов:</span><span id="pipeHousesSpan">0 (0 квартир)</span></div>
                    <div style="display:flex;justify-content:space-between;color:#fbbf24;"><span>Тепловая нагрузка:</span><span id="pipeLoadSpan">0.0 Гкал/ч</span></div>
                </div>
                <div style="background:#0f172a;padding:8px;border-radius:9px;border:1px solid #334155;max-height:80px;overflow-y:auto;margin-bottom:12px;font-size:10px;" id="connectedHousesTagList">
                    <span style="color:#64748b;">Нет выбранных домов</span>
                </div>`;

html = html.replace(oldSaveModal, newSaveModal);

// 4. UPDATE SCRIPT LOGIC
const scriptBlockToReplace = `        let currentUserProfile = null;
        let isDrawingPipe = false;
        let drawingPoints = [];
        let drawingSource = { id: null, name: "Спроектированная трасса", lat: null, lng: null };
        let activeDrawingPolyline = null;
        let drawingVertexMarkers = L.layerGroup().addTo(map);
        let pickingMode = null;
        let tempPickMarker = null;

        const customIncidentMarkers = {};
        const customObjectMarkers = {};
        const customPipelineLayers = {};`;

const newScriptBlock = `        let currentUserProfile = null;
        let isDrawingPipe = false;
        let drawingPoints = [];
        let drawingSource = { id: null, name: "Спроектированная трасса", lat: null, lng: null };
        let drawingDestination = { id: null, name: "Конечный узел", lat: null, lng: null };
        let activeDrawingPolyline = null;
        let drawingVertexMarkers = L.layerGroup().addTo(map);
        let connectedHouseHighlightGroup = L.layerGroup().addTo(map);
        let selectedHousesForPipe = new Map();
        let isSelectingHousesMode = false;
        let pickingMode = null;
        let tempPickMarker = null;

        const customIncidentMarkers = {};
        const customObjectMarkers = {};
        const customPipelineLayers = {};
        let customPipeLinesData = {};

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

        window.autoCaptureHousesAlongRoute = function(radiusM = 150) {
            if (drawingPoints.length < 2) {
                alert("Сначала проложите линию трассы на карте!");
                return;
            }
            selectedHousesForPipe.clear();
            connectedHouseHighlightGroup.clearLayers();

            if (dependentHouseCatalog) {
                dependentHouseCatalog.forEach(h => {
                    if (!h.position) return;
                    const hLatLng = h.position;
                    let minDistance = Infinity;

                    for (let i = 0; i < drawingPoints.length - 1; i++) {
                        const d = getDistanceToSegmentM(hLatLng, drawingPoints[i], drawingPoints[i + 1]);
                        if (d < minDistance) minDistance = d;
                    }

                    if (minDistance <= radiusM) {
                        selectedHousesForPipe.set(h.key || h.address, {
                            address: h.address,
                            flats: h.flats || 1,
                            floors: h.floors || 1,
                            lat: h.position[0],
                            lng: h.position[1]
                        });
                    }
                });
            }

            renderConnectedHousesHighlights();
            updateDrawingStatsUI();
        };

        window.toggleHouseSelectionMode = function() {
            isSelectingHousesMode = !isSelectingHousesMode;
            const btn = document.getElementById("btnToggleHousePicker");
            if (btn) {
                btn.style.background = isSelectingHousesMode ? "rgba(147,51,234,0.8)" : "rgba(147,51,234,0.25)";
            }
            if (isSelectingHousesMode) {
                alert("Режим выбора домов активен! Кликайте по карте/зданиям для привязки к этой теплотрассе.");
            }
        };

        function renderConnectedHousesHighlights() {
            connectedHouseHighlightGroup.clearLayers();
            selectedHousesForPipe.forEach(h => {
                const glowCircle = L.circleMarker([h.lat, h.lng], {
                    radius: 7,
                    color: "#c084fc",
                    fillColor: "#a855f7",
                    fillOpacity: 0.85,
                    weight: 2
                });
                glowCircle.bindTooltip(\`🏠 \${h.address} (\${h.flats} кв.)\`, { direction: "top" });
                connectedHouseHighlightGroup.addLayer(glowCircle);
            });
        }

        function updateDrawingStatsUI() {
            const badge = document.getElementById("selectedHousesBadge");
            if (badge) badge.textContent = selectedHousesForPipe.size;

            let totalM = 0;
            for (let i = 0; i < drawingPoints.length - 1; i++) {
                totalM += map.distance(drawingPoints[i], drawingPoints[i + 1]);
            }
            const dist = Math.round(totalM);

            let totalFlats = 0;
            selectedHousesForPipe.forEach(h => totalFlats += (h.flats || 1));
            const totalLoad = (totalFlats * 0.0035).toFixed(2);

            const statsEl = document.getElementById("drawingToolbarStats");
            if (statsEl) {
                statsEl.innerHTML = \`Точек: <b>\${drawingPoints.length}</b> | Длина: <b style="color:#34d399;">\${dist} м</b> | Домов: <b style="color:#c084fc;">\${selectedHousesForPipe.size}</b> (\${totalFlats} кв., \${totalLoad} Гкал/ч)\`;
            }

            const hSpan = document.getElementById("pipeHousesSpan");
            if (hSpan) hSpan.textContent = \`\${selectedHousesForPipe.size} (\${totalFlats} квартир)\`;

            const loadSpan = document.getElementById("pipeLoadSpan");
            if (loadSpan) loadSpan.textContent = \`\${totalLoad} Гкал/ч\`;

            const tagList = document.getElementById("connectedHousesTagList");
            if (tagList) {
                if (selectedHousesForPipe.size === 0) {
                    tagList.innerHTML = '<span style="color:#64748b;">Нет выбранных домов</span>';
                } else {
                    let tags = [];
                    selectedHousesForPipe.forEach(h => {
                        tags.push(\`<span style="background:#1e1b4b;color:#c084fc;padding:2px 6px;border-radius:4px;border:1px solid #4338ca;margin-right:4px;">\${h.address}</span>\`);
                    });
                    tagList.innerHTML = tags.slice(0, 12).join("") + (tags.length > 12 ? \`<span style="color:#94a3b8;"> + ещё \${tags.length - 12}</span>\` : "");
                }
            }
        }

        window.handleSourceClickInDrawing = function(id, name, lat, lng) {
            if (!isDrawingPipe) {
                window.ktekStartDrawFromSource(id, name, lat, lng);
                return;
            }

            if (drawingPoints.length === 0) {
                drawingSource = { id, name, lat, lng };
                drawingPoints = [[lat, lng]];
                const badge = document.getElementById("drawingConnectionBadge");
                if (badge) badge.textContent = "Старт: " + name;
                renderDrawingState();
                return;
            }

            // Target source snap!
            drawingDestination = { id, name, lat, lng };
            drawingPoints.push([lat, lng]);
            const badge = document.getElementById("drawingConnectionBadge");
            if (badge) badge.textContent = drawingSource.name + " ➔ " + name;
            renderDrawingState();
            window.autoCaptureHousesAlongRoute(150);

            setTimeout(() => {
                window.ktekFinishDrawPipe();
            }, 300);
        };`;

html = html.replace(scriptBlockToReplace, newScriptBlock);

// 5. ATTACH BUTTONS IN SCRIPT
const buttonAttachCode = `        document.getElementById("btnAutoCaptureHouses").addEventListener("click", () => window.autoCaptureHousesAlongRoute(150));
        document.getElementById("btnToggleHousePicker").addEventListener("click", () => window.toggleHouseSelectionMode());`;
html = html.replace('document.getElementById("btnDrawPipeFromCard").addEventListener("click", () => window.ktekStartDrawFromCard());', 'document.getElementById("btnDrawPipeFromCard").addEventListener("click", () => window.ktekStartDrawFromCard());\n' + buttonAttachCode);

// 6. UPDATE START & FINISH METHODS IN SCRIPT
const oldStartMethods = `        window.ktekStartFreeDrawing = function() {
            isDrawingPipe = true;
            drawingPoints = [];
            drawingSource = { id: null, name: "Спроектированная трасса", lat: null, lng: null };
            document.getElementById("drawingToolbarTitle").textContent = "Трассировка сети";
            document.getElementById("pipeDrawingToolbar").classList.remove("hidden");
            renderDrawingState();
        };

        window.ktekStartDrawFromSource = function(id, name, lat, lng) {
            isDrawingPipe = true;
            drawingPoints = [[lat, lng]];
            drawingSource = { id, name, lat, lng };
            document.getElementById("drawingToolbarTitle").textContent = "Трасса от: " + name;
            document.getElementById("pipeDrawingToolbar").classList.remove("hidden");
            renderDrawingState();
        };`;

const newStartMethods = `        window.ktekStartFreeDrawing = function() {
            isDrawingPipe = true;
            drawingPoints = [];
            drawingSource = { id: null, name: "Спроектированный ввод", lat: null, lng: null };
            drawingDestination = { id: null, name: "Конечный узел", lat: null, lng: null };
            selectedHousesForPipe.clear();
            connectedHouseHighlightGroup.clearLayers();
            const badge = document.getElementById("drawingConnectionBadge");
            if (badge) badge.textContent = "Кликните на стартовую ТЭЦ";
            document.getElementById("pipeDrawingToolbar").classList.remove("hidden");
            renderDrawingState();
        };

        window.ktekStartDrawFromSource = function(id, name, lat, lng) {
            isDrawingPipe = true;
            drawingPoints = [[lat, lng]];
            drawingSource = { id, name, lat, lng };
            drawingDestination = { id: null, name: "Конечный узел", lat: null, lng: null };
            selectedHousesForPipe.clear();
            connectedHouseHighlightGroup.clearLayers();
            const badge = document.getElementById("drawingConnectionBadge");
            if (badge) badge.textContent = "Старт: " + name;
            document.getElementById("pipeDrawingToolbar").classList.remove("hidden");
            renderDrawingState();
        };`;

html = html.replace(oldStartMethods, newStartMethods);

// 7. UPDATE FINISH AND SUBMIT
const oldFinishMethods = `        window.ktekFinishDrawPipe = function() {
            if (drawingPoints.length < 2) {
                alert("Поставьте как минимум 2 точки на карте для прокладки трубопровода!");
                return;
            }
            let totalM = 0;
            for (let i = 0; i < drawingPoints.length - 1; i++) {
                totalM += map.distance(drawingPoints[i], drawingPoints[i + 1]);
            }
            const dist = Math.round(totalM);
            document.getElementById("pipeSourceSpan").textContent = drawingSource.name;
            document.getElementById("pipeLengthSpan").textContent = dist + " м";
            document.getElementById("pipePointsSpan").textContent = drawingPoints.length;
            document.getElementById("pipeNameInput").value = "Магистраль от " + drawingSource.name;
            window.ktekOpenModal("savePipelineModal");
        };

        document.getElementById("pipelineForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            let totalM = 0;
            for (let i = 0; i < drawingPoints.length - 1; i++) {
                totalM += map.distance(drawingPoints[i], drawingPoints[i + 1]);
            }

            const newPipe = {
                name: document.getElementById("pipeNameInput").value,
                sourceName: drawingSource.name,
                sourceId: drawingSource.id,
                diameter: parseInt(document.getElementById("pipeDiameterInput").value) || 325,
                status: document.getElementById("pipeStatusInput").value,
                lengthM: Math.round(totalM),
                waypoints: drawingPoints,
                createdAt: new Date().toISOString(),
                author: currentUserProfile?.email || "Admin"
            };

            await push(ref(fbDb, "custom_pipelines"), newPipe);
            window.ktekCloseModal("savePipelineModal");
            window.ktekCancelDrawPipe();
        });`;

const newFinishMethods = `        window.ktekFinishDrawPipe = function() {
            if (drawingPoints.length < 2) {
                alert("Поставьте как минимум 2 точки на карте для прокладки трубопровода!");
                return;
            }
            let totalM = 0;
            for (let i = 0; i < drawingPoints.length - 1; i++) {
                totalM += map.distance(drawingPoints[i], drawingPoints[i + 1]);
            }
            const dist = Math.round(totalM);
            document.getElementById("pipeSourceSpan").textContent = drawingSource.name;
            document.getElementById("pipeTargetSpan").textContent = drawingDestination.name;
            document.getElementById("pipeLengthSpan").textContent = dist + " м";
            document.getElementById("pipePointsSpan").textContent = drawingPoints.length;

            if (selectedHousesForPipe.size === 0) {
                window.autoCaptureHousesAlongRoute(150);
            }
            updateDrawingStatsUI();

            const defaultTitle = drawingDestination.id
                ? \`Связка: \${drawingSource.name} ➔ \${drawingDestination.name}\`
                : \`Магистраль от \${drawingSource.name}\`;
            document.getElementById("pipeNameInput").value = defaultTitle;
            window.ktekOpenModal("savePipelineModal");
        };

        document.getElementById("pipelineForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            let totalM = 0;
            for (let i = 0; i < drawingPoints.length - 1; i++) {
                totalM += map.distance(drawingPoints[i], drawingPoints[i + 1]);
            }

            const connectedHousesArray = [];
            selectedHousesForPipe.forEach(h => connectedHousesArray.push(h));

            let totalFlats = 0;
            connectedHousesArray.forEach(h => totalFlats += (h.flats || 1));
            const totalLoadGcal = parseFloat((totalFlats * 0.0035).toFixed(2));

            const newPipe = {
                name: document.getElementById("pipeNameInput").value,
                sourceName: drawingSource.name,
                sourceId: drawingSource.id,
                destinationName: drawingDestination.name,
                destinationId: drawingDestination.id,
                diameter: parseInt(document.getElementById("pipeDiameterInput").value) || 325,
                status: document.getElementById("pipeStatusInput").value,
                lengthM: Math.round(totalM),
                waypoints: drawingPoints,
                connectedHouses: connectedHousesArray,
                connectedHousesCount: connectedHousesArray.length,
                totalFlats: totalFlats,
                totalLoadGcal: totalLoadGcal,
                createdAt: new Date().toISOString(),
                author: currentUserProfile?.email || "Admin"
            };

            await push(ref(fbDb, "custom_pipelines"), newPipe);
            window.ktekCloseModal("savePipelineModal");
            window.ktekCancelDrawPipe();
        });`;

html = html.replace(oldFinishMethods, newFinishMethods);

// 8. UPDATE PIPELINE RENDERING IN index.html
const oldPipelineRender = `                        polyline.on("click", (event) => {
                            if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
                            openCard(customPipeObj, "Участок тепловой сети", polyline);
                        });`;

const newPipelineRender = `                        customPipeLinesData[id] = pipe;
                        polyline.on("click", (event) => {
                            if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
                            openCard(customPipeObj, "Участок тепловой сети", polyline);
                            if (pipe.connectedHouses && pipe.connectedHouses.length) {
                                window.highlightPipelineHouses(id);
                            }
                        });`;

html = html.replace(oldPipelineRender, newPipelineRender);

// Add highlight helper
const highlightHelper = `
        window.highlightPipelineHouses = function(pipeId) {
            const p = customPipeLinesData ? customPipeLinesData[pipeId] : null;
            if (!p || !p.connectedHouses || !p.connectedHouses.length) return;
            connectedHouseHighlightGroup.clearLayers();

            p.connectedHouses.forEach(h => {
                const glowCircle = L.circleMarker([h.lat, h.lng], {
                    radius: 8,
                    color: "#fbbf24",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.9,
                    weight: 2
                });
                glowCircle.bindTooltip(\`🔥 Запитано от \${p.name}: \${h.address}\`, { direction: "top" });
                connectedHouseHighlightGroup.addLayer(glowCircle);
            });
        };
`;
html = html.replace('window.ktekDeleteFirebaseItem = async function', highlightHelper + '\n        window.ktekDeleteFirebaseItem = async function');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with snap-to-source and heated houses!');
