-- RPCs para registrar acciones de auditoría desde el panel admin (security definer, como aprobar_ticket)

create or replace function public.rechazar_ticket_admin(p_id uuid, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_nota text := coalesce(nullif(trim(p_nota), ''), 'Descartado sin notas adicionales.');
begin
  if public.mi_rol() <> 'admin' then
    raise exception 'no autorizado';
  end if;

  update public.tickets
  set estado = 'rechazado',
      notas_admin = v_nota,
      updated_at = now()
  where id = p_id;

  insert into public.ticket_historial(ticket_id, actor, accion, nota, a_valor)
  values (p_id, auth.uid(), 'rechazado', v_nota, 'rechazado');
end;
$$;

create or replace function public.registrar_historial_ticket_admin(
  p_ticket_id uuid,
  p_accion text,
  p_nota text default null,
  p_de_valor text default null,
  p_a_valor text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.mi_rol() <> 'admin' then
    raise exception 'no autorizado';
  end if;

  insert into public.ticket_historial(ticket_id, actor, accion, nota, de_valor, a_valor)
  values (p_ticket_id, auth.uid(), p_accion, p_nota, p_de_valor, p_a_valor);
end;
$$;

grant execute on function public.rechazar_ticket_admin(uuid, text) to authenticated;
grant execute on function public.registrar_historial_ticket_admin(uuid, text, text, text, text) to authenticated;
