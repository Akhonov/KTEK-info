(function () {
    "use strict";

    const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
    const pct = value => `${Math.round(value * 100)}%`;
    const dateText = value => value ? new Date(value).toLocaleString("ru-RU") : "—";

    class OperationsUI {
        constructor(options) {
            Object.assign(this, options);
            this.currentObject = null;
            this.anomalyLayer = L.layerGroup().addTo(this.map);
            this.injectStyles();
            this.buildToolbar();
            this.buildCardSection();
            this.buildDashboard();
            this.buildEditor();
            this.renderAnomalies();
        }

        injectStyles() {
            const style = document.createElement("style");
            style.textContent = `
                .ops-toggle{width:46px;height:46px;border:0;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#6df5ca,#19b98c);color:#08261e;box-shadow:0 8px 24px rgba(13,129,98,.32);cursor:pointer;font-size:21px;font-weight:900}.ops-toggle:hover{transform:translateY(-2px)}
                .ops-card{background:linear-gradient(150deg,#0d2029,#143742);color:#eafff8;border-radius:15px;padding:14px;margin-top:2px}.ops-card__title{display:flex;justify-content:space-between;gap:8px;align-items:center;font-weight:850;font-size:13px}.ops-origin{font-size:9px;padding:4px 7px;border-radius:999px;background:#234954;color:#83f4d1}.ops-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.ops-metric{padding:9px;border-radius:10px;background:rgba(255,255,255,.07)}.ops-metric span{display:block;color:#9ab9b5;font-size:9px;text-transform:uppercase}.ops-metric strong{font-size:16px}.ops-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ops-form label{color:#a5c2be;font-size:10px}.ops-form input,.ops-form select,.ops-editor input,.ops-editor select,.ops-editor textarea{width:100%;margin-top:4px;padding:9px;border:1px solid #31515b;border-radius:8px;background:#102a34;color:#fff}.ops-button{border:0;border-radius:9px;padding:9px 11px;background:#6df5ca;color:#083128;font-weight:850;cursor:pointer}.ops-button.secondary{background:#284651;color:#d9eeea}.ops-button.danger{background:#e44848;color:#fff}.ops-actions{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}.ops-passport{font-size:11px;line-height:1.6;color:#c7ddda;margin-top:10px}.ops-defects{margin-top:12px}.ops-defect{padding:10px;margin-top:7px;border-radius:10px;background:rgba(255,255,255,.07);border-left:3px solid #f2a93b}.ops-defect.active{border-color:#ff5151}.ops-defect b{font-size:11px}.ops-defect small{display:block;color:#a8c0bd;margin-top:4px;line-height:1.4}
                .ops-dashboard{position:fixed;z-index:2200;inset:0;display:none;background:rgba(5,14,19,.76);backdrop-filter:blur(8px);padding:24px;overflow:auto}.ops-dashboard.open{display:block}.ops-shell{max-width:1180px;margin:auto;background:#f5f8f8;border-radius:25px;overflow:hidden;box-shadow:0 25px 80px #0008}.ops-head{padding:24px 28px;background:linear-gradient(120deg,#0d2029,#164957);color:#fff;display:flex;justify-content:space-between;align-items:center}.ops-head h2{margin:4px 0;font-size:25px}.ops-head p{margin:0;color:#a7c8c2;font-size:12px}.ops-close{border:0;border-radius:50%;width:40px;height:40px;background:#ffffff18;color:#fff;font-size:25px;cursor:pointer}.ops-body{padding:22px}.ops-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.ops-kpi{background:#fff;border-radius:14px;padding:16px;box-shadow:0 3px 12px #182b3012}.ops-kpi span{display:block;color:#718087;font-size:11px}.ops-kpi strong{font-size:26px;color:#15313a}.ops-charts{display:grid;grid-template-columns:1.15fr .85fr;gap:15px;margin-top:15px}.ops-panel{background:#fff;border-radius:15px;padding:17px;box-shadow:0 3px 12px #182b3012}.ops-panel h3{margin:0 0 13px;font-size:14px;color:#263e45}.ops-chart{width:100%;height:230px}.ops-bars{display:grid;gap:8px}.ops-bar{display:grid;grid-template-columns:110px 1fr 35px;gap:8px;align-items:center;font-size:10px}.ops-bar i{height:9px;border-radius:5px;background:linear-gradient(90deg,#1dc99a,#f2ae40)}.ops-table{width:100%;border-collapse:collapse;font-size:11px}.ops-table th,.ops-table td{text-align:left;padding:9px;border-bottom:1px solid #e8eeee}.ops-risk{font-weight:900;color:#d44545}.ops-note{margin-top:13px;padding:11px;border-radius:10px;background:#fff6d9;color:#6c5720;font-size:11px}.ops-editor{position:fixed;z-index:2400;inset:0;display:none;place-items:center;background:#071218b8}.ops-editor.open{display:grid}.ops-editor__box{width:min(540px,calc(100vw - 25px));max-height:90vh;overflow:auto;background:#102832;color:#fff;padding:20px;border-radius:18px}.ops-editor h3{margin:0 0 12px}.ops-editor textarea{min-height:75px;resize:vertical}.ops-editor__grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ops-anomaly{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#ee3f45;color:#fff;border:3px solid #fff;box-shadow:0 3px 12px #d9000066;font-weight:900;animation:opsPulse 1.8s infinite}@keyframes opsPulse{50%{box-shadow:0 0 0 8px #ef3f4530}}@media(max-width:800px){.ops-kpis,.ops-charts{grid-template-columns:1fr 1fr}.ops-charts{grid-template-columns:1fr}.ops-dashboard{padding:8px}.ops-body{padding:12px}}`;
            document.head.appendChild(style);
        }

        buildToolbar() {
            const button = document.createElement("button");
            button.className = "ops-toggle";
            button.type = "button";
            button.title = "Аналитика, прогноз и Excel";
            button.textContent = "∿";
            button.addEventListener("click", event => { event.stopPropagation(); this.openDashboard(); });
            document.querySelector(".map-toolbar").prepend(button);
        }

        buildCardSection() {
            this.cardSection = document.createElement("section");
            this.cardSection.className = "info-row";
            this.cardSection.innerHTML = '<span class="info-label">математическая модель и эксплуатационная БД</span><div id="opsCardContent"><p class="info-value info-empty">Подготовка базы…</p></div>';
            document.querySelector(".object-card__body").appendChild(this.cardSection);
            this.cardContent = this.cardSection.querySelector("#opsCardContent");
        }

        buildDashboard() {
            this.dashboard = document.createElement("div");
            this.dashboard.className = "ops-dashboard";
            this.dashboard.innerHTML = '<div class="ops-shell"><header class="ops-head"><div><p>КТЭК · аналитический контур</p><h2>Надёжность теплосети</h2><p>Прогноз, дефекты, аномалии и отчётность за 6 месяцев</p></div><button class="ops-close" type="button">×</button></header><main class="ops-body" id="opsDashboardBody"></main></div>';
            document.body.appendChild(this.dashboard);
            this.dashboard.querySelector(".ops-close").onclick = () => this.dashboard.classList.remove("open");
            this.dashboard.addEventListener("click", event => { if (event.target === this.dashboard) this.dashboard.classList.remove("open"); });
        }

        buildEditor() {
            this.editor = document.createElement("div");
            this.editor.className = "ops-editor";
            this.editor.innerHTML = '<form class="ops-editor__box" id="opsEditorForm"><h3 id="opsEditorTitle"></h3><div id="opsEditorFields"></div><div class="ops-actions"><button class="ops-button" type="submit">Сохранить в БД</button><button class="ops-button secondary" id="opsEditorCancel" type="button">Отмена</button></div></form>';
            document.body.appendChild(this.editor);
            this.editor.querySelector("#opsEditorCancel").onclick = () => this.editor.classList.remove("open");
        }

        openObject(object) {
            this.currentObject = object;
            this.renderObject();
        }

        renderObject() {
            const object = this.currentObject;
            if (!object) return;
            const asset = this.database.getAsset(object.id);
            const model = this.hydraulic.get(object.id);
            if (!asset || !model) {
                this.cardContent.innerHTML = '<p class="info-value info-empty">Расчётные данные объекта не найдены.</p>';
                return;
            }
            const defects = this.database.getDefects(object.id).sort((a, b) => String(b.detectedAt).localeCompare(String(a.detectedAt)));
            const passport = asset.passport || {};
            const sourceForm = asset.assetType === "source" ? this.sourceControls(asset) : "";
            const latest = this.database.getTelemetry(object.id).at(-1);
            const anomalyText = latest?.anomaly ? `<div class="ops-defect active"><b>! Аномалия регулярных данных</b><small>Давление: ${latest.pressureBar} бар вместо ${latest.expectedPressureBar} (${latest.pressureBar >= latest.expectedPressureBar ? "+" : ""}${(latest.pressureBar-latest.expectedPressureBar).toFixed(2)} бар)<br>Температура: ${latest.temperatureC} °C вместо ${latest.expectedTemperatureC} (${latest.temperatureC >= latest.expectedTemperatureC ? "+" : ""}${(latest.temperatureC-latest.expectedTemperatureC).toFixed(1)} °C)</small></div>` : "";
            this.cardContent.innerHTML = `<div class="ops-card"><div class="ops-card__title"><span>Расчётное состояние</span><span class="ops-origin">МОДЕЛЬ</span></div><div class="ops-grid">
                <div class="ops-metric"><span>Давление</span><strong>${model.pressureBar.toFixed(2)} бар</strong></div><div class="ops-metric"><span>Подача</span><strong>${model.supplyTemperatureC.toFixed(1)} °C</strong></div>
                <div class="ops-metric"><span>Энергия</span><strong>${model.thermalPowerMW.toFixed(2)} МВт</strong></div><div class="ops-metric"><span>Расход</span><strong>${model.flowM3h.toFixed(1)} м³/ч</strong></div>
                <div class="ops-metric"><span>Потеря давления</span><strong>${model.pressureLossBar.toFixed(3)} бар</strong></div><div class="ops-metric"><span>Теплопотери</span><strong>${model.heatLossKW.toFixed(1)} кВт</strong></div></div>
                ${sourceForm}<div class="ops-passport"><b>Паспорт:</b> ${esc(passport.passportNumber || passport.cardNumber)} · ввод ${asset.commissionedYear}<br>${asset.assetType === "pipe" ? `Ø ${passport.outerDiameterMm} мм · ${passport.lengthM} м · ${esc(passport.material)} · изоляция ${esc(passport.insulation)}` : `${esc(passport.chamberType || passport.sourceType)} · расчётное давление ${passport.designPressureBar} бар`}<br><small>${esc(model.formula)}</small></div>
                <div class="ops-passport"><b>Регулярный режим:</b> ${asset.regularProfile?.expectedPressureBar ?? "—"} ± ${asset.regularProfile?.pressureToleranceBar ?? "—"} бар · ${asset.regularProfile?.expectedSupplyTemperatureC ?? "—"} ± ${asset.regularProfile?.temperatureToleranceC ?? "—"} °C</div>${anomalyText}<div class="ops-actions"><button class="ops-button secondary" data-ops="edit-asset">Изменить карточку</button><button class="ops-button secondary" data-ops="new-defect">Добавить дефект</button></div>
                <div class="ops-defects"><b>Дефекты в единой БД: ${defects.length}</b>${defects.slice(0, 8).map(item => `<div class="ops-defect ${item.status}"><b>${esc(item.defectType)} · ${item.status === "active" ? "АКТИВЕН" : "устранён"}</b><small>${dateText(item.detectedAt)} · выявил: ${esc(item.detectedBy)}<br>Дома: ${item.affectedHouseCount || 0} · ${esc((item.affectedStreets || []).join(", ") || "нет данных")}${item.repairDurationHours ? `<br>Устранение: ${item.repairDurationHours} ч · ${esc(this.crewName(item.crewId))}` : ""}${item.status === "active" ? `<br><span class="live-defect-timer" data-start="${esc(item.detectedAt)}">С момента обнаружения: идёт подсчёт…</span>` : ""}</small>${item.status === "active" ? `<button class="ops-button" data-resolve="${esc(item.id)}" style="margin-top:7px">Отметить устранение</button>` : ""}</div>`).join("")}</div></div>`;
            this.bindCardActions(asset);
        }

        sourceControls(asset) {
            const values = this.hydraulic.getSourceControls(asset.id);
            return `<form class="ops-form" id="opsSourceForm"><label>Давление, бар<input name="pressure" type="number" min="1" max="20" step="0.1" value="${values.pressureBar}"></label><label>Температура, °C<input name="temperature" type="number" min="40" max="160" step="1" value="${values.supplyTemperatureC}"></label><label>Энергия, МВт<input name="power" type="number" min="0.2" max="1000" step="0.1" value="${values.thermalPowerMW}"></label><label>Обратка, °C<input name="returnTemperature" type="number" min="20" max="100" step="1" value="${values.returnTemperatureC}"></label><button class="ops-button" type="submit">Пересчитать ветвь</button><button class="ops-button secondary" type="button" data-ops="reset-source">Сбросить</button></form>`;
        }

        bindCardActions(asset) {
            this.cardContent.querySelector("#opsSourceForm")?.addEventListener("submit", event => {
                event.preventDefault(); const form = new FormData(event.currentTarget);
                const results = this.hydraulic.updateSource(asset.id, { pressureBar: form.get("pressure"), supplyTemperatureC: form.get("temperature"), thermalPowerMW: form.get("power"), returnTemperatureC: form.get("returnTemperature") });
                this.digitalTwin?.setHydraulicResults(results); this.renderObject(); this.onRecalculated?.(results);
            });
            this.cardContent.querySelector('[data-ops="reset-source"]')?.addEventListener("click", () => { const results = this.hydraulic.resetSource(asset.id); this.digitalTwin?.setHydraulicResults(results); this.renderObject(); this.onRecalculated?.(results); });
            this.cardContent.querySelector('[data-ops="edit-asset"]')?.addEventListener("click", () => this.editAsset(asset));
            this.cardContent.querySelector('[data-ops="new-defect"]')?.addEventListener("click", () => this.editDefect(asset));
            this.cardContent.querySelectorAll("[data-resolve]").forEach(button => button.addEventListener("click", () => this.resolveDefect(button.dataset.resolve)));
        }

        editAsset(asset) {
            const passport = asset.passport || {};
            this.showEditor("Карточка объекта", `<div class="ops-editor__grid"><label>Адрес<input name="address" value="${esc(asset.address)}"></label><label>Год ввода<input name="year" type="number" value="${asset.commissionedYear}"></label><label>Паспорт / карточка<input name="passportNumber" value="${esc(passport.passportNumber || passport.cardNumber)}"></label><label>Расчётное давление, бар<input name="designPressure" type="number" step="0.1" value="${passport.designPressureBar || 12}"></label><label>Регулярное давление, бар<input name="regularPressure" type="number" step="0.1" value="${asset.regularProfile?.expectedPressureBar || 6}"></label><label>Допуск давления, бар<input name="pressureTolerance" type="number" step="0.1" value="${asset.regularProfile?.pressureToleranceBar || .65}"></label><label>Регулярная температура, °C<input name="regularTemperature" type="number" step="0.1" value="${asset.regularProfile?.expectedSupplyTemperatureC || 75}"></label><label>Допуск температуры, °C<input name="temperatureTolerance" type="number" step="0.1" value="${asset.regularProfile?.temperatureToleranceC || 6}"></label>${asset.assetType === "pipe" ? `<label>Диаметр, мм<input name="diameter" type="number" value="${passport.outerDiameterMm}"></label><label>Материал<input name="material" value="${esc(passport.material)}"></label>` : `<label>Тип камеры/источника<input name="kind" value="${esc(passport.chamberType || passport.sourceType)}"></label>`}</div>`, async form => {
                const fd = new FormData(form); const cardKey = passport.passportNumber !== undefined ? "passportNumber" : "cardNumber";
                await this.database.updateAsset(asset.id, { address: fd.get("address"), commissionedYear: Number(fd.get("year")), regularProfile: { ...asset.regularProfile, expectedPressureBar: Number(fd.get("regularPressure")), pressureToleranceBar: Number(fd.get("pressureTolerance")), expectedSupplyTemperatureC: Number(fd.get("regularTemperature")), temperatureToleranceC: Number(fd.get("temperatureTolerance")) }, passport: { [cardKey]: fd.get("passportNumber"), designPressureBar: Number(fd.get("designPressure")), ...(asset.assetType === "pipe" ? { outerDiameterMm: Number(fd.get("diameter")), material: fd.get("material") } : { [asset.assetType === "source" ? "sourceType" : "chamberType"]: fd.get("kind") }) } });
                const results = this.hydraulic.solve(); this.digitalTwin?.setHydraulicResults(results); this.onRecalculated?.(results);
                this.renderObject();
            });
        }

        editDefect(asset) {
            this.showEditor("Новый дефект", `<div class="ops-editor__grid"><label>Тип дефекта<input required name="type" placeholder="Например: течь задвижки"></label><label>Кем выявлен<input required name="detector" value="Диспетчерская КТЭК"></label><label>Приоритет<select name="priority"><option>1</option><option>2</option><option>3</option><option>4</option><option selected>5</option></select></label><label>Затронуто домов<input name="houses" type="number" min="0" value="0"></label></div><label>Улицы через запятую<textarea name="streets"></textarea></label><label>Примечание<textarea name="notes"></textarea></label>`, async form => {
                const fd = new FormData(form); await this.database.upsertDefect({ id: `manual-${Date.now()}`, assetId: asset.id, dataOrigin: "manual", detectedAt: new Date().toISOString(), detectedBy: fd.get("detector"), defectType: fd.get("type"), status: "active", priority: Number(fd.get("priority")), resolvedAt: null, repairDurationHours: null, crewId: null, affectedHouses: [], affectedHouseCount: Number(fd.get("houses")), affectedStreets: String(fd.get("streets")).split(",").map(x => x.trim()).filter(Boolean), address: asset.address, notes: fd.get("notes") }); this.refreshTwinDefectState(asset.id); this.renderObject(); this.renderAnomalies();
            });
        }

        resolveDefect(id) {
            const defect = this.database.cache.defects.find(item => item.id === id); if (!defect) return;
            this.showEditor("Устранение дефекта", `<div class="ops-editor__grid"><label>Бригада<select name="crew">${this.database.cache.crews.map(crew => `<option value="${crew.id}">${esc(crew.name)}</option>`).join("")}</select></label><label>Затрачено, часов<input required name="hours" type="number" min="0.1" step="0.1"></label><label>Мастер / исполнитель<input name="master"></label></div><label>Итог работ<textarea name="notes">Дефект устранён, участок проверен.</textarea></label>`, async form => { const fd = new FormData(form); await this.database.upsertDefect({ ...defect, status: "resolved", resolvedAt: new Date().toISOString(), repairDurationHours: Number(fd.get("hours")), crewId: fd.get("crew"), resolvedBy: fd.get("master"), resolutionNotes: fd.get("notes") }); this.refreshTwinDefectState(defect.assetId); this.renderObject(); this.renderAnomalies(); });
        }

        refreshTwinDefectState(assetId) {
            const model = this.digitalTwin?.models?.get(assetId);
            if (model) model.hasActiveDefect = this.database.getDefects(assetId).some(item => item.status === "active");
            this.digitalTwin?.tick();
        }

        showEditor(title, fields, submit) {
            this.editor.querySelector("#opsEditorTitle").textContent = title;
            this.editor.querySelector("#opsEditorFields").innerHTML = fields;
            const form = this.editor.querySelector("#opsEditorForm");
            form.onsubmit = async event => { event.preventDefault(); await submit(form); this.editor.classList.remove("open"); };
            this.editor.classList.add("open");
        }

        crewName(id) { return this.database.cache.crews.find(crew => crew.id === id)?.name || "бригада не указана"; }

        renderAnomalies() {
            this.anomalyLayer.clearLayers();
            const objects = new Map(this.selectableObjects.map(target => [target.object.id, target.object]));
            const candidates = this.database.cache.assets.map(asset => {
                const telemetry = this.database.getTelemetry(asset.id); const latestAnomaly = telemetry.at(-1)?.anomaly ? telemetry.at(-1) : null;
                const activeDefects = this.database.getDefects(asset.id).filter(item => item.status === "active");
                const active = activeDefects.length > 0;
                const priority = Math.max(0, ...activeDefects.map(item => Number(item.priority || 0)));
                const registered = activeDefects.some(item => ["source-register", "manual"].includes(item.dataOrigin));
                return { asset, latestAnomaly, active, priority, registered, score: (registered ? 100 : 0) + priority * 10 + (latestAnomaly ? 8 : 0) };
            }).filter(item => item.active || item.latestAnomaly).sort((a, b) => b.score - a.score).slice(0, 120);
            candidates.forEach(({ asset, latestAnomaly, active }) => {
                const object = objects.get(asset.id); if (!object) return;
                let latlng = object.lat != null ? [object.lat, object.lng] : null;
                if (!latlng && object.coordinates?.length) latlng = object.coordinates[Math.floor(object.coordinates.length / 2)];
                if (!latlng) return;
                const marker = L.marker(latlng, { icon: L.divIcon({ className: "", html: '<span class="ops-anomaly">!</span>', iconSize: [25, 25], iconAnchor: [12, 12] }), zIndexOffset: 1200 }).addTo(this.anomalyLayer);
                const deviations = latestAnomaly ? `давление ${latestAnomaly.pressureBar} бар (${latestAnomaly.pressureBar >= latestAnomaly.expectedPressureBar ? "+" : ""}${(latestAnomaly.pressureBar-latestAnomaly.expectedPressureBar).toFixed(2)}); температура ${latestAnomaly.temperatureC} °C (${latestAnomaly.temperatureC >= latestAnomaly.expectedTemperatureC ? "+" : ""}${(latestAnomaly.temperatureC-latestAnomaly.expectedTemperatureC).toFixed(1)})` : "";
                marker.bindTooltip(`${asset.name}: ${active ? "активный дефект" : `аномалия — ${deviations}`}`, { className: "object-tooltip" });
                marker.on("click", event => {
                    if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
                    const target = this.selectableObjects.find(item => item.object.id === asset.id);
                    target?.layer.fire("click");
                });
            });
        }

        openDashboard() {
            const db = this.database.cache, risks = this.database.calculateRisks(), defects = db.defects;
            const active = defects.filter(item => item.status === "active").length;
            const anomalous = db.assets.filter(asset => this.database.getTelemetry(asset.id).slice(-6).some(item => item.anomaly)).length;
            const districtCounts = {}; defects.forEach(item => { const asset = this.database.getAsset(item.assetId); const key = asset?.district || "Без привязки"; districtCounts[key] = (districtCounts[key] || 0) + 1; });
            const topDistricts = Object.entries(districtCounts).sort((a,b) => b[1]-a[1]).slice(0,8); const max = topDistricts[0]?.[1] || 1;
            const backtest = this.database.monthlyBacktest();
            this.dashboard.querySelector("#opsDashboardBody").innerHTML = `<div class="ops-kpis"><div class="ops-kpi"><span>Всего объектов</span><strong>${db.assets.length}</strong></div><div class="ops-kpi"><span>Дефекты / активные</span><strong>${defects.length} / ${active}</strong></div><div class="ops-kpi"><span>Аномалии за 6 недель</span><strong>${anomalous}</strong></div><div class="ops-kpi"><span>Высокий риск ≥70%</span><strong>${risks.filter(x=>x.probability>=.7).length}</strong></div></div><div class="ops-charts"><section class="ops-panel"><h3>Прогноз против факта · помесячная проверка</h3>${this.lineChart(backtest)}</section><section class="ops-panel"><h3>Дефекты по районам / источникам</h3><div class="ops-bars">${topDistricts.map(([name,count])=>`<div class="ops-bar"><span>${esc(name)}</span><i style="width:${Math.max(4,count/max*100)}%"></i><b>${count}</b></div>`).join("")}</div></section></div><section class="ops-panel" style="margin-top:15px"><h3>Участки, требующие внимания</h3><table class="ops-table"><thead><tr><th>Объект</th><th>Район</th><th>Дефекты</th><th>Активно</th><th>Прогноз 30 дней</th></tr></thead><tbody>${risks.slice(0,15).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.district)}</td><td>${x.defects}</td><td>${x.active}</td><td class="ops-risk">${pct(x.probability)}</td></tr>`).join("")}</tbody></table><div class="ops-actions"><button class="ops-button" id="opsExport">Экспортировать Excel</button></div></section><div class="ops-note">Учебный прогноз: логистическая модель учитывает частоту и давность дефектов, активные аварии, возраст, длительность ремонта и аномалии телеметрии. Он не заменяет инженерное обследование.</div>`;
            this.dashboard.querySelector("#opsExport").onclick = () => this.exportExcel(risks);
            this.dashboard.classList.add("open");
        }

        lineChart(rows) {
            const w=620,h=220,p=35,max=Math.max(10,...rows.flatMap(x=>[x.forecast,x.actual])); const points = key => rows.map((x,i)=>`${p+i*(w-2*p)/Math.max(1,rows.length-1)},${h-p-x[key]/max*(h-2*p)}`).join(" ");
            return `<svg class="ops-chart" viewBox="0 0 ${w} ${h}"><g stroke="#e3ebeb">${[0,1,2,3,4].map(i=>`<line x1="${p}" y1="${p+i*(h-2*p)/4}" x2="${w-p}" y2="${p+i*(h-2*p)/4}"/>`).join("")}</g><polyline fill="none" stroke="#16b98a" stroke-width="4" points="${points("forecast")}"/><polyline fill="none" stroke="#ef8d32" stroke-width="4" points="${points("actual")}"/>${rows.map((x,i)=>`<text x="${p+i*(w-2*p)/Math.max(1,rows.length-1)}" y="${h-9}" font-size="11" text-anchor="middle" fill="#718087">${x.label}</text>`).join("")}<text x="45" y="20" fill="#16a77d" font-size="11">— прогноз</text><text x="135" y="20" fill="#e57924" font-size="11">— факт</text></svg>`;
        }

        exportExcel(risks) {
            const defectRows = this.database.cache.defects.map(item => ({ ID:item.id, Объект:this.database.getAsset(item.assetId)?.name||"Без привязки", Статус:item.status, Выявлен:item.detectedAt, "Кем выявлен":item.detectedBy, Дефект:item.defectType, Бригада:this.crewName(item.crewId), "Устранён":item.resolvedAt, "Часы ремонта":item.repairDurationHours, "Домов отключено":item.affectedHouseCount, Улицы:(item.affectedStreets||[]).join(", "), Происхождение:item.dataOrigin }));
            const assetRows = this.database.cache.assets.map(asset => ({ ID:asset.id, Объект:asset.name, Тип:asset.assetType, Адрес:asset.address, Район:asset.district, "Год ввода":asset.commissionedYear, Паспорт:JSON.stringify(asset.passport), "Регулярный профиль":JSON.stringify(asset.regularProfile), "Давление расч., бар":this.hydraulic.get(asset.id)?.pressureBar, "Температура расч., °C":this.hydraulic.get(asset.id)?.supplyTemperatureC, "Мощность расч., МВт":this.hydraulic.get(asset.id)?.thermalPowerMW }));
            const riskRows = risks.map(x=>({ Объект:x.name, Район:x.district, "Вероятность 30 дней":Number((x.probability*100).toFixed(1)), Дефекты:x.defects, Активные:x.active, Аномалии:x.anomalies }));
            const telemetryRows = this.database.cache.assets.flatMap(asset => this.database.getTelemetry(asset.id).map(item => ({ ID_объекта:asset.id, Объект:asset.name, ...item })));
            const crewRows = this.database.cache.crews.map(crew => ({ ID:crew.id, Бригада:crew.name, Бригадир:crew.foreman, Телефон:crew.phone }));
            if (window.XLSX) { const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(defectRows),"Дефекты"); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(assetRows),"Объекты"); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(telemetryRows),"Телеметрия"); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(crewRows),"Бригады"); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(riskRows),"Прогноз"); XLSX.writeFile(wb,`КТЭК_отчет_${new Date().toISOString().slice(0,10)}.xlsx`); }
            else { const blob=new Blob(["\ufeff"+Object.keys(defectRows[0]).join(";")+"\n"+defectRows.map(row=>Object.values(row).map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="КТЭК_дефекты.csv";a.click();URL.revokeObjectURL(a.href); }
        }
    }

    window.OperationsUI = OperationsUI;
})();
