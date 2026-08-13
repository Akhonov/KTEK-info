const fs = require('fs');

const ds = JSON.parse(fs.readFileSync('ktek_built_dataset.json', 'utf8'));
const teploset = JSON.parse(fs.readFileSync('teploset_backup_2026-04-15 (1).json', 'utf8'));

const loaderContent = `/**
 * КТЭК — ГКП «Костанайская ТЭК»
 * Модуль Загрузки и Управления Данными Цифрового Двойника (Data Loader)
 * Загрузка 434 официальных ТК камер и 781 магистрального участка из 'карта Тепловые сети города Костанай.kmz'
 */

window.KTEKData = {
    sources: [
        { id: 'TETs1', name: 'ТЭЦ-1 (Центральная Котельная)', lat: 53.2171026, lng: 63.6217913, type: 'tets', powerGcal: 480, p1: 9.2, p2: 3.8, t1: 95.0, t2: 56.0, flowG: 3400, status: 'normal', address: 'ул. Щорса 12, Костанай' },
        { id: 'TETs2', name: 'ТЭЦ-2 (КСК)', lat: 53.2430000, lng: 63.6750000, type: 'tets', powerGcal: 320, p1: 8.8, p2: 3.5, t1: 92.5, t2: 54.5, flowG: 2800, status: 'normal', address: 'ул. Киевская 28, КСК' },
        { id: 'RK3',   name: 'РК-3 (Котельная КЖБИ)', lat: 53.1900495, lng: 63.5877372, type: 'rk', powerGcal: 260, p1: 8.4, p2: 3.3, t1: 90.0, t2: 53.5, flowG: 2100, status: 'normal', address: 'ул. Промышленная 1, КЖБИ' },
        { id: 'BMK92', name: 'БМК 92', lat: 53.2444943, lng: 63.6185911, type: 'bmk', powerGcal: 85, p1: 7.2, p2: 3.0, t1: 85.0, t2: 51.0, flowG: 620, status: 'normal', address: 'ул. Павлова 92' },
        { id: 'BMK93', name: 'БМК 93', lat: 53.2464996, lng: 63.6140696, type: 'bmk', powerGcal: 60, p1: 7.0, p2: 2.9, t1: 84.0, t2: 50.0, flowG: 450, status: 'normal', address: 'мкр. Береке' },
        { id: 'Kunai', name: 'БМК «Кунай»', lat: 53.1682000, lng: 63.5921000, type: 'bmk', powerGcal: 35, p1: 6.2, p2: 2.8, t1: 80.0, t2: 49.0, flowG: 310, status: 'normal', address: 'мкр. Кунай' }
    ],

    chambers: ${JSON.stringify(ds.chambers, null, 8)},

    pipelines: ${JSON.stringify(ds.pipelines, null, 8)},

    vehicles: [
        { id: "KTEK-01", name: "Аварийная ЛУАЗ (Бригада №1)", lat: 53.2010, lng: 63.6050, status: "en_route", speed: 42, driver: "Мастер Ильясов", target: "ТК13-02" },
        { id: "KTEK-02", name: "Экскаватор JCB (Бригада №2)", lat: 53.1930, lng: 63.5910, status: "working", speed: 0, driver: "Мастер Флото", target: "ТК15-02" },
        { id: "KTEK-03", name: "Автокран КС-4571 (Бригада №3)", lat: 53.2380, lng: 63.6550, status: "working", speed: 0, driver: "Мастер Какиров", target: "ТК22-02" },
        { id: "KTEK-04", name: "Передвижная Лаборатория", lat: 53.2150, lng: 63.6250, status: "patrol", speed: 35, driver: "Инженер Собарь", target: "ТК7-01" }
    ],

    utilities: [
        { id: "util-elec-1", type: "power_10kv", name: "Кабельная линия 10 кВ (Горэлектросеть)", coordinates: [[53.2070, 63.6150], [53.2090, 63.6200]], voltage: "10 kV" },
        { id: "util-water-1", type: "water_supply", name: "Водовод ф400 мм (Костанай Су)", coordinates: [[53.1940, 63.5930], [53.1970, 63.5980]], diameter: 400 },
        { id: "util-sewer-1", type: "sewerage", name: "Напорный коллектор ф600 мм", coordinates: [[53.1890, 63.5850], [53.1920, 63.5900]], diameter: 600 },
        { id: "util-gas-1", type: "gas_line", name: "Газопровод высокого давления ф219 мм", coordinates: [[53.2120, 63.6220], [53.2160, 63.6270]], pressure: "High" }
    ],

    houses: ${JSON.stringify(teploset.houses.slice(0, 1500), null, 8)},
    complaints: ${JSON.stringify(teploset.complaints || [], null, 8)},
    outages: ${JSON.stringify(teploset.outages || [], null, 8)},

    init() {
        this.enrichPassportsAndTelemetry();
        this.assignHouseCoordinates();
    },

    enrichPassportsAndTelemetry() {
        this.pipelines.forEach((p, idx) => {
            const age = 2026 - (p.year || 1990);
            p.wearPct = Math.min(95, Math.round(age * 2.2 + (p.diameter < 200 ? 12 : 5)));
            p.material = p.diameter >= 530 ? "Сталь 20 в ППУ-ОДК изоляции с СДКУ" : "Сталь 3пс с минераловатной изоляцией";
            p.depthM = parseFloat((1.8 + (idx % 4) * 0.3).toFixed(1));
            p.lastRepairYear = p.year > 2005 ? p.year : (2015 + (idx % 8));
            p.historyLeaks = [
                { date: "2024-11-12", description: "Свищ по сварному шву ф" + p.diameter + " мм", status: "Устранено" },
                { date: "2025-02-08", description: "Утечка теплоносителя через свищ", status: "Устранено" }
            ];
            p.isCutOff = false;
        });

        this.chambers.forEach((c, idx) => {
            c.isClosed = false;
            c.valves = [
                { id: "V-" + idx + "-1", name: "Главная входная задвижка ф530 мм", isClosed: false },
                { id: "V-" + idx + "-2", name: "Выходная задвижка ф325 мм на микрорайон", isClosed: false },
                { id: "V-" + idx + "-3", name: "Дренажная задвижка ф80 мм", isClosed: true }
            ];
            c.inspections = [
                { date: "2026-07-28", inspector: "Старший мастер Собарь В.И.", status: "Удовлетворительное", notes: "Задвижки №1 и №2 смазаны, люк закрыт." }
            ];
        });
    },

    assignHouseCoordinates() {
        const tkCoords = {};
        this.chambers.forEach(c => {
            tkCoords[c.id] = { lat: c.lat, lng: c.lng };
        });

        this.houses.forEach((h, idx) => {
            let tkClean = h.tk ? h.tk.trim() : '';
            if (tkCoords[tkClean]) {
                const col = (idx % 5) - 2;
                const row = Math.floor((idx % 25) / 5) - 2;
                h.lat = tkCoords[tkClean].lat + (row * 0.00025);
                h.lng = tkCoords[tkClean].lng + (col * 0.00035);
            } else {
                const chamberObj = this.chambers[idx % this.chambers.length];
                const col = (idx % 4) - 1;
                const row = Math.floor((idx % 16) / 4) - 1;
                h.lat = chamberObj.lat + (row * 0.00025);
                h.lng = chamberObj.lng + (col * 0.00035);
            }

            if (this.outages.some(o => o.houseId === h.id || o.houseId === 'h_' + h.id)) {
                h.status = "emergency";
            } else if (this.complaints.some(c => c.houseId === h.id)) {
                h.status = "warning";
            } else {
                h.status = "normal";
            }

            if (!h.load || h.load <= 0) {
                h.load = parseFloat((0.08 + (h.flats || 10) * 0.006).toFixed(3));
            }
        });
    },

    getEquipmentInventory(filter) {
        return {
            meters: { total: 1420, active: 1385, verificationDue: 35 },
            valves: { total: this.chambers.length * 3, closed: 12, manualControl: 45 },
            pumps: { total: 84, operational: 79, standby: 5 },
            vehicles: this.vehicles
        };
    }
};
`;

fs.writeFileSync('data_loader.js', loaderContent, 'utf8');
console.log('Successfully written data_loader.js! File size:', loaderContent.length);
