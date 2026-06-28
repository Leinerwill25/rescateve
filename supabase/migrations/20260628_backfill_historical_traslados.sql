-- =====================================================================
-- RESCATE VE — Sincronizar/Migrar Traslados Existentes e Históricos
-- Pégalo en: Supabase > SQL Editor > Run (Ejecutar una sola vez)
-- =====================================================================

insert into public.tickets (
  id,
  fuente,
  fuente_id,
  descripcion,
  categoria_sugerida,
  departamentos_sugeridos,
  prioridad,
  origen_ref,
  origen_lat,
  origen_lng,
  destino_ref,
  destino_lat,
  destino_lng,
  cantidad,
  contacto_solicitante,
  estado,
  requiere_revision
)
select 
  t.id,
  'traslado' as fuente,
  t.id::text as fuente_id,
  coalesce(t.descripcion, '[Traslado: ' || t.tipo || ']') as descripcion,
  case when t.tipo = 'insumos' then 'insumo_basico' when t.tipo = 'personal_medico' then 'traslado_personal' else 'otro' end as categoria_sugerida,
  case when t.tipo = 'insumos' then array['acopio', 'transporte_carga'] when t.tipo = 'personal_medico' then array['personal_medico'] else array['otro'] end as departamentos_sugeridos,
  coalesce(t.prioridad, 'media') as prioridad,
  t.origen_ref,
  t.origen_lat,
  t.origen_lng,
  t.destino_ref,
  t.destino_lat,
  t.destino_lng,
  t.cantidad,
  t.contacto as contacto_solicitante,
  case 
    when t.estado = 'completado' then 'completado'
    when t.estado = 'en_camino' then 'en_camino'
    when t.estado = 'asignado' then 'asignado'
    else 'en_validacion' -- Los traslados en 'solicitado' irán a la cola de validación
  end as estado,
  true as requiere_revision
from public.traslados t
left join public.tickets tk on tk.id = t.id
where tk.id is null; -- Solo los traslados históricos que no tienen ticket asociado
