import csv
import json
import os

# Directorio raiz del proyecto (scripts/py/ -> ../../)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

export_dir = os.path.join(PROJECT_ROOT, 'db_export')
os.makedirs(export_dir, exist_ok=True)

input_file = os.path.join(PROJECT_ROOT, 'data/real/Supabase Snippet Untitled query.csv')

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    headers = next(reader)
    
    try:
        row = next(reader)
    except StopIteration:
        print("No data row found in CSV.")
        exit(1)
    
    for i, table_name in enumerate(headers):
        if i >= len(row):
            break
            
        data_str = row[i]
        if not data_str or data_str == 'null':
            print(f"Skipping {table_name}, no data.")
            continue
            
        try:
            data = json.loads(data_str)
            if not data or len(data) == 0:
                print(f"Table {table_name} is empty.")
                continue
                
            # Write to JSON
            json_path = os.path.join(export_dir, f'{table_name}.json')
            with open(json_path, 'w', encoding='utf-8') as out_json:
                json.dump(data, out_json, indent=2, ensure_ascii=False)
                
            # Write to CSV
            keys = []
            for item in data:
                for k in item.keys():
                    if k not in keys:
                        keys.append(k)
                        
            csv_path = os.path.join(export_dir, f'{table_name}.csv')
            with open(csv_path, 'w', encoding='utf-8', newline='') as out_csv:
                writer = csv.DictWriter(out_csv, fieldnames=keys)
                writer.writeheader()
                for item in data:
                    processed_item = {}
                    for k, v in item.items():
                        if isinstance(v, (dict, list)):
                            processed_item[k] = json.dumps(v, ensure_ascii=False)
                        else:
                            processed_item[k] = v
                    writer.writerow(processed_item)
                    
            print(f"Created {csv_path} ({len(data)} rows)")
        except Exception as e:
            print(f"Error processing {table_name}: {e}")

print("Todos los archivos extraidos y convertidos!")
