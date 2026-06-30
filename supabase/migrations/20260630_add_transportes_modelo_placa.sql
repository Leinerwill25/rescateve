-- =====================================================================
-- RESCATE VE — Columnas modelo y placa en transportes
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

alter table public.transportes
  add column if not exists modelo text,
  add column if not exists placa text;

-- Refrescar caché de esquema de PostgREST (opcional, suele aplicarse solo)
notify pgrst, 'reload schema';
