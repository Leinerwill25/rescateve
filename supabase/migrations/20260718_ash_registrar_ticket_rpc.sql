-- RPC para registrar tickets desde Ash sin service role en el servidor

create or replace function public.registrar_tickets_ash(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  inserted_ids uuid[] := '{}';
  new_id uuid;
  cnt int := 0;
  deps text[];
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items debe ser un array JSON';
  end if;

  if jsonb_array_length(p_items) < 1 then
    raise exception 'se requiere al menos un item';
  end if;

  if jsonb_array_length(p_items) > 10 then
    raise exception 'maximo 10 items por solicitud';
  end if;

  for item in select value from jsonb_array_elements(p_items) as t(value)
  loop
    if coalesce(item->>'fuente', '') <> 'publico' then
      raise exception 'fuente invalida';
    end if;

    if item->>'fuente_id' is null or item->>'fuente_id' not like 'ash:%' then
      raise exception 'fuente_id invalida';
    end if;

    if item->>'descripcion' is null or length(trim(item->>'descripcion')) < 3 then
      raise exception 'descripcion invalida';
    end if;

    if item->>'destino_lat' is null or item->>'destino_lng' is null then
      raise exception 'ubicacion requerida';
    end if;

    deps := null;
    if item ? 'departamentos_sugeridos' and jsonb_typeof(item->'departamentos_sugeridos') = 'array' then
      select coalesce(array_agg(elem), '{}')
      into deps
      from jsonb_array_elements_text(item->'departamentos_sugeridos') as t(elem);
    end if;

    insert into public.tickets (
      fuente,
      fuente_id,
      descripcion,
      categoria_sugerida,
      departamentos_sugeridos,
      prioridad,
      destino_ref,
      destino_lat,
      destino_lng,
      cantidad,
      contacto_solicitante,
      grupo_id,
      para_quien,
      estado
    ) values (
      'publico',
      item->>'fuente_id',
      trim(item->>'descripcion'),
      nullif(trim(item->>'categoria_sugerida'), ''),
      deps,
      coalesce(nullif(item->>'prioridad', ''), 'media'),
      nullif(trim(item->>'destino_ref'), ''),
      (item->>'destino_lat')::double precision,
      (item->>'destino_lng')::double precision,
      nullif(trim(item->>'cantidad'), ''),
      nullif(trim(item->>'contacto_solicitante'), ''),
      nullif(item->>'grupo_id', '')::uuid,
      nullif(trim(item->>'para_quien'), ''),
      'en_validacion'
    )
    on conflict (fuente, fuente_id) where fuente_id is not null do nothing
    returning id into new_id;

    if new_id is not null then
      inserted_ids := array_append(inserted_ids, new_id);
      cnt := cnt + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'count', cnt,
    'ids', to_jsonb(inserted_ids)
  );
end;
$$;

revoke all on function public.registrar_tickets_ash(jsonb) from public;
grant execute on function public.registrar_tickets_ash(jsonb) to anon, authenticated;
