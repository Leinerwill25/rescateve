import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data, count, error } = await supabase.from('tickets').select('id, fuente, fuente_id', { count: 'exact' }).eq('fuente', 'ayuda_en_camino');
  console.log('Count tickets AEC:', count, 'Error:', error);
  
  const { data: logs, error: logErr } = await supabase.from('ingesta_log').select('*').order('corrida_at', { ascending: false }).limit(5);
  console.log('Logs:', logs, 'Error:', logErr);
}
run();
