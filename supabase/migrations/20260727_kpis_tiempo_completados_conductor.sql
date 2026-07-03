-- Tiempo promedio: solo tickets COMPLETADOS con conductor asignado.
-- Incluye fallbacks de timestamp (historial ampliado, match, traslados legacy).

create or replace function public.kpis_logistica()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with asignacion as (
    select
      t.id,
      t.created_at as inicio,
      coalesce(
        (
          select min(th.created_at)
          from public.ticket_historial th
          where th.ticket_id = t.id
            and (
              th.accion in (
                'asignado',
                'match_acopio_reclamado',
                'match_acopio_confirmado',
                'reasignado'
              )
              or (
                th.accion = 'estado_cambiado'
                and th.a_valor in ('asignado', 'aceptado')
              )
            )
        ),
        (
          select min(coalesce(m.confirmado_at, m.reclamado_at, m.created_at))
          from public.match_traslados_acopio m
          where m.ticket_id = t.id
            and m.transporte_id is not null
        ),
        (
          select min(n.created_at)
          from public.notificaciones n
          where n.ticket_id = t.id
            and n.destinatario_tipo = 'transportista'
        ),
        (
          select t.updated_at
          from public.traslados tr
          where tr.id = t.id
            and tr.operador is not null
            and trim(coalesce(tr.operador::text, '')) not in ('', 'null')
            and tr.estado in ('asignado', 'en_camino', 'completado', 'solventado_externo')
          limit 1
        )
      ) as asignado_at
    from public.tickets t
    where t.estado = 'completado'
      and t.fuente <> 'ayuda_en_camino'
      and (
        t.fuente = 'traslado'
        or (t.fuente = 'manual' and t.cuando is not null)
        or (
          t.fuente = 'publico'
          and (
            t.fuente_id like 'ash:%'
            or t.descripcion like '[Ash%'
          )
        )
      )
      and (
        t.transporte_id is not null
        or exists (
          select 1
          from public.ticket_historial th
          where th.ticket_id = t.id
            and (
              th.accion in (
                'asignado',
                'match_acopio_reclamado',
                'match_acopio_confirmado',
                'reasignado'
              )
              or (
                th.accion = 'estado_cambiado'
                and th.a_valor in ('asignado', 'aceptado')
              )
            )
        )
        or exists (
          select 1
          from public.match_traslados_acopio m
          where m.ticket_id = t.id
            and m.transporte_id is not null
        )
        or exists (
          select 1
          from public.notificaciones n
          where n.ticket_id = t.id
            and n.destinatario_tipo = 'transportista'
        )
        or exists (
          select 1
          from public.traslados tr
          where tr.id = t.id
            and tr.operador is not null
            and trim(coalesce(tr.operador::text, '')) not in ('', 'null')
        )
      )
  ),
  tiempos_asignacion as (
    select extract(epoch from (asignado_at - inicio)) / 3600.0 as horas
    from asignacion
    where asignado_at is not null
      and asignado_at >= inicio
  ),
  completados as (
    select *
    from public.tickets
    where estado = 'completado'
  )
  select jsonb_build_object(
    'traslados_completados',
      (select count(*)::int from completados),
    'en_ruta_ahora',
      (select count(*)::int from public.tickets
       where estado in ('asignado', 'aceptado', 'en_camino')
         and transporte_id is not null),
    'insumos_movidos',
      (select count(*)::int from completados c
       where c.fuente in ('traslado', 'ayuda_en_camino', 'manual', 'publico')
         or coalesce(c.categoria_final, c.categoria_sugerida, c.categoria_externa, '')
           ~* '(insumo|alimento|medic|ropa|carga|agua|personal_medico|insumo_)'),
    'voluntarios_activos',
      (select count(*)::int from public.transportes where activo = true),
    'zonas_atendidas',
      (select count(distinct z)::int from (
         select nullif(trim(coalesce(destino_ref, ubicacion_externa, origen_ref)), '') as z
         from completados
       ) q where z is not null),
    'tiempo_promedio_horas',
      (select round(avg(horas)::numeric, 1) from tiempos_asignacion),
    'tiempo_promedio_muestras',
      (select count(*)::int from tiempos_asignacion),
    'litros_aportados',
      (select coalesce(sum(litros), 0)::numeric from public.solicitudes_gasolina
       where estado = 'suministrado'),
    'entregas_evidencia_pct',
      (select coalesce(
         round(
           100.0 * count(*) filter (where evidencia_entrega_url is not null and trim(evidencia_entrega_url) <> '')
           / nullif(count(*), 0)
         ),
         0
       )::int
       from completados),
    'actualizado_at', now()
  );
$$;

grant execute on function public.kpis_logistica() to anon, authenticated;
