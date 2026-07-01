-- Traslados → tickets: auto-import en BD + backfill de pendientes
-- Cubre INSERT directo en public.traslados (SQL, scripts) sin depender del frontend.

create or replace function public.clasificar_tipo_traslado(p_tipo text)
returns table (categoria text, departamentos text[], etiqueta text)
language plpgsql immutable as $$
declare
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_tiene_insumos boolean := false;
  v_tiene_personal boolean := false;
begin
  if v_tipo = '' then
    categoria := 'otro';
    departamentos := array['otro'];
    etiqueta := 'Otro';
    return next;
    return;
  end if;

  v_tiene_insumos := v_tipo like '%insumo%';
  v_tiene_personal := v_tipo like '%personal%';

  if v_tiene_insumos and v_tiene_personal then
    categoria := 'multiple';
    departamentos := array['acopio', 'transporte_carga', 'personal_medico'];
    etiqueta := 'Insumos / Carga + Personal Médico';
  elsif v_tiene_personal then
    categoria := 'traslado_personal';
    departamentos := array['personal_medico'];
    etiqueta := 'Personal Médico';
  elsif v_tiene_insumos then
    categoria := 'insumo_basico';
    departamentos := array['acopio', 'transporte_carga'];
    etiqueta := 'Insumos / Carga';
  else
    categoria := 'otro';
    departamentos := array['otro'];
    etiqueta := initcap(replace(v_tipo, '_', ' '));
  end if;

  return next;
end;
$$;


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

  select id into v_ticket_id
  from public.tickets
  where id = p_traslado.id
     or (fuente = 'traslado' and fuente_id = p_traslado.id::text)
  limit 1;

  if v_ticket_id is not null then
    return v_ticket_id;
  end if;

  select * into v_cat from public.clasificar_tipo_traslado(p_traslado.tipo);

  v_estado := case p_traslado.estado
    when 'asignado' then 'asignado'
    when 'en_camino' then 'en_camino'
    else 'en_validacion'
  end;

  insert into public.tickets (
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
  ) values (
    'traslado',
    p_traslado.id::text,
    '[Traslado: ' || v_cat.etiqueta || '] ' || coalesce(p_traslado.descripcion, '(Sin descripción)'),
    v_cat.categoria,
    v_cat.categoria,
    v_cat.departamentos,
    v_cat.departamentos,
    p_traslado.contacto,
    coalesce(p_traslado.origen_ref, 'Ubicación no especificada'),
    p_traslado.origen_lat,
    p_traslado.origen_lng,
    p_traslado.destino_ref,
    p_traslado.destino_lat,
    p_traslado.destino_lng,
    p_traslado.cantidad,
    p_traslado.cuando,
    coalesce(p_traslado.prioridad, 'media'),
    v_estado,
    true
  )
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;


create or replace function public.trg_importar_traslado_a_ticket()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  if exists (select 1 from public.tickets where id = NEW.id) then
    return NEW;
  end if;

  perform public.importar_traslado_a_ticket(NEW);
  return NEW;
end;
$$;

drop trigger if exists trg_importar_traslado_a_ticket on public.traslados;
create trigger trg_importar_traslado_a_ticket
  after insert on public.traslados
  for each row execute function public.trg_importar_traslado_a_ticket();


-- Backfill: traslados activos sin ticket en cola
do $$
declare
  r public.traslados;
  v_count int := 0;
begin
  for r in
    select t.*
    from public.traslados t
    where t.estado in ('solicitado', 'asignado', 'en_camino')
      and not exists (
        select 1 from public.tickets tk
        where tk.id = t.id
           or (tk.fuente = 'traslado' and tk.fuente_id = t.id::text)
      )
  loop
    perform public.importar_traslado_a_ticket(r);
    v_count := v_count + 1;
  end loop;
  raise notice 'Traslados importados a tickets: %', v_count;
end;
$$;
