-- =====================================================================
-- RESCATE VE — Traslados públicos sin espejos de Ayuda en Camino
-- Pégalo en: Supabase > SQL Editor > Run
--
-- Problema: al ingerir tickets de Ayuda en Camino, el trigger
-- sync_ticket_changes_to_traslado (CASO B) creaba filas en public.traslados
-- por clasificación de insumos, mostrando ~600 peticiones en la página pública.
--
-- Solución:
-- 1. CASO B solo aplica a tickets manuales logísticos (fuente = 'manual').
-- 2. Limpiar espejos fantasma sin borrar tickets AEC ni traslados reales.
-- 3. RLS: lectura pública solo de traslados con reporter_token.
-- =====================================================================

-- ── 1. Tickets → Traslados: no espejar ingesta externa ──
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

  -- CASO B: solo tickets manuales logísticos creados en operaciones
  elsif NEW.fuente = 'manual' then
    if NEW.categoria_final in ('insumo_basico', 'insumo_medico', 'traslado_personal')
       or NEW.categoria_sugerida in ('insumo_basico', 'insumo_medico', 'traslado_personal')
       or 'transporte_carga' = any(NEW.departamentos_final)
       or 'personal_medico' = any(NEW.departamentos_final)
       or 'transporte_carga' = any(NEW.departamentos_sugeridos)
       or 'personal_medico' = any(NEW.departamentos_sugeridos) then
      v_is_traslado := true;
    end if;

    if v_is_traslado then
      if NEW.categoria_final = 'traslado_personal'
         or NEW.categoria_sugerida = 'traslado_personal'
         or 'personal_medico' = any(NEW.departamentos_final) then
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
      set estado = case
                     when public.traslados.estado = 'solventado_externo' then 'solventado_externo'::text
                     when NEW.estado = 'completado' then 'completado'::text
                     when NEW.estado = 'en_camino' then 'en_camino'::text
                     when NEW.estado = 'asignado' then 'asignado'::text
                     else 'solicitado'::text
                   end,
          operador = coalesce(v_operador_json, public.traslados.operador),
          prioridad = coalesce(NEW.prioridad, public.traslados.prioridad),
          cuando = coalesce(NEW.cuando, public.traslados.cuando),
          contacto = coalesce(NEW.contacto_solicitante, public.traslados.contacto);
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;


-- ── 2. Al borrar un espejo fantasma, no eliminar tickets de ingesta ──
create or replace function public.sync_traslado_delete_to_ticket()
returns trigger as $$
begin
  delete from public.tickets
  where id = OLD.id
    and fuente not in ('ayuda_en_camino', 'publico');

  return OLD;
end;
$$ language plpgsql security definer;


-- ── 3. Limpiar espejos fantasma ya creados (conserva traslados con reporter_token) ──
delete from public.traslados t
using public.tickets tk
where t.id = tk.id
  and tk.fuente = 'ayuda_en_camino'
  and t.reporter_token is null;


-- ── 4. RLS: la página pública solo ve traslados solicitados desde el mapa ──
drop policy if exists "Anyone can read traslados" on public.traslados;

create policy "publico lee traslados del mapa" on public.traslados
  for select using (reporter_token is not null);

create policy "admin lee todos los traslados" on public.traslados
  for select using (public.mi_rol() = 'admin');
