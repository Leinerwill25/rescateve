-- =====================================================================
-- RESCATE VE — Sincronización Automática entre Traslados y Tickets
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Función para crear automáticamente un ticket en la cola cuando se solicita un traslado
create or replace function public.create_ticket_from_traslado()
returns trigger as $$
declare
  v_categoria_sugerida text;
  v_departamentos_sugeridos text[];
begin
  -- Determinar sugerencias de categoría y departamentos basados en el tipo de traslado
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

  -- Insertar el ticket correspondiente en la cola de validación
  insert into public.tickets (
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
  );
  
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_create_ticket_from_traslado on public.traslados;
create trigger trg_create_ticket_from_traslado
  after insert on public.traslados
  for each row execute function public.create_ticket_from_traslado();


-- 2. Función para sincronizar cambios del ticket hacia el traslado (ej. cuando el admin asigna operador o cambia estado)
create or replace function public.sync_ticket_to_traslado()
returns trigger as $$
declare
  v_traslado_id uuid;
  v_nombre text;
  v_telefono text;
  v_modelo text;
  v_placa text;
  v_operador_json text;
begin
  -- Solo actuar si el ticket proviene de un traslado
  if NEW.fuente = 'traslado' and NEW.fuente_id is not null then
    v_traslado_id := NEW.fuente_id::uuid;
    
    -- Si el estado del ticket cambió
    if NEW.estado = 'asignado' or NEW.estado = 'en_camino' or NEW.estado = 'completado' then
      -- Obtener detalles del operador si está asignado
      if NEW.transporte_id is not null then
        select t.nombre, t.telefono, t.modelo, t.placa
        into v_nombre, v_telefono, v_modelo, v_placa
        from public.transportes t where t.id = NEW.transporte_id;
        
        -- Formatear como JSON string para el campo operador del traslado
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
      
      -- Actualizar traslado
      update public.traslados
      set estado = case 
                     when NEW.estado = 'completado' then 'completado'::text
                     when NEW.estado = 'en_camino' then 'en_camino'::text
                     else 'asignado'::text
                   end,
          operador = coalesce(v_operador_json, operador)
      where id = v_traslado_id;
      
    elsif NEW.estado = 'aprobado' then
      -- Si fue aprobado pero aún no asignado
      update public.traslados
      set estado = 'solicitado',
          operador = null
      where id = v_traslado_id;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_ticket_to_traslado on public.tickets;
create trigger trg_sync_ticket_to_traslado
  after update of estado, transporte_id, medico_id on public.tickets
  for each row execute function public.sync_ticket_to_traslado();


-- 3. Función para sincronizar cambios del traslado hacia el ticket (ej. solventado por fuera)
create or replace function public.sync_traslado_to_ticket()
returns trigger as $$
declare
  v_ticket_id uuid;
begin
  select id into v_ticket_id
  from public.tickets
  where fuente = 'traslado' and fuente_id = NEW.id::text;
  
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


-- 4. Sincronizar eliminaciones
create or replace function public.sync_traslado_delete_to_ticket()
returns trigger as $$
begin
  delete from public.tickets
  where fuente = 'traslado' and fuente_id = OLD.id::text;
  return OLD;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_traslado_delete_to_ticket on public.traslados;
create trigger trg_sync_traslado_delete_to_ticket
  after delete on public.traslados
  for each row execute function public.sync_traslado_delete_to_ticket();
