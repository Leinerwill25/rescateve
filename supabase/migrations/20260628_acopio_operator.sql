-- =====================================================================
-- RESCATE VE — Rol de Acopio y Control de Movimientos de Inventario
-- Pégalo en: Supabase > SQL Editor > Run
-- =====================================================================

-- 1. Agregar columna perfil_id a centros_acopio para vincular un usuario a un acopio
alter table public.centros_acopio 
  add column if not exists perfil_id uuid references public.perfiles(id) on delete set null;

-- 2. Tabla de movimientos de inventario (auditoría e histórico detallado)
create table if not exists public.inventario_movimientos (
  id                    uuid primary key default gen_random_uuid(),
  centro_id             uuid references public.centros_acopio(id) on delete cascade,
  item                  text not null,
  cantidad              numeric not null, -- positivo para entradas, negativo para salidas
  tipo_movimiento       text not null check (tipo_movimiento in ('entrada', 'salida')),
  destinatario_nombre   text,
  destinatario_apellido text,
  destino_ref           text,
  retirado_por          text,             -- Nombre del transportista o persona que retira
  created_at            timestamptz not null default now(),
  creado_por            uuid references public.perfiles(id) on delete set null
);

-- 3. Habilitar RLS en inventario_movimientos
alter table public.inventario_movimientos enable row level security;

-- 4. Trigger para actualizar automáticamente las cantidades en public.inventario_acopio
create or replace function public.tg_actualizar_inventario_por_movimiento()
returns trigger language plpgsql as $$
declare
  v_item_existente_id uuid;
  v_cantidad_actual numeric;
  v_cantidad_operacion numeric;
begin
  -- Normalizar item a minúsculas para evitar duplicados por tipeo
  select id, cantidad into v_item_existente_id, v_cantidad_actual 
    from public.inventario_acopio 
   where centro_id = new.centro_id 
     and lower(trim(item)) = lower(trim(new.item));

  -- Determinar el signo de la cantidad para el inventario
  if new.tipo_movimiento = 'entrada' then
    v_cantidad_operacion := abs(new.cantidad);
  else
    v_cantidad_operacion := -abs(new.cantidad);
  end if;

  if v_item_existente_id is not null then
    -- Validar que no quede cantidad negativa
    if (v_cantidad_actual + v_cantidad_operacion) < 0 then
      raise exception 'Inventario insuficiente. No se puede retirar % de %. Stock actual: %', 
        abs(new.cantidad), new.item, v_cantidad_actual;
    end if;

    update public.inventario_acopio 
       set cantidad = cantidad + v_cantidad_operacion,
           actualizado_at = now()
     where id = v_item_existente_id;
  else
    -- Si es salida y no existe, dar error
    if new.tipo_movimiento = 'salida' then
      raise exception 'No se puede registrar salida de un insumo (%) que no existe en el inventario', new.item;
    end if;

    -- Si es entrada y no existe, insertarlo
    insert into public.inventario_acopio (centro_id, item, cantidad, unidad)
    values (new.centro_id, trim(new.item), v_cantidad_operacion, 'Unidades');
  end if;

  return new;
end $$;

drop trigger if exists trg_actualizar_inventario on public.inventario_movimientos;
create trigger trg_actualizar_inventario 
after insert on public.inventario_movimientos
for each row execute function public.tg_actualizar_inventario_por_movimiento();

-- 5. RLS y políticas seguras para el rol 'acopio'

-- Permisos de lectura pública o privada para el centro
drop policy if exists "admin all movimientos" on public.inventario_movimientos;
create policy "admin all movimientos" on public.inventario_movimientos 
  for all using (public.mi_rol()='admin') with check (public.mi_rol()='admin');

drop policy if exists "acopio gestiona sus movimientos" on public.inventario_movimientos;
create policy "acopio gestiona sus movimientos" on public.inventario_movimientos
  for all using (
    public.mi_rol() = 'acopio' 
    and centro_id in (select id from public.centros_acopio where perfil_id = auth.uid())
  )
  with check (
    public.mi_rol() = 'acopio' 
    and centro_id in (select id from public.centros_acopio where perfil_id = auth.uid())
  );

-- Actualizar permisos de inventario para que el rol 'acopio' pueda modificar su stock
drop policy if exists "acopio gestiona su inventario" on public.inventario_acopio;
create policy "acopio gestiona su inventario" on public.inventario_acopio
  for all using (
    public.mi_rol() = 'acopio' 
    and centro_id in (select id from public.centros_acopio where perfil_id = auth.uid())
  )
  with check (
    public.mi_rol() = 'acopio' 
    and centro_id in (select id from public.centros_acopio where perfil_id = auth.uid())
  );

-- El encargado de acopio puede ver su propia ficha de acopio
drop policy if exists "acopio ve su ficha" on public.centros_acopio;
create policy "acopio ve su ficha" on public.centros_acopio
  for select using (perfil_id = auth.uid() or public.mi_rol() = 'admin');

-- El admin puede asignar perfil_id en centros_acopio (cubierto por admin all acopio)
