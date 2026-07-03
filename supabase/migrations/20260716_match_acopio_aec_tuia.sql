-- Match AEC (necesidades) ↔ Tuia911 (insumos) + reclamos de transportistas

-- Cache geocodificación (Nominatim/OSM — gratuito)
create table if not exists public.geocache (
  query_hash text primary key,
  query_text text not null,
  lat        double precision,
  lng        double precision,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_geocache_fetched on public.geocache(fetched_at desc);

-- Reclamos / asignaciones de traslado acopio
create table if not exists public.match_traslados_acopio (
  id                 uuid primary key default gen_random_uuid(),
  ticket_id          uuid not null references public.tickets(id) on delete cascade,
  tuia_centro_id     text not null,
  tuia_centro_nombre text,
  tuia_centro_tel    text,
  tuia_articulo      text not null,
  tuia_disponible    numeric,
  tuia_unidad        text,
  distancia_km       numeric,
  score_match        numeric,
  estado             text not null default 'reclamado'
    check (estado in ('reclamado', 'confirmado', 'en_camino', 'completado', 'cancelado')),
  transporte_id      uuid references public.transportes(id) on delete set null,
  perfil_id          uuid not null references public.perfiles(id) on delete cascade,
  reclamado_at       timestamptz not null default now(),
  confirmado_por     uuid references public.perfiles(id),
  confirmado_at      timestamptz,
  notas              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_match_traslados_ticket on public.match_traslados_acopio(ticket_id);
create index if not exists idx_match_traslados_estado on public.match_traslados_acopio(estado);
create index if not exists idx_match_traslados_perfil on public.match_traslados_acopio(perfil_id);

-- Un transportista activo por ticket (evita duplicados)
create unique index if not exists uq_match_traslados_ticket_activo
  on public.match_traslados_acopio(ticket_id)
  where estado in ('reclamado', 'confirmado', 'en_camino');

alter table public.geocache enable row level security;
alter table public.match_traslados_acopio enable row level security;

drop policy if exists geocache_admin on public.geocache;
create policy geocache_admin on public.geocache
  for all using (public.mi_rol() = 'admin') with check (public.mi_rol() = 'admin');

drop policy if exists match_traslados_select on public.match_traslados_acopio;
create policy match_traslados_select on public.match_traslados_acopio
  for select using (
    public.mi_rol() = 'admin'
    or perfil_id = auth.uid()
    or transporte_id in (select id from public.transportes where perfil_id = auth.uid())
  );

drop policy if exists match_traslados_insert_transportista on public.match_traslados_acopio;
create policy match_traslados_insert_transportista on public.match_traslados_acopio
  for insert with check (
    public.mi_rol() = 'transportista'
    and perfil_id = auth.uid()
    and transporte_id in (select id from public.transportes where perfil_id = auth.uid())
  );

drop policy if exists match_traslados_admin on public.match_traslados_acopio;
create policy match_traslados_admin on public.match_traslados_acopio
  for all using (public.mi_rol() = 'admin') with check (public.mi_rol() = 'admin');

-- Transportista reclama un traslado acopio → AEC
create or replace function public.reclamar_match_acopio(
  p_ticket_id uuid,
  p_tuia_centro_id text,
  p_tuia_centro_nombre text,
  p_tuia_centro_tel text,
  p_tuia_articulo text,
  p_tuia_disponible numeric,
  p_tuia_unidad text,
  p_distancia_km numeric,
  p_score_match numeric
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
    distancia_km, score_match, estado, transporte_id, perfil_id
  ) values (
    p_ticket_id, p_tuia_centro_id, p_tuia_centro_nombre, p_tuia_centro_tel,
    p_tuia_articulo, p_tuia_disponible, p_tuia_unidad,
    p_distancia_km, p_score_match, 'reclamado', v_transporte_id, auth.uid()
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

-- Admin confirma reclamo
create or replace function public.confirmar_match_acopio(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.mi_rol() <> 'admin' then
    raise exception 'no autorizado';
  end if;

  update public.match_traslados_acopio
  set estado = 'confirmado',
      confirmado_por = auth.uid(),
      confirmado_at = now(),
      updated_at = now()
  where id = p_match_id and estado = 'reclamado';

  insert into public.ticket_historial(ticket_id, actor, accion)
  select ticket_id, auth.uid(), 'match_acopio_confirmado'
  from public.match_traslados_acopio where id = p_match_id;
end;
$$;

grant execute on function public.reclamar_match_acopio(uuid,text,text,text,text,numeric,text,numeric,numeric) to authenticated;
grant execute on function public.confirmar_match_acopio(uuid) to authenticated;
