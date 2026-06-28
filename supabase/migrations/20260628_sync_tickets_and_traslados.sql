-- =====================================================================
-- RESCATE VE — Sincronización Automática Bidireccional Completa
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Al insertar un traslado público, se crea un ticket con el mismo ID
create or replace function public.create_ticket_from_traslado()
returns trigger as $$
declare
  v_categoria_sugerida text;
  v_departamentos_sugeridos text[];
begin
  -- Determinar sugerencias basadas en el tipo de traslado
  if NEW.tipo = 'insumos' then
    v_categoria_sugerida := 'insumo_basico';
    v_departamentos_sugeridos := array['acopio', 'transporte_carga'];
  elsif NEW.tipo = 'personal_medico' then
    v_categoria_sugerida := 'traslado_personal';
    v_departamentos_sugeridos := array['personal_medico'];
  else
    v_categoria_sugerida := 'otro';
    v_departamentos_sugeridos := array['otro'];
  end if;

  -- Insertar el ticket correspondiente con el mismo UUID
  insert into public.tickets (
    id,
    fuente,
    fuente_id,
    descripcion,
    categoria_sugerida,
    departamentos_sugeridos,
    prioridad,
    origen_ref,
    origen_lat,
    origen_lng,
    destino_ref,
    destino_lat,
    destino_lng,
    cantidad,
    contacto_solicitante,
    estado,
    requiere_revision
  ) values (
    NEW.id,
    'traslado',
    NEW.id::text,
    coalesce(NEW.descripcion, '[Traslado: ' || NEW.tipo || ']'),
    v_categoria_sugerida,
    v_departamentos_sugeridos,
    coalesce(NEW.prioridad, 'media'),
    NEW.origen_ref,
    NEW.origen_lat,
    NEW.origen_lng,
    NEW.destino_ref,
    NEW.destino_lat,
    NEW.destino_lng,
    NEW.cantidad,
    NEW.contacto,
    'en_validacion',
    true
  )
  on conflict (id) do nothing;
  
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_create_ticket_from_traslado on public.traslados;
create trigger trg_create_ticket_from_traslado
  after insert on public.traslados
  for each row execute function public.create_ticket_from_traslado();


-- 2. Cuando se crea o actualiza un ticket, se sincroniza con traslados (Bidireccional)
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
begin
  -- CASO A: El ticket proviene de un traslado público (fuente = 'traslado')
  if NEW.fuente = 'traslado' then
    if NEW.estado = 'asignado' or NEW.estado = 'en_camino' or NEW.estado = 'completado' then
      -- Obtener detalles del operador si está asignado
      if NEW.transporte_id is not null then
        select t.nombre, t.telefono, t.modelo, t.placa
        into v_nombre, v_telefono, v_modelo, v_placa
        from public.transportes t where t.id = NEW.transporte_id;
        
        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, ''),
          'modelo', coalesce(v_modelo, ''),
          'placa', coalesce(v_placa, '')
        )::text;
      elsif NEW.medico_id is not null then
        select m.nombre, m.telefono
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
                     when NEW.estado = 'completado' then 'completado'::text
                     when NEW.estado = 'en_camino' then 'en_camino'::text
                     else 'asignado'::text
                   end,
          operador = coalesce(v_operador_json, operador)
      where id = NEW.id;
      
    elsif NEW.estado = 'aprobado' or NEW.estado = 'en_validacion' then
      update public.traslados
      set estado = 'solicitado',
          operador = null
      where id = NEW.id;
    end if;

  -- CASO B: El ticket se creó internamente o desde otra fuente pero califica como traslado logístico
  else
    if NEW.categoria_final in ('insumo_basico', 'insumo_medico', 'traslado_personal')
       or NEW.categoria_sugerida in ('insumo_basico', 'insumo_medico', 'traslado_personal')
       or 'transporte_carga' = any(NEW.departamentos_final)
       or 'personal_medico' = any(NEW.departamentos_final)
       or 'transporte_carga' = any(NEW.departamentos_sugeridos)
       or 'personal_medico' = any(NEW.departamentos_sugeridos) then
      v_is_traslado := true;
    end if;

    if v_is_traslado then
      -- Determinar el tipo de traslado
      if NEW.categoria_final = 'traslado_personal' or NEW.categoria_sugerida = 'traslado_personal' or 'personal_medico' = any(NEW.departamentos_final) then
        v_tipo := 'personal_medico';
      else
        v_tipo := 'insumos';
      end if;

      -- Obtener detalles del operador
      if NEW.transporte_id is not null then
        select t.nombre, t.telefono, t.modelo, t.placa
        into v_nombre, v_telefono, v_modelo, v_placa
        from public.transportes t where t.id = NEW.transporte_id;
        
        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, ''),
          'modelo', coalesce(v_modelo, ''),
          'placa', coalesce(v_placa, '')
        )::text;
      elsif NEW.medico_id is not null then
        select m.nombre, m.telefono
        into v_nombre, v_telefono
        from public.personal_medico m where m.id = NEW.medico_id;
        
        v_operador_json := json_build_object(
          'nombre', coalesce(v_nombre, ''),
          'telefono', coalesce(v_telefono, '')
        )::text;
      else
        v_operador_json := null;
      end if;

      -- Insertar o actualizar el traslado equivalente compartiendo el UUID
      insert into public.traslados (
        id,
        tipo,
        descripcion,
        cantidad,
        origen_ref,
        origen_lat,
        origen_lng,
        destino_ref,
        destino_lat,
        destino_lng,
        prioridad,
        contacto,
        cuando,
        estado,
        operador
      ) values (
        NEW.id,
        v_tipo,
        coalesce(NEW.descripcion, '[Ticket ' || NEW.id || ']'),
        NEW.cantidad,
        coalesce(NEW.origen_ref, 'Origen no especificado'),
        NEW.origen_lat,
        NEW.origen_lng,
        NEW.destino_ref,
        NEW.destino_lat,
        NEW.destino_lng,
        coalesce(NEW.prioridad, 'media'),
        NEW.contacto_solicitante,
        'Lo antes posible',
        case 
          when NEW.estado = 'completado' then 'completado'::text
          when NEW.estado = 'en_camino' then 'en_camino'::text
          when NEW.estado = 'asignado' then 'asignado'::text
          else 'solicitado'::text
        end,
        v_operador_json
      )
      on conflict (id) do update 
      set estado = case 
                     when NEW.estado = 'completado' then 'completado'::text
                     when NEW.estado = 'en_camino' then 'en_camino'::text
                     when NEW.estado = 'asignado' then 'asignado'::text
                     else 'solicitado'::text
                   end,
          operador = coalesce(v_operador_json, public.traslados.operador),
          prioridad = coalesce(NEW.prioridad, public.traslados.prioridad),
          contacto = coalesce(NEW.contacto_solicitante, public.traslados.contacto);
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_ticket_changes_to_traslado on public.tickets;
create trigger trg_sync_ticket_changes_to_traslado
  after insert or update of estado, transporte_id, medico_id, categoria_final, departamentos_final on public.tickets
  for each row execute function public.sync_ticket_changes_to_traslado();


-- 3. Cuando se actualiza un traslado (ej. solventado por fuera), se actualiza el ticket asociado
create or replace function public.sync_traslado_to_ticket()
returns trigger as $$
declare
  v_ticket_id uuid;
begin
  select id into v_ticket_id
  from public.tickets
  where id = NEW.id;
  
  if v_ticket_id is not null then
    if NEW.estado = 'solventado_externo' or NEW.estado = 'completado' then
      update public.tickets
      set estado = 'completado',
          updated_at = now()
      where id = v_ticket_id and estado <> 'completado';
    elsif NEW.estado = 'en_camino' then
      update public.tickets
      set estado = 'en_camino',
          updated_at = now()
      where id = v_ticket_id and estado <> 'en_camino';
    elsif NEW.estado = 'asignado' then
      update public.tickets
      set estado = 'asignado',
          updated_at = now()
      where id = v_ticket_id and estado <> 'asignado';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_traslado_to_ticket on public.traslados;
create trigger trg_sync_traslado_to_ticket
  after update of estado on public.traslados
  for each row execute function public.sync_traslado_to_ticket();


-- 4. Mantener sincronizadas las eliminaciones en ambas direcciones
create or replace function public.sync_ticket_delete_to_traslado()
returns trigger as $$
begin
  delete from public.traslados where id = OLD.id;
  return OLD;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_ticket_delete_to_traslado on public.tickets;
create trigger trg_sync_ticket_delete_to_traslado
  after delete on public.tickets
  for each row execute function public.sync_ticket_delete_to_traslado();


create or replace function public.sync_traslado_delete_to_ticket()
returns trigger as $$
begin
  delete from public.tickets where id = OLD.id;
  return OLD;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_traslado_delete_to_ticket on public.traslados;
create trigger trg_sync_traslado_delete_to_ticket
  after delete on public.traslados
  for each row execute function public.sync_traslado_delete_to_ticket();
