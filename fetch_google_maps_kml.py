#!/usr/bin/env python3
import requests
import xml.etree.ElementTree as ET
import json
import time

url = "https://www.google.com/maps/d/u/0/kml?mid=1a0TrYqu031MBHQx7KV2IUqVQrK6Fq8o"

print("Загружаю KML данные с Google My Maps...")
print(f"URL: {url}\n")

try:
    # Download with headers to look like browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=10)
    response.encoding = 'utf-8'
    
    if response.status_code == 200:
        print("✓ KML данные загружены\n")
        
        # Parse KML
        root = ET.fromstring(response.content)
        
        # Define namespace
        ns = {'kml': 'http://www.opengis.net/kml/2.2'}
        
        # Extract all Placemarks
        placemarks = root.findall('.//kml:Placemark', ns)
        print(f"✓ Найдено меток: {len(placemarks)}\n")
        
        markers_data = []
        
        for i, pm in enumerate(placemarks):
            try:
                name_elem = pm.find('kml:name', ns)
                desc_elem = pm.find('kml:description', ns)
                
                # Try Point
                point = pm.find('.//kml:Point/kml:coordinates', ns)
                # Try LineString
                line = pm.find('.//kml:LineString/kml:coordinates', ns)
                # Try Polygon
                poly = pm.find('.//kml:Polygon//kml:coordinates', ns)
                
                coords_elem = point or line or poly
                
                if coords_elem is not None and coords_elem.text:
                    coord_text = coords_elem.text.strip()
                    
                    if point is not None:  # For points, take the first coordinate
                        parts = coord_text.split(',')
                        if len(parts) >= 2:
                            lon, lat = float(parts[0]), float(parts[1])
                            
                            marker = {
                                'id': f'marker_{i}',
                                'name': name_elem.text if name_elem is not None else f'Объект {i}',
                                'lat': lat,
                                'lng': lon,
                                'type': 'point',
                                'description': desc_elem.text if desc_elem is not None else ''
                            }
                            
                            markers_data.append(marker)
                    else:  # For LineString/Polygon, take first coordinate
                        parts = coord_text.split('\n')[0].split(',')
                        if len(parts) >= 2:
                            lon, lat = float(parts[0]), float(parts[1])
                            
                            marker = {
                                'id': f'marker_{i}',
                                'name': name_elem.text if name_elem is not None else f'Объект {i}',
                                'lat': lat,
                                'lng': lon,
                                'type': 'line' if line is not None else 'polygon',
                                'description': desc_elem.text if desc_elem is not None else ''
                            }
                            
                            markers_data.append(marker)
                    
                    if i < 15:  # Show first 15
                        print(f"{i+1}. {markers_data[-1]['name']}")
                        print(f"   Координаты: {markers_data[-1]['lat']}, {markers_data[-1]['lng']}")
                        if markers_data[-1]['description']:
                            print(f"   Описание: {markers_data[-1]['description'][:60]}")
                        print()
            
            except Exception as e:
                pass
        
        # Save to JSON
        output_file = 'kml_markers.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(markers_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n✓ Сохранено {len(markers_data)} объектов в {output_file}")
    
    else:
        print(f"✗ Ошибка при загрузке: {response.status_code}")

except requests.exceptions.RequestException as e:
    print(f"✗ Ошибка сети: {e}")
    print("\nПопытаюсь использовать альтернативный способ...")
except Exception as e:
    print(f"✗ Ошибка: {e}")
