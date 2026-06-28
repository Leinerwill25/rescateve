-- =====================================================================
-- RESCATE VE — Corregir Políticas RLS de la tabla perfiles
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Eliminar políticas de lectura previas en perfiles
drop policy if exists "perfil propio lectura" on public.perfiles;
drop policy if exists "Anyone can read perfiles" on public.perfiles;
drop policy if exists "Lectura de perfiles abierta" on public.perfiles;

-- 2. Crear una política de lectura abierta para que cualquier usuario pueda ver los nombres y roles
create policy "Lectura de perfiles abierta" on public.perfiles
  for select using (true);
