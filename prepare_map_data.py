#!/usr/bin/env python3
"""Build browser-friendly map data from the Google My Maps KML export."""

from __future__ import annotations

import html
import hashlib
import json
import difflib
import math
import re
import unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "ktek_google_map_data.kml"
OUTPUT = ROOT / "ktek_map_objects.json"
DEFECTS_SOURCE = ROOT / "DEFECTS_KTEK_2026-08-10.json"
HOUSES_SOURCE = ROOT / "teploset_backup_2026-04-15 (1).json"
OSM_ADDRESSES_SOURCE = ROOT / "kostanay_osm_addresses.json"
BUILDING_GEOMETRY_SOURCE = ROOT / "kostanay_dependent_building_geometry.json"
NS = {"k": "http://www.opengis.net/kml/2.2"}

HEAT_SOURCES = [
    {
        "id": "heat-tets-1", "name": "Костанайская ТЭЦ", "shortName": "ТЭЦ-1",
        "kind": "major", "address": "ул. Чехова, 107",
        "description": "Костанайская ТЭЦ — центральный теплоисточник города.",
        "lat": 53.2182112, "lng": 63.6222714, "accuracy": "manual", "color": "#ff4d2e",
    },
    {
        "id": "heat-tets-2", "name": "ТЭЦ-2", "shortName": "ТЭЦ-2",
        "kind": "major", "address": "район КСК; отдельный почтовый адрес не опубликован",
        "description": "Теплоисточник района КСК.",
        "lat": 53.2485254, "lng": 63.6748052, "accuracy": "manual", "color": "#ff4d2e",
    },
    {
        "id": "heat-boiler-3", "name": "Котельная № 3 (район КЖБИ)", "shortName": "К-3",
        "kind": "district", "address": "район КЖБИ; отдельный номер здания не указан",
        "description": "Крупный теплоисточник, снабжающий южную часть города.",
        "lat": 53.1900495, "lng": 63.5877372, "accuracy": "area", "color": "#ff8a00",
    },
    {
        "id": "heat-boiler-7", "name": "Котельная № 7", "shortName": "К-7",
        "kind": "small", "address": "ул. Сибирская, 50",
        "description": "Малая котельная КТЭК.",
        "lat": 53.1986066, "lng": 63.6047615, "accuracy": "exact", "color": "#7c4dff",
    },
    {
        "id": "heat-boiler-12", "name": "Котельная № 12", "shortName": "К-12",
        "kind": "modular", "address": "мкр. Аэропорт; отдельный номер здания не опубликован",
        "description": "Блочно-модульная котельная микрорайона Аэропорт.",
        "lat": 53.2184909, "lng": 63.5706427, "accuracy": "area", "color": "#5468ff",
    },
    {
        "id": "heat-boiler-15", "name": "Котельная № 15", "shortName": "К-15",
        "kind": "modular", "address": "мкр. Юбилейный; отдельный номер здания не найден",
        "description": "Блочно-модульная котельная микрорайона Юбилейный.",
        "lat": 53.2444943, "lng": 63.6185911, "accuracy": "area", "color": "#5468ff",
    },
    {
        "id": "heat-boiler-16", "name": "Котельная № 16", "shortName": "К-16",
        "kind": "modular", "address": "мкр. Юбилейный; отдельный номер здания не найден",
        "description": "Блочно-модульная котельная микрорайона Юбилейный.",
        "lat": 53.2464996, "lng": 63.6140696, "accuracy": "area", "color": "#5468ff",
    },
]


def kml_color(value: str, fallback: str) -> str:
    """Convert KML AABBGGRR color to a CSS #RRGGBB color."""
    value = (value or "").strip().lower()
    if len(value) == 8:
        return f"#{value[6:8]}{value[4:6]}{value[2:4]}".upper()
    return fallback


def clean_description(value: str) -> tuple[str, str]:
    value = value or ""
    links = re.findall(r"https?://[^\s\"'<>]+", html.unescape(value))
    text = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text).strip()
    if links and text == links[0]:
        text = ""
    return text[:500], links[0] if links else ""


def coordinates(value: str) -> list[list[float]]:
    result = []
    for item in (value or "").split():
        parts = item.split(",")
        if len(parts) >= 2:
            result.append([float(parts[1]), float(parts[0])])
    return result


def normalize_name(value: str) -> str:
    value = unicodedata.normalize("NFKC", str(value or "")).upper().replace("Ё", "Е")
    return "".join(char for char in value if char.isalnum())


def defect_name_variants(value: str) -> list[str]:
    """Return conservative variants used in the defect register."""
    suffixes = ("ПРЯМО", "ПРЯМ", "ЛЕВО", "ЛЕВ", "ПР", "Л", "П")
    normalized = normalize_name(value)
    variants = [normalized]
    if normalized.startswith("ОТ") and len(normalized) > 4:
        variants.append(normalized[2:])

    for base in list(variants):
        current = base
        for _ in range(3):
            suffix = next((item for item in suffixes if current.endswith(item)), "")
            if not suffix:
                break
            current = current[: -len(suffix)]
            if len(current) >= 4:
                variants.append(current)
    return list(dict.fromkeys(variants))


def synthesize_impact(defect: dict, houses_by_tk: dict[str, list[dict]]) -> dict:
    """Create a stable model estimate of buildings affected by a defect."""
    candidates = []
    for variant in defect_name_variants(defect.get("tk", "")):
        candidates.extend(houses_by_tk.get(variant, []))

    unique_candidates = {}
    for house in candidates:
        address = " ".join(
            str(part).strip()
            for part in (house.get("street"), house.get("house"), house.get("block"))
            if part is not None and str(part).strip()
        )
        if address:
            unique_candidates[address] = house

    candidates = list(unique_candidates.values())
    seed = int(hashlib.sha256(str(defect.get("id", "")).encode()).hexdigest()[:12], 16)
    priority = int(defect.get("priority") or 5)
    desired_count = max(1, min(12, 2 + priority // 2 + seed % 4))

    selected = []
    if candidates:
        start = seed % len(candidates)
        ordered = candidates[start:] + candidates[:start]
        selected = ordered[:desired_count]

    houses = []
    flats = 0
    if selected:
        for house in selected:
            address = " ".join(
                str(part).strip()
                for part in (house.get("street"), house.get("house"), house.get("block"))
                if part is not None and str(part).strip()
            )
            houses.append(address)
            flats += int(house.get("flats") or 0)
    else:
        base_address = str(defect.get("address") or defect.get("tk") or "Объект сети").strip()
        number_match = re.search(r"(\d+)(?!.*\d)", base_address)
        if number_match:
            base_number = int(number_match.group(1))
            prefix = base_address[: number_match.start()].strip(" ,.-")
            suffix = base_address[number_match.end() :].strip()
            for offset in range(desired_count):
                number = base_number + offset * 2
                houses.append(" ".join(part for part in (prefix, str(number), suffix) if part))
        else:
            houses = [base_address]
        flats = len(houses) * (8 + seed % 53)

    streets = []
    for address in houses:
        street = re.sub(r"\s+\d+[\wА-Яа-я/-]*.*$", "", address).strip(" ,.-") or address
        if street not in streets:
            streets.append(street)

    return {
        "modelled": True,
        "method": "Реестр домов по ТК" if selected else "Оценка вокруг адреса дефекта",
        "houses": houses,
        "housesCount": len(houses),
        "streets": streets,
        "flatsEstimate": flats,
    }


def house_name_variants(value: str) -> list[str]:
    normalized = normalize_name(value)
    variants = [normalized]
    if normalized and not normalized.startswith(("ТК", "ТМ", "ВУ", "УТ")):
        variants.append("ТК" + normalized)
    for base in list(variants):
        current = base
        for _ in range(3):
            suffix = next(
                (item for item in ("ПРЯМО", "ПРЯМ", "ЛЕВО", "ЛЕВ", "ПР", "Л", "П") if current.endswith(item)),
                "",
            )
            if not suffix:
                break
            current = current[: -len(suffix)]
            if len(current) >= 4:
                variants.append(current)
    return list(dict.fromkeys(variants))


def normalize_street(value: str) -> str:
    value = unicodedata.normalize("NFKC", str(value or "")).upper().replace("Ё", "Е")
    value = value.translate(
        str.maketrans({"Ғ": "Г", "Қ": "К", "Ө": "О", "Ұ": "У", "Ү": "У", "І": "И", "Ә": "А", "Ң": "Н", "Һ": "Х"})
    )
    replacements = {
        "МАМЫР": "МАЯ",
        "САУИР": "АПРЕЛЯ",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    for service_word in (
        "УЛИЦА", "КОШЕСИ", "ДАНГЫЛЫ", "ПРОСПЕКТ", "ПЕРЕУЛОК",
        "МИКРОРАЙОН", "МИКРОРАЙОНЫ", "МКРН", "МКР", "ИМЕНИ", "ИМ.",
    ):
        value = value.replace(service_word, "")
    return "".join(char for char in value if char.isalnum())


def normalize_house_number(value: str) -> str:
    value = unicodedata.normalize("NFKC", str(value or "")).upper().replace("КОРПУС", "/")
    value = value.replace("СТРОЕНИЕ", "/").replace(" ", "")
    return "".join(char for char in value if char.isalnum() or char == "/")


def osm_coordinates(element: dict) -> tuple[float | None, float | None]:
    center = element.get("center", {})
    return element.get("lat", center.get("lat")), element.get("lon", center.get("lon"))


def geocode_houses(
    houses: list[dict], osm_elements: list[dict], network_locations: dict[str, list[tuple[float, float]]]
) -> tuple[int, int]:
    by_number = defaultdict(list)
    for element in osm_elements:
        tags = element.get("tags", {})
        street = normalize_street(tags.get("addr:street") or tags.get("addr:place"))
        number = normalize_house_number(tags.get("addr:housenumber"))
        lat, lng = osm_coordinates(element)
        if not street or not number or lat is None or lng is None:
            continue
        priority = 2 if element.get("type") in ("way", "relation") and tags.get("building") else 1
        by_number[number].append((street, float(lat), float(lng), element, priority))

    exact = 0
    fuzzy = 0
    for house in houses:
        house.pop("_realLat", None)
        house.pop("_realLng", None)
        street = normalize_street(house.get("street"))
        number = normalize_house_number(house.get("house"))
        candidates = by_number.get(number, [])
        if not street or not candidates:
            continue

        anchors = []
        for variant in house_name_variants(house.get("tk", "")):
            anchors.extend(network_locations.get(variant, []))
        def candidate_distance(candidate: tuple) -> float:
            if not anchors:
                return -candidate[4]
            return min(
                (candidate[1] - anchor[0]) ** 2 + ((candidate[2] - anchor[1]) * 0.6) ** 2
                for anchor in anchors
            )

        exact_candidates = [candidate for candidate in candidates if candidate[0] == street]
        match = min(exact_candidates, key=candidate_distance, default=None)
        method = "Точное совпадение адреса"
        confidence = 1.0

        if match is None:
            candidates_by_street = defaultdict(list)
            for candidate in candidates:
                candidates_by_street[candidate[0]].append(candidate)
            scored = []
            for candidate_street, street_candidates in candidates_by_street.items():
                score = difflib.SequenceMatcher(None, street, candidate_street).ratio()
                if len(street) >= 6 and (street in candidate_street or candidate_street in street):
                    score = max(score, 0.9)
                scored.append((score, candidate_street, street_candidates))
            scored.sort(key=lambda item: item[0], reverse=True)
            if scored:
                second_score = scored[1][0] if len(scored) > 1 else 0
                if scored[0][0] >= 0.80 and (scored[0][0] - second_score >= 0.04 or scored[0][0] >= 0.94):
                    confidence, _, street_candidates = scored[0]
                    match = min(street_candidates, key=candidate_distance)
                    method = "Нормализованное совпадение адреса"

        if match is None:
            continue
        _, lat, lng, element, _ = match
        if anchors:
            nearest_degrees = math.sqrt(candidate_distance(match))
            if nearest_degrees * 111 > 2.5:
                # An identical address can exist in a nearby village. A house
                # directly linked to a TK must be geographically local to it.
                continue
        house["_realLat"] = lat
        house["_realLng"] = lng
        house["_osmType"] = element.get("type")
        house["_osmId"] = element.get("id")
        house["_geocodeMethod"] = method
        house["_geocodeConfidence"] = round(confidence, 3)
        if confidence == 1:
            exact += 1
        else:
            fuzzy += 1
    return exact, fuzzy


def attach_dependent_houses(items: list[dict], houses_by_tk: dict[str, list[dict]]) -> int:
    total = 0
    for item in items:
        candidates = {}
        for variant in house_name_variants(item["name"]):
            for house in houses_by_tk.get(variant, []):
                candidates[house["id"]] = house

        dependent_houses = []
        ordered = sorted(
            (house for house in candidates.values() if house.get("_realLat") is not None),
            key=lambda house: (str(house.get("street") or ""), str(house.get("house") or "")),
        )
        for house in ordered:
            address = " ".join(
                str(part).strip()
                for part in (house.get("street"), house.get("house"), house.get("block"))
                if part is not None and str(part).strip()
            )
            dependent_houses.append(
                {
                    "id": house["id"],
                    "address": address or "Адрес не указан",
                    "street": house.get("street") or "",
                    "house": str(house.get("house") or ""),
                    "flats": int(house.get("flats") or 0),
                    "floors": int(house.get("floors") or 0),
                    "lat": round(house["_realLat"], 7),
                    "lng": round(house["_realLng"], 7),
                    "realCoordinates": True,
                    "coordinateSource": "OpenStreetMap",
                    "geocodeMethod": house["_geocodeMethod"],
                    "geocodeConfidence": house["_geocodeConfidence"],
                    "osmUrl": f"https://www.openstreetmap.org/{house['_osmType']}/{house['_osmId']}",
                    "osmKey": f"{house['_osmType']}/{house['_osmId']}",
                }
            )
        item["dependentHouses"] = dependent_houses
        total += len(dependent_houses)
    return total


def meter_distance(first: list[float], second: list[float]) -> float:
    latitude = math.radians((first[0] + second[0]) / 2)
    return math.hypot(
        (first[0] - second[0]) * 111_000,
        (first[1] - second[1]) * 111_000 * math.cos(latitude),
    )


def build_downstream_dependencies(
    points: list[dict], lines: list[dict], heat_sources: list[dict]
) -> None:
    """Build a source-rooted network tree and attach all downstream house keys."""
    endpoints = []
    for line_index, line in enumerate(lines):
        endpoints.append((line_index, 0, line["coordinates"][0]))
        endpoints.append((line_index, 1, line["coordinates"][-1]))

    parent = list(range(len(endpoints)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(first: int, second: int) -> None:
        first_root, second_root = find(first), find(second)
        if first_root != second_root:
            parent[second_root] = first_root

    cell_size = 0.00012
    endpoint_grid = defaultdict(list)
    for index, (_, _, position) in enumerate(endpoints):
        cell = (round(position[0] / cell_size), round(position[1] / cell_size))
        for lat_offset in (-1, 0, 1):
            for lng_offset in (-1, 0, 1):
                for other in endpoint_grid[(cell[0] + lat_offset, cell[1] + lng_offset)]:
                    if meter_distance(position, endpoints[other][2]) <= 12:
                        union(index, other)
        endpoint_grid[cell].append(index)

    cluster_members = defaultdict(list)
    for index, (_, _, position) in enumerate(endpoints):
        cluster_members[find(index)].append(position)
    cluster_ids = {root: index for index, root in enumerate(cluster_members)}
    node_positions = [
        [
            sum(position[0] for position in cluster_members[root]) / len(cluster_members[root]),
            sum(position[1] for position in cluster_members[root]) / len(cluster_members[root]),
        ]
        for root in cluster_members
    ]
    line_nodes = []
    graph = defaultdict(set)
    for line_index in range(len(lines)):
        first = cluster_ids[find(line_index * 2)]
        second = cluster_ids[find(line_index * 2 + 1)]
        line_nodes.append((first, second))
        graph[first].add(second)
        graph[second].add(first)

    point_nodes = []
    for point in points:
        position = [point["lat"], point["lng"]]
        nearest = min(range(len(node_positions)), key=lambda node: meter_distance(position, node_positions[node]))
        point_nodes.append(nearest if meter_distance(position, node_positions[nearest]) <= 60 else None)

    direct_houses_by_node = defaultdict(set)
    for point, node in zip(points, point_nodes):
        direct_keys = {house["osmKey"] for house in point.get("dependentHouses", []) if house.get("osmKey")}
        point["dependentHouseKeys"] = sorted(direct_keys)
        if node is not None:
            direct_houses_by_node[node].update(direct_keys)
    for line in lines:
        line["dependentHouseKeys"] = sorted(
            {house["osmKey"] for house in line.get("dependentHouses", []) if house.get("osmKey")}
        )

    unseen = set(range(len(node_positions)))
    while unseen:
        component_root = next(iter(unseen))
        component = []
        stack = [component_root]
        unseen.remove(component_root)
        while stack:
            node = stack.pop()
            component.append(node)
            for neighbour in graph[node]:
                if neighbour in unseen:
                    unseen.remove(neighbour)
                    stack.append(neighbour)

        root = min(
            component,
            key=lambda node: min(
                meter_distance(node_positions[node], [source["lat"], source["lng"]])
                for source in heat_sources
            ),
        )
        tree_parent = {root: None}
        depth = {root: 0}
        order = [root]
        queue = [root]
        for node in queue:
            for neighbour in graph[node]:
                if neighbour not in tree_parent:
                    tree_parent[neighbour] = node
                    depth[neighbour] = depth[node] + 1
                    order.append(neighbour)
                    queue.append(neighbour)
        downstream = {node: set(direct_houses_by_node[node]) for node in component}
        for node in reversed(order):
            if tree_parent[node] is not None:
                downstream[tree_parent[node]].update(downstream[node])

        for point_index, node in enumerate(point_nodes):
            if node in downstream:
                direct = set(points[point_index].get("dependentHouseKeys", []))
                points[point_index]["downstreamHouseKeys"] = sorted(downstream[node] | direct)
        for line_index, (first, second) in enumerate(line_nodes):
            if first in downstream and second in downstream:
                lower_node = second if depth.get(second, 0) >= depth.get(first, 0) else first
                direct = set(lines[line_index].get("dependentHouseKeys", []))
                lines[line_index]["downstreamHouseKeys"] = sorted(downstream[lower_node] | direct)


def build_dependent_house_catalog(items: list[dict]) -> list[dict]:
    outlines = {}
    if BUILDING_GEOMETRY_SOURCE.exists():
        outlines = json.loads(BUILDING_GEOMETRY_SOURCE.read_text(encoding="utf-8")).get("outlines", {})
    catalog = {}
    for item in items:
        for house in item.get("dependentHouses", []):
            key = house.get("osmKey")
            if not key or key in catalog:
                continue
            catalog[key] = {
                "key": key,
                "address": house["address"],
                "flats": house["flats"],
                "floors": house["floors"],
                "lat": house["lat"],
                "lng": house["lng"],
                "outline": outlines.get(key, []),
                "osmUrl": house["osmUrl"],
            }
    return list(catalog.values())


def main() -> None:
    root = ET.parse(SOURCE).getroot()
    parent = {child: node for node in root.iter() for child in node}

    styles = {}
    for style in root.findall(".//k:Style", NS):
        style_id = style.get("id", "")
        styles[style_id] = {
            "iconColor": kml_color(
                style.findtext("k:IconStyle/k:color", "", NS), "#1A73E8"
            ),
            "lineColor": kml_color(
                style.findtext("k:LineStyle/k:color", "", NS), "#A52714"
            ),
            "lineWidth": float(style.findtext("k:LineStyle/k:width", "3", NS) or 3),
        }

    style_maps = {}
    for style_map in root.findall(".//k:StyleMap", NS):
        pairs = {
            pair.findtext("k:key", "", NS): pair.findtext("k:styleUrl", "", NS).lstrip("#")
            for pair in style_map.findall("k:Pair", NS)
        }
        style_maps[style_map.get("id", "")] = pairs.get("normal", "")

    def style_for(placemark: ET.Element) -> dict:
        style_id = placemark.findtext("k:styleUrl", "", NS).lstrip("#")
        style_id = style_maps.get(style_id, style_id)
        return styles.get(style_id, {"iconColor": "#1A73E8", "lineColor": "#A52714", "lineWidth": 3})

    def folder_for(placemark: ET.Element) -> str:
        node = parent.get(placemark)
        while node is not None:
            if node.tag.endswith("}Folder"):
                return node.findtext("k:name", "Без раздела", NS)
            node = parent.get(node)
        return "Без раздела"

    points = []
    lines = []
    for placemark in root.findall(".//k:Placemark", NS):
        name = placemark.findtext("k:name", "Без названия", NS).strip() or "Без названия"
        description, link = clean_description(placemark.findtext("k:description", "", NS))
        folder = folder_for(placemark)
        style = style_for(placemark)

        point_node = placemark.find(".//k:Point/k:coordinates", NS)
        if point_node is not None:
            coords = coordinates(point_node.text or "")
            if coords:
                points.append(
                    {
                        "id": f"point-{len(points) + 1:04d}",
                        "name": name,
                        "description": description,
                        "link": link,
                        "folder": folder,
                        "color": style["iconColor"],
                        "lat": coords[0][0],
                        "lng": coords[0][1],
                    }
                )

        line_node = placemark.find(".//k:LineString/k:coordinates", NS)
        if line_node is not None:
            coords = coordinates(line_node.text or "")
            if len(coords) > 1:
                lines.append(
                    {
                        "id": f"line-{len(lines) + 1:04d}",
                        "name": name,
                        "description": description,
                        "link": link,
                        "folder": folder,
                        "color": style["lineColor"],
                        "weight": max(2, min(6, round(style["lineWidth"]))),
                        "coordinates": coords,
                    }
                )
            elif len(coords) == 1 and point_node is None:
                # Google My Maps contains one LineString with a single coordinate.
                # Preserve it as a point so no source object silently disappears.
                points.append(
                    {
                        "id": f"point-{len(points) + 1:04d}",
                        "name": name,
                        "description": description,
                        "link": link,
                        "folder": folder,
                        "color": style["lineColor"],
                        "lat": coords[0][0],
                        "lng": coords[0][1],
                    }
                )

    defects = json.loads(DEFECTS_SOURCE.read_text(encoding="utf-8-sig"))
    house_database = json.loads(HOUSES_SOURCE.read_text(encoding="utf-8"))["houses"]
    osm_elements = json.loads(OSM_ADDRESSES_SOURCE.read_text(encoding="utf-8"))["elements"]
    network_locations = defaultdict(list)
    for item in [*points, *lines]:
        if "lat" in item:
            location = (item["lat"], item["lng"])
        else:
            center = item["coordinates"][len(item["coordinates"]) // 2]
            location = (center[0], center[1])
        for variant in house_name_variants(item["name"]):
            network_locations[variant].append(location)
    exact_geocodes, fuzzy_geocodes = geocode_houses(house_database, osm_elements, network_locations)
    address_index = []
    seen_address_ids = set()
    for house in house_database:
        if house.get("_realLat") is None or house["id"] in seen_address_ids:
            continue
        seen_address_ids.add(house["id"])
        address = " ".join(
            str(part).strip()
            for part in (house.get("street"), house.get("house"), house.get("block"))
            if part is not None and str(part).strip()
        )
        if not address:
            continue
        address_index.append(
            {
                "id": house["id"],
                "address": address,
                "street": house.get("street") or "",
                "house": str(house.get("house") or ""),
                "tk": house.get("tk") or "",
                "flats": int(house.get("flats") or 0),
                "floors": int(house.get("floors") or 0),
                "lat": round(house["_realLat"], 7),
                "lng": round(house["_realLng"], 7),
                "osmUrl": f"https://www.openstreetmap.org/{house['_osmType']}/{house['_osmId']}",
            }
        )
    address_index.sort(key=lambda house: (house["street"], house["house"]))
    houses_by_tk = defaultdict(list)
    for house in house_database:
        for house_key in house_name_variants(house.get("tk", "")):
            houses_by_tk[house_key].append(house)
    for defect in defects:
        defect["impact"] = synthesize_impact(defect, houses_by_tk)
    dependent_house_bindings = attach_dependent_houses([*points, *lines], houses_by_tk)
    dependent_house_catalog = build_dependent_house_catalog([*points, *lines])
    build_downstream_dependencies(points, lines, HEAT_SOURCES)
    objects_by_name = defaultdict(list)
    for item in [*points, *lines]:
        item["defects"] = []
        objects_by_name[normalize_name(item["name"])].append(item)

    matched_defects = 0
    unmatched_defects = []
    for defect in defects:
        matches = []
        for variant in defect_name_variants(defect.get("tk", "")):
            if variant in objects_by_name:
                matches = objects_by_name[variant]
                break

        if not matches:
            # Compound register names such as "ВУ3 ТМ14" can be safely tied
            # to their explicitly named main-pipeline segment.
            for main_name in re.findall(r"ТМ\d+", normalize_name(defect.get("tk", ""))):
                if main_name in objects_by_name:
                    matches = objects_by_name[main_name]
                    break

        if matches:
            matched_defects += 1
            for item in matches:
                item["defects"].append(defect)
        else:
            unmatched_defects.append(defect)

    payload = {
        "info": {
            "source": 'карта "Тепловые сети города Костанай" (Google My Maps KML)',
            "points": len(points),
            "lines": len(lines),
            "defects": len(defects),
            "matchedDefects": matched_defects,
            "unmatchedDefects": len(unmatched_defects),
            "dependentHouseBindings": dependent_house_bindings,
            "geocodedHousesExact": exact_geocodes,
            "geocodedHousesNormalized": fuzzy_geocodes,
            "searchableAddresses": len(address_index),
            "heatSources": len(HEAT_SOURCES),
            "dependentBuildingOutlines": sum(bool(house["outline"]) for house in dependent_house_catalog),
        },
        "points": points,
        "lines": lines,
        "heatSources": HEAT_SOURCES,
        "dependentHouses": dependent_house_catalog,
        "addresses": address_index,
        "unmatchedDefects": unmatched_defects,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"Created {OUTPUT.name}: {len(points)} points, {len(lines)} lines, "
        f"{matched_defects}/{len(defects)} defects matched, "
        f"{dependent_house_bindings} real dependent-house bindings "
        f"({exact_geocodes} exact + {fuzzy_geocodes} normalized addresses)"
    )


if __name__ == "__main__":
    main()
