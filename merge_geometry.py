import json

# Load all sources
with open('ktek_parsed_kml.json') as f:
    kml_data = json.load(f)

with open('ktek_built_dataset.json') as f:
    current_data = json.load(f)

# Create indexed map of current chambers for telemetry
current_chambers_map = {c['id']: c for c in current_data['chambers']}
current_pipelines_map = {p['id']: p for p in current_data['pipelines']}

# Merge datasets
merged_data = {
    "chambers": [],
    "pipelines": [],
    "metadata": {
        "source": "KML geometry + current telemetry",
        "chambers_total": len(kml_data['points']),
        "pipelines_total": len(kml_data['lines'])
    }
}

# Merge chambers (KML geometry + current telemetry)
for point in kml_data['points']:
    chamber = {
        "id": point['name'],
        "name": point['name'],
        "lat": point['coordinates'][0],
        "lng": point['coordinates'][1],
        "type": "chamber",
        "status": "normal"
    }
    
    # Merge with current data if exists
    if point['name'] in current_chambers_map:
        current = current_chambers_map[point['name']]
        # Merge telemetry data
        chamber.update({
            "source": current.get("source"),
            "t1": current.get("t1"),
            "t2": current.get("t2"),
            "p1": current.get("p1"),
            "p2": current.get("p2"),
            "status": current.get("status", "normal"),
            "street": current.get("street")
        })
    
    merged_data['chambers'].append(chamber)

# Merge pipelines (KML geometry + current metadata)
for line in kml_data['lines']:
    pipeline = {
        "id": line['name'],
        "name": line['name'],
        "type": "pipeline",
        "coordinates": line['coordinates'],
        "waypoints": [f"{coord[0]} {coord[1]}" for coord in line['coordinates']],
        "status": "normal"
    }
    
    # Add start/end info
    if len(line['coordinates']) >= 2:
        pipeline['from'] = f"LatLng({line['coordinates'][0][0]}, {line['coordinates'][0][1]})"
        pipeline['to'] = f"LatLng({line['coordinates'][-1][0]}, {line['coordinates'][-1][1]})"
    
    # Merge with current pipeline data if exists
    if line['name'] in current_pipelines_map:
        current = current_pipelines_map[line['name']]
        # Keep additional metadata
        pipeline.update({
            "status": current.get("status", "normal"),
            "diameter": current.get("diameter"),
            "lengthM": current.get("lengthM"),
            "year": current.get("year"),
            "isMagistral": current.get("isMagistral", False)
        })
    
    merged_data['pipelines'].append(pipeline)

print(f'Merged dataset:')
print(f'  Chambers: {len(merged_data["chambers"])}')
print(f'  Pipelines: {len(merged_data["pipelines"])}')

# Sample chamber with telemetry
print(f'\nSample chamber (with telemetry):')
sample_chamber = [c for c in merged_data['chambers'] if c.get('t1')]
if sample_chamber:
    print(json.dumps(sample_chamber[0], indent=2, ensure_ascii=False))

# Sample pipeline
print(f'\nSample pipeline (with geometry):')
print(json.dumps(merged_data['pipelines'][0], indent=2, ensure_ascii=False))

# Save merged file
with open('ktek_merged_full.json', 'w', encoding='utf-8') as f:
    json.dump(merged_data, f, indent=2, ensure_ascii=False)

print(f'\nSaved to: ktek_merged_full.json')

# Also update the main file
with open('ktek_built_dataset.json', 'w', encoding='utf-8') as f:
    # Reorganize to keep chamber index
    final_data = {
        "chambers": merged_data['chambers'],
        "pipelines": merged_data['pipelines'],
        "info": merged_data['metadata']
    }
    json.dump(final_data, f, indent=2, ensure_ascii=False)

print(f'Updated: ktek_built_dataset.json')
