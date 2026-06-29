-- =====================================================================
-- RESCATE VE — Limpiar tickets fantasma de traslados (panel admin)
-- Pégalo en: Supabase > SQL Editor > Run
--
-- Problema: el backfill y el trigger create_ticket_from_traslado crearon
-- tickets fuente='traslado' para espejos de Ayuda en Camino (sin reporter_token).
-- El filtro "Solo Traslados Logísticos" mostraba ~175 en vez de los reales.
-- =====================================================================

-- 1. No crear tickets automáticos para traslados que no vienen del mapa público
create or replace function public.create_ticket_from_traslado()
returns trigger as $$
declare
  v_categoria_sugerida text;
  v_departamentos_sugeridos text[];
begin
  if NEW.reporter_token is null then
    return NEW;
  end if;

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

  insert into public.tickets (
    id, fuente, fuente_id, descripcion,
    categoria_sugerida, departamentos_sugeridos,
    prioridad, origen_ref, origen_lat, origen_lng,
    destino_ref, destino_lat, destino_lng,
    cantidad, contacto_solicitante, estado, requiere_revision
  ) values (
    NEW.id, 'traslado', NEW.id::text,
    coalesce(NEW.descripcion, '[Traslado: ' || NEW.tipo || ']'),
    v_categoria_sugerida, v_departamentos_sugeridos,
    coalesce(NEW.prioridad, 'media'),
    NEW.origen_ref, NEW.origen_lat, NEW.origen_lng,
    NEW.destino_ref, NEW.destino_lat, NEW.destino_lng,
    NEW.cantidad, NEW.contacto, 'en_validacion', true
  )
  on conflict (id) do nothing;

  return NEW;
end;
$$ language plpgsql security definer;


-- 2. Eliminar tickets fantasma en cola (sin traslado público asociado)
delete from public.tickets tk
where tk.fuente = 'traslado'
  and tk.estado = 'en_validacion'
  and not exists (
    select 1 from public.traslados t
    where t.id = tk.id
      and t.reporter_token is not null
  );
