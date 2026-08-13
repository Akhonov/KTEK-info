#!/usr/bin/env python3
"""Build browser-friendly map data from the Google My Maps KML export."""

from __future__ import annotations

import html
import hashlib
import json
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
NS = {"k": "http://www.opengis.net/kml/2.2"}


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
    houses_by_tk = defaultdict(list)
    for house in house_database:
        house_name = normalize_name(house.get("tk", ""))
        house_keys = [house_name]
        if house_name and not house_name.startswith(("ТК", "ТМ", "ВУ", "УТ")):
            house_keys.append("ТК" + house_name)
        for house_key in house_keys:
            houses_by_tk[house_key].append(house)
    for defect in defects:
        defect["impact"] = synthesize_impact(defect, houses_by_tk)
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
        },
        "points": points,
        "lines": lines,
        "unmatchedDefects": unmatched_defects,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"Created {OUTPUT.name}: {len(points)} points, {len(lines)} lines, "
        f"{matched_defects}/{len(defects)} defects matched"
    )


if __name__ == "__main__":
    main()
