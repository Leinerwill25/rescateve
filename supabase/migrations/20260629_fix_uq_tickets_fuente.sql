-- El índice parcial (WHERE fuente_id IS NOT NULL) no es compatible con
-- ON CONFLICT (fuente, fuente_id) en PostgREST/Supabase upsert.
-- Un índice único completo sigue permitiendo varios tickets manuales con fuente_id NULL.
drop index if exists public.uq_tickets_fuente;
create unique index uq_tickets_fuente on public.tickets (fuente, fuente_id);
