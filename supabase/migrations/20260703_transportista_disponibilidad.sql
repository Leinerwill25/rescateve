-- =====================================================================
-- RESCATE VE — Disponibilidad de transportistas (en_standby)
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- El transportista puede activar/desactivar si recibe nuevos traslados
create or replace function public.actualizar_disponibilidad_transporte(p_en_standby boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_updated int;
begin
  if public.mi_rol() <> 'transportista' then
    raise exception 'no autorizado';
  end if;

  update public.transportes
  set en_standby = p_en_standby
  where perfil_id = auth.uid()
    and activo = true;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'No se encontró una ficha de transporte activa vinculada a su usuario';
  end if;
end $$;

grant execute on function public.actualizar_disponibilidad_transporte(boolean) to authenticated;
