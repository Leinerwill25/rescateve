-- Sincronización robusta: tickets manuales de traslado → public.traslados
-- Incluye categoría "multiple", detección por campo cuando y actualización de todos los campos.

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
begin
  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  if NEW.fuente = 'traslado' then
    if NEW.estado = 'asignado' or NEW.estado = 'en_camino' or NEW.estado = 'completado' then
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
      where id = NEW.id;

    elsif NEW.estado = 'aprobado' or NEW.estado = 'en_validacion' then
      update public.traslados
      set estado = 'solicitado',
          operador = null
      where id = NEW.id;
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

drop trigger if exists trg_sync_ticket_changes_to_traslado on public.tickets;
create trigger trg_sync_ticket_changes_to_traslado
  after insert or update of
    estado, transporte_id, medico_id,
    categoria_final, categoria_sugerida,
    departamentos_final, departamentos_sugeridos,
    cuando, descripcion, cantidad,
    origen_ref, origen_lat, origen_lng,
    destino_ref, destino_lat, destino_lng,
    contacto_solicitante, prioridad
  on public.tickets
  for each row execute function public.sync_ticket_changes_to_traslado();
