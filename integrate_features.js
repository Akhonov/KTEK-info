const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. INJECT CSS BEFORE </style>
const customCss = `
        /* ===== KTEK FIREBASE & CAD DRAWING STYLES ===== */
        .ktek-login-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(8, 14, 23, 0.92);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: inherit;
        }
        .ktek-login-overlay.hidden { display: none !important; }

        .ktek-login-card {
            background: rgba(19, 29, 41, 0.98);
            border: 1px solid rgba(64, 85, 107, 0.6);
            border-radius: 20px;
            padding: 32px 28px;
            width: 100%;
            max-width: 380px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.15);
            color: #f1f5f9;
        }

        .ktek-login-head {
            text-align: center;
            margin-bottom: 24px;
        }
        .ktek-login-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 12px;
            border-radius: 16px;
            background: linear-gradient(135deg, #ef4444, #f97316);
            display: grid;
            place-items: center;
            font-size: 26px;
            box-shadow: 0 8px 24px rgba(239, 68, 68, 0.35);
        }
        .ktek-login-title { margin: 0; font-size: 20px; font-weight: 800; color: #fff; }
        .ktek-login-sub { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }

        .ktek-form-group { margin-bottom: 14px; }
        .ktek-form-label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        .ktek-input {
            width: 100%;
            padding: 10px 14px;
            background: rgba(30, 41, 59, 0.9);
            border: 1px solid #475569;
            border-radius: 10px;
            color: #fff;
            font-size: 13px;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ktek-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .ktek-input::placeholder { color: #64748b; }

        .ktek-btn-primary {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            border: 0;
            border-radius: 10px;
            color: #fff;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.15s;
            margin-top: 8px;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        }
        .ktek-btn-primary:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .ktek-btn-primary:active { transform: translateY(0); }
        .ktek-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .ktek-error-box {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #fca5a5;
            padding: 9px 12px;
            border-radius: 8px;
            font-size: 12px;
            margin-bottom: 12px;
            display: none;
        }
        .ktek-error-box.is-visible { display: block; }

        /* USER CONTROL IN TOOLBAR */
        .user-control {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px 4px 12px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(28, 39, 49, 0.12);
            border-radius: 24px;
            box-shadow: 0 3px 14px rgba(27, 39, 51, 0.15);
            height: 46px;
            box-sizing: border-box;
        }
        body.dark .user-control {
            background: rgba(37, 46, 51, 0.95);
            border-color: #46545b;
            color: #fff;
        }
        .user-role-badge {
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 12px;
        }
        .user-role-badge.admin { background: #ede9fe; color: #7c3aed; }
        .user-role-badge.dispatcher { background: #e0f2fe; color: #0284c7; }
        .user-role-badge.brigade { background: #fef3c7; color: #d97706; }
        body.dark .user-role-badge.admin { background: rgba(168,85,247,0.25); color: #c084fc; }
        body.dark .user-role-badge.dispatcher { background: rgba(14,165,233,0.25); color: #38bdf8; }
        body.dark .user-role-badge.brigade { background: rgba(245,158,11,0.25); color: #fbbf24; }

        .user-logout-btn {
            background: transparent;
            border: 0;
            cursor: pointer;
            font-size: 15px;
            padding: 4px;
            border-radius: 50%;
            transition: background 0.15s;
        }
        .user-logout-btn:hover { background: rgba(0,0,0,0.06); }

        /* ACTION TOOLBAR BUTTONS */
        .admin-actions-toolbar {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .toolbar-btn {
            height: 46px;
            padding: 0 14px;
            border: 0;
            border-radius: 23px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 3px 14px rgba(27, 39, 51, 0.18);
            transition: all 0.15s;
            color: #fff;
        }
        .toolbar-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .toolbar-btn.btn-danger { background: #ef4444; }
        .toolbar-btn.btn-purple { background: #9333ea; }
        .toolbar-btn.btn-amber { background: #f59e0b; color: #1e293b; }

        /* FLOATING CAD DRAWING TOOLBAR */
        .pipe-drawing-toolbar {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2000;
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid #f59e0b;
            border-radius: 16px;
            padding: 10px 18px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            gap: 16px;
            color: #fff;
            backdrop-filter: blur(12px);
        }
        .pipe-drawing-toolbar.hidden { display: none !important; }
        .drawing-pulse-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #f59e0b;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
            animation: ping-dot 1.4s infinite;
        }
        @keyframes ping-dot {
            0% { transform: scale(0.9); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.6; }
            100% { transform: scale(0.9); opacity: 1; }
        }

        .pipe-vertex-pin {
            width: 10px;
            height: 10px;
            background: #f59e0b;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.9);
        }

        /* MODAL OVERLAYS */
        .ktek-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(2, 6, 23, 0.85);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .ktek-modal-overlay.hidden { display: none !important; }

        .ktek-modal-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 18px;
            width: 100%;
            max-width: 440px;
            padding: 24px;
            color: #f1f5f9;
            box-shadow: 0 25px 60px rgba(0,0,0,0.65);
        }
        .ktek-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 1px solid #334155;
        }
        .ktek-modal-title { margin: 0; font-size: 16px; font-weight: 800; }
        .ktek-modal-close { background: transparent; border: 0; color: #94a3b8; font-size: 20px; cursor: pointer; }
        .ktek-modal-close:hover { color: #fff; }

        .ktek-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ktek-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

        .suggestions-dropdown {
            position: absolute;
            left: 0; right: 0; top: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 10px;
            max-height: 160px;
            overflow-y: auto;
            z-index: 80;
            box-shadow: 0 12px 30px rgba(0,0,0,0.7);
        }
        .suggestion-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #1e293b;
            font-size: 12px;
            color: #cbd5e1;
        }
        .suggestion-item:hover { background: #1e293b; color: #38bdf8; }

        .source-draw-pipe-btn {
            width: 100%;
            margin-top: 8px;
            padding: 10px;
            background: #f59e0b;
            color: #1e293b;
            border: 0;
            border-radius: 10px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            transition: filter 0.15s;
        }
        .source-draw-pipe-btn:hover { filter: brightness(1.1); }
`;

html = html.replace('</style>', customCss + '\n    </style>');

// 2. INJECT HTML MODALS & TOOLBAR BUTTONS
const modalsHtml = `
    <!-- ===== FIREBASE AUTHENTICATION SCREEN ===== -->
    <div id="ktekLoginOverlay" class="ktek-login-overlay">
        <div class="ktek-login-card">
            <div class="ktek-login-head">
                <div class="ktek-login-icon">🔥</div>
                <h1 class="ktek-login-title">КТЭК Мониторинг</h1>
                <p class="ktek-login-sub">Цифровой Двойник Теплосетей Костаная</p>
            </div>
            <form id="ktekLoginForm" onsubmit="window.ktekHandleLogin(event)">
                <div class="ktek-error-box" id="ktekLoginError"></div>
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Email оператора / инженера</label>
                    <input id="ktekLoginEmail" type="email" class="ktek-input" placeholder="admin@ktek.kz" required autocomplete="email" />
                </div>
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Пароль доступа</label>
                    <input id="ktekLoginPassword" type="password" class="ktek-input" placeholder="••••••••" required autocomplete="current-password" />
                </div>
                <button type="submit" id="ktekLoginSubmitBtn" class="ktek-btn-primary">
                    Войти в систему
                </button>
            </form>
            <div style="margin-top:16px;text-align:center;font-size:11px;color:#64748b;">
                Доступные роли: Администратор, Диспетчер, Выездные бригады 1-5
            </div>
        </div>
    </div>

    <!-- ===== FLOATING CAD DRAWING TOOLBAR ===== -->
    <div id="pipeDrawingToolbar" class="pipe-drawing-toolbar hidden">
        <div style="display:flex;align-items:center;gap:8px;">
            <div class="drawing-pulse-dot"></div>
            <div>
                <div style="font-size:12px;font-weight:800;color:#fbbf24;" id="drawingToolbarTitle">✏️ Проектирование теплотрассы</div>
                <div style="font-size:11px;color:#cbd5e1;" id="drawingToolbarStats">Кликните на карте вдоль улиц для прокладки пути. Точек: 0 | Длина: 0 м</div>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;border-left:1px solid #334155;padding-left:12px;">
            <button onclick="window.ktekUndoDrawPoint()" style="padding:6px 10px;background:#334155;color:#fff;border:0;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">↩️ Шаг назад</button>
            <button onclick="window.ktekFinishDrawPipe()" style="padding:6px 12px;background:#10b981;color:#fff;border:0;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">💾 Сохранить</button>
            <button onclick="window.ktekCancelDrawPipe()" style="padding:6px 10px;background:#ef4444;color:#fff;border:0;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">✕ Отмена</button>
        </div>
    </div>

    <!-- ===== FLOATING MAP PICK BANNER ===== -->
    <div id="mapPickBanner" class="pipe-drawing-toolbar hidden" style="border-color:#3b82f6;">
        <span style="font-size:16px;">📍</span>
        <span id="mapPickBannerText" style="font-size:12px;font-weight:700;">Кликните на карту, чтобы выбрать точные координаты объекта</span>
        <button onclick="window.ktekCancelMapPick()" style="padding:4px 10px;background:#334155;color:#fff;border:0;border-radius:8px;font-size:11px;cursor:pointer;">Отмена</button>
    </div>

    <!-- ===== MODAL: ДОБАВЛЕНИЕ АВАРИИ ===== -->
    <div id="addIncidentModal" class="ktek-modal-overlay hidden">
        <div class="ktek-modal-card">
            <div class="ktek-modal-header">
                <h3 class="ktek-modal-title" style="color:#ef4444;">🚨 Фиксация новой аварии / порыва</h3>
                <button onclick="window.ktekCloseModal('addIncidentModal')" class="ktek-modal-close">✕</button>
            </div>
            <form onsubmit="window.ktekSubmitIncident(event)">
                <div class="ktek-form-group" style="position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <label class="ktek-form-label" style="margin:0;">Адрес аварии</label>
                        <button type="button" onclick="window.ktekPickOnMap('incident')" style="background:transparent;border:0;color:#38bdf8;font-size:11px;font-weight:700;cursor:pointer;">📍 Указать на карте</button>
                    </div>
                    <input id="incAddressInput" type="text" class="ktek-input" placeholder="Начните ввод: Баймагамбетова 152, Абая..." autocomplete="off" oninput="window.ktekSearchAddress(this.value, 'incident')" required />
                    <div id="incAddressDropdown" class="suggestions-dropdown" style="display:none;"></div>
                </div>
                <input type="hidden" id="incLat" />
                <input type="hidden" id="incLng" />
                <div id="incCoordsStatus" style="font-size:11px;color:#fbbf24;background:rgba(245,158,11,0.1);padding:6px 10px;border-radius:8px;margin-bottom:12px;border:1px solid rgba(245,158,11,0.25);">
                    Выберите адрес из подсказок или кликните на карту
                </div>
                <div class="ktek-grid-2" style="margin-bottom:12px;">
                    <div>
                        <label class="ktek-form-label">Тип повреждения</label>
                        <select id="incTypeInput" class="ktek-input">
                            <option value="Порыв магистрали">Порыв магистрали</option>
                            <option value="Свищ в камере ТК">Свищ в камере ТК</option>
                            <option value="Утечка теплоносителя">Утечка теплоносителя</option>
                            <option value="Засор грязевика">Засор грязевика</option>
                            <option value="Неучтенный отбор">Неучтенный отбор</option>
                        </select>
                    </div>
                    <div>
                        <label class="ktek-form-label">Срочность</label>
                        <select id="incSeverityInput" class="ktek-input">
                            <option value="high">Критический (Высокий)</option>
                            <option value="med">Средний</option>
                            <option value="low">Низкий (Плановый)</option>
                        </select>
                    </div>
                </div>
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Назначить выездную бригаду</label>
                    <select id="incBrigadeInput" class="ktek-input">
                        <option value="Бригада №1 (Центр)">Бригада №1 (Центр)</option>
                        <option value="Бригада №2 (КСК)">Бригада №2 (КСК)</option>
                        <option value="Бригада №3 (Запад)">Бригада №3 (Запад)</option>
                        <option value="Бригада №4 (Юбилейный)">Бригада №4 (Юбилейный)</option>
                        <option value="Бригада №5 (Аварийная)">Бригада №5 (Аварийная)</option>
                    </select>
                </div>
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Описание дефекта</label>
                    <textarea id="incDescInput" class="ktek-input" rows="2" placeholder="Зафиксировано падение давления P1, выход пара..."></textarea>
                </div>
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button type="button" onclick="window.ktekCloseModal('addIncidentModal')" style="flex:1;padding:10px;background:#334155;border:0;color:#cbd5e1;border-radius:10px;font-weight:700;cursor:pointer;">Отмена</button>
                    <button type="submit" style="flex:1;padding:10px;background:#ef4444;border:0;color:#fff;border-radius:10px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(239,68,68,0.4);">Сохранить аварию</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===== MODAL: ДОБАВЛЕНИЕ КОТЛА / ОБЪЕКТА ===== -->
    <div id="addObjectModal" class="ktek-modal-overlay hidden">
        <div class="ktek-modal-card">
            <div class="ktek-modal-header">
                <h3 class="ktek-modal-title" style="color:#c084fc;">🏭 Добавить котел / БМК / ТЭЦ</h3>
                <button onclick="window.ktekCloseModal('addObjectModal')" class="ktek-modal-close">✕</button>
            </div>
            <form onsubmit="window.ktekSubmitObject(event)">
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Наименование объекта</label>
                    <input id="objNameInput" type="text" class="ktek-input" placeholder="БМК-Юбилейный-2, Котлоагрегат ст. №7..." required />
                </div>
                <div class="ktek-grid-2" style="margin-bottom:12px;">
                    <div>
                        <label class="ktek-form-label">Тип объекта</label>
                        <select id="objTypeInput" class="ktek-input">
                            <option value="bmk">БМК (Блочно-модульная котельная)</option>
                            <option value="boiler">Котёл (Новый энергоблок)</option>
                            <option value="pump">ПНС (Насосная станция)</option>
                            <option value="ctp">ЦТП / Тепловой пункт</option>
                        </select>
                    </div>
                    <div>
                        <label class="ktek-form-label">Статус / Режим</label>
                        <select id="objStatusInput" class="ktek-input">
                            <option value="active">🟢 В работе (Действующий)</option>
                            <option value="planned">🟡 В планах (Моделирование)</option>
                        </select>
                    </div>
                </div>
                <div class="ktek-form-group" style="position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <label class="ktek-form-label" style="margin:0;">Адрес размещения</label>
                        <button type="button" onclick="window.ktekPickOnMap('object')" style="background:transparent;border:0;color:#c084fc;font-size:11px;font-weight:700;cursor:pointer;">📍 Указать на карте</button>
                    </div>
                    <input id="objAddressInput" type="text" class="ktek-input" placeholder="Начните ввод адреса или укажите на карте..." autocomplete="off" oninput="window.ktekSearchAddress(this.value, 'object')" required />
                    <div id="objAddressDropdown" class="suggestions-dropdown" style="display:none;"></div>
                </div>
                <input type="hidden" id="objLat" />
                <input type="hidden" id="objLng" />
                <div id="objCoordsStatus" style="font-size:11px;color:#fbbf24;background:rgba(245,158,11,0.1);padding:6px 10px;border-radius:8px;margin-bottom:12px;border:1px solid rgba(245,158,11,0.25);">
                    Выберите адрес или укажите точку кликом на карте
                </div>
                <div class="ktek-grid-3" style="margin-bottom:14px;">
                    <div>
                        <label class="ktek-form-label">Мощность</label>
                        <input id="objPowerInput" type="text" class="ktek-input" placeholder="25 Гкал/ч" />
                    </div>
                    <div>
                        <label class="ktek-form-label">Расход (G)</label>
                        <input id="objFlowInput" type="text" class="ktek-input" placeholder="400 т/ч" />
                    </div>
                    <div>
                        <label class="ktek-form-label">Темп. T1</label>
                        <input id="objT1Input" type="text" class="ktek-input" placeholder="95 °C" />
                    </div>
                </div>
                <div style="background:rgba(147,51,234,0.12);padding:10px;border-radius:10px;border:1px solid rgba(147,51,234,0.3);margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="objAutoDrawPipe" checked style="width:16px;height:16px;" />
                    <label for="objAutoDrawPipe" style="font-size:11px;color:#e9d5ff;cursor:pointer;">Сразу начать рисование теплотрассы от этого котла ✏️</label>
                </div>
                <div style="display:flex;gap:8px;">
                    <button type="button" onclick="window.ktekCloseModal('addObjectModal')" style="flex:1;padding:10px;background:#334155;border:0;color:#cbd5e1;border-radius:10px;font-weight:700;cursor:pointer;">Отмена</button>
                    <button type="submit" style="flex:1;padding:10px;background:#9333ea;border:0;color:#fff;border-radius:10px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(147,51,234,0.4);">Сохранить объект</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===== MODAL: СОХРАНЕНИЕ СПРОЕКТИРОВАННОЙ ТРАССЫ ===== -->
    <div id="savePipelineModal" class="ktek-modal-overlay hidden">
        <div class="ktek-modal-card">
            <div class="ktek-modal-header">
                <h3 class="ktek-modal-title" style="color:#fbbf24;">📐 Сохранить спроектированную теплотрассу</h3>
                <button onclick="window.ktekCloseModal('savePipelineModal')" class="ktek-modal-close">✕</button>
            </div>
            <form onsubmit="window.ktekSubmitPipeline(event)">
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Наименование трассы</label>
                    <input id="pipeNameInput" type="text" class="ktek-input" placeholder="Магистраль от БМК-Юбилейный..." required />
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:10px;border:1px solid #334155;margin-bottom:12px;font-size:11px;line-height:1.6;">
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Источник:</span><span id="pipeSourceSpan" style="color:#fbbf24;font-weight:700;">—</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Общая длина пути:</span><span id="pipeLengthSpan" style="color:#34d399;font-weight:800;">0 м</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Точек поворота:</span><span id="pipePointsSpan" style="color:#f1f5f9;font-weight:700;">0</span></div>
                </div>
                <div class="ktek-grid-2" style="margin-bottom:14px;">
                    <div>
                        <label class="ktek-form-label">Диаметр трубы</label>
                        <select id="pipeDiameterInput" class="ktek-input">
                            <option value="530">ф530 мм (Магистраль)</option>
                            <option value="426">ф426 мм (Магистраль)</option>
                            <option value="325" selected>ф325 мм (Распределительная)</option>
                            <option value="219">ф219 мм (Квартальная)</option>
                            <option value="159">ф159 мм (Вводная)</option>
                            <option value="108">ф108 мм (Подводящая)</option>
                        </select>
                    </div>
                    <div>
                        <label class="ktek-form-label">Статус трассы</label>
                        <select id="pipeStatusInput" class="ktek-input">
                            <option value="planned">🟡 Проектируемая (Аналитика)</option>
                            <option value="active">🟢 Действующая (В работе)</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button type="button" onclick="window.ktekCloseModal('savePipelineModal')" style="flex:1;padding:10px;background:#334155;border:0;color:#cbd5e1;border-radius:10px;font-weight:700;cursor:pointer;">Продолжить черчение</button>
                    <button type="submit" style="flex:1;padding:10px;background:#d97706;border:0;color:#fff;border-radius:10px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(217,119,6,0.4);">Зафиксировать в Twin</button>
                </div>
            </form>
        </div>
    </div>
`;

html = html.replace('<body>', '<body>\n' + modalsHtml);

// 3. INJECT TOOLBAR ACTION BUTTONS INTO .map-toolbar
const toolbarButtonsHtml = `
        <div class="user-control" id="ktekUserControl">
            <span id="ktekUserBadge" class="user-role-badge dispatcher">Диспетчер</span>
            <button id="ktekLogoutBtn" class="user-logout-btn" title="Сменить аккаунт / Выйти" type="button" onclick="window.ktekLogout()">🚪</button>
        </div>
        <div class="admin-actions-toolbar" id="ktekAdminActions">
            <button class="toolbar-btn btn-danger" type="button" onclick="window.ktekOpenModal('addIncidentModal')" title="Зафиксировать аварию">🚨 + Авария</button>
            <button class="toolbar-btn btn-purple" type="button" onclick="window.ktekOpenModal('addObjectModal')" title="Добавить котел / ТЭЦ">🏭 + Котел</button>
            <button class="toolbar-btn btn-amber" type="button" onclick="window.ktekStartFreeDrawing()" title="Нарисовать трассу">✏️ Трасса</button>
        </div>
`;

html = html.replace('<div class="map-toolbar">', '<div class="map-toolbar">\n' + toolbarButtonsHtml);

// 4. INJECT DRAW PIPE BUTTON IN CARD
const cardDrawPipeHtml = `
                <button class="source-draw-pipe-btn" id="btnDrawPipeFromCard" type="button" onclick="window.ktekStartDrawFromCard()" hidden>✏️ Нарисовать трассу от этого источника</button>
`;
html = html.replace('<button class="heat-source-delete" id="heatSourceDelete" type="button" hidden>Удалить котельную с карты</button>', '<button class="heat-source-delete" id="heatSourceDelete" type="button" hidden>Удалить котельную с карты</button>\n' + cardDrawPipeHtml);

// 5. INJECT FIREBASE MODULE & CAD ENGINE SCRIPT BEFORE </body>
const scriptInjection = `
    <!-- Firebase SDK (ESM) & KTEK Digital Twin Extension -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getDatabase, ref, get, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

        const firebaseConfig = {
            apiKey: "AIzaSyD4kVWah6OImJwTFUi2hKN5NdEEY6zfdcs",
            authDomain: "ktek-698db.firebaseapp.com",
            databaseURL: "https://ktek-698db-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "ktek-698db",
            storageBucket: "ktek-698db.firebasestorage.app",
            messagingSenderId: "411782902337",
            appId: "1:411782902337:web:341325fa6d56cbd937ccc0"
        };

        const fbApp = initializeApp(firebaseConfig);
        const fbAuth = getAuth(fbApp);
        const fbDb = getDatabase(fbApp);

        let currentUserProfile = null;
        let isDrawingPipe = false;
        let drawingPoints = [];
        let drawingSource = { id: null, name: "Спроектированная трасса", lat: null, lng: null };
        let activeDrawingPolyline = null;
        let drawingVertexMarkers = L.layerGroup().addTo(map);
        let pickingMode = null;
        let tempPickMarker = null;

        const customIncidentMarkers = {};
        const customObjectMarkers = {};
        const customPipelineLayers = {};

        // ── 1. AUTHENTICATION ──
        onAuthStateChanged(fbAuth, async (user) => {
            const overlay = document.getElementById("ktekLoginOverlay");
            const badge = document.getElementById("ktekUserBadge");
            const actions = document.getElementById("ktekAdminActions");

            if (user) {
                let profile = { name: user.email, role: "dispatcher", email: user.email };
                try {
                    const snap = await get(ref(fbDb, "users"));
                    if (snap.exists()) {
                        const usersData = snap.val();
                        for (let k in usersData) {
                            if (usersData[k].email && usersData[k].email.toLowerCase() === user.email.toLowerCase()) {
                                profile = { ...profile, ...usersData[k] };
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.warn("User profile fetch error:", e);
                }

                currentUserProfile = profile;
                overlay.classList.add("hidden");

                if (profile.role === "admin") {
                    badge.textContent = "Администратор: " + (profile.name || user.email);
                    badge.className = "user-role-badge admin";
                    actions.hidden = false;
                } else if (profile.role === "dispatcher") {
                    badge.textContent = "Диспетчер: " + (profile.name || user.email);
                    badge.className = "user-role-badge dispatcher";
                    actions.hidden = false;
                } else {
                    badge.textContent = profile.name || "Бригада";
                    badge.className = "user-role-badge brigade";
                    actions.hidden = true;
                }

                listenFirebaseRealtime();
            } else {
                overlay.classList.remove("hidden");
                currentUserProfile = null;
            }
        });

        window.ktekHandleLogin = async function(e) {
            e.preventDefault();
            const email = document.getElementById("ktekLoginEmail").value.trim();
            const pass = document.getElementById("ktekLoginPassword").value;
            const btn = document.getElementById("ktekLoginSubmitBtn");
            const err = document.getElementById("ktekLoginError");

            btn.disabled = true;
            btn.textContent = "Проверка...";
            err.classList.remove("is-visible");

            try {
                await signInWithEmailAndPassword(fbAuth, email, pass);
            } catch (error) {
                const msgs = {
                    "auth/user-not-found": "Пользователь с таким email не найден.",
                    "auth/wrong-password": "Неверный пароль.",
                    "auth/invalid-credential": "Неверный логин или пароль."
                };
                err.textContent = msgs[error.code] || ("Ошибка: " + error.message);
                err.classList.add("is-visible");
            } finally {
                btn.disabled = false;
                btn.textContent = "Войти в систему";
            }
        };

        window.ktekLogout = async function() {
            await signOut(fbAuth);
        };

        // ── 2. MODAL & MAP PICKING UTILS ──
        window.ktekOpenModal = (id) => document.getElementById(id).classList.remove("hidden");
        window.ktekCloseModal = (id) => {
            document.getElementById(id).classList.add("hidden");
            document.getElementById("incAddressDropdown").style.display = "none";
            document.getElementById("objAddressDropdown").style.display = "none";
        };

        window.ktekPickOnMap = (mode) => {
            pickingMode = mode;
            window.ktekCloseModal(mode === 'incident' ? 'addIncidentModal' : 'addObjectModal');
            document.getElementById("mapPickBanner").classList.remove("hidden");
            document.getElementById("mapPickBannerText").textContent = mode === 'incident'
                ? "Кликните мышкой на карту в месте аварии / порыва"
                : "Кликните мышкой на карту в месте размещения котла / БМК";
        };

        window.ktekCancelMapPick = () => {
            pickingMode = null;
            document.getElementById("mapPickBanner").classList.add("hidden");
        };

        // ── 3. ADDRESS AUTOCOMPLETE SEARCH ──
        window.ktekSearchAddress = function(query, target) {
            const dropdown = document.getElementById(target === 'incident' ? 'incAddressDropdown' : 'objAddressDropdown');
            if (!query || query.trim().length < 2) {
                dropdown.style.display = "none";
                return;
            }

            const q = normalizeSearch(query);
            const results = [];

            // Search in addressDatabase loaded on the map
            if (addressDatabase && addressDatabase.length) {
                for (let item of addressDatabase) {
                    if (item.normalized.includes(q)) {
                        results.push({ name: item.title, lat: item.lat, lng: item.lng });
                        if (results.length >= 7) break;
                    }
                }
            }

            // Also search in allHeatSources and selectableObjects
            if (results.length < 7 && selectableObjects.length) {
                for (let targetObj of selectableObjects) {
                    const name = targetObj.object.name || "";
                    if (normalizeSearch(name).includes(q) && targetObj.latlng) {
                        results.push({ name: name, lat: targetObj.latlng.lat, lng: targetObj.latlng.lng });
                        if (results.length >= 7) break;
                    }
                }
            }

            if (!results.length) {
                dropdown.style.display = "none";
                return;
            }

            dropdown.innerHTML = results.map(r => \`
                <div class="suggestion-item" onclick="window.ktekSelectAddress('\${r.name.replace(/'/g, "\\\\'")}', \${r.lat}, \${r.lng}, '\${target}')">
                    \${r.name}
                </div>
            \`).join("");
            dropdown.style.display = "block";
        };

        window.ktekSelectAddress = function(addr, lat, lng, target) {
            if (target === 'incident') {
                document.getElementById("incAddressInput").value = addr;
                document.getElementById("incLat").value = lat;
                document.getElementById("incLng").value = lng;
                document.getElementById("incCoordsStatus").style.color = "#34d399";
                document.getElementById("incCoordsStatus").innerHTML = \`✅ Привязано к: <b>\${addr}</b> (\${lat.toFixed(5)}, \${lng.toFixed(5)})\`;
                document.getElementById("incAddressDropdown").style.display = "none";
            } else {
                document.getElementById("objAddressInput").value = addr;
                document.getElementById("objLat").value = lat;
                document.getElementById("objLng").value = lng;
                document.getElementById("objCoordsStatus").style.color = "#c084fc";
                document.getElementById("objCoordsStatus").innerHTML = \`✅ Привязано к: <b>\${addr}</b> (\${lat.toFixed(5)}, \${lng.toFixed(5)})\`;
                document.getElementById("objAddressDropdown").style.display = "none";
            }
        };

        // ── 4. CAD PIPELINE DRAWING ENGINE ──
        window.ktekStartFreeDrawing = function() {
            isDrawingPipe = true;
            drawingPoints = [];
            drawingSource = { id: null, name: "Спроектированная трасса", lat: null, lng: null };
            document.getElementById("drawingToolbarTitle").textContent = "✏️ Режим черчения трассы";
            document.getElementById("pipeDrawingToolbar").classList.remove("hidden");
            renderDrawingState();
        };

        window.ktekStartDrawFromSource = function(id, name, lat, lng) {
            isDrawingPipe = true;
            drawingPoints = [[lat, lng]];
            drawingSource = { id, name, lat, lng };
            document.getElementById("drawingToolbarTitle").textContent = "✏️ Трасса от: " + name;
            document.getElementById("pipeDrawingToolbar").classList.remove("hidden");
            renderDrawingState();
        };

        window.ktekStartDrawFromCard = function() {
            if (!activeCardObjectId) return;
            const target = selectableObjects.find(item => item.object.id === activeCardObjectId);
            if (target && target.latlng) {
                closeCard();
                window.ktekStartDrawFromSource(target.object.id, target.object.name, target.latlng.lat, target.latlng.lng);
            }
        };

        function renderDrawingState() {
            drawingVertexMarkers.clearLayers();
            if (!drawingPoints.length) {
                document.getElementById("drawingToolbarStats").textContent = "Кликните на карту для установки начальной точки трассы.";
                if (activeDrawingPolyline) { map.removeLayer(activeDrawingPolyline); activeDrawingPolyline = null; }
                return;
            }

            drawingPoints.forEach(pt => {
                const icon = L.divIcon({
                    className: "",
                    html: '<div class="pipe-vertex-pin"></div>',
                    iconSize: [10, 10],
                    iconAnchor: [5, 5]
                });
                L.marker(pt, { icon }).addTo(drawingVertexMarkers);
            });

            if (drawingPoints.length >= 2) {
                if (activeDrawingPolyline) map.removeLayer(activeDrawingPolyline);
                activeDrawingPolyline = L.polyline(drawingPoints, {
                    color: "#f59e0b",
                    weight: 5,
                    dashArray: "8, 8",
                    opacity: 0.95
                }).addTo(map);

                let totalM = 0;
                for (let i = 0; i < drawingPoints.length - 1; i++) {
                    totalM += map.distance(drawingPoints[i], drawingPoints[i + 1]);
                }
                const dist = Math.round(totalM);
                document.getElementById("drawingToolbarStats").innerHTML = \`Точек: <b>\${drawingPoints.length}</b> | Длина: <b style="color:#34d399;">\${dist} м</b>\`;
            } else {
                document.getElementById("drawingToolbarStats").textContent = "Начальная точка установлена. Кликайте далее вдоль улицы.";
            }
        }

        window.ktekUndoDrawPoint = function() {
            if (drawingPoints.length > 0) {
                drawingPoints.pop();
                renderDrawingState();
            }
        };

        window.ktekCancelDrawPipe = function() {
            isDrawingPipe = false;
            drawingPoints = [];
            if (activeDrawingPolyline) { map.removeLayer(activeDrawingPolyline); activeDrawingPolyline = null; }
            drawingVertexMarkers.clearLayers();
            document.getElementById("pipeDrawingToolbar").classList.add("hidden");
        };

        window.ktekFinishDrawPipe = function() {
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

        window.ktekSubmitPipeline = async function(e) {
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
        };

        // ── 5. SUBMIT OBJECT & INCIDENT ──
        window.ktekSubmitIncident = async function(e) {
            e.preventDefault();
            const lat = parseFloat(document.getElementById("incLat").value);
            const lng = parseFloat(document.getElementById("incLng").value);
            if (!lat || !lng) {
                alert("Пожалуйста, выберите адрес из подсказок или укажите точку на карте!");
                return;
            }
            const newInc = {
                address: document.getElementById("incAddressInput").value,
                lat, lng,
                type: document.getElementById("incTypeInput").value,
                severity: document.getElementById("incSeverityInput").value,
                brigade: document.getElementById("incBrigadeInput").value,
                desc: document.getElementById("incDescInput").value,
                createdAt: new Date().toISOString(),
                author: currentUserProfile?.email || "Admin"
            };
            await push(ref(fbDb, "incidents"), newInc);
            window.ktekCloseModal("addIncidentModal");
            document.getElementById("incAddressInput").value = "";
            document.getElementById("incDescInput").value = "";
            if (tempPickMarker) { map.removeLayer(tempPickMarker); tempPickMarker = null; }
            map.setView([lat, lng], 16);
        };

        window.ktekSubmitObject = async function(e) {
            e.preventDefault();
            const lat = parseFloat(document.getElementById("objLat").value);
            const lng = parseFloat(document.getElementById("objLng").value);
            const autoDraw = document.getElementById("objAutoDrawPipe").checked;

            if (!lat || !lng) {
                alert("Пожалуйста, выберите адрес из подсказок или укажите точку на карте!");
                return;
            }

            const newObj = {
                name: document.getElementById("objNameInput").value,
                address: document.getElementById("objAddressInput").value,
                type: document.getElementById("objTypeInput").value,
                status: document.getElementById("objStatusInput").value,
                power: document.getElementById("objPowerInput").value || "20 Гкал/ч",
                flow: document.getElementById("objFlowInput").value || "400 т/ч",
                t1: document.getElementById("objT1Input").value || "95 °C",
                lat, lng,
                createdAt: new Date().toISOString(),
                author: currentUserProfile?.email || "Admin"
            };

            const newRef = await push(ref(fbDb, "custom_objects"), newObj);
            window.ktekCloseModal("addObjectModal");
            document.getElementById("objNameInput").value = "";
            document.getElementById("objAddressInput").value = "";
            if (tempPickMarker) { map.removeLayer(tempPickMarker); tempPickMarker = null; }
            map.setView([lat, lng], 15);

            if (autoDraw) {
                window.ktekStartDrawFromSource(newRef.key, newObj.name, lat, lng);
            }
        };

        // ── 6. MAP CLICK HANDLER (INTEGRATED) ──
        map.on("click", (e) => {
            const lat = Number(e.latlng.lat.toFixed(6));
            const lng = Number(e.latlng.lng.toFixed(6));

            if (isDrawingPipe) {
                drawingPoints.push([lat, lng]);
                renderDrawingState();
                return;
            }

            if (pickingMode) {
                if (tempPickMarker) map.removeLayer(tempPickMarker);
                tempPickMarker = L.marker([lat, lng]).addTo(map);

                if (pickingMode === 'incident') {
                    document.getElementById("incLat").value = lat;
                    document.getElementById("incLng").value = lng;
                    document.getElementById("incCoordsStatus").style.color = "#34d399";
                    document.getElementById("incCoordsStatus").innerHTML = \`📍 Точка на карте: <b>\${lat}, \${lng}</b>\`;
                    if (!document.getElementById("incAddressInput").value) {
                        document.getElementById("incAddressInput").value = \`Точка на карте (\${lat.toFixed(4)}, \${lng.toFixed(4)})\`;
                    }
                    window.ktekOpenModal("addIncidentModal");
                } else if (pickingMode === 'object') {
                    document.getElementById("objLat").value = lat;
                    document.getElementById("objLng").value = lng;
                    document.getElementById("objCoordsStatus").style.color = "#c084fc";
                    document.getElementById("objCoordsStatus").innerHTML = \`📍 Точка на карте: <b>\${lat}, \${lng}</b>\`;
                    if (!document.getElementById("objAddressInput").value) {
                        document.getElementById("objAddressInput").value = \`Участок (\${lat.toFixed(4)}, \${lng.toFixed(4)})\`;
                    }
                    window.ktekOpenModal("addObjectModal");
                }
                window.ktekCancelMapPick();
            }
        });

        // ── 7. FIREBASE REAL-TIME SYNC + DIGITAL TWIN HOOKS ──
        function listenFirebaseRealtime() {
            // A) INCIDENTS
            onValue(ref(fbDb, "incidents"), (snap) => {
                const data = snap.val() || {};
                Object.values(customIncidentMarkers).forEach(m => map.removeLayer(m));
                for (let k in customIncidentMarkers) delete customIncidentMarkers[k];

                Object.keys(data).forEach(id => {
                    const inc = data[id];
                    if (inc.lat && inc.lng) {
                        const icon = L.divIcon({
                            className: "",
                            html: '<div style="width:32px;height:32px;border-radius:50%;background:#ef4444;border:2px solid #fff;display:grid;place-items:center;font-size:16px;color:#fff;box-shadow:0 0 16px rgba(239,68,68,0.9);animation:ping-dot 1.8s infinite;">🚨</div>',
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });
                        const m = L.marker([inc.lat, inc.lng], { icon }).addTo(map);
                        m.bindPopup(\`
                            <div style="font-size:12px;">
                                <h4 style="margin:0 0 4px;color:#ef4444;font-weight:800;">🚨 \${inc.type}</h4>
                                <p style="margin:2px 0;"><strong>Адрес:</strong> \${inc.address}</p>
                                <p style="margin:2px 0;"><strong>Бригада:</strong> \${inc.brigade}</p>
                                <p style="margin:2px 0;color:#64748b;">\${inc.desc || ''}</p>
                                \${(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'dispatcher') ? \`<button onclick="window.ktekDeleteFirebaseItem('incidents/\${id}')" style="margin-top:6px;width:100%;padding:4px;background:#10b981;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer;">Отметить как устранено ✅</button>\` : ''}
                            </div>
                        \`);
                        customIncidentMarkers[id] = m;
                    }
                });
            });

            // B) CUSTOM BOILERS / SOURCES -> REGISTER INTO DIGITAL TWIN!
            onValue(ref(fbDb, "custom_objects"), (snap) => {
                const data = snap.val() || {};
                Object.values(customObjectMarkers).forEach(m => map.removeLayer(m));
                for (let k in customObjectMarkers) delete customObjectMarkers[k];

                Object.keys(data).forEach(id => {
                    const obj = data[id];
                    if (obj.lat && obj.lng) {
                        const isPlanned = obj.status === 'planned';
                        const safe = isPlanned ? "#eab308" : "#9333ea";

                        const customSourceObj = {
                            id: "custom_" + id,
                            name: obj.name,
                            shortName: obj.name.slice(0, 8),
                            address: obj.address || "г. Костанай",
                            lat: obj.lat,
                            lng: obj.lng,
                            type: "Теплоисточник",
                            isHeatSource: true,
                            color: safe,
                            accuracy: "manual",
                            folder: isPlanned ? "Проектируемые котельные" : "Действующие котельные",
                            description: \`Мощность: \${obj.power || '20 Гкал/ч'}, Расход: \${obj.flow || '400 т/ч'}, Режим: \${isPlanned ? 'В планах (Моделирование)' : 'В работе'}\`,
                            defects: []
                        };

                        const icon = L.divIcon({
                            className: \`heat-source-marker\${isPlanned ? ' is-approximate' : ''}\`,
                            html: \`<span class="heat-source-marker__pin" style="--source-color:\${safe};">
                                <span class="heat-source-marker__icon">
                                    <svg viewBox="0 0 32 32" fill="none"><path d="M4 27V14l8 4v-5l7 4V7h5v12l4 2v6H4Z" fill="currentColor"/><path d="M8 23h3m3 0h3m3 0h3M22 4h4" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
                                </span>\${isPlanned ? '<span class="heat-source-marker__badge">★</span>' : ''}
                            </span><span class="heat-source-marker__label">\${customSourceObj.shortName}</span>\`,
                            iconSize: [48, 48],
                            iconAnchor: [24, 24],
                            tooltipAnchor: [0, -28]
                        });

                        const marker = L.marker([obj.lat, obj.lng], { icon, title: obj.name }).addTo(heatSourcesLayer);

                        const target = {
                            kind: "point",
                            object: customSourceObj,
                            type: "Теплоисточник",
                            layer: marker,
                            latlng: L.latLng(obj.lat, obj.lng)
                        };

                        selectableObjects.push(target);
                        customObjectMarkers[id] = marker;

                        marker.on("click", (event) => {
                            if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
                            openCard(customSourceObj, "Теплоисточник", marker);
                            const drawBtn = document.getElementById("btnDrawPipeFromCard");
                            if (drawBtn) drawBtn.hidden = false;
                        });

                        // REGISTER INTO DIGITAL TWIN!
                        if (digitalTwin && digitalTwin.registerObject) {
                            digitalTwin.registerObject({
                                id: customSourceObj.id,
                                name: customSourceObj.name,
                                type: "Теплоисточник",
                                hasActiveDefect: false,
                                downstreamObjects: []
                            });
                        }
                    }
                });
            });

            // C) CUSTOM PIPELINES -> REGISTER INTO DIGITAL TWIN!
            onValue(ref(fbDb, "custom_pipelines"), (snap) => {
                const data = snap.val() || {};
                Object.values(customPipelineLayers).forEach(l => map.removeLayer(l));
                for (let k in customPipelineLayers) delete customPipelineLayers[k];

                Object.keys(data).forEach(id => {
                    const pipe = data[id];
                    if (pipe.waypoints && pipe.waypoints.length >= 2) {
                        const isPlanned = pipe.status === 'planned';
                        const color = isPlanned ? "#eab308" : "#9333ea";

                        const customPipeObj = {
                            id: "custom_pipe_" + id,
                            name: pipe.name,
                            color: color,
                            weight: pipe.diameter >= 400 ? 5 : 3.5,
                            folder: isPlanned ? "Проектируемые теплотрассы" : "Спроектированные магистрали",
                            description: \`Спроектированная трасса от \${pipe.sourceName || 'источника'}. Диаметр ф\${pipe.diameter} мм, длина: \${pipe.lengthM} м.\`,
                            defects: []
                        };

                        const polyline = L.polyline(pipe.waypoints, {
                            color: color,
                            weight: customPipeObj.weight,
                            dashArray: isPlanned ? "8, 8" : null,
                            opacity: 0.92
                        }).addTo(networkLayer);

                        const target = {
                            kind: "line",
                            object: customPipeObj,
                            type: "Участок тепловой сети",
                            layer: polyline,
                            baseStyle: { color, weight: customPipeObj.weight, opacity: 0.92 }
                        };

                        selectableObjects.push(target);
                        customPipelineLayers[id] = polyline;

                        polyline.on("click", (event) => {
                            if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
                            openCard(customPipeObj, "Участок тепловой сети", polyline);
                        });

                        // REGISTER INTO DIGITAL TWIN!
                        if (digitalTwin && digitalTwin.registerObject) {
                            digitalTwin.registerObject({
                                id: customPipeObj.id,
                                name: customPipeObj.name,
                                type: "Участок тепловой сети",
                                hasActiveDefect: false,
                                downstreamObjects: []
                            });
                        }
                    }
                });
            });
        }

        window.ktekDeleteFirebaseItem = async function(path) {
            if (confirm("Вы уверены, что хотите удалить данный элемент из базы?")) {
                await remove(ref(fbDb, path));
            }
        };
    </script>
`;

html = html.replace('</body>', scriptInjection + '\n</body>');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully injected Firebase Auth, CAD Tracing, and Digital Twin integration into index.html!');
