import json

# Load parsed KML
with open('ktek_parsed_kml.json') as f:
    kml_data = json.load(f)

# Load current dataset
with open('ktek_built_dataset.json') as f:
    current_data = json.load(f)

print(f'Current chambers: {len(current_data["chambers"])}')
print(f'Current pipelines: {len(current_data["pipelines"])}')
print(f'KML points: {len(kml_data["points"])}')
print(f'KML lines: {len(kml_data["lines"])}')

# Create enhanced dataset from KML
enhanced_data = {
    "chambers": [],
    "pipelines": []
}

# Add chambers from KML (more authoritative)
for point in kml_data['points']:
    chamber = {
        "id": point['name'],
        "name": point['name'],
        "lat": point['coordinates'][0],
        "lng": point['coordinates'][1],
        "type": "chamber",
        "status": "normal"  # Default status
    }
    enhanced_data['chambers'].append(chamber)

# Add pipelines from KML with proper coordinates
for line in kml_data['lines']:
    pipeline = {
        "id": line['name'],
        "name": line['name'],
        "type": "pipeline",
        "coordinates": line['coordinates'],  # Array of [lat, lng]
        "waypoints": [f"{coord[0]} {coord[1]}" for coord in line['coordinates']],
        "status": "normal"
    }
    
    # Try to extract start and end
    if len(line['coordinates']) >= 2:
        pipeline['from'] = line['coordinates'][0]
        pipeline['to'] = line['coordinates'][-1]
        pipeline['length_m'] = len(line['coordinates'])  # Approximate
    
    enhanced_data['pipelines'].append(pipeline)

print(f'\nEnhanced dataset:')
print(f'  Chambers: {len(enhanced_data["chambers"])}')
print(f'  Pipelines: {len(enhanced_data["pipelines"])}')

# Show sample
print(f'\nSample pipeline:')
print(json.dumps(enhanced_data['pipelines'][0], indent=2, ensure_ascii=False))

# Save to file
output_file = 'ktek_enhanced_geometry.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(enhanced_data, f, indent=2, ensure_ascii=False)

print(f'\nSaved to: {output_file}')
