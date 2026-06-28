-- =====================================================================
-- RESCATE VE — Actualización de Esquema de Gasolina para Integración Muney
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Agregar columnas a solicitudes_gasolina
alter table public.solicitudes_gasolina 
  add column if not exists traslado_id uuid references public.traslados(id) on delete cascade,
  add column if not exists tipo_vehiculo text check (tipo_vehiculo in ('moto', 'carro', 'autobus')),
  add column if not exists banco text,
  add column if not exists order_id text,
  add column if not exists quote_id text,
  add column if not exists payout_status text default 'pendiente',
  add column if not exists payout_error text;

-- 2. Asegurar que las políticas RLS permitan leer y actualizar
drop policy if exists "Anyone can insert solicitudes gasolina" on public.solicitudes_gasolina;
create policy "Anyone can insert solicitudes gasolina" on public.solicitudes_gasolina 
  as permissive for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can read solicitudes gasolina" on public.solicitudes_gasolina;
create policy "Anyone can read solicitudes gasolina" on public.solicitudes_gasolina 
  as permissive for select to anon, authenticated using (true);

drop policy if exists "Anyone can update solicitudes gasolina" on public.solicitudes_gasolina;
create policy "Anyone can update solicitudes gasolina" on public.solicitudes_gasolina 
  as permissive for update to anon, authenticated using (true);
