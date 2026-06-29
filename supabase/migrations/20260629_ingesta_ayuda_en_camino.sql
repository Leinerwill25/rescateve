-- =====================================================================
-- RESCATE VE — Configuración de la Ingesta de Ayuda en Camino
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Agregar columnas externas a la tabla tickets
alter table public.tickets
  add column if not exists categoria_externa text,
  add column if not exists ubicacion_externa text,
  add column if not exists estado_externo    text default 'pendiente', -- pendiente | cubierta
  add column if not exists fuente_url         text,
  add column if not exists capturado_at       timestamptz;

-- 2. Crear índice único para deduplicación por fuente
create unique index if not exists uq_tickets_fuente
  on public.tickets (fuente, fuente_id) where fuente_id is not null;

-- 3. Crear tabla de bitácora de ingesta
create table if not exists public.ingesta_log (
  id           uuid primary key default gen_random_uuid(),
  fuente       text not null,
  corrida_at   timestamptz not null default now(),
  nuevos       integer default 0,
  actualizados integer default 0,
  cubiertos    integer default 0,
  error        text
);

-- Habilitar permisos
grant select on public.ingesta_log to anon, authenticated;
