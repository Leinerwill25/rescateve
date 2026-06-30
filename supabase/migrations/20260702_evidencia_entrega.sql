-- =====================================================================
-- RESCATE VE — Evidencia fotográfica de entregas (transportistas)
-- Pégalo en: Supabase > SQL Editor > Run
-- También crea el bucket "entregas" (público) en Storage si no existe.
-- =====================================================================

alter table public.tickets
  add column if not exists evidencia_entrega_url text;

-- Extender RPC para guardar foto al completar
create or replace function public.actualizar_estado_ticket(
  p_id uuid,
  p_estado text,
  p_evidencia_url text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare v_ok boolean;
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
    update public.tickets set
      estado = 'aprobado',
      transporte_id = null,
      medico_id = null,
      updated_at = now()
    where id = p_id;
  elsif p_estado = 'completado' then
    update public.tickets set
      estado = p_estado,
      evidencia_entrega_url = coalesce(nullif(trim(p_evidencia_url), ''), evidencia_entrega_url),
      updated_at = now()
    where id = p_id;
  else
    update public.tickets set
      estado = p_estado,
      updated_at = now()
    where id = p_id;
  end if;

  insert into public.ticket_historial(ticket_id, actor, accion, a_valor)
  values (p_id, auth.uid(), 'estado_cambiado', p_estado);
end $$;

grant execute on function public.actualizar_estado_ticket(uuid, text, text) to authenticated;

-- Bucket de fotos de entrega
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entregas',
  'entregas',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set public = true;

drop policy if exists "entregas insert auth" on storage.objects;
create policy "entregas insert auth" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'entregas');

drop policy if exists "entregas select public" on storage.objects;
create policy "entregas select public" on storage.objects
  for select to public
  using (bucket_id = 'entregas');

drop policy if exists "entregas update auth" on storage.objects;
create policy "entregas update auth" on storage.objects
  for update to authenticated
  using (bucket_id = 'entregas');
