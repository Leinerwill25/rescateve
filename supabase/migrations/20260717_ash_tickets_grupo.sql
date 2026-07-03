-- Campos para solicitudes agrupadas del asistente Ash (fuente=publico)

alter table public.tickets
  add column if not exists grupo_id uuid,
  add column if not exists para_quien text;

create index if not exists idx_tickets_grupo_id on public.tickets(grupo_id)
  where grupo_id is not null;

comment on column public.tickets.grupo_id is 'Agrupa varios ítems de una misma conversación Ash';
comment on column public.tickets.para_quien is 'Destinatario: centro_acopio, refugio, persona_familia, etc.';
