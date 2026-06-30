-- =====================================================================
-- RESCATE VE — KPIs logística pública + voluntarios con consentimiento
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- Consentimiento y datos mínimos para listado público
alter table public.transportes
  add column if not exists mostrar_publico boolean not null default false,
  add column if not exists nombre_publico text,
  add column if not exists ciudad text,
  add column if not exists created_at timestamptz not null default now();

-- Vista pública sin datos sensibles
create or replace view public.voluntarios_publicos as
  select
    id,
    nombre_publico,
    tipo,
    coalesce(ciudad, zona) as ciudad,
    created_at
  from public.transportes
  where activo = true
    and mostrar_publico = true
    and nombre_publico is not null
    and trim(nombre_publico) <> '';

grant select on public.voluntarios_publicos to anon, authenticated;

-- KPIs agregados en una sola consulta (sin PII)
create or replace function public.kpis_logistica()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'traslados_completados',
      (select count(*)::int from public.traslados
       where estado in ('completado', 'entregado') and reporter_token is not null),
    'en_ruta_ahora',
      (select count(*)::int from public.traslados
       where estado in ('asignado', 'aceptado', 'en_camino')
         and reporter_token is not null),
    'insumos_movidos',
      (select count(*)::int from public.traslados
       where estado in ('completado', 'entregado')
         and reporter_token is not null
         and tipo in ('insumos', 'medicamentos', 'alimentos', 'insumo_medico', 'insumo_basico', 'carga', 'personal_medico', 'agua')),
    'voluntarios_activos',
      (select count(*)::int from public.transportes where activo = true),
    'zonas_atendidas',
      (select count(distinct destino_ref)::int from public.traslados
       where estado in ('completado', 'entregado')
         and reporter_token is not null
         and destino_ref is not null
         and trim(destino_ref) <> ''),
    'tiempo_promedio_horas',
      (select round(
         avg(extract(epoch from (updated_at - created_at)) / 3600.0)::numeric,
         1
       )
       from public.tickets
       where estado = 'completado'),
    'litros_aportados',
      (select coalesce(sum(litros), 0)::numeric from public.solicitudes_gasolina
       where estado = 'suministrado'),
    'entregas_evidencia_pct',
      (select coalesce(
         round(
           100.0 * count(*) filter (where evidencia_entrega_url is not null and trim(evidencia_entrega_url) <> '')
           / nullif(count(*), 0)
         ),
         0
       )::int
       from public.tickets
       where estado = 'completado'),
    'actualizado_at', now()
  );
$$;

grant execute on function public.kpis_logistica() to anon, authenticated;

-- Registro público de voluntarios (pendiente de aprobación admin)
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
    false,
    false
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.registrar_voluntario_publico(text, text, text, text, boolean) to anon, authenticated;
