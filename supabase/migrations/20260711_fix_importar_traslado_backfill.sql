-- Hotfix: cast record → traslados en el backfill de reparación
-- NOTA: Si no ves cambios, usa 20260712_force_restore_traslados_tickets.sql
-- Ejecutar si 60710 falló con: cannot cast type record to traslados

do $$
declare
  r public.traslados;
  v_count int := 0;
  v_id uuid;
begin
  for r in
    select t.*
    from public.traslados t
    where t.estado in ('solicitado', 'asignado', 'en_camino')
    order by t.created_at desc
  loop
    v_id := public.importar_traslado_a_ticket(r);
    if v_id is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  raise notice 'Traslados reparados/sincronizados en tickets: %', v_count;
end;
$$;
