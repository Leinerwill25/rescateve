-- =====================================================================
-- RESCATE VE — Ruta en 2 tramos para Match Acopio:
--   Tramo 1: transportista → centro de acopio (recoger insumos)
--   Tramo 2: centro de acopio → ubicación de la necesidad (entrega)
-- Guarda coordenadas del acopio al reclamar y marca la recogida de insumos.
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Nuevas columnas en el reclamo
alter table public.match_traslados_acopio
  add column if not exists tuia_centro_lat double precision,
  add column if not exists tuia_centro_lng double precision,
  add column if not exists insumos_recogidos_at timestamptz;

-- 2. Reclamar traslado (ahora guarda coords del acopio para trazar la ruta)
drop function if exists public.reclamar_match_acopio(uuid, text, text, text, text, numeric, text, numeric, numeric);

create or replace function public.reclamar_match_acopio(
  p_ticket_id uuid,
  p_tuia_centro_id text,
  p_tuia_centro_nombre text,
  p_tuia_centro_tel text,
  p_tuia_articulo text,
  p_tuia_disponible numeric,
  p_tuia_unidad text,
  p_distancia_km numeric,
  p_score_match numeric,
  p_tuia_centro_lat double precision default null,
  p_tuia_centro_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transporte_id uuid;
  v_match_id uuid;
  v_ticket_estado text;
begin
  if public.mi_rol() <> 'transportista' then
    raise exception 'Solo transportistas pueden reclamar traslados de acopio';
  end if;

  select id into v_transporte_id
  from public.transportes
  where perfil_id = auth.uid() and activo = true
  limit 1;

  if v_transporte_id is null then
    raise exception 'No tiene ficha de transporte activa';
  end if;

  select estado into v_ticket_estado from public.tickets where id = p_ticket_id;
  if v_ticket_estado is null then
    raise exception 'Ticket no encontrado';
  end if;

  if exists (
    select 1 from public.match_traslados_acopio
    where ticket_id = p_ticket_id
      and estado in ('reclamado', 'confirmado', 'en_camino')
  ) then
    raise exception 'Este traslado ya fue reclamado por otro transportista';
  end if;

  insert into public.match_traslados_acopio (
    ticket_id, tuia_centro_id, tuia_centro_nombre, tuia_centro_tel,
    tuia_articulo, tuia_disponible, tuia_unidad,
    distancia_km, score_match, estado, transporte_id, perfil_id,
    tuia_centro_lat, tuia_centro_lng
  ) values (
    p_ticket_id, p_tuia_centro_id, p_tuia_centro_nombre, p_tuia_centro_tel,
    p_tuia_articulo, p_tuia_disponible, p_tuia_unidad,
    p_distancia_km, p_score_match, 'reclamado', v_transporte_id, auth.uid(),
    p_tuia_centro_lat, p_tuia_centro_lng
  )
  returning id into v_match_id;

  update public.tickets
  set transporte_id = v_transporte_id,
      estado = case when estado = 'en_validacion' then 'asignado' else estado end,
      updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_historial(ticket_id, actor, accion, a_valor)
  values (p_ticket_id, auth.uid(), 'match_acopio_reclamado', p_tuia_centro_nombre);

  return v_match_id;
end;
$$;

grant execute on function public.reclamar_match_acopio(
  uuid, text, text, text, text, numeric, text, numeric, numeric, double precision, double precision
) to authenticated;

-- 3. Marcar que el transportista ya recogió los insumos en el acopio
--    (habilita el tramo 2: acopio → necesidad).
create or replace function public.marcar_insumos_recogidos(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if public.mi_rol() <> 'transportista' then
    raise exception 'Solo el transportista asignado puede marcar la recogida';
  end if;

  select exists (
    select 1 from public.match_traslados_acopio
    where id = p_match_id
      and perfil_id = auth.uid()
      and estado in ('reclamado', 'confirmado', 'en_camino')
  ) into v_ok;

  if not v_ok then
    raise exception 'Reclamo no encontrado o no pertenece a este transportista';
  end if;

  update public.match_traslados_acopio
  set insumos_recogidos_at = now(),
      updated_at = now()
  where id = p_match_id;
end;
$$;

grant execute on function public.marcar_insumos_recogidos(uuid) to authenticated;
