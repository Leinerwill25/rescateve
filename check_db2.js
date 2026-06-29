const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data, count, error } = await supabase.from('tickets').select('id, fuente, fuente_id', { count: 'exact' }).eq('fuente', 'ayuda_en_camino');
  console.log('Count tickets AEC:', count, 'Error:', error);
  
  const { data: logs, error: logErr } = await supabase.from('ingesta_log').select('*').order('corrida_at', { ascending: false }).limit(5);
  console.log('Logs:', logs, 'Error:', logErr);
}
run();
