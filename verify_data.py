import json

with open('ktek_built_dataset.json', encoding='utf-8') as f:
    data = json.load(f)

print('Dataset verification:')
print(f'Chambers: {len(data["chambers"])}')
print(f'Pipelines: {len(data["pipelines"])}')

# Check pipeline structure
p = data['pipelines'][0]
print(f'\nFirst pipeline:')
print(f'  ID: {p.get("id")}')
print(f'  Name: {p.get("name")}')
print(f'  Has coordinates: {"coordinates" in p}')
print(f'  Has waypoints: {"waypoints" in p}')
if 'coordinates' in p:
    print(f'  Coordinate points: {len(p["coordinates"])}')
    print(f'  Format check: {p["coordinates"][0]}')

# Check chamber structure
c = data['chambers'][0]
print(f'\nFirst chamber:')
print(f'  ID: {c.get("id")}')
print(f'  Name: {c.get("name")}')
print(f'  Has telemetry: {c.get("t1") is not None}')
if c.get("t1"):
    print(f'  T1: {c.get("t1")}°C, P1: {c.get("p1")} bar')

print('\n✓ Dataset ready for mapping')
