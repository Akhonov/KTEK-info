/**
 * KTEK SCADA Digital Twin 2.0 - No-Code Administrator Module
 * Allows admin to modify telemetry thresholds, expand object passport schemas, and register object types.
 */

window.KTEKAdminNoCode = {
    customTypes: [
        { key: "ultrasound_meter", label: "Ультразвуковой расходомер", icon: "fa-wave-square" },
        { key: "cathodic_station", label: "Станция катодной защиты", icon: "fa-bolt" },
        { key: "pressure_regulator", label: "Регулятор давления (РД)", icon: "fa-sliders" }
    ],

    passportSchema: [
        { fieldName: "diameter", label: "Диаметр трубы (мм)", type: "number" },
        { fieldName: "insulationType", label: "Тип изоляции (ППУ / Минеральная вата)", type: "select" },
        { fieldName: "installationYear", label: "Год прокладки", type: "number" },
        { fieldName: "lastInspectionDate", label: "Дата последнего обследования", type: "date" }
    ],

    init() {
        console.log("⚡ [No-Code Admin] Initializing No-Code System Administrator Module...");
    },

    registerCustomType(label, icon = "fa-cogs") {
        const key = `custom_${Date.now()}`;
        this.customTypes.push({ key, label, icon });
        console.log(`✅ Registered new custom object type: ${label}`);
        if (window.KTEKApp) {
            window.KTEKApp.showNotification(`Новый тип объекта '${label}' добавлен в систему!`, "success");
            window.KTEKApp.renderNoCodeAdminViews();
        }
    },

    addPassportField(fieldName, label, type) {
        this.passportSchema.push({ fieldName, label, type });
        console.log(`✅ Expanded asset passport schema: ${label}`);
        if (window.KTEKApp) {
            window.KTEKApp.showNotification(`Структура паспортов расширена полем '${label}'!`, "success");
            window.KTEKApp.renderNoCodeAdminViews();
        }
    },

    saveSCADAThresholds(t1Min, t1Max, p1Min, p1Max, deltaPMin) {
        if (window.KTEKScada) {
            window.KTEKScada.setThresholds({
                t1Min: parseFloat(t1Min),
                t1Max: parseFloat(t1Max),
                p1Min: parseFloat(p1Min),
                p1Max: parseFloat(p1Max),
                deltaPMin: parseFloat(deltaPMin)
            });
            if (window.KTEKApp) {
                window.KTEKApp.showNotification("Новые пороговые значения СКАДА успешно применены без перезагрузки!", "success");
            }
        }
    }
};
