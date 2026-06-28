-- =====================================================================
-- RESCATE VE — Agregar estado 'solventado_externo' a la tabla traslados
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Eliminar la restricción check existente en public.traslados
alter table public.traslados drop constraint if exists traslados_estado_check;

-- 2. Agregar la nueva restricción check que incluye 'solventado_externo'
alter table public.traslados add constraint traslados_estado_check 
  check (estado in ('solicitado', 'asignado', 'en_camino', 'completado', 'solventado_externo'));
