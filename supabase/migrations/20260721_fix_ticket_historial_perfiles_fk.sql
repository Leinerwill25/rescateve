-- Asegura FK ticket_historial.actor → perfiles (solo auditoría; no toca tickets ni ingesta).
--
-- SEGURO: no modifica tickets, traslados, match_acopio ni lógica de cola.
-- Si hay actor huérfano (perfil borrado), se pone NULL antes de crear la FK.

do $$
declare
  v_huerfanos int;
begin
  select count(*) into v_huerfanos
  from public.ticket_historial h
  where h.actor is not null
    and not exists (select 1 from public.perfiles p where p.id = h.actor);

  if v_huerfanos > 0 then
    update public.ticket_historial h
    set actor = null
    where h.actor is not null
      and not exists (select 1 from public.perfiles p where p.id = h.actor);
    raise notice 'ticket_historial: % filas con actor huérfano → actor NULL', v_huerfanos;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ticket_historial_actor_fkey'
  ) then
    alter table public.ticket_historial
      add constraint ticket_historial_actor_fkey
      foreign key (actor) references public.perfiles(id) on delete set null;
    raise notice 'FK ticket_historial_actor_fkey creada';
  else
    raise notice 'FK ticket_historial_actor_fkey ya existía — sin cambios';
  end if;
end $$;
