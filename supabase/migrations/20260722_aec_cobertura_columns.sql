-- Cobertura AEC en tickets: meta, recibidos, en camino y contacto del solicitante
alter table public.tickets
  add column if not exists aec_meta numeric,
  add column if not exists aec_recibidos numeric,
  add column if not exists aec_en_camino numeric,
  add column if not exists aec_contacto_nombre text;
