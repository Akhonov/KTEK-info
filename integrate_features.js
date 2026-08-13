const fs = require('fs');

// We will recreate index.html from clean base git version, then apply clean top-tier styles
const { execSync } = require('child_process');
execSync('git checkout origin/main -- index.html');

let html = fs.readFileSync('index.html', 'utf8');

// 1. CLEAN MODERN CSS
const customCss = `
        /* ===== KTEK PREMIUM SCADA / GIS DESIGN SYSTEM (NO EMOJIS, ZERO OVERLAP) ===== */
        
        /* 1. TOP-LEFT BRAND & USER PROFILE */
        .app-brand-user {
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 5px 10px 5px 14px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(28, 39, 49, 0.12);
            border-radius: 28px;
            box-shadow: 0 4px 18px rgba(27, 39, 51, 0.14);
            backdrop-filter: blur(12px);
            font-family: inherit;
            height: 46px;
            box-sizing: border-box;
            user-select: none;
        }
        body.dark .app-brand-user {
            background: rgba(30, 41, 51, 0.96);
            border-color: rgba(255, 255, 255, 0.12);
            color: #fff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .brand-logo-text {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.05em;
            color: #ff6b24;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .brand-divider {
            width: 1px;
            height: 20px;
            background: rgba(148, 163, 184, 0.35);
        }
        .user-role-tag {
            font-size: 11px;
            font-weight: 800;
            padding: 3px 9px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .user-role-tag.admin { background: #ede9fe; color: #7c3aed; }
        .user-role-tag.dispatcher { background: #e0f2fe; color: #0284c7; }
        .user-role-tag.brigade { background: #fef3c7; color: #d97706; }
        body.dark .user-role-tag.admin { background: rgba(168,85,247,0.22); color: #c084fc; }
        body.dark .user-role-tag.dispatcher { background: rgba(14,165,233,0.22); color: #38bdf8; }
        body.dark .user-role-tag.brigade { background: rgba(245,158,11,0.22); color: #fbbf24; }

        .user-display-name {
            font-size: 12px;
            font-weight: 600;
            color: #334155;
            max-width: 150px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        body.dark .user-display-name { color: #cbd5e1; }

        .btn-user-logout {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 0;
            background: transparent;
            color: #64748b;
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: all 0.15s;
            margin-left: 2px;
        }
        .btn-user-logout:hover {
            background: rgba(239, 68, 68, 0.12);
            color: #ef4444;
        }
        .btn-user-logout svg { width: 16px; height: 16px; }

        /* 2. UNIFIED TOP-RIGHT MAP TOOLBAR */
        .map-toolbar {
            position: fixed;
            z-index: 1000;
            top: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .map-tool-btn {
            position: relative;
            width: 46px;
            height: 46px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(28, 39, 49, 0.12);
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 3px 14px rgba(27, 39, 51, 0.18);
            color: #263238;
            cursor: pointer;
            transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        body.dark .map-tool-btn {
            background: rgba(37, 46, 51, 0.95);
            color: #fff;
            border-color: #46545b;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }
        .map-tool-btn:hover {
            transform: translateY(-1px);
        }
        .map-tool-btn svg { width: 22px; height: 22px; }

        /* Specific button hover accents */
        .map-tool-btn.btn-tool-incident:hover {
            background: #e32626;
            color: #fff;
            box-shadow: 0 6px 20px rgba(227, 38, 38, 0.38);
        }
        .map-tool-btn.btn-tool-boiler:hover {
            background: #8b5cf6;
            color: #fff;
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.38);
        }
        .map-tool-btn.btn-tool-pipe:hover {
            background: #f59e0b;
            color: #fff;
            box-shadow: 0 6px 20px rgba(245, 158, 11, 0.38);
        }

        /* Tooltip badge for tool buttons */
        .map-tool-btn[data-title]:hover::after {
            content: attr(data-title);
            position: absolute;
            top: 54px;
            right: 0;
            background: rgba(15, 23, 42, 0.92);
            color: #f1f5f9;
            padding: 5px 9px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            z-index: 1050;
        }

        /* 3. CAD TRACING FLOATING PANEL */
        .pipe-drawing-toolbar {
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2000;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid #f59e0b;
            border-radius: 20px;
            padding: 8px 18px;
            box-shadow: 0 16px 36px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 14px;
            color: #fff;
            backdrop-filter: blur(14px);
        }
        .pipe-drawing-toolbar.hidden { display: none !important; }

        .pipe-vertex-pin {
            width: 10px;
            height: 10px;
            background: #f59e0b;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.8);
        }

        /* 4. MODALS & FORMS (CLEAN INDUSTRIAL DESIGN) */
        .ktek-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(2, 6, 23, 0.82);
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
            padding-bottom: 12px;
            border-bottom: 1px solid #334155;
        }
        .ktek-modal-title {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.02em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .ktek-modal-close {
            background: transparent;
            border: 0;
            color: #94a3b8;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            line-height: 1;
        }
        .ktek-modal-close:hover { color: #fff; }

        .ktek-form-group { margin-bottom: 14px; }
        .ktek-form-label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        .ktek-input {
            width: 100%;
            padding: 10px 12px;
            background: rgba(30, 41, 59, 0.9);
            border: 1px solid #475569;
            border-radius: 9px;
            color: #fff;
            font-size: 13px;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.15s;
        }
        .ktek-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
        .ktek-input::placeholder { color: #64748b; }

        .ktek-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ktek-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

        .suggestions-dropdown {
            position: absolute;
            left: 0; right: 0; top: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 9px;
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
            border-radius: 9px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            transition: filter 0.15s;
        }
        .source-draw-pipe-btn:hover { filter: brightness(1.1); }

        /* 5. LOGIN SCREEN */
        .ktek-login-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(8, 14, 23, 0.94);
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
            box-shadow: 0 25px 60px rgba(0,0,0,0.7);
            color: #f1f5f9;
        }
        .ktek-login-head { text-align: center; margin-bottom: 24px; }
        .ktek-login-title { margin: 0; font-size: 20px; font-weight: 800; color: #fff; }
        .ktek-login-sub { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
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
        }
        .ktek-btn-primary:hover { filter: brightness(1.08); }
`;

html = html.replace('</style>', customCss + '\n    </style>');

// 2. CLEAN HTML FOR TOP-LEFT BRAND BAR & MODALS
const modalsAndBrandHtml = `
    <!-- ===== TOP-LEFT BRAND & USER PROFILE BAR ===== -->
    <div class="app-brand-user" id="appBrandUser">
        <div class="brand-logo-text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            КТЭК
        </div>
        <div class="brand-divider"></div>
        <span id="ktekUserBadge" class="user-role-tag dispatcher">Диспетчер</span>
        <span id="ktekUserName" class="user-display-name">Системный оператор</span>
        <button id="ktekLogoutBtn" class="btn-user-logout" title="Сменить аккаунт / Выйти" type="button" onclick="window.ktekLogout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
        </button>
    </div>

    <!-- ===== FIREBASE AUTHENTICATION SCREEN ===== -->
    <div id="ktekLoginOverlay" class="ktek-login-overlay">
        <div class="ktek-login-card">
            <div class="ktek-login-head">
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
                Доступные роли: Администратор, Диспетчер, Выездные бригады
            </div>
        </div>
    </div>

    <!-- ===== FLOATING CAD DRAWING TOOLBAR ===== -->
    <div id="pipeDrawingToolbar" class="pipe-drawing-toolbar hidden">
        <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div>
            <div>
                <div style="font-size:12px;font-weight:800;color:#fbbf24;" id="drawingToolbarTitle">Трассировка трубопровода</div>
                <div style="font-size:11px;color:#cbd5e1;" id="drawingToolbarStats">Кликайте по карте вдоль улиц для прокладки. Точек: 0 | Длина: 0 м</div>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;border-left:1px solid #334155;padding-left:12px;">
            <button onclick="window.ktekUndoDrawPoint()" style="padding:6px 10px;background:#334155;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">Шаг назад</button>
            <button onclick="window.ktekFinishDrawPipe()" style="padding:6px 12px;background:#10b981;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;">Завершить</button>
            <button onclick="window.ktekCancelDrawPipe()" style="padding:6px 10px;background:#ef4444;color:#fff;border:0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">Отмена</button>
        </div>
    </div>

    <!-- ===== FLOATING MAP PICK BANNER ===== -->
    <div id="mapPickBanner" class="pipe-drawing-toolbar hidden" style="border-color:#3b82f6;">
        <span id="mapPickBannerText" style="font-size:12px;font-weight:700;">Кликните на карту, чтобы выбрать точные координаты объекта</span>
        <button onclick="window.ktekCancelMapPick()" style="padding:4px 10px;background:#334155;color:#fff;border:0;border-radius:7px;font-size:11px;cursor:pointer;">Отмена</button>
    </div>

    <!-- ===== MODAL: ДОБАВЛЕНИЕ АВАРИИ ===== -->
    <div id="addIncidentModal" class="ktek-modal-overlay hidden">
        <div class="ktek-modal-card">
            <div class="ktek-modal-header">
                <h3 class="ktek-modal-title" style="color:#ef4444;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Фиксация инцидента / аварии
                </h3>
                <button onclick="window.ktekCloseModal('addIncidentModal')" class="ktek-modal-close">✕</button>
            </div>
            <form onsubmit="window.ktekSubmitIncident(event)">
                <div class="ktek-form-group" style="position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <label class="ktek-form-label" style="margin:0;">Адрес повреждения</label>
                        <button type="button" onclick="window.ktekPickOnMap('incident')" style="background:transparent;border:0;color:#38bdf8;font-size:11px;font-weight:700;cursor:pointer;">Указать на карте</button>
                    </div>
                    <input id="incAddressInput" type="text" class="ktek-input" placeholder="Введите адрес: Баймагамбетова 152..." autocomplete="off" oninput="window.ktekSearchAddress(this.value, 'incident')" required />
                    <div id="incAddressDropdown" class="suggestions-dropdown" style="display:none;"></div>
                </div>
                <input type="hidden" id="incLat" />
                <input type="hidden" id="incLng" />
                <div id="incCoordsStatus" style="font-size:11px;color:#fbbf24;background:rgba(245,158,11,0.1);padding:6px 10px;border-radius:8px;margin-bottom:12px;border:1px solid rgba(245,158,11,0.25);">
                    Выберите адрес из подсказок или укажите точку на карте
                </div>
                <div class="ktek-grid-2" style="margin-bottom:12px;">
                    <div>
                        <label class="ktek-form-label">Тип дефекта</label>
                        <select id="incTypeInput" class="ktek-input">
                            <option value="Порыв магистрали">Порыв магистрали</option>
                            <option value="Свищ в камере ТК">Свищ в камере ТК</option>
                            <option value="Утечка теплоносителя">Утечка теплоносителя</option>
                            <option value="Засор грязевика">Засор грязевика</option>
                            <option value="Неучтенный отбор">Неучтенный отбор</option>
                        </select>
                    </div>
                    <div>
                        <label class="ktek-form-label">Критичность</label>
                        <select id="incSeverityInput" class="ktek-input">
                            <option value="high">Высокая (Критическая)</option>
                            <option value="med">Средняя</option>
                            <option value="low">Низкая (Плановая)</option>
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
                    <label class="ktek-form-label">Примечание дежурного</label>
                    <textarea id="incDescInput" class="ktek-input" rows="2" placeholder="Падение давления в контуре, выход пара на поверхность..."></textarea>
                </div>
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button type="button" onclick="window.ktekCloseModal('addIncidentModal')" style="flex:1;padding:10px;background:#334155;border:0;color:#cbd5e1;border-radius:9px;font-weight:700;cursor:pointer;">Отмена</button>
                    <button type="submit" style="flex:1;padding:10px;background:#ef4444;border:0;color:#fff;border-radius:9px;font-weight:800;cursor:pointer;">Сохранить инцидент</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===== MODAL: ДОБАВЛЕНИЕ КОТЛА / ОБЪЕКТА ===== -->
    <div id="addObjectModal" class="ktek-modal-overlay hidden">
        <div class="ktek-modal-card">
            <div class="ktek-modal-header">
                <h3 class="ktek-modal-title" style="color:#c084fc;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
                        <path d="M4 21V10l7 3V7l7 3V3h2v18H4z"></path>
                    </svg>
                    Добавление теплоисточника / котла
                </h3>
                <button onclick="window.ktekCloseModal('addObjectModal')" class="ktek-modal-close">✕</button>
            </div>
            <form onsubmit="window.ktekSubmitObject(event)">
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Наименование объекта</label>
                    <input id="objNameInput" type="text" class="ktek-input" placeholder="БМK-Юбилейный-2, Котел ст. №7..." required />
                </div>
                <div class="ktek-grid-2" style="margin-bottom:12px;">
                    <div>
                        <label class="ktek-form-label">Тип источника</label>
                        <select id="objTypeInput" class="ktek-input">
                            <option value="bmk">БМК (Блочно-модульная)</option>
                            <option value="boiler">Котлоагрегат ТЭЦ</option>
                            <option value="pump">ПНС (Насосная станция)</option>
                            <option value="ctp">ЦТП / Теплопункт</option>
                        </select>
                    </div>
                    <div>
                        <label class="ktek-form-label">Режим объекта</label>
                        <select id="objStatusInput" class="ktek-input">
                            <option value="active">В работе (Действующий)</option>
                            <option value="planned">Проектируемый (Моделирование)</option>
                        </select>
                    </div>
                </div>
                <div class="ktek-form-group" style="position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <label class="ktek-form-label" style="margin:0;">Адрес привязки</label>
                        <button type="button" onclick="window.ktekPickOnMap('object')" style="background:transparent;border:0;color:#c084fc;font-size:11px;font-weight:700;cursor:pointer;">Указать на карте</button>
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
                <div style="background:rgba(147,51,234,0.12);padding:10px;border-radius:9px;border:1px solid rgba(147,51,234,0.3);margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="objAutoDrawPipe" checked style="width:16px;height:16px;" />
                    <label for="objAutoDrawPipe" style="font-size:11px;color:#e9d5ff;cursor:pointer;">Сразу начать прокладку теплотрассы от этого котла</label>
                </div>
                <div style="display:flex;gap:8px;">
                    <button type="button" onclick="window.ktekCloseModal('addObjectModal')" style="flex:1;padding:10px;background:#334155;border:0;color:#cbd5e1;border-radius:9px;font-weight:700;cursor:pointer;">Отмена</button>
                    <button type="submit" style="flex:1;padding:10px;background:#8b5cf6;border:0;color:#fff;border-radius:9px;font-weight:800;cursor:pointer;">Сохранить объект</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===== MODAL: СОХРАНЕНИЕ СПРОЕКТИРОВАННОЙ ТРАССЫ ===== -->
    <div id="savePipelineModal" class="ktek-modal-overlay hidden">
        <div class="ktek-modal-card">
            <div class="ktek-modal-header">
                <h3 class="ktek-modal-title" style="color:#fbbf24;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
                        <polyline points="3 19 8 7 16 17 21 5"></polyline>
                    </svg>
                    Сохранение участка теплотрассы
                </h3>
                <button onclick="window.ktekCloseModal('savePipelineModal')" class="ktek-modal-close">✕</button>
            </div>
            <form onsubmit="window.ktekSubmitPipeline(event)">
                <div class="ktek-form-group">
                    <label class="ktek-form-label">Наименование трассы</label>
                    <input id="pipeNameInput" type="text" class="ktek-input" placeholder="Магистраль от БМК-Юбилейный..." required />
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:9px;border:1px solid #334155;margin-bottom:12px;font-size:11px;line-height:1.6;">
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Источник:</span><span id="pipeSourceSpan" style="color:#fbbf24;font-weight:700;">—</span></div>
                    <div style="display:flex;justify-content:space-between;color:#94a3b8;"><span>Длина участка:</span><span id="pipeLengthSpan" style="color:#34d399;font-weight:800;">0 м</span></div>
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
                            <option value="planned">Проектируемая (Аналитика)</option>
                            <option value="active">Действующая (В работе)</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button type="button" onclick="window.ktekCloseModal('savePipelineModal')" style="flex:1;padding:10px;background:#334155;border:0;color:#cbd5e1;border-radius:9px;font-weight:700;cursor:pointer;">Продолжить черчение</button>
                    <button type="submit" style="flex:1;padding:10px;background:#f59e0b;border:0;color:#1e293b;border-radius:9px;font-weight:800;cursor:pointer;">Зафиксировать в Twin</button>
                </div>
            </form>
        </div>
    </div>
`;

html = html.replace('<body>', '<body>\n' + modalsAndBrandHtml);

// 3. CLEAN UNIFIED 46px ICON BUTTONS IN .map-toolbar
const unifiedToolbarButtons = `
        <button class="map-tool-btn btn-tool-incident" id="btnOpenAddIncident" type="button" data-title="Фиксация аварии" onclick="window.ktekOpenModal('addIncidentModal')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        </button>
        <button class="map-tool-btn btn-tool-boiler" id="btnOpenAddObject" type="button" data-title="Добавить котел / ТЭЦ" onclick="window.ktekOpenModal('addObjectModal')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 21V10l7 3V7l7 3V3h2v18H4z"></path>
                <circle cx="9" cy="18" r="1.5" fill="currentColor"></circle>
                <circle cx="15" cy="18" r="1.5" fill="currentColor"></circle>
            </svg>
        </button>
        <button class="map-tool-btn btn-tool-pipe" id="btnStartDrawPipe" type="button" data-title="Трассировка сети" onclick="window.ktekStartFreeDrawing()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 19 8 7 16 17 21 5"></polyline>
                <circle cx="3" cy="19" r="2" fill="currentColor"></circle>
                <circle cx="8" cy="7" r="2" fill="currentColor"></circle>
                <circle cx="16" cy="17" r="2" fill="currentColor"></circle>
                <circle cx="21" cy="5" r="2" fill="currentColor"></circle>
            </svg>
        </button>
`;

html = html.replace('<div class="map-toolbar">', '<div class="map-toolbar">\n' + unifiedToolbarButtons);

// 4. DRAW PIPE BUTTON IN CARD
const cardDrawPipeHtml = `
                <button class="source-draw-pipe-btn" id="btnDrawPipeFromCard" type="button" onclick="window.ktekStartDrawFromCard()" hidden>Проложить теплотрассу от этого источника</button>
`;
html = html.replace('<button class="heat-source-delete" id="heatSourceDelete" type="button" hidden>Удалить котельную с карты</button>', '<button class="heat-source-delete" id="heatSourceDelete" type="button" hidden>Удалить котельную с карты</button>\n' + cardDrawPipeHtml);

// 5. FIREBASE SCRIPT LOGIC (NO EMOJIS, CLEAN PROFILE)
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
            const nameSpan = document.getElementById("ktekUserName");
            const btnIncident = document.getElementById("btnOpenAddIncident");
            const btnBoiler = document.getElementById("btnOpenAddObject");
            const btnPipe = document.getElementById("btnStartDrawPipe");

            if (user) {
                let profile = { name: user.email.split('@')[0], role: "dispatcher", email: user.email };
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
                nameSpan.textContent = profile.name || user.email.split('@')[0];

                if (profile.role === "admin") {
                    badge.textContent = "Администратор";
                    badge.className = "user-role-tag admin";
                    btnIncident.hidden = false;
                    btnBoiler.hidden = false;
                    btnPipe.hidden = false;
                } else if (profile.role === "dispatcher") {
                    badge.textContent = "Диспетчер";
                    badge.className = "user-role-tag dispatcher";
                    btnIncident.hidden = false;
                    btnBoiler.hidden = false;
                    btnPipe.hidden = false;
                } else {
                    badge.textContent = profile.name || "Бригада";
                    badge.className = "user-role-tag brigade";
                    btnIncident.hidden = true;
                    btnBoiler.hidden = true;
                    btnPipe.hidden = true;
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
                ? "Кликните на карту в месте аварии / порыва"
                : "Кликните на карту в месте размещения котла / БМК";
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

            if (addressDatabase && addressDatabase.length) {
                for (let item of addressDatabase) {
                    if (item.normalized.includes(q)) {
                        results.push({ name: item.title, lat: item.lat, lng: item.lng });
                        if (results.length >= 7) break;
                    }
                }
            }

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
                document.getElementById("incCoordsStatus").innerHTML = \`Привязано к: <b>\${addr}</b> (\${lat.toFixed(5)}, \${lng.toFixed(5)})\`;
                document.getElementById("incAddressDropdown").style.display = "none";
            } else {
                document.getElementById("objAddressInput").value = addr;
                document.getElementById("objLat").value = lat;
                document.getElementById("objLng").value = lng;
                document.getElementById("objCoordsStatus").style.color = "#c084fc";
                document.getElementById("objCoordsStatus").innerHTML = \`Привязано к: <b>\${addr}</b> (\${lat.toFixed(5)}, \${lng.toFixed(5)})\`;
                document.getElementById("objAddressDropdown").style.display = "none";
            }
        };

        // ── 4. CAD PIPELINE DRAWING ENGINE ──
        window.ktekStartFreeDrawing = function() {
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
                    weight: 4,
                    dashArray: "6, 6",
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

        // ── 6. MAP CLICK HANDLER ──
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
                    document.getElementById("incCoordsStatus").innerHTML = \`Точка на карте: <b>\${lat}, \${lng}</b>\`;
                    if (!document.getElementById("incAddressInput").value) {
                        document.getElementById("incAddressInput").value = \`Точка на карте (\${lat.toFixed(4)}, \${lng.toFixed(4)})\`;
                    }
                    window.ktekOpenModal("addIncidentModal");
                } else if (pickingMode === 'object') {
                    document.getElementById("objLat").value = lat;
                    document.getElementById("objLng").value = lng;
                    document.getElementById("objCoordsStatus").style.color = "#c084fc";
                    document.getElementById("objCoordsStatus").innerHTML = \`Точка на карте: <b>\${lat}, \${lng}</b>\`;
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
                            html: '<div style="width:28px;height:28px;border-radius:50%;background:#e32626;border:2px solid #fff;display:grid;place-items:center;color:#fff;box-shadow:0 0 14px rgba(227,38,38,0.85);"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" style=\"width:14px;height:14px;\"><path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"></path><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"></line><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"></line></svg></div>',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                        });
                        const m = L.marker([inc.lat, inc.lng], { icon }).addTo(map);
                        m.bindPopup(\`
                            <div style="font-size:12px;color:#f1f5f9;">
                                <h4 style="margin:0 0 4px;color:#ef4444;font-weight:800;">\${inc.type}</h4>
                                <p style="margin:2px 0;"><strong>Адрес:</strong> \${inc.address}</p>
                                <p style="margin:2px 0;"><strong>Бригада:</strong> \${inc.brigade}</p>
                                <p style="margin:2px 0;color:#94a3b8;">\${inc.desc || ''}</p>
                                \${(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'dispatcher') ? \`<button onclick="window.ktekDeleteFirebaseItem('incidents/\${id}')" style="margin-top:8px;width:100%;padding:6px;background:#10b981;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer;">Отметить как устранено</button>\` : ''}
                            </div>
                        \`);
                        customIncidentMarkers[id] = m;
                    }
                });
            });

            // B) CUSTOM BOILERS / SOURCES -> REGISTER INTO DIGITAL TWIN
            onValue(ref(fbDb, "custom_objects"), (snap) => {
                const data = snap.val() || {};
                Object.values(customObjectMarkers).forEach(m => map.removeLayer(m));
                for (let k in customObjectMarkers) delete customObjectMarkers[k];

                Object.keys(data).forEach(id => {
                    const obj = data[id];
                    if (obj.lat && obj.lng) {
                        const isPlanned = obj.status === 'planned';
                        const safe = isPlanned ? "#eab308" : "#8b5cf6";

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
                                </span>
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

            // C) CUSTOM PIPELINES -> REGISTER INTO DIGITAL TWIN
            onValue(ref(fbDb, "custom_pipelines"), (snap) => {
                const data = snap.val() || {};
                Object.values(customPipelineLayers).forEach(l => map.removeLayer(l));
                for (let k in customPipelineLayers) delete customPipelineLayers[k];

                Object.keys(data).forEach(id => {
                    const pipe = data[id];
                    if (pipe.waypoints && pipe.waypoints.length >= 2) {
                        const isPlanned = pipe.status === 'planned';
                        const color = isPlanned ? "#eab308" : "#8b5cf6";

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
            if (confirm("Удалить данный элемент из базы?")) {
                await remove(ref(fbDb, path));
            }
        };
    </script>
`;

html = html.replace('</body>', scriptInjection + '\n</body>');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully written clean, emoji-free, premium UI to index.html');
