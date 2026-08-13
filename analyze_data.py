import json

# Analyze what data is being sent to the browser
with open('ktek_built_dataset.json', encoding='utf-8') as f:
    data = json.load(f)

print('=== DATA STRUCTURE ANALYSIS ===\n')

# Check first 5 pipelines
print('First 5 pipelines:')
for i, pipe in enumerate(data['pipelines'][:5]):
    print(f'\n{i+1}. {pipe.get("id")}')
    print(f'   Has coordinates: {"coordinates" in pipe}')
    print(f'   Has waypoints: {"waypoints" in pipe}')
    
    if 'coordinates' in pipe:
        coords = pipe['coordinates']
        print(f'   Coordinates type: {type(coords).__name__}')
        print(f'   First item type: {type(coords[0]).__name__ if coords else "empty"}')
        if coords:
            print(f'   First 2 coords: {coords[:2]}')
    
    if 'waypoints' in pipe:
        wps = pipe['waypoints']
        print(f'   Waypoints: {len(wps)} items')
        if wps:
            print(f'   First waypoint: {wps[0]}')
            print(f'   Waypoint type: {type(wps[0]).__name__}')

# Check chamber structure
print('\n\n=== CHAMBER STRUCTURE ===')
print(f'First chamber:')
chamber = data['chambers'][0]
for key in ['id', 'name', 'lat', 'lng', 'status', 't1', 't2', 'p1', 'p2']:
    print(f'  {key}: {chamber.get(key)}')

# Check data integrity
print('\n\n=== DATA INTEGRITY CHECK ===')
chambers_with_coords = sum(1 for c in data['chambers'] if c.get('lat') and c.get('lng'))
print(f'Chambers with coordinates: {chambers_with_coords}/{len(data["chambers"])}')

pipes_with_data = 0
for p in data['pipelines']:
    if (p.get('coordinates') and len(p['coordinates']) > 1) or \
       (p.get('waypoints') and len(p['waypoints']) > 1):
        pipes_with_data += 1

print(f'Pipelines with coordinate data: {pipes_with_data}/{len(data["pipelines"])}')
