#!/usr/bin/env python3
import os
import zipfile
import xml.etree.ElementTree as ET
import json

# Find KMZ file
possible_paths = [
    'карта Тепловые сети города Костанай(1).kmz',
    'карта Тепловые сети города Костанай.kmz',
    os.path.expanduser('~/Downloads/карта Тепловые сети города Костанай.kmz'),
]

kmz_file = None
for path in possible_paths:
    if os.path.exists(path):
        kmz_file = path
        break

if not kmz_file:
    print("KMZ файл не найден. Ищу в текущей папке:")
    files = os.listdir('.')
    for f in files:
        if f.endswith('.kmz'):
            print(f"  - {f}")
            kmz_file = f
            break

if kmz_file:
    print(f"✓ Найден файл: {kmz_file}")
    
    try:
        # Extract KMZ
        with zipfile.ZipFile(kmz_file, 'r') as zip_ref:
            zip_ref.extractall('kmz_data')
        
        print("✓ KMZ распакован")
        
        # Parse KML
        kml_file = 'kmz_data/doc.kml'
        if os.path.exists(kml_file):
            tree = ET.parse(kml_file)
            root = tree.getroot()
            
            # Define namespace
            ns = {'kml': 'http://www.opengis.net/kml/2.2'}
            
            # Extract placemarks
            placemarks = root.findall('.//kml:Placemark', ns)
            print(f"✓ Найдено меток: {len(placemarks)}\n")
            
            markers_data = []
            
            for i, pm in enumerate(placemarks):
                try:
                    name_elem = pm.find('kml:name', ns)
                    coords_elem = pm.find('.//kml:coordinates', ns)
                    desc_elem = pm.find('kml:description', ns)
                    
                    if coords_elem is not None and coords_elem.text:
                        # KML coordinates format: lon,lat,altitude
                        coord_text = coords_elem.text.strip()
                        parts = coord_text.split(',')
                        
                        if len(parts) >= 2:
                            lon, lat = float(parts[0]), float(parts[1])
                            
                            marker = {
                                'id': f'marker_{i}',
                                'name': name_elem.text if name_elem is not None else f'Объект {i}',
                                'lat': lat,
                                'lng': lon,
                                'description': desc_elem.text if desc_elem is not None else ''
                            }
                            
                            markers_data.append(marker)
                            
                            if i < 10:  # Show first 10
                                print(f"{i+1}. {marker['name']}")
                                print(f"   Координаты: {lat}, {lon}")
                                if marker['description']:
                                    print(f"   Описание: {marker['description'][:60]}")
                                print()
                except Exception as e:
                    print(f"Ошибка парсирования метки {i}: {e}")
            
            # Save to JSON
            output_file = 'kml_markers.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(markers_data, f, ensure_ascii=False, indent=2)
            
            print(f"✓ Сохранено {len(markers_data)} меток в {output_file}")
        else:
            print(f"✗ KML файл не найден в архиве")
    
    except Exception as e:
        print(f"✗ Ошибка: {e}")
else:
    print("✗ KMZ файл не найден")
