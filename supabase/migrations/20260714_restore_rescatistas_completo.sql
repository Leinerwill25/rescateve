-- Restaurar COMPLETO el traslado + ticket de 40 rescatistas (ROTARAC)
-- Usar cuando 60713 no hace nada: el traslado ya no existe en public.traslados
--
-- ID fijo: 0e9ed93b-528d-4603-ae41-10cd22da3061

-- ── 1. Restaurar fila en traslados (upsert) ──
insert into public.traslados (
  id,
  created_at,
  tipo,
  descripcion,
  cantidad,
  origen_ref,
  origen_lat,
  origen_lng,
  destino_ref,
  destino_lat,
  destino_lng,
  prioridad,
  contacto,
  cuando,
  estado,
  operador,
  reporter_token
) values (
  '0e9ed93b-528d-4603-ae41-10cd22da3061',
  '2026-06-26T02:20:40.276187+00:00',
  'personal_medico',
  '40 rescatistas y 8 perros rastreadores (personal nacional y extranjero). Adicionalmente insumos medicos y material de rescate',
  '40+8',
  'Casa de muro blanco con banderines de ROTARAC enfrente',
  10.445829,
  -66.870695,
  'Zona de desastres, punto de llegada a determinar una vez en el sitio',
  10.600038,
  -66.929641,
  'alta',
  '04241782827 - 04244687763',
  '26/06/2026 2:00pm',
  'solicitado',
  null,
  '1c52314f-3ce0-42bc-b609-7233d7708ce1'
)
on conflict (id) do update set
  tipo = excluded.tipo,
  descripcion = excluded.descripcion,
  cantidad = excluded.cantidad,
  origen_ref = excluded.origen_ref,
  origen_lat = excluded.origen_lat,
  origen_lng = excluded.origen_lng,
  destino_ref = excluded.destino_ref,
  destino_lat = excluded.destino_lat,
  destino_lng = excluded.destino_lng,
  prioridad = excluded.prioridad,
  contacto = excluded.contacto,
  cuando = excluded.cuando,
  estado = 'solicitado',
  reporter_token = coalesce(public.traslados.reporter_token, excluded.reporter_token);

-- ── 2. Restaurar ticket en cola (valores fijos, no depende del SELECT) ──
insert into public.tickets (
  id,
  fuente,
  fuente_id,
  descripcion,
  categoria_sugerida,
  categoria_final,
  departamentos_sugeridos,
  departamentos_final,
  contacto_solicitante,
  origen_ref,
  origen_lat,
  origen_lng,
  destino_ref,
  destino_lat,
  destino_lng,
  cantidad,
  cuando,
  prioridad,
  estado,
  requiere_revision
) values (
  '0e9ed93b-528d-4603-ae41-10cd22da3061',
  'traslado',
  '0e9ed93b-528d-4603-ae41-10cd22da3061',
  '[Traslado: Personal + Insumos] 40 rescatistas y 8 perros rastreadores (personal nacional y extranjero). Adicionalmente insumos medicos y material de rescate',
  'multiple',
  'multiple',
  array['acopio', 'transporte_carga', 'personal_medico']::text[],
  array['acopio', 'transporte_carga', 'personal_medico']::text[],
  '04241782827 - 04244687763',
  'Casa de muro blanco con banderines de ROTARAC enfrente',
  10.445829,
  -66.870695,
  'Zona de desastres, punto de llegada a determinar una vez en el sitio',
  10.600038,
  -66.929641,
  '40+8',
  '26/06/2026 2:00pm',
  'alta',
  'en_validacion',
  true
)
on conflict (id) do update set
  fuente = excluded.fuente,
  fuente_id = excluded.fuente_id,
  descripcion = excluded.descripcion,
  categoria_sugerida = excluded.categoria_sugerida,
  categoria_final = excluded.categoria_final,
  departamentos_sugeridos = excluded.departamentos_sugeridos,
  departamentos_final = excluded.departamentos_final,
  contacto_solicitante = excluded.contacto_solicitante,
  origen_ref = excluded.origen_ref,
  origen_lat = excluded.origen_lat,
  origen_lng = excluded.origen_lng,
  destino_ref = excluded.destino_ref,
  destino_lat = excluded.destino_lat,
  destino_lng = excluded.destino_lng,
  cantidad = excluded.cantidad,
  cuando = excluded.cuando,
  prioridad = excluded.prioridad,
  requiere_revision = true,
  estado = 'en_validacion',
  updated_at = now();

-- ── 3. Verificación: deben aparecer LOS DOS traslados activos ──
select
  t.id,
  t.estado as traslado_estado,
  t.contacto,
  left(t.descripcion, 55) as traslado_desc,
  tk.estado as ticket_estado,
  case
    when tk.id is null then 'SIN TICKET'
    when tk.estado = 'en_validacion' then 'EN COLA'
    else 'ticket: ' || tk.estado
  end as status
from public.traslados t
left join public.tickets tk on tk.id = t.id
where t.id in (
  '0e9ed93b-528d-4603-ae41-10cd22da3061',
  'cb1e7f97-f717-4b19-ad2c-b80179673b06'
)
order by t.created_at desc;
