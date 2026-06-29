const fs = require('fs');
const path = require('path');

// Directorio raiz del proyecto (scripts/js/ -> ../../)
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Manually parse .env.local
const envPath = path.join(PROJECT_ROOT, '.env.local');
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = value;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') SUPABASE_KEY = value;
    }
  });
}

const TABLES = [
  'solicitudes_ayuda',
  'personas_desaparecidas',
  'desaparecidos_actualizaciones',
  'rescatados',
  'rescatados_publicos',
  'avisos',
  'traslados'
];

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportData() {
  const exportDir = path.join(PROJECT_ROOT, 'db_export');
  if (!fs.existsSync(exportDir)){
    fs.mkdirSync(exportDir);
  }

  for (const table of TABLES) {
    console.log(`Exporting table: ${table}...`);
    try {
      let allData = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + batchSize - 1);
          
        if (error) {
          console.error(`Error exporting ${table}:`, error.message);
          break;
        }
        
        if (!data || data.length === 0) {
          break;
        }
        
        allData = allData.concat(data);
        if (data.length < batchSize) {
          break;
        }
        from += batchSize;
      }
      
      if (allData.length > 0) {
        const filePath = path.join(exportDir, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
        console.log(`✅ Saved ${allData.length} records to ${filePath}`);
      } else {
        console.log(`⚠️ No data found or accessible for table ${table}.`);
      }
    } catch(err) {
      console.error(`Failed to fetch ${table}:`, err.message);
    }
  }
  
  console.log("🎉 Export finished!");
}

exportData();
