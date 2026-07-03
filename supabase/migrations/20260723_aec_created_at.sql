-- Fecha de creación original en Ayuda en Camino (API createdAt)
alter table public.tickets
  add column if not exists aec_created_at timestamptz;

create index if not exists idx_tickets_aec_created_at
  on public.tickets (aec_created_at)
  where fuente = 'ayuda_en_camino' and aec_created_at is not null;
