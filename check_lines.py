import json

with open('ktek_parsed_kml.json') as f:
    data = json.load(f)

print(f'Points: {len(data["points"])}')
print(f'Lines: {len(data["lines"])}')

if data['lines']:
    line = data['lines'][0]
    print(f'\nFirst line structure:')
    print(f'  Name: {line.get("name")}')
    print(f'  Type: {line.get("type")}')
    print(f'  Coords count: {len(line.get("coordinates", []))}')
    if line.get("coordinates"):
        print(f'  First coord: {line["coordinates"][0]}')
        print(f'  Last coord: {line["coordinates"][-1]}')
