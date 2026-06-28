-- =====================================================================
-- RESCATE VE — Corregir error de tipo de datos en Motor de Clasificación
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

create or replace function public.clasificar_necesidad(p_texto text)
returns jsonb language plpgsql stable as $$
declare
  v_norm text; v_cats text[] := '{}'; v_deps text[] := '{}';
  v_emergencia boolean := false; v_revision boolean := false;
  v_prioridad text := 'media'; r record;
begin
  v_norm := lower(unaccent(coalesce(p_texto,'')));
  for r in select * from public.reglas_clasificacion where activa loop
    if exists (select 1 from unnest(r.palabras_clave) k
               where v_norm like '%' || lower(unaccent(k)) || '%') then
      v_cats := array(select distinct unnest(v_cats || r.categoria));
      v_deps := array(select distinct unnest(v_deps || r.departamentos));
      if r.es_emergencia then v_emergencia := true; end if;
    end if;
  end loop;

  if array_length(v_cats,1) is null then v_revision := true;        -- sin match
  elsif array_length(v_cats,1) > 1 then v_revision := true; end if; -- ambiguo

  if v_emergencia or v_revision then          -- bias a escalar
    v_prioridad := 'alta';
    if v_emergencia and not ('emergencia_medica' = any(v_deps)) then
      -- Se usa array['emergencia_medica'] para evitar ambigüedad de tipos en Postgres (22P02)
      v_deps := v_deps || array['emergencia_medica'];
    end if;
  end if;

  return jsonb_build_object(
    'categoria', case when array_length(v_cats,1)=1 then v_cats[1]
                      when coalesce(array_length(v_cats,1),0)>1 then 'multiple' else null end,
    'departamentos', v_deps, 'prioridad', v_prioridad,
    'requiere_revision', v_revision);
end $$;
