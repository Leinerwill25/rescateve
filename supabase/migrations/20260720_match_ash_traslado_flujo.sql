-- Match Ash + Traslados: confirmar/rechazar viaje con nota y notificaciones admin

create or replace function public.notify_admins(p_ticket_id uuid, p_mensaje text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificaciones(ticket_id, destinatario_tipo, destinatario_id, mensaje, canal, estado)
  select p_ticket_id, 'admin', p.id, p_mensaje, 'in_app', 'pendiente'
  from public.perfiles p
  where p.rol = 'admin' and p.activo = true;
end;
$$;

-- Reclamar: soporta AEC, Ash y traslados + aviso a admin
create or replace function public.reclamar_match_acopio(
  p_ticket_id uuid,
  p_tuia_centro_id text,
  p_tuia_centro_nombre text,
  p_tuia_centro_tel text,
  p_tuia_articulo text,
  p_tuia_disponible numeric,
  p_tuia_unidad text,
  p_distancia_km numeric,
  p_score_match numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transporte_id uuid;
  v_match_id uuid;
  v_ticket record;
  v_transp_nombre text;
begin
  if public.mi_rol() <> 'transportista' then
    raise exception 'Solo transportistas pueden reclamar traslados de acopio';
  end if;

  select id, nombre into v_transporte_id, v_transp_nombre
  from public.transportes
  where perfil_id = auth.uid() and activo = true
  limit 1;

  if v_transporte_id is null then
    raise exception 'No tiene ficha de transporte activa';
  end if;

  select id, estado, fuente, fuente_id, descripcion into v_ticket
  from public.tickets where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Ticket no encontrado';
  end if;

  if v_ticket.estado in ('completado', 'rechazado', 'cancelado') then
    raise exception 'Este ticket ya no está disponible';
  end if;

  if exists (
    select 1 from public.match_traslados_acopio
    where ticket_id = p_ticket_id
      and estado in ('reclamado', 'confirmado', 'en_camino')
  ) then
    raise exception 'Este traslado ya fue reclamado por otro transportista';
  end if;

  insert into public.match_traslados_acopio (
    ticket_id, tuia_centro_id, tuia_centro_nombre, tuia_centro_tel,
    tuia_articulo, tuia_disponible, tuia_unidad,
    distancia_km, score_match, estado, transporte_id, perfil_id
  ) values (
    p_ticket_id, p_tuia_centro_id, p_tuia_centro_nombre, p_tuia_centro_tel,
    p_tuia_articulo, p_tuia_disponible, p_tuia_unidad,
    p_distancia_km, p_score_match, 'reclamado', v_transporte_id, auth.uid()
  )
  returning id into v_match_id;

  update public.tickets
  set transporte_id = v_transporte_id,
      estado = case when estado in ('en_validacion', 'aprobado') then 'asignado' else estado end,
      updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_historial(ticket_id, actor, accion, a_valor)
  values (p_ticket_id, auth.uid(), 'match_acopio_reclamado', p_tuia_centro_nombre);

  perform public.notify_admins(
    p_ticket_id,
    coalesce(v_transp_nombre, 'Un transportista') || ' reclamó un traslado desde ' ||
    coalesce(p_tuia_centro_nombre, 'acopio') || '. Pendiente confirmación del conductor.'
  );

  return v_match_id;
end;
$$;

-- Transportista confirma o rechaza tras contactar acopio + solicitante
create or replace function public.responder_reclamo_acopio(
  p_match_id uuid,
  p_aceptar boolean,
  p_nota text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_transp_nombre text;
begin
  if public.mi_rol() <> 'transportista' then
    raise exception 'Solo transportistas pueden responder reclamos';
  end if;

  select m.*, t.nombre as transp_nombre
  into v_match
  from public.match_traslados_acopio m
  join public.transportes t on t.id = m.transporte_id
  where m.id = p_match_id
    and m.perfil_id = auth.uid()
    and m.estado = 'reclamado';

  if v_match.id is null then
    raise exception 'Reclamo no encontrado o ya fue respondido';
  end if;

  v_transp_nombre := coalesce(v_match.transp_nombre, 'Transportista');

  if p_aceptar then
    update public.match_traslados_acopio
    set estado = 'confirmado',
        confirmado_por = auth.uid(),
        confirmado_at = now(),
        updated_at = now()
    where id = p_match_id;

    update public.tickets
    set estado = 'aceptado', updated_at = now()
    where id = v_match.ticket_id;

    insert into public.ticket_historial(ticket_id, actor, accion, a_valor)
    values (v_match.ticket_id, auth.uid(), 'match_acopio_confirmado', 'aceptado_por_conductor');

    perform public.notify_admins(
      v_match.ticket_id,
      v_transp_nombre || ' confirmó que realizará el traslado desde ' ||
      coalesce(v_match.tuia_centro_nombre, 'acopio') || '.'
    );
  else
    if p_nota is null or length(trim(p_nota)) < 5 then
      raise exception 'Debe indicar el motivo del rechazo (mínimo 5 caracteres)';
    end if;

    update public.match_traslados_acopio
    set estado = 'cancelado',
        notas = trim(p_nota),
        updated_at = now()
    where id = p_match_id;

    update public.tickets
    set estado = 'aprobado',
        transporte_id = null,
        updated_at = now()
    where id = v_match.ticket_id;

    insert into public.ticket_historial(ticket_id, actor, accion, a_valor, nota)
    values (v_match.ticket_id, auth.uid(), 'match_acopio_rechazado', 'rechazado_por_conductor', trim(p_nota));

    perform public.notify_admins(
      v_match.ticket_id,
      v_transp_nombre || ' rechazó el traslado. Motivo: ' || trim(p_nota)
    );
  end if;
end;
$$;

-- Rechazo de viaje con nota obligatoria + notificación admin
create or replace function public.actualizar_estado_ticket(
  p_id uuid,
  p_estado text,
  p_evidencia_url text default null,
  p_nota text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_ok boolean;
  v_transp_nombre text;
  v_match_id uuid;
begin
  if p_estado not in ('aceptado','en_camino','completado','rechazado') then
    raise exception 'estado invalido';
  end if;

  select exists(
    select 1 from public.tickets t
    where t.id=p_id and (
      (public.mi_rol()='transportista' and t.transporte_id in (select id from public.transportes where perfil_id=auth.uid()))
      or (public.mi_rol()='medico' and t.medico_id in (select id from public.personal_medico where perfil_id=auth.uid()))
      or public.mi_rol()='admin')
  ) into v_ok;

  if not v_ok then raise exception 'no autorizado'; end if;

  if p_estado = 'completado' and public.mi_rol() = 'transportista'
     and (p_evidencia_url is null or trim(p_evidencia_url) = '') then
    raise exception 'Debe adjuntar una foto de evidencia de entrega';
  end if;

  if p_estado = 'rechazado' then
    if public.mi_rol() = 'transportista'
       and (p_nota is null or length(trim(p_nota)) < 5) then
      raise exception 'Debe indicar el motivo del rechazo (mínimo 5 caracteres)';
    end if;

    select t.nombre into v_transp_nombre
    from public.transportes t
    join public.tickets tk on tk.transporte_id = t.id
    where tk.id = p_id and t.perfil_id = auth.uid()
    limit 1;

    select id into v_match_id
    from public.match_traslados_acopio
    where ticket_id = p_id and estado in ('reclamado', 'confirmado')
    limit 1;

    if v_match_id is not null then
      update public.match_traslados_acopio
      set estado = 'cancelado',
          notas = coalesce(nullif(trim(p_nota), ''), notas),
          updated_at = now()
      where id = v_match_id;
    end if;

    update public.tickets set
      estado = 'aprobado',
      transporte_id = null,
      medico_id = null,
      updated_at = now()
    where id = p_id;

    if public.mi_rol() = 'transportista' then
      insert into public.ticket_historial(ticket_id, actor, accion, a_valor, nota)
      values (p_id, auth.uid(), 'rechazado', 'rechazado', coalesce(trim(p_nota), ''));

      perform public.notify_admins(
        p_id,
        coalesce(v_transp_nombre, 'Un transportista') || ' rechazó un viaje asignado. Motivo: ' ||
        coalesce(trim(p_nota), 'Sin detalle')
      );
    end if;
  elsif p_estado = 'completado' then
    update public.tickets set
      estado = p_estado,
      evidencia_entrega_url = coalesce(nullif(trim(p_evidencia_url), ''), evidencia_entrega_url),
      updated_at = now()
    where id = p_id;

    update public.match_traslados_acopio
    set estado = 'completado', updated_at = now()
    where ticket_id = p_id and estado in ('confirmado', 'en_camino');
  elsif p_estado = 'en_camino' then
    update public.tickets set estado = p_estado, updated_at = now() where id = p_id;

    update public.match_traslados_acopio
    set estado = 'en_camino', updated_at = now()
    where ticket_id = p_id and estado = 'confirmado';
  else
    update public.tickets set estado = p_estado, updated_at = now() where id = p_id;
  end if;

  insert into public.ticket_historial(ticket_id, actor, accion, a_valor)
  values (p_id, auth.uid(), 'estado_cambiado', p_estado);
end $$;

grant execute on function public.notify_admins(uuid, text) to authenticated;
grant execute on function public.responder_reclamo_acopio(uuid, boolean, text) to authenticated;
grant execute on function public.actualizar_estado_ticket(uuid, text, text, text) to authenticated;
