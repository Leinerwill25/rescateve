-- =====================================================================
-- RESCATE VE — Combustible desde consola transportista + panel admin
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- Cédula opcional del conductor en ficha de transporte (validación anti-autopago)
alter table public.transportes
  add column if not exists cedula text;

-- Vincular solicitudes con tickets operativos y transportistas
alter table public.solicitudes_gasolina
  add column if not exists ticket_id uuid references public.tickets(id) on delete set null,
  add column if not exists transporte_id uuid references public.transportes(id) on delete set null,
  add column if not exists solicitante_perfil_id uuid references public.perfiles(id) on delete set null,
  add column if not exists origen text not null default 'publico';

-- Ampliar estados permitidos
alter table public.solicitudes_gasolina
  drop constraint if exists solicitudes_gasolina_estado_check;

alter table public.solicitudes_gasolina
  add constraint solicitudes_gasolina_estado_check
  check (estado in ('pendiente', 'suministrado', 'pendiente_autorizacion', 'rechazado'));

create index if not exists idx_gasolina_ticket on public.solicitudes_gasolina(ticket_id);
create index if not exists idx_gasolina_transporte on public.solicitudes_gasolina(transporte_id);
create index if not exists idx_gasolina_estado on public.solicitudes_gasolina(estado);
