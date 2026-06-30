-- =====================================================================
-- RESCATE VE — Voluntarios públicos: incluir flota interna (admin)
-- Los transportistas dados de alta en el panel admin (origen=admin)
-- aparecen en la landing si están activos (solo nombre de pila + zona).
-- Los registros desde /voluntarios (origen=publico) requieren consentimiento.
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

alter table public.transportes
  add column if not exists origen text not null default 'admin';

alter table public.transportes
  drop constraint if exists transportes_origen_check;

alter table public.transportes
  add constraint transportes_origen_check
  check (origen in ('admin', 'publico'));

-- Vista pública (sin datos sensibles)
create or replace view public.voluntarios_publicos as
  select
    id,
    coalesce(nullif(trim(nombre_publico), ''), split_part(trim(nombre), ' ', 1)) as nombre_publico,
    tipo,
    coalesce(nullif(trim(ciudad), ''), nullif(trim(zona), '')) as ciudad,
    created_at
  from public.transportes
  where activo = true
    and (
      (origen = 'publico' and mostrar_publico = true)
      or origen = 'admin'
    )
    and coalesce(nullif(trim(nombre_publico), ''), split_part(trim(nombre), ' ', 1)) <> '';

grant select on public.voluntarios_publicos to anon, authenticated;

-- RPC security definer (evita bloqueo RLS de transportes para anon)
create or replace function public.list_voluntarios_publicos()
returns table (
  id uuid,
  nombre_publico text,
  tipo text,
  ciudad text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    v.nombre_publico,
    v.tipo,
    v.ciudad,
    v.created_at
  from public.voluntarios_publicos v
  order by v.created_at desc;
$$;

grant execute on function public.list_voluntarios_publicos() to anon, authenticated;

-- Actualizar registro público desde /voluntarios
create or replace function public.registrar_voluntario_publico(
  p_nombre text,
  p_ciudad text,
  p_tipo text,
  p_contacto text,
  p_mostrar_publico boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_ciudad text := trim(coalesce(p_ciudad, ''));
  v_tipo text := trim(coalesce(p_tipo, ''));
  v_contacto text := trim(coalesce(p_contacto, ''));
begin
  if length(v_nombre) < 2 then
    raise exception 'Indica tu nombre';
  end if;
  if length(v_ciudad) < 2 then
    raise exception 'Indica tu ciudad o zona';
  end if;
  if v_tipo not in ('pasajeros', 'carga', 'ambulancia', 'grua', 'tecnico') then
    raise exception 'Tipo de vehículo no válido';
  end if;
  if length(v_contacto) < 7 then
    raise exception 'Indica un teléfono de contacto';
  end if;

  insert into public.transportes (
    nombre,
    nombre_publico,
    ciudad,
    zona,
    tipo,
    contacto,
    mostrar_publico,
    origen,
    activo,
    en_standby
  ) values (
    v_nombre,
    case when p_mostrar_publico then split_part(v_nombre, ' ', 1) else null end,
    v_ciudad,
    v_ciudad,
    v_tipo,
    v_contacto,
    coalesce(p_mostrar_publico, false),
    'publico',
    false,
    false
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.registrar_voluntario_publico(text, text, text, text, boolean) to anon, authenticated;
