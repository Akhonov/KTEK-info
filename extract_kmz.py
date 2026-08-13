import zipfile
import os
import glob
import xml.etree.ElementTree as ET

# Find KMZ file
kmz_files = glob.glob('*.kmz')
if not kmz_files:
    print('No KMZ files found')
    exit(1)

kmz_path = kmz_files[0]
print(f'Found KMZ file: {kmz_path}\n')

# Extract and read KML
with zipfile.ZipFile(kmz_path, 'r') as zip_ref:
    print('Files in KMZ:')
    for name in zip_ref.namelist():
        print(f'  {name}')
    
    # Find and read KML file
    kml_files = [f for f in zip_ref.namelist() if f.endswith('.kml')]
    if kml_files:
        kml_content = zip_ref.read(kml_files[0]).decode('utf-8')
        print(f'\nKML file size: {len(kml_content)} bytes')
        print('\n=== KML Preview (first 2000 chars) ===')
        print(kml_content[:2000])
        
        # Parse XML
        print('\n=== Parsing KML Structure ===')
        try:
            root = ET.fromstring(kml_content)
            
            # Define namespaces
            ns = {'kml': 'http://www.opengis.net/kml/2.2'}
            
            # Find all placemarks (routes/objects)
            placemarks = root.findall('.//kml:Placemark', ns)
            print(f'Found {len(placemarks)} placemarks')
            
            # Show first few
            for i, pm in enumerate(placemarks[:5]):
                name_elem = pm.find('kml:name', ns)
                desc_elem = pm.find('kml:description', ns)
                coords_elem = pm.find('.//kml:coordinates', ns)
                
                if name_elem is not None:
                    print(f'\n{i+1}. {name_elem.text}')
                    if desc_elem is not None:
                        print(f'   Description: {desc_elem.text[:100]}...')
                    if coords_elem is not None:
                        coords_text = coords_elem.text[:100] if coords_elem.text else 'None'
                        print(f'   Coordinates: {coords_text}...')
        except Exception as e:
            print(f'Error parsing XML: {e}')
