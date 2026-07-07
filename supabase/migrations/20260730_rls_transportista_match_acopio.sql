-- =====================================================================
-- RESCATE VE — RLS: transportista puede VER necesidades pendientes
-- para ofrecerse en Match Acopio ↔ Tuia911.
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================
--
-- Contexto: la política "transp ve sus tickets" solo deja ver tickets ya
-- asignados a su transporte. Por eso el panel de transportista salía vacío
-- (no podía leer las necesidades pendientes sin asignar). Esta política de
-- SOLO LECTURA le permite ver las necesidades candidatas a match:
--   - AEC (fuente = 'ayuda_en_camino')
--   - Ash (fuente = 'publico' con fuente_id 'ash:%')
--   - Traslados logísticos (fuente = 'traslado')
-- en estados de match (en_validacion, aprobado, asignado).
--
-- No otorga permisos de escritura: reclamar sigue pasando por la función
-- reclamar_match_acopio() que valida el rol.

drop policy if exists "transp ve necesidades match" on public.tickets;
create policy "transp ve necesidades match" on public.tickets for select using (
  public.mi_rol() = 'transportista'
  and estado in ('en_validacion', 'aprobado', 'asignado')
  and (
    fuente = 'ayuda_en_camino'
    or fuente = 'traslado'
    or (fuente = 'publico' and fuente_id like 'ash:%')
  )
);
