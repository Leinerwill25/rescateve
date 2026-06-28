-- =====================================================================
-- RESCATE VE — Agregar columnas faltantes a la tabla perfiles
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

alter table public.perfiles 
  add column if not exists activo boolean not null default true,
  add column if not exists organizacion text;
