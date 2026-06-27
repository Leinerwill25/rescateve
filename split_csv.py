import csv
import json
import os

os.makedirs('db_export', exist_ok=True)

input_file = 'Supabase Snippet Untitled query.csv'

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
                
            # Write to JSON just in case
            with open(f'db_export/{table_name}.json', 'w', encoding='utf-8') as out_json:
                json.dump(data, out_json, indent=2, ensure_ascii=False)
                
            # Write to CSV
            # Get all possible keys across all dictionaries to ensure we don't miss any columns
            keys = []
            for item in data:
                for k in item.keys():
                    if k not in keys:
                        keys.append(k)
                        
            with open(f'db_export/{table_name}.csv', 'w', encoding='utf-8', newline='') as out_csv:
                writer = csv.DictWriter(out_csv, fieldnames=keys)
                writer.writeheader()
                for item in data:
                    # Convert nested dicts/lists back to JSON strings for CSV compatibility
                    processed_item = {}
                    for k, v in item.items():
                        if isinstance(v, (dict, list)):
                            processed_item[k] = json.dumps(v, ensure_ascii=False)
                        else:
                            processed_item[k] = v
                    writer.writerow(processed_item)
                    
            print(f"Created db_export/{table_name}.csv ({len(data)} rows)")
        except Exception as e:
            print(f"Error processing {table_name}: {e}")

print("Todos los archivos extraidos y convertidos!")
