#!/usr/bin/env python3
"""Fetch OSM outlines for buildings referenced by dependent houses."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MAP_DATA = ROOT / "ktek_map_objects.json"
OUTPUT = ROOT / "kostanay_dependent_building_geometry.json"
OVERPASS_URLS = (
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
)
OSM_API = "https://api.openstreetmap.org/api/0.6"


def referenced_elements() -> dict[str, set[int]]:
    payload = json.loads(MAP_DATA.read_text(encoding="utf-8"))
    refs = {"way": set(), "relation": set()}
    for item in [*payload.get("points", []), *payload.get("lines", [])]:
        for house in item.get("dependentHouses", []):
            parts = str(house.get("osmUrl") or "").rstrip("/").split("/")
            if len(parts) >= 2 and parts[-2] in refs and parts[-1].isdigit():
                refs[parts[-2]].add(int(parts[-1]))
    return refs


def fetch_query(query: str) -> dict:
    body = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_error = None
    for url in OVERPASS_URLS:
        for attempt in range(2):
            try:
                request = urllib.request.Request(
                    url,
                    data=body,
                    headers={"User-Agent": "KTEK-map-local/1.0"},
                )
                with urllib.request.urlopen(request, timeout=45) as response:
                    return json.load(response)
            except Exception as error:  # noqa: BLE001 - retry another public mirror
                last_error = error
                time.sleep(1 + attempt)
    raise RuntimeError(f"Overpass request failed: {last_error}")


def main() -> None:
    refs = referenced_elements()
    outlines = {}
    targets = [(element_type, element_id) for element_type, ids in refs.items() for element_id in sorted(ids)]

    def fetch_full(target: tuple[str, int]) -> tuple[str, list[list[float]]]:
        element_type, element_id = target
        url = f"{OSM_API}/{element_type}/{element_id}/full.json"
        request = urllib.request.Request(url, headers={"User-Agent": "KTEK-map-local/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
        nodes = {
            element["id"]: [round(float(element["lat"]), 7), round(float(element["lon"]), 7)]
            for element in payload.get("elements", [])
            if element.get("type") == "node" and "lat" in element and "lon" in element
        }
        target_element = next(
            (
                element
                for element in payload.get("elements", [])
                if element.get("type") == element_type and element.get("id") == element_id
            ),
            None,
        )
        coordinates = []
        if target_element and element_type == "way":
            coordinates = [nodes[node_id] for node_id in target_element.get("nodes", []) if node_id in nodes]
        elif target_element and element_type == "relation":
            outer = next(
                (
                    member
                    for member in target_element.get("members", [])
                    if member.get("type") == "way" and member.get("role") in ("outer", "")
                ),
                None,
            )
            if outer:
                member_way = next(
                    (
                        element
                        for element in payload.get("elements", [])
                        if element.get("type") == "way" and element.get("id") == outer.get("ref")
                    ),
                    None,
                )
                if member_way:
                    coordinates = [nodes[node_id] for node_id in member_way.get("nodes", []) if node_id in nodes]
        return f"{element_type}/{element_id}", coordinates

    completed = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(fetch_full, target): target for target in targets}
        for future in as_completed(futures):
            completed += 1
            try:
                key, coordinates = future.result()
                if len(coordinates) >= 3:
                    outlines[key] = coordinates
            except Exception as error:  # noqa: BLE001 - keep all successfully fetched outlines
                print(f"Failed {futures[future]}: {error}")
            if completed % 50 == 0 or completed == len(targets):
                print(f"OSM outlines: {completed}/{len(targets)}", flush=True)

    OUTPUT.write_text(
        json.dumps({"source": "OpenStreetMap", "outlines": outlines}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Created {OUTPUT.name}: {len(outlines)} building outlines")


if __name__ == "__main__":
    main()
