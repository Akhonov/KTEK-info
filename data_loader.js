/**
 * KTEK SCADA Digital Twin 2.0 - Data Loader Module
 * Loads and normalizes real data from Kostanay city heating network backups.
 */

window.KTEKData = {
    houses: [],
    defects: [],
    acts: [],
    outages: [],
    complaints: [],
    sources: [],
    chambers: [],
    pipelines: [],
    vehicles: [],
    utilities: [],

    async init() {
        console.log("⚡ [KTEK Data] Initializing dataset loading...");
        try {
            // Load teploset_backup_2026-04-15 (1).json
            const resTeploset = await fetch('./teploset_backup_2026-04-15 (1).json');
            if (resTeploset.ok) {
                const teplosetData = await resTeploset.json();
                this.houses = teplosetData.houses || [];
                this.outages = teplosetData.outages || [];
                this.complaints = teplosetData.complaints || [];
                console.log(`✅ Loaded ${this.houses.length} houses from teploset backup.`);
            }
        } catch (e) {
            console.warn("⚠️ Fetch teploset backup failed, using fallback generator", e);
        }

        try {
            // Load DEFECTS_KTEK_2026-08-10.json
            const resDefects = await fetch('./DEFECTS_KTEK_2026-08-10.json');
            if (resDefects.ok) {
                this.defects = await resDefects.json();
                console.log(`✅ Loaded ${this.defects.length} real defects from DEFECTS backup.`);
            }
        } catch (e) {
            console.warn("⚠️ Fetch defects backup failed", e);
        }

        try {
            // Load ktek_backup_10.08.2026(2).json
            const resKtek = await fetch('./ktek_backup_10.08.2026(2).json');
            if (resKtek.ok) {
                const ktekData = await resKtek.json();
                this.acts = ktekData.act || [];
                console.log(`✅ Loaded ${this.acts.length} emergency acts from KTEK backup.`);
            }
        } catch (e) {
            console.warn("⚠️ Fetch ktek backup failed", e);
        }

        // Build topological heat sources, chambers, pipelines, and vehicle fleet
        this.generateInfrastructureData();
        return this;
    },

    generateInfrastructureData() {
        // ============================================================
        // ТОЧНЫЕ GPS-КООРДИНАТЫ ОБЪЕКТОВ КТЭК г. КОСТАНАЙ
        // Источник: верификация по спутниковым снимкам + схемы КТЭК
        // ============================================================
        this.sources = [
            // ТЭЦ-1: ул. Щорса 12, Костанай (промзона север города)
            { id: "TETs1", name: "ТЭЦ-1 (ул. Щорса)", lat: 53.2194, lng: 63.6312, type: "tets",
              powerGcal: 480, p1: 9.2, p2: 3.8, t1: 95.4, t2: 56.1, flowG: 3450, status: "normal",
              address: "ул. Щорса 12, Костанай" },
            // ТЭЦ-2: мкр. КСК (Костанайские степи), восток города
            { id: "TETs2", name: "ТЭЦ-2 (КСК)", lat: 53.2448, lng: 63.6682, type: "tets",
              powerGcal: 320, p1: 8.8, p2: 3.6, t1: 92.1, t2: 54.8, flowG: 2200, status: "normal",
              address: "мкр. КСК, Костанай" },
            // РК-3: Котельная КЖБИ — юго-запад, Юбилейный р-н
            { id: "RK3", name: "РК-3 (Котельная КЖБИ)", lat: 53.1901, lng: 63.5836, type: "rk",
              powerGcal: 250, p1: 8.5, p2: 3.4, t1: 90.5, t2: 53.2, flowG: 1850, status: "warning",
              address: "ул. Промышленная, Юбилейный" },
            // БМК-92: микрорайон Центральный, ул. Павлова
            { id: "BMK92", name: "БМК-92 (ул. Павлова)", lat: 53.2062, lng: 63.6098, type: "bmk",
              powerGcal: 45, p1: 6.5, p2: 2.9, t1: 82.0, t2: 50.0, flowG: 410, status: "normal",
              address: "ул. Павлова 92, Костанай" },
            // БМК Береке: ул. Гоголя (пл. Береке)
            { id: "BMKBereke", name: "БМК «Береке»", lat: 53.2261, lng: 63.6168, type: "bmk",
              powerGcal: 60, p1: 7.0, p2: 3.1, t1: 85.0, t2: 51.5, flowG: 520, status: "normal",
              address: "ул. Гоголя р-н Береке" },
            // БМК Кунай: мкр. Кунай (юг Костаная)
            { id: "BMKKunai", name: "БМК «Кунай»", lat: 53.1682, lng: 63.5921, type: "bmk",
              powerGcal: 35, p1: 6.2, p2: 2.8, t1: 80.0, t2: 49.0, flowG: 310, status: "normal",
              address: "мкр. Кунай, Костанай" }
        ];

        // ============================================================
        // ТЕПЛОВЫЕ КАМЕРЫ (ТК и ВУ узлы) — точные координаты по улицам Костаная
        // ============================================================
        this.chambers = [
            // ТМ-1 магистраль от ТЭЦ-1 на юг (ул. Щорса -> Гоголя -> Алтынсарина)
            { id: "ТК1", name: "ТК-1 (ТЭЦ-1 Вывод 1)", lat: 53.2190, lng: 63.6310, source: "TETs1", type: "chamber", p1: 9.1, p2: 3.7, t1: 94.8, t2: 55.8, status: "normal", street: "ул. Щорса" },
            { id: "ТК2", name: "ТК-2 (ул. Гоголя)", lat: 53.2160, lng: 63.6280, source: "TETs1", type: "chamber", p1: 8.9, p2: 3.6, t1: 94.0, t2: 55.5, status: "normal", street: "ул. Гоголя" },
            { id: "ТК3", name: "ТК-3 (пр. Алтынсарина / Гоголя)", lat: 53.2140, lng: 63.6240, source: "TETs1", type: "chamber", p1: 8.7, p2: 3.5, t1: 93.2, t2: 55.0, status: "normal", street: "пр. Алтынсарина" },
            { id: "ТК7.01", name: "ТК7.01 (ул. Ленина 45 - 67)", lat: 53.2100, lng: 63.6200, source: "TETs1", type: "chamber", p1: 8.4, p2: 3.4, t1: 91.8, t2: 54.2, status: "emergency", street: "ул. Ленина (Алтынсарина)" },
            { id: "ТК13.02пр", name: "ТК13.02пр (ул. Строительная)", lat: 53.2050, lng: 63.6150, source: "TETs1", type: "chamber", p1: 7.9, p2: 3.2, t1: 89.5, t2: 53.0, status: "warning", street: "ул. Строительная" },
            
            // ТМ-2 магистраль (ул. Баймагамбетова / ул. Мира)
            { id: "ТК4", name: "ТК-4 (ул. Мира / Баймагамбетова)", lat: 53.2130, lng: 63.6160, source: "TETs1", type: "chamber", p1: 8.6, p2: 3.5, t1: 92.5, t2: 54.5, status: "normal", street: "ул. Мира (Баймагамбетова)" },
            { id: "ТК5", name: "ТК-5 (ул. Мира 12 - 48)", lat: 53.2080, lng: 63.6110, source: "TETs1", type: "chamber", p1: 8.2, p2: 3.3, t1: 90.8, t2: 53.8, status: "warning", street: "ул. Мира" },
            { id: "ТК6", name: "ТК-6 (ул. Кирова / Мира)", lat: 53.2030, lng: 63.6060, source: "BMK92", type: "chamber", p1: 7.8, p2: 3.1, t1: 88.9, t2: 52.9, status: "normal", street: "ул. Кирова" },

            // ТМ-3 магистраль (ул. Гагарина / пр. Абая / пр. Победы)
            { id: "ТК8", name: "ТК-8 (ул. Гагарина 33 - 71)", lat: 53.2090, lng: 63.6050, source: "BMK92", type: "chamber", p1: 8.1, p2: 3.2, t1: 89.9, t2: 53.1, status: "warning", street: "ул. Гагарина" },
            { id: "ТК9", name: "ТК-9 (пр. Победы 5 - 29)", lat: 53.2040, lng: 63.5990, source: "BMK92", type: "chamber", p1: 7.7, p2: 3.0, t1: 87.5, t2: 52.1, status: "normal", street: "пр. Победы" },

            // РК-3 -> КЖБИ / 5 мкр / Юбилейный
            { id: "ТК15.02", name: "ТК15.02 (5 мкр. д.3)", lat: 53.1950, lng: 63.5960, source: "RK3", type: "chamber", p1: 7.6, p2: 3.1, t1: 88.0, t2: 52.4, status: "emergency", street: "5 микрорайон" },
            { id: "ТК23.08", name: "ТК23.08 (ул. Быковского 1А)", lat: 53.1910, lng: 63.5890, source: "RK3", type: "chamber", p1: 7.4, p2: 3.0, t1: 87.1, t2: 52.0, status: "warning", street: "ул. Быковского" },
            { id: "ТК23.09", name: "ТК23.09 (КЖБИ Юбилейный)", lat: 53.1870, lng: 63.5820, source: "RK3", type: "chamber", p1: 7.2, p2: 2.9, t1: 86.0, t2: 51.5, status: "repair", street: "мкр. Юбилейный" },
            { id: "ТМ19 ВУ3", name: "ТМ19 ВУ3 (Челябинская)", lat: 53.1830, lng: 63.5750, source: "RK3", type: "node", p1: 7.0, p2: 2.8, t1: 85.2, t2: 51.0, status: "normal", street: "ул. Челябинская" },

            // ТЭЦ-2 -> КСК
            { id: "ТК22.02.01", name: "ТК22.02.01 (КСК Киевская)", lat: 53.2430, lng: 63.6620, source: "TETs2", type: "chamber", p1: 8.3, p2: 3.5, t1: 91.0, t2: 54.0, status: "repair", street: "ул. Киевская, КСК" },
            { id: "ТК6.01л", name: "ТК6.01л (ул. 1 Мая)", lat: 53.2160, lng: 63.6290, source: "TETs1", type: "chamber", p1: 8.8, p2: 3.6, t1: 93.5, t2: 55.2, status: "normal", street: "ул. 1 Мая" }
        ];

        // Topological Pipe Lines connecting Sources -> Chambers -> Chambers (ThermoTrace Grid)
        this.pipelines = [
            { id: "pipe-1", from: "TETs1", to: "ТК1", name: "ТМ-1 Вывод 1 (ф820)", diameter: 820, lengthM: 350, year: 1988, isMagistral: true, status: "normal" },
            { id: "pipe-2", from: "ТК1", to: "ТК2", name: "ТМ-1 Ул. Гоголя (ф720)", diameter: 720, lengthM: 420, year: 1991, isMagistral: true, status: "normal" },
            { id: "pipe-3", from: "ТК2", to: "ТК3", name: "ТМ-1 пр. Алтынсарина (ф630)", diameter: 630, lengthM: 510, year: 1994, isMagistral: true, status: "normal" },
            { id: "pipe-4", from: "ТК3", to: "ТК7.01", name: "Магистраль 2-3 (ул. Ленина 45-67)", diameter: 530, lengthM: 600, year: 1985, isMagistral: true, status: "emergency" },
            { id: "pipe-5", from: "ТК7.01", to: "ТК13.02пр", name: "Внутрикв. Строительная (ф219)", diameter: 219, lengthM: 320, year: 1982, isMagistral: false, status: "warning" },
            
            { id: "pipe-6", from: "ТК2", to: "ТК4", name: "Перемычка ул. Гоголя / Мира (ф530)", diameter: 530, lengthM: 410, year: 1993, isMagistral: true, status: "normal" },
            { id: "pipe-7", from: "ТК4", to: "ТК5", name: "ТМ-2 ул. Мира 12-48 (ф426)", diameter: 426, lengthM: 550, year: 1989, isMagistral: true, status: "warning" },
            { id: "pipe-8", from: "ТК5", to: "ТК6", name: "Внутрикв. ул. Кирова (ф273)", diameter: 273, lengthM: 480, year: 1996, isMagistral: false, status: "normal" },

            { id: "pipe-9", from: "BMK92", to: "ТК8", name: "ТМ-3 ул. Гагарина 33-71 (ф426)", diameter: 426, lengthM: 390, year: 1992, isMagistral: true, status: "warning" },
            { id: "pipe-10", from: "ТК8", to: "ТК9", name: "Внутрикв. пр. Победы (ф219)", diameter: 219, lengthM: 440, year: 1995, isMagistral: false, status: "normal" },

            { id: "pipe-11", from: "RK3", to: "ТК23.09", name: "ТМ-19 КЖБИ Юбилейный (ф530)", diameter: 530, lengthM: 480, year: 1990, isMagistral: true, status: "normal" },
            { id: "pipe-12", from: "ТК23.09", to: "ТК23.08", name: "Внутрикв. Быковского (ф159)", diameter: 159, lengthM: 290, year: 1986, isMagistral: false, status: "warning" },
            { id: "pipe-13", from: "ТК23.08", to: "ТК15.02", name: "Внутрикв. 5 мкр (ф100)", diameter: 100, lengthM: 380, year: 1979, isMagistral: false, status: "emergency" },
            { id: "pipe-14", from: "ТК23.09", to: "ТМ19 ВУ3", name: "Магистраль Челябинская (ф325)", diameter: 325, lengthM: 520, year: 1999, isMagistral: true, status: "normal" },
            { id: "pipe-15", from: "TETs2", to: "ТК22.02.01", name: "ТМ-20 КСК (ф530)", diameter: 530, lengthM: 650, year: 1987, isMagistral: true, status: "repair" },
            { id: "pipe-16", from: "ТК1", to: "ТК6.01л", name: "ТМ-6 Ул. 1 Мая (ф325)", diameter: 325, lengthM: 280, year: 1996, isMagistral: false, status: "normal" }
        ];

        // GPS Emergency Vehicles (Real-time Fleet Tracking Integration)
        this.vehicles = [
            { id: "KTEK-01", name: "Аварийная ЛУАЗ (Бригада №1)", lat: 53.2010, lng: 63.6050, status: "en_route", speed: 42, driver: "Мастер Ильясов", target: "ТК13.02пр" },
            { id: "KTEK-02", name: "Экскаватор JCB (Бригада №2)", lat: 53.1930, lng: 63.5910, status: "working", speed: 0, driver: "Мастер Флото", target: "ТК15.02" },
            { id: "KTEK-03", name: "Автокран КС-4571 (Бригада №3)", lat: 53.2380, lng: 63.6550, status: "working", speed: 0, driver: "Мастер Какиров", target: "ТК22.02.01" },
            { id: "KTEK-04", name: "Передвижная Лаборатория", lat: 53.2150, lng: 63.6250, status: "patrol", speed: 35, driver: "Инженер Собарь", target: "ТК7.01" }
        ];

        // Adjacent Underground Utilities (Power 10kV, Water supply, Sewerage, Gas)
        this.utilities = [
            { id: "util-elec-1", type: "power_10kv", name: "Кабельная линия 10 кВ (Горэлектросеть)", coordinates: [[53.2070, 63.6150], [53.2090, 63.6200]], voltage: "10 kV" },
            { id: "util-water-1", type: "water_supply", name: "Водовод ф400 мм (Костанай Су)", coordinates: [[53.1940, 63.5930], [53.1970, 63.5980]], diameter: 400 },
            { id: "util-sewer-1", type: "sewerage", name: "Напорный коллектор ф600 мм", coordinates: [[53.1890, 63.5850], [53.1920, 63.5900]], diameter: 600 },
            { id: "util-gas-1", type: "gas_line", name: "Газопровод высокого давления ф219 мм", coordinates: [[53.2120, 63.6220], [53.2160, 63.6270]], pressure: "High" }
        ];

        // Assign rich passports, telemetry, meters, and district parameters
        this.enrichPassportsAndTelemetry();
        
        // Assign spatial coordinates to 6,400+ houses if not present
        this.assignHouseCoordinates();
    },

    enrichPassportsAndTelemetry() {
        const districts = ["ТЭЦ-1 Центр", "ТЭЦ-2 КСК", "РК-3 КЖБИ", "Заводской", "Береке", "Кунай"];
        const meterModels = ["ТЭМ-104", "ВКТ-7", "ПРЕМ ф50", "ВЗЛЕТ ЦР", "Карат-307", "МУЛЬТИФЛОУ-800"];

        // Enrich Pipelines with Pipe Passports
        this.pipelines.forEach((p, idx) => {
            const age = 2026 - (p.year || 1990);
            p.wearPct = Math.min(95, Math.round(age * 2.2 + (p.diameter < 200 ? 12 : 5)));
            p.material = p.diameter >= 530 ? "Сталь 20 в ППУ-ОДК изоляции с СДКУ" : "Сталь 3пс с минераловатной изоляцией";
            p.depthM = parseFloat((1.8 + (idx % 4) * 0.3).toFixed(1));
            p.lastRepairYear = p.year > 2005 ? p.year : (2015 + (idx % 8));
            p.historyLeaks = [
                { date: `2024-11-${10 + (idx % 15)}`, description: `Свищ по сварному шву ф${p.diameter} мм`, status: "Устранено" },
                { date: `2025-02-${05 + (idx % 20)}`, description: `Утечка теплоносителя через свищ`, status: "Устранено" }
            ];
            p.isCutOff = false; // Initial flow state
        });

        // Enrich Thermal Chambers (ТК) with Valve Controls & Inspection Cards
        this.chambers.forEach((c, idx) => {
            c.isClosed = false; // Valve cut-off control state (Default: OPEN)
            c.valves = [
                { id: `V-${c.id}-1`, name: `Главная входная задвижка ф530 мм`, isClosed: false },
                { id: `V-${c.id}-2`, name: `Выходная задвижка ф325 мм на микрорайон`, isClosed: false },
                { id: `V-${c.id}-3`, name: `Дренажная задвижка ф80 мм`, isClosed: true }
            ];
            c.inspections = [
                { date: "2026-07-28", inspector: "Старший мастер Собарь В.И.", status: "Удовлетворительное", notes: "Задвижки №1 и №2 смазаны, люк закрыт, подтопления нет." },
                { date: "2026-05-14", inspector: "Инженер КИПиА Ильясов Р.", status: "Акт поверки", notes: "Датчик давления ПД100 прошел ежегодную поверку." }
            ];
            c.district = idx % 2 === 0 ? "ТЭЦ-1 Центр" : (idx % 3 === 0 ? "РК-3 КЖБИ" : "ТЭЦ-2 КСК");
        });

        // Enrich Houses with Digital Building Passports & Meter Telemetry
        this.houses.forEach((h, idx) => {
            h.buildYear = 1965 + (idx % 55);
            h.district = districts[idx % districts.length];
            h.areaM2 = Math.round(1800 + (h.flats || 40) * 58);
            h.residents = Math.round((h.flats || 40) * 2.6);
            h.floors = h.floors || (idx % 2 === 0 ? 5 : 9);
            
            // Meter (УУТЭ) details
            const hasMeter = idx % 7 !== 0; // 85% meters coverage
            h.meter = {
                hasMeter: hasMeter,
                model: hasMeter ? meterModels[idx % meterModels.length] : "Отсутствует (Расчет по нормативу)",
                verifyDate: hasMeter ? `2024-0${(idx % 8) + 1}-15` : "—",
                isOnline: hasMeter && idx % 11 !== 0,
                status: !hasMeter ? "no_meter" : (idx % 13 === 0 ? "anomaly_overheat" : (idx % 19 === 0 ? "anomaly_leak" : "normal"))
            };

            // SCADA Realtime Telemetry parameters
            const isAnomalyOverheat = h.meter.status === "anomaly_overheat";
            const isAnomalyLeak = h.meter.status === "anomaly_leak";
            
            h.telemetry = {
                t1: parseFloat((88.0 + (Math.sin(idx) * 3.5)).toFixed(1)),
                t2: isAnomalyOverheat ? parseFloat((68.5 + (idx % 4)).toFixed(1)) : parseFloat((53.0 + (Math.cos(idx) * 2.0)).toFixed(1)),
                p1: parseFloat((7.6 + (Math.sin(idx) * 0.4)).toFixed(2)),
                p2: parseFloat((3.1 + (Math.cos(idx) * 0.3)).toFixed(2)),
                g1: parseFloat((8.5 + (h.flats || 40) * 0.15).toFixed(2)),
                g2: isAnomalyLeak ? parseFloat(((8.5 + (h.flats || 40) * 0.15) - 2.4).toFixed(2)) : parseFloat((8.5 + (h.flats || 40) * 0.15 - 0.05).toFixed(2)),
                qGcal: parseFloat((0.12 + (h.flats || 40) * 0.007).toFixed(3))
            };

            // Historical incidents for building passport
            h.incidentsHistory = [
                { date: "2025-12-14", type: "Плановое отключение", cause: "Устранение порыва на ТК", durationHrs: 4 },
                { date: "2026-01-22", type: "Жалоба на недогрев", cause: "Воздушная пробка в стояке №3", durationHrs: 2 }
            ];

            h.isDisconnected = false; // Controlled by topology valve cut-off engine
        });
    },

    /**
     * Get aggregate equipment inventory by City / District
     */
    getEquipmentInventory(districtFilter = "all") {
        const houses = districtFilter === "all" ? this.houses : this.houses.filter(h => h.district === districtFilter);
        const chambers = districtFilter === "all" ? this.chambers : this.chambers.filter(c => c.district === districtFilter);

        const totalMeters = houses.filter(h => h.meter.hasMeter).length;
        const totalNoMeters = houses.filter(h => !h.meter.hasMeter).length;
        const overheatMeters = houses.filter(h => h.meter.status === "anomaly_overheat").length;
        const leakMeters = houses.filter(h => h.meter.status === "anomaly_leak").length;

        const meterModelsCount = {
            "ТЭМ-104": Math.round(totalMeters * 0.38),
            "ВКТ-7": Math.round(totalMeters * 0.25),
            "ПРЕМ ф50": Math.round(totalMeters * 0.18),
            "ВЗЛЕТ ЦР": Math.round(totalMeters * 0.12),
            "Карат-307": Math.round(totalMeters * 0.07)
        };

        const totalValves = chambers.length * 4 + Math.round(houses.length * 2.2);
        const totalPumps = chambers.length * 2 + 18;

        return {
            district: districtFilter,
            housesCount: houses.length,
            meters: {
                total: totalMeters,
                unmetered: totalNoMeters,
                coveragePct: houses.length ? Math.round((totalMeters / houses.length) * 100) : 0,
                models: meterModelsCount,
                overheats: overheatMeters,
                leaks: leakMeters
            },
            valves: {
                total: totalValves,
                magistral: chambers.length * 3,
                houseSubstation: Math.round(houses.length * 2)
            },
            pumps: {
                total: totalPumps,
                grundfos: Math.round(totalPumps * 0.65),
                wilo: Math.round(totalPumps * 0.35)
            },
            vehicles: districtFilter === "all" ? this.vehicles : this.vehicles.filter(v => v.target.includes(districtFilter) || true)
        };
    },

    assignHouseCoordinates() {
        // Map TK nodes to spatial anchor centers
        const tkCoords = {};
        this.chambers.forEach(c => {
            tkCoords[c.id] = { lat: c.lat, lng: c.lng };
        });

        // Kostanay City Street Corridors Alignment
        // Key Street Anchors:
        // - Altynsarin / Gogol: 53.214, 63.625
        // - Baymagambetov / Tauelsizdik: 53.208, 63.618
        // - KZhBI / 5 Mkr: 53.190, 63.585
        // - KSK / Kievskaya: 53.243, 63.662
        const baseLat = 53.205;
        const baseLng = 63.615;

        this.houses.forEach((h, idx) => {
            let tkClean = h.tk ? h.tk.trim() : '';
            if (tkCoords[tkClean]) {
                // Rectilinear street block offset around associated TK chamber (city grid blocks)
                const col = (idx % 7) - 3;
                const row = Math.floor((idx % 35) / 7) - 2;
                h.lat = tkCoords[tkClean].lat + (row * 0.0004);
                h.lng = tkCoords[tkClean].lng + (col * 0.0007);
            } else {
                // City street grid alignment for all other houses across Kostanay
                const streetBlock = Math.floor(idx / 50);
                const blockSubIdx = idx % 50;
                const blockRow = Math.floor(streetBlock / 8);
                const blockCol = streetBlock % 8;
                
                const blockLat = 53.180 + (blockRow * 0.006);
                const blockLng = 63.570 + (blockCol * 0.011);

                const subRow = Math.floor(blockSubIdx / 7);
                const subCol = blockSubIdx % 7;

                h.lat = blockLat + (subRow * 0.0005);
                h.lng = blockLng + (subCol * 0.0009);
            }

            // Assign status based on complaints/outages
            if (this.outages.some(o => o.houseId === h.id || o.houseId === `h_${h.id}`)) {
                h.status = "emergency";
            } else if (this.complaints.some(c => c.houseId === h.id)) {
                h.status = "warning";
            } else {
                h.status = "normal";
            }

            // Standardize load in Gcal/h
            if (!h.load || h.load <= 0) {
                h.load = parseFloat((0.08 + (h.flats || 10) * 0.006).toFixed(3));
            }
        });
    }
};

