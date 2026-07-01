-- Reparar vínculo traslados ↔ tickets (restaurar cola admin)
--
-- Problemas corregidos:
-- 1. importar_traslado_a_ticket creaba ticket con id distinto al traslado → sync roto
-- 2. Trigger duplicado create_ticket_from_traslado compite con importar
-- 3. Tickets en cola borrados por lógica antigua (60630) o desincronizados
--
-- Estrategia: ticket.id = traslado.id (mismo UUID), fuente='traslado', fuente_id=id

-- Un solo trigger de importación
drop trigger if exists trg_create_ticket_from_traslado on public.traslados;

create or replace function public.create_ticket_from_traslado()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.importar_traslado_a_ticket(NEW);
  return NEW;
end;
$$;

drop trigger if exists trg_importar_traslado_a_ticket on public.traslados;
create trigger trg_importar_traslado_a_ticket
  after insert on public.traslados
  for each row execute function public.trg_importar_traslado_a_ticket();


create or replace function public.importar_traslado_a_ticket(p_traslado public.traslados)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cat record;
  v_ticket_id uuid;
  v_estado text;
  v_orphan_id uuid;
begin
  if p_traslado.estado not in ('solicitado', 'asignado', 'en_camino') then
    return null;
  end if;

  select id into v_ticket_id
  from public.tickets
  where id = p_traslado.id
  limit 1;

  if v_ticket_id is null then
    select id into v_orphan_id
    from public.tickets
    where fuente = 'traslado'
      and fuente_id = p_traslado.id::text
      and id <> p_traslado.id
    limit 1;

    if v_orphan_id is not null then
      delete from public.tickets where id = v_orphan_id;
    end if;
  end if;

  select * into v_cat from public.clasificar_tipo_traslado(p_traslado.tipo);

  v_estado := case p_traslado.estado
    when 'asignado' then 'asignado'
    when 'en_camino' then 'en_camino'
    else 'en_validacion'
  end;

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
  ) values (
    p_traslado.id,
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
    estado = case
      when public.tickets.estado in ('aprobado', 'asignado', 'en_camino', 'completado')
        then public.tickets.estado
      else excluded.estado
    end,
    updated_at = now()
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;


-- Sync ticket→traslado: resolver traslado por id o fuente_id
create or replace function public.sync_ticket_changes_to_traslado()
returns trigger as $$
declare
  v_tipo text;
  v_nombre text;
  v_telefono text;
  v_modelo text;
  v_placa text;
  v_operador_json text;
  v_is_traslado boolean := false;
  v_tiene_insumos boolean := false;
  v_tiene_personal boolean := false;
  v_traslado_id uuid;
begin
  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  v_traslado_id := coalesce(
    nullif(NEW.fuente_id, '')::uuid,
    NEW.id
  );

  if NEW.fuente = 'traslado' then
    if NEW.estado in ('asignado', 'en_camino', 'completado') then
      if NEW.transporte_id is not null then
        select t.nombre, t.contacto, t.modelo, t.placa
        into v_nombre, v_telefono, v_modelo, v_placa
        from public.transportes t where t.id = NEW.transporte_id;

        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, ''),
          'modelo', coalesce(v_modelo, ''),
          'placa', coalesce(v_placa, '')
        )::text;
      elsif NEW.medico_id is not null then
        select m.nombre, m.contacto
        into v_nombre, v_telefono
        from public.personal_medico m where m.id = NEW.medico_id;

        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, '')
        )::text;
      else
        v_operador_json := null;
      end if;

      update public.traslados
      set estado = case
                     when public.traslados.estado = 'solventado_externo' then 'solventado_externo'::text
                     when NEW.estado = 'completado' then 'completado'::text
                     when NEW.estado = 'en_camino' then 'en_camino'::text
                     else 'asignado'::text
                   end,
          operador = coalesce(v_operador_json, operador),
          cuando = coalesce(NEW.cuando, cuando)
      where id = v_traslado_id;

    elsif NEW.estado in ('aprobado', 'en_validacion') then
      update public.traslados
      set estado = 'solicitado',
          operador = null
      where id = v_traslado_id;
    end if;

  elsif NEW.fuente = 'manual' then
    v_tiene_insumos :=
      NEW.categoria_final in ('insumo_basico', 'insumo_medico', 'multiple')
      or NEW.categoria_sugerida in ('insumo_basico', 'insumo_medico', 'multiple')
      or 'transporte_carga' = any(coalesce(NEW.departamentos_final, '{}'))
      or 'acopio' = any(coalesce(NEW.departamentos_final, '{}'))
      or 'transporte_carga' = any(coalesce(NEW.departamentos_sugeridos, '{}'))
      or 'acopio' = any(coalesce(NEW.departamentos_sugeridos, '{}'));

    v_tiene_personal :=
      NEW.categoria_final in ('traslado_personal', 'multiple')
      or NEW.categoria_sugerida in ('traslado_personal', 'multiple')
      or 'personal_medico' = any(coalesce(NEW.departamentos_final, '{}'))
      or 'personal_medico' = any(coalesce(NEW.departamentos_sugeridos, '{}'));

    if v_tiene_insumos or v_tiene_personal or NEW.cuando is not null then
      v_is_traslado := true;
    end if;

    if v_is_traslado then
      if v_tiene_insumos and v_tiene_personal then
        v_tipo := 'insumos,personal_medico';
      elsif v_tiene_personal then
        v_tipo := 'personal_medico';
      else
        v_tipo := 'insumos';
      end if;

      if NEW.transporte_id is not null then
        select t.nombre, t.contacto, t.modelo, t.placa
        into v_nombre, v_telefono, v_modelo, v_placa
        from public.transportes t where t.id = NEW.transporte_id;

        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, ''),
          'modelo', coalesce(v_modelo, ''),
          'placa', coalesce(v_placa, '')
        )::text;
      elsif NEW.medico_id is not null then
        select m.nombre, m.contacto
        into v_nombre, v_telefono
        from public.personal_medico m where m.id = NEW.medico_id;

        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, '')
        )::text;
      else
        v_operador_json := null;
      end if;

      insert into public.traslados (
        id, tipo, descripcion, cantidad,
        origen_ref, origen_lat, origen_lng,
        destino_ref, destino_lat, destino_lng,
        prioridad, contacto, cuando, estado, operador
      ) values (
        NEW.id,
        v_tipo,
        coalesce(NEW.descripcion, '[Ticket ' || NEW.id || ']'),
        NEW.cantidad,
        coalesce(NEW.origen_ref, 'Origen no especificado'),
        NEW.origen_lat, NEW.origen_lng,
        NEW.destino_ref, NEW.destino_lat, NEW.destino_lng,
        coalesce(NEW.prioridad, 'media'),
        NEW.contacto_solicitante,
        coalesce(NEW.cuando, 'Lo antes posible'),
        case
          when NEW.estado = 'completado' then 'completado'::text
          when NEW.estado = 'en_camino' then 'en_camino'::text
          when NEW.estado = 'asignado' then 'asignado'::text
          else 'solicitado'::text
        end,
        v_operador_json
      )
      on conflict (id) do update
      set tipo = excluded.tipo,
          descripcion = excluded.descripcion,
          cantidad = excluded.cantidad,
          origen_ref = excluded.origen_ref,
          origen_lat = excluded.origen_lat,
          origen_lng = excluded.origen_lng,
          destino_ref = excluded.destino_ref,
          destino_lat = excluded.destino_lat,
          destino_lng = excluded.destino_lng,
          prioridad = excluded.prioridad,
          contacto = excluded.contacto,
          cuando = excluded.cuando,
          estado = case
                     when public.traslados.estado = 'solventado_externo' then 'solventado_externo'::text
                     when excluded.estado = 'completado' then 'completado'::text
                     when excluded.estado = 'en_camino' then 'en_camino'::text
                     when excluded.estado = 'asignado' then 'asignado'::text
                     else 'solicitado'::text
                   end,
          operador = coalesce(excluded.operador, public.traslados.operador);
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;


-- Reparar / restaurar todos los traslados activos en cola
do $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select t.*
    from public.traslados t
    where t.estado in ('solicitado', 'asignado', 'en_camino')
    order by t.created_at desc
  loop
    perform public.importar_traslado_a_ticket(r);
    v_count := v_count + 1;
  end loop;
  raise notice 'Traslados reparados/sincronizados en tickets: %', v_count;
end;
$$;

-- Verificación rápida (descomenta para ver resultado en SQL Editor)
-- select t.id, t.estado as traslado_estado, tk.id as ticket_id, tk.estado as ticket_estado, tk.descripcion
-- from public.traslados t
-- left join public.tickets tk on tk.id = t.id
-- where t.estado = 'solicitado'
-- order by t.created_at desc
-- limit 20;
