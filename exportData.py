import os
import urllib.request
import json

env_path = '.env.local'
SUPABASE_URL = ''
SUPABASE_KEY = ''

if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                if key == 'NEXT_PUBLIC_SUPABASE_URL':
                    SUPABASE_URL = val
                elif key == 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
                    SUPABASE_KEY = val

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    exit(1)

TABLES = [
    'solicitudes_ayuda',
    'personas_desaparecidas',
    'desaparecidos_actualizaciones',
    'rescatados',
    'rescatados_publicos',
    'avisos',
    'traslados'
]

os.makedirs('db_export', exist_ok=True)

for table in TABLES:
    print(f"Exporting table: {table}...")
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    })
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            if data:
                file_path = f"db_export/{table}.json"
                with open(file_path, 'w', encoding='utf-8') as out:
                    json.dump(data, out, indent=2, ensure_ascii=False)
                print(f"✅ Saved {len(data)} records to {file_path}")
            else:
                print(f"⚠️ No data found for {table}")
    except Exception as e:
        print(f"Failed to fetch {table}: {e}")

print("🎉 Export finished!")
