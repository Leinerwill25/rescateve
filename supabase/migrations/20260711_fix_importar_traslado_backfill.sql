-- Hotfix: cast record → traslados en el backfill de reparación
-- Ejecutar si 60710 falló con: cannot cast type record to traslados

do $$
declare
  r public.traslados;
  v_count int := 0;
begin
  for r in
    select t.*
    from public.traslados t
    where t.estado in ('solicitado', 'asignado', 'en_camino')
    order by t.created_at desc
  loop
    perform public.importar_traslado_a_ticket(r);
    v_count := v_count + 1;
  end loop;
  raise notice 'Traslados reparados/sincronizados en tickets: %', v_count;
end;
$$;
