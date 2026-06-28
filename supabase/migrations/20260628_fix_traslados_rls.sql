-- =====================================================================
-- RESCATE VE — Corregir Políticas RLS para la Tabla de Traslados
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Habilitar RLS en la tabla traslados si aún no lo está
alter table public.traslados enable row level security;

-- 2. Eliminar políticas existentes para evitar duplicaciones
drop policy if exists "Anyone can insert traslados" on public.traslados;
drop policy if exists "Anyone can read traslados" on public.traslados;
drop policy if exists "Anyone can update traslados" on public.traslados;
drop policy if exists "Anyone can delete traslados" on public.traslados;

-- 3. Crear las políticas de acceso público (anon y authenticated)
create policy "Anyone can insert traslados" on public.traslados 
  for insert to anon, authenticated 
  with check (true);

create policy "Anyone can read traslados" on public.traslados 
  for select to anon, authenticated 
  using (true);

create policy "Anyone can update traslados" on public.traslados 
  for update to anon, authenticated 
  using (true);

create policy "Anyone can delete traslados" on public.traslados 
  for delete to anon, authenticated 
  using (true);

-- 4. Otorgar permisos a los roles anon y authenticated (por si acaso)
grant insert, select, update, delete on table public.traslados to anon, authenticated;
