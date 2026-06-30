-- =====================================================================
-- RESCATE VE — Donantes personas naturales
-- Registro con cuenta, donaciones de insumos y necesidades de la comunidad
-- =====================================================================

-- Ficha del donante (vinculada a auth + perfiles)
create table if not exists public.donantes (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null unique references public.perfiles(id) on delete cascade,
  nombre       text not null,
  apellido     text not null,
  cedula       text not null unique,
  telefono     text not null,
  email_login  text not null unique,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_donantes_cedula_norm
  on public.donantes (upper(replace(replace(trim(cedula), '-', ''), ' ', '')));

-- Insumos que ofrece cada donante
create table if not exists public.donaciones_insumos (
  id           uuid primary key default gen_random_uuid(),
  donante_id   uuid not null references public.donantes(id) on delete cascade,
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  descripcion  text not null,
  categoria    text,
  cantidad     text,
  unidad       text not null default 'unidades',
  estado       text not null default 'disponible'
    check (estado in ('disponible', 'reservado', 'entregado', 'cancelado')),
  notas        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_donaciones_insumos_estado
  on public.donaciones_insumos (estado, created_at desc);

-- Necesidades actuales de la comunidad (visible para donantes)
create table if not exists public.necesidades_comunidad (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  prioridad    text not null default 'alta'
    check (prioridad in ('alta', 'media', 'baja')),
  activo       boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

insert into public.necesidades_comunidad (nombre, descripcion, prioridad, orden)
select v.nombre, v.descripcion, v.prioridad, v.orden
from (values
  ('Colchones', 'Camas y colchones para familias desplazadas', 'alta', 1),
  ('Colchonetas', 'Colchonetas y espuma para refugios temporales', 'alta', 2),
  ('Productos de Higiene', 'Jabón, shampoo, pasta dental, toallas sanitarias', 'alta', 3)
) as v(nombre, descripcion, prioridad, orden)
where not exists (
  select 1 from public.necesidades_comunidad n where n.nombre = v.nombre
);

-- Trigger: asignar donante_id y perfil_id al insertar donación
create or replace function public.trg_donaciones_insumos_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donante_id uuid;
begin
  select id into v_donante_id
  from public.donantes
  where perfil_id = auth.uid();

  if v_donante_id is null then
    raise exception 'No tienes ficha de donante activa';
  end if;

  new.donante_id := v_donante_id;
  new.perfil_id := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists donaciones_insumos_defaults on public.donaciones_insumos;
create trigger donaciones_insumos_defaults
  before insert on public.donaciones_insumos
  for each row execute function public.trg_donaciones_insumos_defaults();

create or replace function public.trg_donaciones_insumos_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists donaciones_insumos_updated on public.donaciones_insumos;
create trigger donaciones_insumos_updated
  before update on public.donaciones_insumos
  for each row execute function public.trg_donaciones_insumos_updated();

-- RLS
alter table public.donantes enable row level security;
alter table public.donaciones_insumos enable row level security;
alter table public.necesidades_comunidad enable row level security;

drop policy if exists donantes_admin_all on public.donantes;
create policy donantes_admin_all on public.donantes
  for all using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

drop policy if exists donantes_self_select on public.donantes;
create policy donantes_self_select on public.donantes
  for select using (perfil_id = auth.uid());

drop policy if exists donaciones_admin_all on public.donaciones_insumos;
create policy donaciones_admin_all on public.donaciones_insumos
  for all using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

drop policy if exists donaciones_self_crud on public.donaciones_insumos;
create policy donaciones_self_crud on public.donaciones_insumos
  for all using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

drop policy if exists donaciones_donante_read_comunidad on public.donaciones_insumos;
create policy donaciones_donante_read_comunidad on public.donaciones_insumos
  for select using (
    public.mi_rol() = 'donante'
    and estado in ('disponible', 'reservado')
  );

drop policy if exists necesidades_read on public.necesidades_comunidad;
create policy necesidades_read on public.necesidades_comunidad
  for select using (activo = true);

drop policy if exists necesidades_admin on public.necesidades_comunidad;
create policy necesidades_admin on public.necesidades_comunidad
  for all using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

-- Login con cédula (resuelve correo ficticio)
create or replace function public.obtener_email_donante_por_cedula(p_cedula text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email_login
  from public.donantes
  where upper(replace(replace(trim(cedula), '-', ''), ' ', ''))
      = upper(replace(replace(trim(p_cedula), '-', ''), ' ', ''))
  limit 1;
$$;

grant execute on function public.obtener_email_donante_por_cedula(text) to anon, authenticated;

-- Listado anónimo de donaciones de la comunidad
create or replace function public.list_donaciones_comunidad()
returns table (
  id uuid,
  descripcion text,
  categoria text,
  cantidad text,
  unidad text,
  estado text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.descripcion,
    d.categoria,
    d.cantidad,
    d.unidad,
    d.estado,
    d.created_at
  from public.donaciones_insumos d
  where d.estado in ('disponible', 'reservado')
  order by d.created_at desc;
$$;

grant execute on function public.list_donaciones_comunidad() to authenticated;

-- Necesidades para donantes autenticados
create or replace function public.list_necesidades_comunidad()
returns setof public.necesidades_comunidad
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.necesidades_comunidad
  where activo = true
  order by orden asc, nombre asc;
$$;

grant execute on function public.list_necesidades_comunidad() to authenticated;
