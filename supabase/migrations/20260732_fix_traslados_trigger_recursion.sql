-- =====================================================================
-- RESCATE VE — Fix: stack depth / timeout al INSERT en public.traslados
--
-- Diagnóstico (reproducido en prod):
--   code 54001 "stack depth limit exceeded"
--   o 57014 "canceling statement due to statement timeout"
--
-- Cadena rota:
--   INSERT traslados
--     → importar_traslado_a_ticket → INSERT tickets
--       → sync_ticket_changes_to_traslado
--         → UPDATE traslados (estado=solicitado, operador=null)  -- aunque ya esté así
--           → sync_traslado_to_ticket
--             → UPDATE tickets (updated_at / estado)
--               → sync_ticket_changes_to_traslado → … bucle infinito
--
-- Solución:
--   1. Candado de sesión (app.rv_syncing) más fiable que solo pg_trigger_depth
--   2. En INSERT de ticket fuente='traslado': NO sincronizar de vuelta (el traslado ya existe)
--   3. UPDATEs condicionales (solo si el valor cambia) para no re-disparar triggers
--   4. Garantizar un solo trigger AFTER INSERT de importación
--
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- Candado compartido
create or replace function public.rv_sync_lock_get()
returns boolean
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.rv_syncing', true), ''), '') = '1';
$$;

create or replace function public.rv_sync_lock_set(p_on boolean)
returns void
language plpgsql
as $$
begin
  perform set_config('app.rv_syncing', case when p_on then '1' else '' end, true);
end;
$$;

-- ── 1. Tickets → Traslados ───────────────────────────────────────────
create or replace function public.sync_ticket_changes_to_traslado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  v_new_estado text;
begin
  -- Candado + profundidad: evita reentrancia cruzada tickets ↔ traslados
  if public.rv_sync_lock_get() or pg_trigger_depth() > 1 then
    return NEW;
  end if;

  -- El ticket recién creado desde un traslado público ya refleja el traslado.
  -- Re-sincronizar en INSERT solo genera UPDATEs inútiles y bucles.
  if TG_OP = 'INSERT' and NEW.fuente = 'traslado' then
    return NEW;
  end if;

  v_traslado_id := coalesce(
    nullif(NEW.fuente_id, '')::uuid,
    NEW.id
  );

  perform public.rv_sync_lock_set(true);

  begin
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

        v_new_estado := case
          when NEW.estado = 'completado' then 'completado'
          when NEW.estado = 'en_camino' then 'en_camino'
          else 'asignado'
        end;

        update public.traslados
        set estado = case
                       when public.traslados.estado = 'solventado_externo' then 'solventado_externo'::text
                       else v_new_estado
                     end,
            operador = coalesce(v_operador_json, operador),
            cuando = coalesce(NEW.cuando, cuando)
        where id = v_traslado_id
          and (
            (public.traslados.estado is distinct from 'solventado_externo'
              and public.traslados.estado is distinct from v_new_estado)
            or (v_operador_json is not null and public.traslados.operador is distinct from v_operador_json)
            or (NEW.cuando is not null and public.traslados.cuando is distinct from NEW.cuando)
          );

      elsif NEW.estado in ('aprobado', 'en_validacion') then
        update public.traslados
        set estado = 'solicitado',
            operador = null
        where id = v_traslado_id
          and (
            public.traslados.estado is distinct from 'solicitado'
            or public.traslados.operador is not null
          );
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
  exception when others then
    perform public.rv_sync_lock_set(false);
    raise;
  end;

  perform public.rv_sync_lock_set(false);
  return NEW;
end;
$$;

-- ── 2. Traslados → Tickets ───────────────────────────────────────────
create or replace function public.sync_traslado_to_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id uuid;
  v_transporte_id uuid;
  v_medico_id uuid;
  v_operador_nombre text;
  v_new_estado text;
begin
  if public.rv_sync_lock_get() or pg_trigger_depth() > 1 then
    return NEW;
  end if;

  select id into v_ticket_id
  from public.tickets
  where id = NEW.id;

  if v_ticket_id is null then
    return NEW;
  end if;

  perform public.rv_sync_lock_set(true);

  begin
    if NEW.operador is not null and NEW.operador <> '' then
      begin
        v_operador_nombre := (NEW.operador::jsonb)->>'nombre';
        if v_operador_nombre is not null and v_operador_nombre <> '' then
          select id into v_transporte_id
          from public.transportes
          where nombre = v_operador_nombre;

          if v_transporte_id is null then
            select id into v_medico_id
            from public.personal_medico
            where nombre = v_operador_nombre;
          end if;
        end if;
      exception when others then
        v_operador_nombre := NEW.operador;
        select id into v_transporte_id
        from public.transportes
        where nombre = v_operador_nombre;
      end;
    end if;

    v_new_estado := case
      when NEW.estado = 'solventado_externo' then 'completado'
      when NEW.estado = 'completado' then 'completado'
      when NEW.estado = 'en_camino' then 'en_camino'
      when NEW.estado = 'asignado' then 'asignado'
      else null
    end;

    update public.tickets
    set estado = coalesce(v_new_estado, estado),
        transporte_id = coalesce(v_transporte_id, transporte_id),
        medico_id = coalesce(v_medico_id, medico_id),
        updated_at = now()
    where id = v_ticket_id
      and (
        (v_new_estado is not null and public.tickets.estado is distinct from v_new_estado)
        or (v_transporte_id is not null and public.tickets.transporte_id is distinct from v_transporte_id)
        or (v_medico_id is not null and public.tickets.medico_id is distinct from v_medico_id)
      );
  exception when others then
    perform public.rv_sync_lock_set(false);
    raise;
  end;

  perform public.rv_sync_lock_set(false);
  return NEW;
end;
$$;

-- ── 3. Import trigger limpio (un solo AFTER INSERT) ───────────────────
create or replace function public.trg_importar_traslado_a_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.rv_sync_lock_get() or pg_trigger_depth() > 1 then
    return NEW;
  end if;

  if exists (select 1 from public.tickets where id = NEW.id) then
    return NEW;
  end if;

  perform public.rv_sync_lock_set(true);
  begin
    perform public.importar_traslado_a_ticket(NEW);
  exception when others then
    perform public.rv_sync_lock_set(false);
    raise;
  end;
  perform public.rv_sync_lock_set(false);

  return NEW;
end;
$$;

drop trigger if exists trg_create_ticket_from_traslado on public.traslados;
drop trigger if exists trg_importar_traslado_a_ticket on public.traslados;
create trigger trg_importar_traslado_a_ticket
  after insert on public.traslados
  for each row execute function public.trg_importar_traslado_a_ticket();

drop trigger if exists trg_sync_ticket_changes_to_traslado on public.tickets;
create trigger trg_sync_ticket_changes_to_traslado
  after insert or update of estado, transporte_id, medico_id, categoria_final, departamentos_final, cuando
  on public.tickets
  for each row execute function public.sync_ticket_changes_to_traslado();

drop trigger if exists trg_sync_traslado_to_ticket on public.traslados;
create trigger trg_sync_traslado_to_ticket
  after update of estado, operador on public.traslados
  for each row execute function public.sync_traslado_to_ticket();
