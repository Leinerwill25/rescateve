-- Asegura FK ticket_historial.actor → perfiles para joins PostgREST

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ticket_historial_actor_fkey'
  ) then
    alter table public.ticket_historial
      add constraint ticket_historial_actor_fkey
      foreign key (actor) references public.perfiles(id) on delete set null;
  end if;
end $$;
