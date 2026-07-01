-- Restauración FORZADA traslados → tickets (sin depender de importar_traslado_a_ticket)
-- Ejecutar en Supabase SQL Editor. Al final muestra filas con el resultado.
--
-- Qué hace:
-- 1. Borra tickets huérfanos (id distinto al traslado pero mismo fuente_id)
-- 2. INSERT tickets faltantes (id = traslado.id)
-- 3. UPDATE tickets existentes → en_validacion si el traslado sigue solicitado
-- 4. SELECT de verificación

-- ── 1. Limpiar huérfanos que bloquean la restauración ──
with deleted as (
  delete from public.tickets tk
  where tk.fuente = 'traslado'
    and tk.fuente_id is not null
    and exists (
      select 1 from public.traslados t
      where t.id::text = tk.fuente_id
        and tk.id <> t.id
    )
  returning tk.id
)
select count(*) as huerfanos_eliminados from deleted;

-- ── 2. Crear tickets que faltan ──
with inserted as (
  insert into public.tickets (
    id,
    fuente,
    fuente_id,
    descripcion,
    categoria_sugerida,
    categoria_final,
    departamentos_sugeridos,
    departamentos_final,
    contacto_solicitante,
    origen_ref,
    origen_lat,
    origen_lng,
    destino_ref,
    destino_lat,
    destino_lng,
    cantidad,
    cuando,
    prioridad,
    estado,
    requiere_revision
  )
  select
    t.id,
    'traslado',
    t.id::text,
    '[Traslado] ' || coalesce(t.descripcion, '(Sin descripción)'),
    case
      when lower(coalesce(t.tipo, '')) like '%insumo%' and lower(coalesce(t.tipo, '')) like '%personal%' then 'multiple'
      when lower(coalesce(t.tipo, '')) like '%personal%' then 'traslado_personal'
      when lower(coalesce(t.tipo, '')) like '%insumo%' then 'insumo_basico'
      else 'otro'
    end,
    case
      when lower(coalesce(t.tipo, '')) like '%insumo%' and lower(coalesce(t.tipo, '')) like '%personal%' then 'multiple'
      when lower(coalesce(t.tipo, '')) like '%personal%' then 'traslado_personal'
      when lower(coalesce(t.tipo, '')) like '%insumo%' then 'insumo_basico'
      else 'otro'
    end,
    case
      when lower(coalesce(t.tipo, '')) like '%insumo%' and lower(coalesce(t.tipo, '')) like '%personal%' then array['acopio', 'transporte_carga', 'personal_medico']::text[]
      when lower(coalesce(t.tipo, '')) like '%personal%' then array['personal_medico']::text[]
      when lower(coalesce(t.tipo, '')) like '%insumo%' then array['acopio', 'transporte_carga']::text[]
      else array['otro']::text[]
    end,
    case
      when lower(coalesce(t.tipo, '')) like '%insumo%' and lower(coalesce(t.tipo, '')) like '%personal%' then array['acopio', 'transporte_carga', 'personal_medico']::text[]
      when lower(coalesce(t.tipo, '')) like '%personal%' then array['personal_medico']::text[]
      when lower(coalesce(t.tipo, '')) like '%insumo%' then array['acopio', 'transporte_carga']::text[]
      else array['otro']::text[]
    end,
    t.contacto,
    coalesce(t.origen_ref, 'Ubicación no especificada'),
    t.origen_lat,
    t.origen_lng,
    t.destino_ref,
    t.destino_lat,
    t.destino_lng,
    t.cantidad,
    t.cuando,
    coalesce(t.prioridad, 'media'),
    case t.estado
      when 'asignado' then 'asignado'
      when 'en_camino' then 'en_camino'
      else 'en_validacion'
    end,
    true
  from public.traslados t
  where t.estado in ('solicitado', 'asignado', 'en_camino')
    and not exists (
      select 1 from public.tickets tk where tk.id = t.id
    )
  returning id, descripcion
)
select count(*) as tickets_creados from inserted;

-- ── 3. Re-activar en cola los que ya existían pero no están en validación ──
with updated as (
  update public.tickets tk
  set
    fuente = 'traslado',
    fuente_id = t.id::text,
    descripcion = '[Traslado] ' || coalesce(t.descripcion, tk.descripcion),
    contacto_solicitante = coalesce(t.contacto, tk.contacto_solicitante),
    origen_ref = coalesce(t.origen_ref, tk.origen_ref),
    origen_lat = coalesce(t.origen_lat, tk.origen_lat),
    origen_lng = coalesce(t.origen_lng, tk.origen_lng),
    destino_ref = coalesce(t.destino_ref, tk.destino_ref),
    destino_lat = coalesce(t.destino_lat, tk.destino_lat),
    destino_lng = coalesce(t.destino_lng, tk.destino_lng),
    cantidad = coalesce(t.cantidad, tk.cantidad),
    cuando = coalesce(t.cuando, tk.cuando),
    prioridad = coalesce(t.prioridad, tk.prioridad),
    requiere_revision = true,
    estado = case
      when t.estado = 'solicitado' then 'en_validacion'
      when t.estado = 'asignado' then 'asignado'
      when t.estado = 'en_camino' then 'en_camino'
      else tk.estado
    end,
    updated_at = now()
  from public.traslados t
  where tk.id = t.id
    and t.estado in ('solicitado', 'asignado', 'en_camino')
  returning tk.id
)
select count(*) as tickets_actualizados from updated;

-- ── 4. Verificación: debes ver tus traslados con ticket en cola ──
select
  t.id,
  t.estado as traslado_estado,
  t.contacto,
  left(t.descripcion, 70) as traslado_desc,
  tk.id as ticket_id,
  tk.estado as ticket_estado,
  tk.prioridad,
  case
    when tk.id is null then '❌ SIN TICKET'
    when tk.estado = 'en_validacion' then '✅ EN COLA'
    else '⚠️ ticket estado: ' || tk.estado
  end as status
from public.traslados t
left join public.tickets tk on tk.id = t.id
where t.estado in ('solicitado', 'asignado', 'en_camino')
order by t.created_at desc
limit 30;
