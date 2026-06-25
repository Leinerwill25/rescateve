-- =====================================================================
-- RESCATE VE — Esquema de base de datos para Supabase
-- Pégalo completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- 1. SOLICITUDES DE AYUDA (puntos de emergencia) ----------
create table if not exists public.solicitudes_ayuda (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  tipo              text not null,            -- rescate | paramedico | ambulancia | proteccion_civil | bomberos | agua | alimentos | refugio | otro
  descripcion       text,
  latitud           double precision not null,
  longitud          double precision not null,
  referencia        text,                     -- punto de referencia / dirección en palabras
  personas_afectadas integer,
  prioridad         text not null default 'alta',     -- alta | media | baja
  contacto          text,
  estado            text not null default 'pendiente' -- pendiente | en_proceso | atendido
);

create index if not exists idx_solicitudes_estado on public.solicitudes_ayuda (estado);
create index if not exists idx_solicitudes_created on public.solicitudes_ayuda (created_at desc);

-- ---------- 2. PERSONAS DESAPARECIDAS ----------
create table if not exists public.personas_desaparecidas (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  nombre            text not null,
  edad              integer,
  descripcion       text,                     -- descripción física, vestimenta
  ultima_ubicacion  text,                     -- dónde lo vieron por última vez (en palabras)
  latitud           double precision,         -- coordenada del último lugar visto / esperado
  longitud          double precision,
  foto_url          text,
  contacto          text not null,            -- contacto del familiar que reporta
  estado            text not null default 'desaparecido' -- desaparecido | encontrado
);

create index if not exists idx_desaparecidas_estado on public.personas_desaparecidas (estado);
create index if not exists idx_desaparecidas_created on public.personas_desaparecidas (created_at desc);

-- ---------- 3. ROW LEVEL SECURITY ----------
-- En una emergencia la gente reporta sin cuenta. Permitimos lectura e
-- inserción anónima, y actualización de estado (para marcar "atendido" /
-- "encontrado"). Ver nota sobre moderación en el README.
alter table public.solicitudes_ayuda     enable row level security;
alter table public.personas_desaparecidas enable row level security;

-- Lectura pública
create policy "lectura publica solicitudes"
  on public.solicitudes_ayuda for select using (true);
create policy "lectura publica desaparecidas"
  on public.personas_desaparecidas for select using (true);

-- Inserción pública
create policy "insercion publica solicitudes"
  on public.solicitudes_ayuda for insert with check (true);
create policy "insercion publica desaparecidas"
  on public.personas_desaparecidas for insert with check (true);

-- Actualización pública (solo para cambiar estado en terreno)
create policy "actualizacion publica solicitudes"
  on public.solicitudes_ayuda for update using (true) with check (true);
create policy "actualizacion publica desaparecidas"
  on public.personas_desaparecidas for update using (true) with check (true);

-- ---------- 4. REALTIME (el mapa se actualiza solo) ----------
alter publication supabase_realtime add table public.solicitudes_ayuda;
alter publication supabase_realtime add table public.personas_desaparecidas;

-- ---------- 5. (OPCIONAL) Storage para fotos de desaparecidos ----------
-- Crea un bucket público llamado "desaparecidos" desde
-- Supabase > Storage > New bucket (marcar "Public bucket").
-- Luego este policy permite subir:
--   (Storage policies se crean desde la UI; ver README.)
