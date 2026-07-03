-- Diagnóstico: ¿por qué hay más tickets que necesidades en Ayuda en Camino?
-- Ejecutar en Supabase SQL Editor (solo lectura salvo la sección 4 opcional).

-- 1) Total por fuente
select fuente, count(*) as total
from public.tickets
group by fuente
order by total desc;

-- 2) AEC: ¿duplicados reales? (mismo fuente + fuente_id)
select fuente_id, count(*) as copias
from public.tickets
where fuente = 'ayuda_en_camino'
  and fuente_id is not null
group by fuente_id
having count(*) > 1
order by copias desc
limit 30;

-- 3) AEC: totales útiles
select
  count(*) as total_filas_aec,
  count(distinct fuente_id) as fuente_ids_unicos,
  count(*) filter (where estado = 'en_validacion') as en_validacion,
  count(*) filter (where estado_externo = 'pendiente') as externo_pendiente,
  count(*) filter (where estado = 'completado') as completados
from public.tickets
where fuente = 'ayuda_en_camino';

-- 4) Traslados: tickets huérfanos (mismo fuente_id, distinto id) — causa común de inflación
select t.fuente_id, count(*) as tickets_distintos, array_agg(t.id::text order by t.created_at) as ids
from public.tickets t
where t.fuente = 'traslado'
  and t.fuente_id is not null
group by t.fuente_id
having count(*) > 1
order by tickets_distintos desc
limit 20;

-- 5) ¿Índice anti-duplicado correcto? (debe ser ÚNICO completo, no parcial)
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'tickets'
  and indexname = 'uq_tickets_fuente';

-- 6) Últimas corridas de ingesta AEC
select corrida_at, nuevos, actualizados, cubiertos, error
from public.ingesta_log
where fuente = 'ayuda_en_camino'
order by corrida_at desc
limit 10;
