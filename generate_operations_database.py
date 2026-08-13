"""Build a deterministic demo operations database for the Kostanay heat network.

Source-register records are preserved verbatim in ``sourceRecord``.  Missing
passports, telemetry and six-month history are intentionally synthetic and are
marked with ``dataOrigin=synthetic`` so that they cannot be mistaken for
instrument or field data.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import re
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MAP_PATH = ROOT / "ktek_map_objects.json"
OUTPUT_PATH = ROOT / "ktek_operations_database.json"
NOW = datetime(2026, 8, 14, 12, 0)
HISTORY_START = datetime(2026, 2, 14, 12, 0)

CREWS = [
    {"id": "crew-01", "name": "Аварийная бригада №1", "foreman": "А. Касымов", "phone": "+7 7142 55-01-01"},
    {"id": "crew-02", "name": "Аварийная бригада №2", "foreman": "Д. Ибраев", "phone": "+7 7142 55-01-02"},
    {"id": "crew-03", "name": "Ремонтная бригада КСК", "foreman": "С. Нургалиев", "phone": "+7 7142 55-02-03"},
    {"id": "crew-04", "name": "Ремонтная бригада КЖБИ", "foreman": "Е. Садыков", "phone": "+7 7142 55-02-04"},
    {"id": "crew-05", "name": "Служба диагностики", "foreman": "М. Ахметов", "phone": "+7 7142 55-03-05"},
    {"id": "crew-06", "name": "Бригада сварщиков №1", "foreman": "Р. Жумабаев", "phone": "+7 7142 55-04-06"},
    {"id": "crew-07", "name": "Бригада тепловой изоляции", "foreman": "И. Смагулов", "phone": "+7 7142 55-05-07"},
    {"id": "crew-08", "name": "Оперативно-выездная служба", "foreman": "К. Омаров", "phone": "+7 7142 55-06-08"},
]

DETECTORS = ["Диспетчерская КТЭК", "Обходчик", "Житель через 109", "Датчик давления", "Тепловизионный контроль", "Мастер участка"]
PIPE_DEFECTS = ["свищ трубопровода", "течь сварного шва", "коррозия трубы", "повреждение изоляции", "утечка во фланцевом соединении"]
CHAMBER_DEFECTS = ["течь задвижки", "неисправность дренажа", "подтопление камеры", "износ сальника", "коррозия запорной арматуры"]
SOURCE_DEFECTS = ["нестабильность подпитки", "износ сетевого насоса", "течь теплообменника", "отказ датчика давления", "неисправность автоматики"]


def stable_seed(value: str) -> int:
    return int(hashlib.sha256(value.encode("utf-8")).hexdigest()[:16], 16)


def haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6_371_000 * 2 * math.asin(math.sqrt(h))


def line_length(coordinates: list[list[float]]) -> float:
    return sum(haversine(tuple(a), tuple(b)) for a, b in zip(coordinates, coordinates[1:]))


def center(object_: dict, kind: str) -> tuple[float, float]:
    if kind == "pipe":
        points = object_.get("coordinates") or [[53.214, 63.624]]
        return sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points)
    return float(object_.get("lat", 53.214)), float(object_.get("lng", 63.624))


def diameter_from_name(name: str, rng: random.Random) -> int:
    match = re.search(r"(?:d|ф|ø)\s*(\d{2,4})", name.lower())
    if match:
        return max(50, min(1200, int(match.group(1))))
    return rng.choice([76, 89, 108, 133, 159, 219, 273, 325, 426, 530, 630])


def asset_record(object_: dict, kind: str, sources: list[dict]) -> dict:
    asset_id = str(object_["id"])
    rng = random.Random(stable_seed(asset_id))
    lat, lng = center(object_, kind)
    nearest_source = min(sources, key=lambda item: haversine((lat, lng), (item["lat"], item["lng"]))) if sources and kind != "source" else object_
    commissioned = rng.randint(1968, 2022)
    address = object_.get("address") or object_.get("description") or object_.get("folder") or "Адрес требует уточнения"
    common = {
        "id": asset_id,
        "mapObjectId": asset_id,
        "name": object_.get("name") or object_.get("shortName") or asset_id,
        "assetType": kind,
        "address": address,
        "district": object_.get("folder") or nearest_source.get("shortName") or nearest_source.get("name", "Костанай"),
        "heatSourceId": nearest_source.get("id"),
        "lat": round(lat, 7),
        "lng": round(lng, 7),
        "commissionedYear": commissioned,
        "lastInspection": (NOW - timedelta(days=rng.randint(3, 330))).date().isoformat(),
        "dataOrigin": "synthetic-passport",
        "editable": True,
        "regularProfile": {
            "expectedPressureBar": round(rng.uniform(4.8, 8.2) if kind != "source" else rng.uniform(7.8, 10.5), 2),
            "pressureToleranceBar": 0.65,
            "expectedSupplyTemperatureC": round(rng.uniform(68, 88) if kind != "source" else rng.uniform(88, 110), 1),
            "temperatureToleranceC": 6.0,
            "inspectionIntervalDays": rng.choice([7, 14, 30]),
        },
    }
    if kind == "pipe":
        diameter = diameter_from_name(common["name"], rng)
        length = max(3, line_length(object_.get("coordinates") or []))
        common["passport"] = {
            "passportNumber": f"TR-{stable_seed(asset_id) % 100000:05d}",
            "lengthM": round(length, 1),
            "outerDiameterMm": diameter,
            "wallThicknessMm": round(max(3.5, diameter * rng.uniform(0.018, 0.035)), 1),
            "material": rng.choice(["Сталь 20", "Сталь 17Г1С", "Предизолированная сталь"]),
            "roughnessMm": round(rng.uniform(0.08, 0.35), 3),
            "insulation": rng.choice(["ППУ", "минеральная вата", "армопенобетон"]),
            "heatTransferWm2K": round(rng.uniform(0.35, 1.15), 2),
            "designPressureBar": rng.choice([10, 12, 16]),
            "designTemperatureC": rng.choice([115, 130, 150]),
        }
    elif kind == "chamber":
        common["passport"] = {
            "cardNumber": f"TK-{stable_seed(asset_id) % 100000:05d}",
            "chamberType": rng.choice(["проходная", "узловая", "секционирующая", "дренажная"]),
            "valves": rng.randint(2, 8),
            "designPressureBar": rng.choice([10, 12, 16]),
            "designTemperatureC": rng.choice([115, 130, 150]),
            "condition": rng.choice(["исправное", "удовлетворительное", "требует наблюдения"]),
        }
    else:
        common["passport"] = {
            "cardNumber": f"HS-{stable_seed(asset_id) % 10000:04d}",
            "sourceType": object_.get("kind", "boiler"),
            "designPressureBar": round(rng.uniform(8.5, 12.0), 1),
            "designSupplyTemperatureC": rng.choice([95, 105, 115, 130]),
            "designPowerMW": round(rng.uniform(25, 260), 1),
            "pumps": rng.randint(2, 7),
        }
    return common


def houses_for(object_: dict) -> list[str]:
    impact_houses = []
    for defect in object_.get("defects") or []:
        impact_houses.extend((defect.get("impact") or {}).get("houses") or [])
    candidates = impact_houses or object_.get("dependentHouses") or object_.get("downstreamHouseKeys") or []
    result = []
    for item in candidates:
        value = item if isinstance(item, str) else item.get("address", "")
        if value and value not in result:
            result.append(value)
        if len(result) >= 18:
            break
    return result


def synthetic_defect(asset: dict, object_: dict, index: int, rng: random.Random) -> dict:
    kind = asset["assetType"]
    detected = HISTORY_START + timedelta(hours=rng.randint(0, int((NOW - HISTORY_START).total_seconds() // 3600)))
    resolved = detected < NOW - timedelta(days=12) and rng.random() > 0.09
    repair_hours = round(rng.uniform(2.5, 78 if kind == "pipe" else 38), 1) if resolved else None
    resolved_at = detected + timedelta(hours=repair_hours) if resolved else None
    defect_types = PIPE_DEFECTS if kind == "pipe" else CHAMBER_DEFECTS if kind == "chamber" else SOURCE_DEFECTS
    homes = houses_for(object_)
    if not homes and kind != "source":
        homes = [f"{asset['district']}, дом {rng.randint(1, 140)}" for _ in range(rng.randint(1, 5))]
    streets = sorted({re.sub(r"\s+(?:д\.?|дом)\s*\d+.*$", "", house, flags=re.I).strip(" ,") for house in homes if house})
    return {
        "id": f"syn-{asset['id']}-{index + 1}",
        "assetId": asset["id"],
        "dataOrigin": "synthetic-history",
        "detectedAt": detected.isoformat(timespec="minutes"),
        "detectedBy": rng.choice(DETECTORS),
        "defectType": rng.choice(defect_types),
        "status": "resolved" if resolved else "active",
        "priority": rng.randint(1, 5),
        "resolvedAt": resolved_at.isoformat(timespec="minutes") if resolved_at else None,
        "repairDurationHours": repair_hours,
        "crewId": rng.choice(CREWS)["id"] if resolved else None,
        "affectedHouses": homes,
        "affectedHouseCount": len(homes),
        "affectedStreets": streets,
        "affectedApartmentsEstimate": len(homes) * rng.randint(28, 96),
        "address": asset["address"],
        "notes": "Учебная синтетическая запись для аналитической модели.",
    }


def source_defect(record: dict, asset_id: str | None) -> dict:
    impact = record.get("impact") or {}
    resolved = bool(record.get("resolved"))
    detected = record.get("dateObserved")
    resolved_at = record.get("resolveDate")
    duration = None
    try:
        if detected and resolved_at:
            duration = round((datetime.fromisoformat(resolved_at) - datetime.fromisoformat(detected)).total_seconds() / 3600, 1)
    except (TypeError, ValueError):
        pass
    return {
        "id": f"src-{record.get('id')}",
        "assetId": asset_id,
        "dataOrigin": "source-register",
        "detectedAt": detected,
        "detectedBy": record.get("detectedBy") or "Не указано",
        "defectType": record.get("defectType") or "Не указан",
        "networkType": record.get("networkType") or "",
        "status": "resolved" if resolved else "active",
        "priority": record.get("priority"),
        "plannedAt": record.get("planDate") or None,
        "resolvedAt": resolved_at,
        "repairDurationHours": duration,
        "crewId": None,
        "resolvedBy": record.get("master") or None,
        "affectedHouses": impact.get("houses") or [],
        "affectedHouseCount": impact.get("housesCount") or 0,
        "affectedStreets": impact.get("streets") or [],
        "affectedApartmentsEstimate": impact.get("flatsEstimate") or 0,
        "address": record.get("address") or "",
        "notes": record.get("note") or "",
        "sourceRecord": record,
    }


def weekly_telemetry(asset: dict) -> list[dict]:
    rng = random.Random(stable_seed("telemetry:" + asset["id"]))
    passport = asset["passport"]
    design_pressure = float(passport.get("designPressureBar", 12))
    design_temp = float(passport.get("designTemperatureC", passport.get("designSupplyTemperatureC", 115)))
    records = []
    for week in range(27):
        timestamp = min(HISTORY_START + timedelta(days=week * 7), NOW)
        winter = max(0, math.cos((timestamp.timetuple().tm_yday - 20) / 365 * math.tau))
        expected_pressure = design_pressure * (0.52 + winter * 0.13)
        expected_temp = 68 + winter * 24
        anomaly = rng.random() < 0.045
        pressure = expected_pressure + rng.gauss(0, 0.22) + (rng.choice([-2.2, 2.5]) if anomaly else 0)
        temperature = expected_temp + rng.gauss(0, 1.4) + (rng.choice([-13, 12]) if anomaly else 0)
        flow = max(1, (passport.get("outerDiameterMm", 250) / 250) ** 2 * (75 + winter * 115) * rng.uniform(0.86, 1.14))
        delta_t = 19 + winter * 8 + rng.uniform(-2, 2)
        power = flow * delta_t * 1.163 / 1000
        records.append({
            "timestamp": timestamp.isoformat(timespec="minutes"),
            "pressureBar": round(max(0.4, pressure), 2),
            "temperatureC": round(temperature, 1),
            "flowM3h": round(flow, 1),
            "thermalPowerMW": round(power, 3),
            "expectedPressureBar": round(expected_pressure, 2),
            "expectedTemperatureC": round(expected_temp, 1),
            "anomaly": anomaly,
            "dataOrigin": "synthetic-telemetry",
        })
    return records


def main() -> None:
    map_data = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    sources = map_data.get("heatSources") or []
    object_by_id: dict[str, dict] = {}
    typed_objects: list[tuple[dict, str]] = []
    for object_ in map_data.get("lines") or []:
        typed_objects.append((object_, "pipe"))
    for object_ in map_data.get("points") or []:
        typed_objects.append((object_, "chamber"))
    for object_ in sources:
        typed_objects.append((object_, "source"))
    assets = []
    for object_, kind in typed_objects:
        object_by_id[str(object_["id"])] = object_
        assets.append(asset_record(object_, kind, sources))

    defects = []
    seen_source_ids = set()
    for object_, _ in typed_objects:
        for record in object_.get("defects") or []:
            record_id = str(record.get("id"))
            if record_id not in seen_source_ids:
                defects.append(source_defect(record, str(object_["id"])))
                seen_source_ids.add(record_id)
    for record in map_data.get("unmatchedDefects") or []:
        record_id = str(record.get("id"))
        if record_id not in seen_source_ids:
            defects.append(source_defect(record, None))
            seen_source_ids.add(record_id)

    for asset in assets:
        object_ = object_by_id[asset["id"]]
        rng = random.Random(stable_seed("defects:" + asset["id"]))
        base_count = 1 + (1 if asset["commissionedYear"] < 1995 and rng.random() < 0.48 else 0) + (1 if rng.random() < 0.12 else 0)
        defects.extend(synthetic_defect(asset, object_, index, rng) for index in range(base_count))

    telemetry = {asset["id"]: weekly_telemetry(asset) for asset in assets}
    payload = {
        "metadata": {
            "schemaVersion": 2,
            "generatedAt": NOW.isoformat(),
            "historyStart": HISTORY_START.isoformat(),
            "historyEnd": NOW.isoformat(),
            "warning": "Паспорта, телеметрия и записи с dataOrigin=synthetic-* являются учебными синтетическими данными.",
            "sourceDefectsPreserved": len(seen_source_ids),
            "assetCount": len(assets),
            "defectCount": len(defects),
            "telemetryRecordCount": sum(map(len, telemetry.values())),
        },
        "crews": CREWS,
        "assets": assets,
        "defects": defects,
        "telemetry": telemetry,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(payload["metadata"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
