-- =====================================================================
-- RESCATE VE — Capa de Orquestación Logística (Consola de Despacho)
-- Pégalo completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

create extension if not exists unaccent;

-- 1. Perfiles de usuario vinculados con auth.users
create table if not exists public.perfiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text,
  rol          text not null default 'transportista', -- admin | transportista | medico
  organizacion text,                                  -- "Nueve Once", "Tu Gruero", "Tilín", "SafeCare", "Voluntario"
  telefono     text,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.perfiles enable row level security;

-- Helper: rol del usuario actual (evita recursión en políticas RLS)
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

-- Políticas para perfiles
drop policy if exists "perfil propio lectura" on public.perfiles;
create policy "perfil propio lectura" on public.perfiles
  for select using (id = auth.uid() or public.mi_rol() = 'admin');

drop policy if exists "perfil propio update" on public.perfiles;
create policy "perfil propio update" on public.perfiles
  for update using (id = auth.uid() or public.mi_rol() = 'admin');

drop policy if exists "admin gestiona perfiles" on public.perfiles;
create policy "admin gestiona perfiles" on public.perfiles
  for all using (public.mi_rol() = 'admin') with check (public.mi_rol() = 'admin');


-- 2. Departamentos, transportes, personal médico y acopio

-- Departamentos = buckets de ruteo
create table if not exists public.departamentos (
  id           uuid primary key default gen_random_uuid(),
  clave        text unique not null, -- acopio | transporte_carga | emergencia_medica | grua | tecnico | rescate_estructural | personal_medico
  nombre       text not null,
  canal_intake text not null default 'in_app', -- in_app | whatsapp | llamada
  contacto     text,
  iniciativa   text,
  activo       boolean not null default true
);

-- Proveedores de transporte (con login, rol transportista)
create table if not exists public.transportes (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid references public.perfiles(id) on delete set null,
  nombre     text not null,          -- "Nueve Once", "Tu Gruero", "Tilín", "Voluntario X"
  tipo       text not null,          -- ambulancia | pasajeros | carga | grua | tecnico
  zona       text,
  contacto   text,
  en_standby boolean not null default true,
  activo     boolean not null default true
);

-- Roster médico verificado
create table if not exists public.personal_medico (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid references public.perfiles(id) on delete set null,
  nombre      text not null,
  especialidad text,
  zona        text,
  contacto    text,
  verificado  boolean not null default false, -- SafeCare
  disponible  boolean not null default true,
  activo      boolean not null default true
);

-- Centros de acopio + inventario
create table if not exists public.centros_acopio (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  direccion text,
  latitud   double precision,
  longitud  double precision,
  contacto  text,
  fuente    text,
  activo    boolean not null default true
);

create table if not exists public.inventario_acopio (
  id             uuid primary key default gen_random_uuid(),
  centro_id      uuid references public.centros_acopio(id) on delete cascade,
  item           text not null,
  cantidad       numeric,
  unidad         text,
  actualizado_at timestamptz not null default now()
);


-- 3. Reglas de clasificación (editables por el admin)
create table if not exists public.reglas_clasificacion (
  id            uuid primary key default gen_random_uuid(),
  palabras_clave text[] not null,
  categoria     text not null,      -- insumo_medico | insumo_basico | emergencia_medica | rescate | grua | tecnico | traslado_personal
  departamentos text[] not null,    -- claves de departamentos a activar
  prioridad     text not null default 'media',
  es_emergencia boolean not null default false,
  activa        boolean not null default true,
  notas         text
);

-- Seed inicial de reglas de clasificación
truncate table public.reglas_clasificacion;
insert into public.reglas_clasificacion (palabras_clave, categoria, departamentos, prioridad, es_emergencia) values
 (array['acetaminofen','paracetamol','tylenol','insulina','antibiotico','gasas','suero','medicina','medicamento','inhalador','jeringa'], 'insumo_medico', array['acopio','transporte_carga'], 'media', false),
 (array['agua','alimento','comida','panal','formula','manta','cobija','ropa','higiene'], 'insumo_basico', array['acopio','transporte_carga'], 'media', false),
 (array['herido','sangrado','sangra','fractura','inconsciente','convulsion','infarto','parto','quemadura','no respira','dificultad para respirar','emergencia'], 'emergencia_medica', array['emergencia_medica','personal_medico'], 'alta', true),
 (array['atrapado','escombros','derrumbe','colapso','soterrado','edificio caido','tapiado'], 'rescate', array['rescate_estructural'], 'alta', true),
 (array['grua','vehiculo varado','remolque','maquinaria','escombros pesados'], 'grua', array['grua'], 'media', false),
 (array['fuga','gas','electricidad','plomeria','tecnico','reparacion'], 'tecnico', array['tecnico'], 'media', false),
 (array['trasladar medico','llevar especialista','mover personal'], 'traslado_personal', array['transporte_carga'], 'media', false);


-- 4. Tickets (objeto central) + auditoría + notificaciones
create table if not exists public.tickets (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  fuente                  text not null default 'manual',  -- ayuda_en_camino | manual | publico
  fuente_id               text,                             -- id externo para dedup
  descripcion             text not null,                    -- texto crudo de la necesidad
  categoria_sugerida      text,
  departamentos_sugeridos text[],
  categoria_final         text,
  departamentos_final     text[],
  requiere_revision       boolean not null default true,
  prioridad               text not null default 'media',    -- alta | media | baja
  origen_ref              text, 
  origen_lat              double precision, 
  origen_lng              double precision,
  destino_ref             text, 
  destino_lat             double precision, 
  destino_lng             double precision,
  cantidad                text,
  contacto_solicitante    text,
  centro_acopio_id        uuid references public.centros_acopio(id),
  transporte_id           uuid references public.transportes(id),
  medico_id               uuid references public.personal_medico(id),
  estado                  text not null default 'en_validacion', -- en_validacion | aprobado | asignado | aceptado | en_camino | completado | rechazado
  validado_por            uuid references public.perfiles(id),
  validado_at             timestamptz,
  notas_admin             text
);

create index if not exists idx_tickets_estado on public.tickets(estado);
create index if not exists idx_tickets_created on public.tickets(created_at desc);
create unique index if not exists uq_tickets_fuente on public.tickets(fuente, fuente_id) where fuente_id is not null;

-- Tabla de historial / auditoría
create table if not exists public.ticket_historial (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid references public.tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor      uuid references public.perfiles(id),
  accion     text not null,   -- clasificado_auto | reclasificado | dividido | reasignado | aprobado | asignado | aceptado | rechazado | estado_cambiado
  de_valor   text,
  a_valor    text,
  nota       text
);

-- Tabla de notificaciones salientes
create table if not exists public.notificaciones (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid references public.tickets(id) on delete cascade,
  created_at      timestamptz not null default now(),
  destinatario_tipo text not null,   -- transportista | medico | departamento
  destinatario_id   uuid,            -- perfil_id o transporte_id/medico_id
  canal           text not null default 'in_app', -- in_app | whatsapp | llamada
  mensaje         text,
  estado          text not null default 'pendiente' -- pendiente | enviada | leida
);


-- 5. Motor de clasificación por palabras clave
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
      v_deps := v_deps || 'emergencia_medica';
    end if;
  end if;

  return jsonb_build_object(
    'categoria', case when array_length(v_cats,1)=1 then v_cats[1]
                      when coalesce(array_length(v_cats,1),0)>1 then 'multiple' else null end,
    'departamentos', v_deps, 'prioridad', v_prioridad,
    'requiere_revision', v_revision);
end $$;

-- Trigger before insert
create or replace function public.tg_clasificar_ticket()
returns trigger language plpgsql as $$
declare c jsonb;
begin
  if new.categoria_sugerida is null then
    c := public.clasificar_necesidad(new.descripcion);
    new.categoria_sugerida := c->>'categoria';
    new.departamentos_sugeridos := array(select jsonb_array_elements_text(c->'departamentos'));
    new.prioridad := coalesce(nullif(new.prioridad,''), c->>'prioridad');
    new.requiere_revision := (c->>'requiere_revision')::boolean;
  end if;
  new.estado := 'en_validacion';   -- jamás auto-aprueba
  return new;
end $$;

drop trigger if exists trg_clasificar on public.tickets;
create trigger trg_clasificar before insert on public.tickets
for each row execute function public.tg_clasificar_ticket();


-- 6. Habilitar RLS en tablas operativas
alter table public.tickets             enable row level security;
alter table public.ticket_historial    enable row level security;
alter table public.notificaciones      enable row level security;
alter table public.departamentos       enable row level security;
alter table public.transportes         enable row level security;
alter table public.personal_medico     enable row level security;
alter table public.centros_acopio      enable row level security;
alter table public.inventario_acopio   enable row level security;
alter table public.reglas_clasificacion enable row level security;

-- Políticas de ADMIN: Control total
create policy "admin all tickets"     on public.tickets            for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all hist"        on public.ticket_historial   for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all notif"       on public.notificaciones     for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all deps"        on public.departamentos      for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all transp"      on public.transportes        for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all medico"      on public.personal_medico    for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all acopio"      on public.centros_acopio     for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all inv"         on public.inventario_acopio  for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');
create policy "admin all reglas"      on public.reglas_clasificacion for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');

-- Lecturas públicas o compartidas limitadas para departamento y recursos en standby
create policy "lectura publica acopios" on public.centros_acopio for select using (true);
create policy "lectura publica inventario" on public.inventario_acopio for select using (true);
create policy "lectura publica departamentos" on public.departamentos for select using (true);

-- Políticas de TRANSPORTISTA: Ve solo tickets asignados a SU transporte y aprobados
create policy "transp ve sus tickets" on public.tickets for select using (
  public.mi_rol()='transportista'
  and transporte_id in (select id from public.transportes where perfil_id = auth.uid())
  and estado in ('asignado','aceptado','en_camino','completado')
);

-- Políticas de MEDICO: Ve solo solicitudes asignadas a él y aprobadas
create policy "medico ve sus tickets" on public.tickets for select using (
  public.mi_rol()='medico'
  and medico_id in (select id from public.personal_medico where perfil_id = auth.uid())
  and estado in ('asignado','aceptado','en_camino','completado')
);

-- Fichas propias
create policy "transp ve su ficha" on public.transportes for select using (perfil_id = auth.uid() or public.mi_rol()='admin');
create policy "medico ve su ficha" on public.personal_medico for select using (perfil_id = auth.uid() or public.mi_rol()='admin');


-- 7. RPCs de cambio de estado (campo-nivel seguro, con auditoría)

-- Aprobar ticket (solo admin)
create or replace function public.aprobar_ticket(p_id uuid, p_categoria text, p_departamentos text[])
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  update public.tickets set categoria_final=p_categoria, departamentos_final=p_departamentos,
         estado='aprobado', requiere_revision=false, validado_por=auth.uid(), validado_at=now(), updated_at=now()
   where id=p_id;
  insert into public.ticket_historial(ticket_id,actor,accion,a_valor) values (p_id, auth.uid(),'aprobado', p_categoria);
end $$;

-- Asignar recursos (solo admin)
create or replace function public.asignar_ticket(p_id uuid, p_transporte uuid, p_medico uuid, p_acopio uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  update public.tickets set transporte_id=p_transporte, medico_id=p_medico, centro_acopio_id=p_acopio,
         estado='asignado', updated_at=now() where id=p_id and estado in ('aprobado','asignado');
  insert into public.ticket_historial(ticket_id,actor,accion) values (p_id, auth.uid(),'asignado');
  if p_transporte is not null then
    insert into public.notificaciones(ticket_id,destinatario_tipo,destinatario_id) values (p_id,'transportista', (select perfil_id from public.transportes where id=p_transporte));
  end if;
  if p_medico is not null then
    insert into public.notificaciones(ticket_id,destinatario_tipo,destinatario_id) values (p_id,'medico', (select perfil_id from public.personal_medico where id=p_medico));
  end if;
end $$;

-- Actualizar estado (transportista, médico o admin)
create or replace function public.actualizar_estado_ticket(p_id uuid, p_estado text)
returns void language plpgsql security definer set search_path=public as $$
declare v_ok boolean;
begin
  if p_estado not in ('aceptado','en_camino','completado','rechazado') then raise exception 'estado invalido'; end if;
  select exists(
    select 1 from public.tickets t
    where t.id=p_id and (
      (public.mi_rol()='transportista' and t.transporte_id in (select id from public.transportes where perfil_id=auth.uid()))
      or (public.mi_rol()='medico' and t.medico_id in (select id from public.personal_medico where perfil_id=auth.uid()))
      or public.mi_rol()='admin')
  ) into v_ok;
  if not v_ok then raise exception 'no autorizado'; end if;
  
  if p_estado = 'rechazado' then
    update public.tickets set estado = 'aprobado',
           transporte_id = null,
           medico_id = null,
           updated_at=now() where id=p_id;
  else
    update public.tickets set estado = p_estado,
           updated_at=now() where id=p_id;
  end if;
  
  insert into public.ticket_historial(ticket_id,actor,accion,a_valor) values (p_id, auth.uid(),'estado_cambiado', p_estado);
end $$;

grant execute on function public.aprobar_ticket(uuid,text,text[]) to authenticated;
grant execute on function public.asignar_ticket(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.actualizar_estado_ticket(uuid,text) to authenticated;


-- 8. Realtime
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.notificaciones;


-- 9. Trigger automático para inicializar perfiles cuando se crea un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, rol, activo)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), 
    coalesce(new.raw_user_meta_data->>'rol', 'transportista'), 
    true
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
