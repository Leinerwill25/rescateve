-- Restaurar ticket rescatistas/ROTARAC + sync seguro SIN borrar tickets
--
-- Qué pasó: 60712 paso 1 eliminó tickets "huérfanos" y paso 3 puso estado=en_camino
-- La cola admin solo muestra tickets con estado = 'en_validacion', por eso desapareció.

-- ── 1. Restaurar el ticket de 40 rescatistas (id fijo del traslado público) ──
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
  '[Traslado: Personal + Insumos] ' || coalesce(t.descripcion, '(Sin descripción)'),
  'multiple',
  'multiple',
  array['acopio', 'transporte_carga', 'personal_medico']::text[],
  array['acopio', 'transporte_carga', 'personal_medico']::text[],
  t.contacto,
  coalesce(t.origen_ref, 'Ubicación no especificada'),
  t.origen_lat,
  t.origen_lng,
  t.destino_ref,
  t.destino_lat,
  t.destino_lng,
  t.cantidad,
  t.cuando,
  coalesce(t.prioridad, 'alta'),
  'en_validacion',
  true
from public.traslados t
where t.id = '0e9ed93b-528d-4603-ae41-10cd22da3061'
on conflict (id) do update set
  fuente = excluded.fuente,
  fuente_id = excluded.fuente_id,
  descripcion = excluded.descripcion,
  categoria_sugerida = excluded.categoria_sugerida,
  categoria_final = excluded.categoria_final,
  departamentos_sugeridos = excluded.departamentos_sugeridos,
  departamentos_final = excluded.departamentos_final,
  contacto_solicitante = excluded.contacto_solicitante,
  origen_ref = excluded.origen_ref,
  origen_lat = excluded.origen_lat,
  origen_lng = excluded.origen_lng,
  destino_ref = excluded.destino_ref,
  destino_lat = excluded.destino_lat,
  destino_lng = excluded.destino_lng,
  cantidad = excluded.cantidad,
  cuando = excluded.cuando,
  prioridad = excluded.prioridad,
  requiere_revision = true,
  estado = 'en_validacion',
  updated_at = now();

-- ── 2. Sync seguro: crear/actualizar SIN borrar ningún ticket ──
insert into public.tickets (
  id, fuente, fuente_id, descripcion,
  categoria_sugerida, categoria_final,
  departamentos_sugeridos, departamentos_final,
  contacto_solicitante,
  origen_ref, origen_lat, origen_lng,
  destino_ref, destino_lat, destino_lng,
  cantidad, cuando, prioridad,
  estado, requiere_revision
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
  t.origen_lat, t.origen_lng,
  t.destino_ref, t.destino_lat, t.destino_lng,
  t.cantidad, t.cuando,
  coalesce(t.prioridad, 'media'),
  case t.estado
    when 'solicitado' then 'en_validacion'
    when 'asignado' then 'asignado'
    when 'en_camino' then 'en_camino'
    else 'en_validacion'
  end,
  true
from public.traslados t
where t.estado in ('solicitado', 'asignado', 'en_camino')
  and not exists (select 1 from public.tickets tk where tk.id = t.id)
on conflict (id) do nothing;

-- ── 3. Quitar borrado de huérfanos en importar_traslado_a_ticket ──
create or replace function public.importar_traslado_a_ticket(p_traslado public.traslados)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cat record;
  v_ticket_id uuid;
  v_estado text;
begin
  if p_traslado.estado not in ('solicitado', 'asignado', 'en_camino') then
    return null;
  end if;

  select * into v_cat from public.clasificar_tipo_traslado(p_traslado.tipo);

  v_estado := case p_traslado.estado
    when 'asignado' then 'asignado'
    when 'en_camino' then 'en_camino'
    else 'en_validacion'
  end;

  insert into public.tickets (
    id, fuente, fuente_id, descripcion,
    categoria_sugerida, categoria_final,
    departamentos_sugeridos, departamentos_final,
    contacto_solicitante,
    origen_ref, origen_lat, origen_lng,
    destino_ref, destino_lat, destino_lng,
    cantidad, cuando, prioridad,
    estado, requiere_revision
  ) values (
    p_traslado.id,
    'traslado',
    p_traslado.id::text,
    '[Traslado: ' || v_cat.etiqueta || '] ' || coalesce(p_traslado.descripcion, '(Sin descripción)'),
    v_cat.categoria, v_cat.categoria,
    v_cat.departamentos, v_cat.departamentos,
    p_traslado.contacto,
    coalesce(p_traslado.origen_ref, 'Ubicación no especificada'),
    p_traslado.origen_lat, p_traslado.origen_lng,
    p_traslado.destino_ref, p_traslado.destino_lat, p_traslado.destino_lng,
    p_traslado.cantidad, p_traslado.cuando,
    coalesce(p_traslado.prioridad, 'media'),
    v_estado,
    true
  )
  on conflict (id) do update set
    descripcion = excluded.descripcion,
    contacto_solicitante = excluded.contacto_solicitante,
    origen_ref = excluded.origen_ref,
    origen_lat = excluded.origen_lat,
    origen_lng = excluded.origen_lng,
    destino_ref = excluded.destino_ref,
    destino_lat = excluded.destino_lat,
    destino_lng = excluded.destino_lng,
    cantidad = excluded.cantidad,
    cuando = excluded.cuando,
    prioridad = excluded.prioridad,
    requiere_revision = true,
    updated_at = now()
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;

-- ── 4. Verificación ──
select
  t.id,
  left(t.descripcion, 60) as traslado,
  t.estado as traslado_estado,
  tk.estado as ticket_estado,
  tk.prioridad
from public.traslados t
left join public.tickets tk on tk.id = t.id
where t.id in (
  '0e9ed93b-528d-4603-ae41-10cd22da3061',
  'cb1e7f97-f717-4b19-ad2c-b80179673b06'
)
   or t.descripcion ilike '%rescatista%'
   or t.contacto ilike '%Cesar%';
