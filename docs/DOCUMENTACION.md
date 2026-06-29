# DOCUMENTACIÓN MAESTRA DE DESARROLLO — RESCATE VE

Este documento contiene la arquitectura de software, estructura del código, flujos de datos, integraciones de API, automatizaciones y guías técnicas de la plataforma **Rescate VE**. Su objetivo es servir como punto de partida para que cualquier equipo de desarrollo entienda, mantenga y expanda el sistema.

---

## 1. Stack Tecnológico

La plataforma está construida utilizando un stack moderno, seguro y optimizado para la web:

* **Framework Principal:** [Next.js 15](https://nextjs.org/) (App Router, con TypeScript).
* **Base de Datos y Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL con Row Level Security y WebSockets para tiempo real).
* **Estilizado (CSS):** CSS Vanilla estructurado con variables personalizadas (CSS custom properties) para temas claros y oscuros, layouts flexibles y diseño premium responsivo.
* **Componentes de Mapas:** [Leaflet.js](https://leafletjs.org/) (renderizado únicamente en el cliente a través de cargas dinámicas).
* **Iconografía:** [Lucide React](https://lucide.dev/).
* **SDK de IA integrada:** `@google/generative-ai` utilizando el modelo `gemini-1.5-flash` para pre-clasificación automática de incidentes.

---

## 2. Estructura de Directorios del Código

```bash
rescate-ve/
├── app/                              # Rutas y páginas de la aplicación (Next.js App Router)
│   ├── api/                          # Endpoints del Backend (Serverless Routes)
│   │   ├── combustible/pagar/        # API de pago en tiempo real con Muney Wallet
│   │   ├── hospitales/buscar/        # API de geobúsqueda de hospitales
│   │   └── usuarios/crear/           # API segura de creación de usuarios (Admin Auth)
│   ├── login/                        # Pantalla de acceso y autenticación
│   ├── operaciones/                  # Módulos del Panel Interno de Operaciones
│   │   ├── cola/                     # Cola de Validación de Incidentes
│   │   ├── despacho/                 # Tablero de Control y Despacho Logístico
│   │   ├── mi-acopio/                # Panel de Control para Operadores de Acopio
│   │   ├── mis-solicitudes/          # Tickets asignados al médico actual
│   │   ├── mis-viajes/               # Viajes asignados al transportista actual
│   │   ├── recursos/                 # ABM de Fichas (Médicos, Grúas, Acopios)
│   │   └── reglas/                   # Configuración del Motor de Clasificación de IA
│   ├── layout.tsx                    # Layout raíz global
│   └── page.tsx                      # Landing pública (Mapa e Inicio de solicitudes)
├── components/                       # Componentes React reutilizables e interactivos
│   ├── LocationPicker.tsx            # Selector de coordenadas geográficas en mapa
│   ├── MapView.tsx                   # Visor de mapa interactivo (Leaflet)
│   ├── TrasladosView.tsx             # Panel de gestión de traslados y combustible
│   └── ...                           # Modales de auditoría y reportes
├── lib/                              # Utilidades, clientes e interfaces compartidas
│   ├── supabase.ts                   # Cliente público de Supabase JS
│   ├── types.ts                      # Tipos TS públicos
│   └── types-operations.ts           # Tipos TS del panel administrativo interno
├── supabase/                         # Scripts de base de datos e historiales de migraciones
│   └── migrations/                   # Archivos SQL de estructura y políticas de seguridad
├── .env.local                        # Configuración de variables de entorno locales
└── package.json                      # Scripts de compilación y dependencias
```

---

## 3. Arquitectura de Datos y Base de Datos (Supabase)

El motor de base de datos es PostgreSQL provisto por Supabase. Se compone de las siguientes tablas centrales:

### Tablas Principales

1. **`public.perfiles`:** Perfiles extendidos de usuarios.
   * *Campos:* `id` (UUID, llave primaria vinculada a `auth.users`), `nombre`, `rol` (`'admin' | 'transportista' | 'medico' | 'acopio'`), `organizacion`, `telefono`, `activo`.
2. **`public.tickets`:** Incidentes reportados en la plataforma.
   * *Campos:* `id`, `descripcion`, `categoria_final`, `departamentos_final` (array de departamentos a alertar), `prioridad` (`'alta' | 'media' | 'baja'`), `estado` (`'en_validacion' | 'aprobado' | 'asignado' | 'aceptado' | 'en_camino' | 'completado'`), `centro_acopio_id`, `transporte_id`, `medico_id`.
3. **`public.centros_acopio`:** Fichas de almacenes y acopios.
   * *Campos:* `id`, `nombre`, `direccion`, `latitud`, `longitud`, `contacto`, `perfil_id` (vínculo al operador que gestiona el almacén).
4. **`public.inventario_acopio`:** Stock de insumos médicos/básicos por almacén.
5. **`public.inventario_movimientos`:** Historial de entradas y salidas de stock (con auditoría de firmas de retiro).
6. **`public.traslados`:** Solicitudes y rutas logísticas activas.
   * *Campos:* `id`, `tipo` (`'insumos' | 'personal_medico' | 'otro'`), `origen_ref`, `destino_ref`, `estado` (`'solicitado' | 'asignado' | 'en_camino' | 'completado' | 'solventado_externo'`), `operador` (JSON string con datos del chofer/vehículo).
7. **`public.solicitudes_gasolina`:** Historial de recargas de combustible y auditoría de Pago Móvil.

### Automatizaciones y Triggers (PL/pgSQL)

Para evitar la desincronización de datos, la lógica de negocio reactiva corre en base de datos:

* **Sincronización Bidireccional (`20260628_sync_tickets_and_traslados.sql`):**
  1. **`trg_create_ticket_from_traslado`:** Al insertar un traslado público, crea automáticamente un ticket en `public.tickets` para su validación administrativa.
  2. **`trg_sync_ticket_to_traslado`:** Cuando el administrador asigna un transportista o cambia el estado de un ticket aprobado en el tablero de despacho, actualiza el estado del traslado público y copia los datos del transportista (`placa`, `teléfono`, etc.) en el campo `operador`.
  3. **`trg_sync_traslado_to_ticket`:** Si el traslado se marca como `solventado_externo` en la página principal, el ticket asociado cambia a `completado` automáticamente.
* **Auto-Creación de Perfiles (`on_auth_user_created`):** Registra el perfil correspondiente en `public.perfiles` inmediatamente después de que un usuario se da de alta en la autenticación de Supabase.

---

## 4. Seguridad y Row Level Security (RLS)

Todas las tablas cuentan con RLS activado para evitar fugas de información o escrituras maliciosas desde clientes no autorizados:

* **Políticas de Lectura en Perfiles (`20260628_fix_perfiles_rls.sql`):** Los perfiles públicos son de lectura abierta (`using (true)`) debido a la necesidad de mostrar nombres y contactos de médicos y choferes en traslados y tickets en tiempo real.
* **Políticas de Escritura:** Solo usuarios con rol `'admin'` en `public.perfiles` pueden insertar o modificar fichas de recursos globales y reglas de clasificación.
* **Políticas de Inventarios:** Los operadores de acopio (`rol = 'acopio'`) solo pueden ver y realizar movimientos sobre el almacén que tengan vinculado bajo su `perfil_id`.

---

## 5. APIs y Rutas de Servidor (Next.js Edge & Node API)

Las funcionalidades críticas que requieren credenciales o alta seguridad se procesan en rutas de backend (`/app/api`):

### 1. Pago de Combustible (`/api/combustible/pagar`)
* **Propósito:** Realizar transferencias inmediatas de Pago Móvil venezolano en base al equivalente de litros autorizados utilizando la API de **Muney Wallet (USDT/USD a VES)**.
* **Flujo de Muney:**
  1. **Quote (`POST /orders/quote/`):** Cotiza la conversión del monto ingresado.
  2. **Order (`POST /orders/`):** Registra la orden de débito en la billetera.
  3. **Confirm (`POST /orders/{orderId}/confirm`):** Aprueba y procesa la transacción de débito.
  4. **Payout (`PUT /orders/v2/transactions/quote/mobile/info/{quoteId}`):** Ejecuta la transferencia de Pago Móvil en tiempo real al destinatario usando banco, cédula y teléfono provistos.

### 2. Creación Administrativa de Usuarios (`/api/usuarios/crear`)
* **Propósito:** Permite a los administradores registrar operadores de acopio con correo y contraseña desde el formulario principal sin cerrar su sesión activa.
* **Seguridad:** Utiliza el SDK administrativo de Supabase (`supabaseAdmin.auth.admin.createUser`) a través de la variable de entorno protegida `SUPABASE_SERVICE_ROLE_KEY`.

---

## 6. Lógica y Validaciones de Negocio Críticas

### Límites de Combustible por Cédula y Vehículo
Las recargas de combustible solicitadas dentro de los traslados están estrictamente validadas para evitar fraudes:
* **Límites Máximos:** Moto: **40 Litros** | Carro: **60 Litros** | Autobús: **120 Litros**.
* **Cálculo Acumulado:** Antes de procesar un pago, el sistema realiza una consulta agregada a `solicitudes_gasolina` sumando los litros aprobados a esa misma **Cédula** de conductor.
* **Excedentes:** Si la solicitud actual supera el límite máximo permitido acumulado, la transacción se pausa y el estado cambia a **`pendiente_autorizacion`**, requiriendo aprobación manual del administrador.

### Bucle de Redirección y Sanado de Sesiones
* **Problema Común:** Usuarios autenticados con cuentas antiguas o incompletas no tenían fila correspondiente en `public.perfiles`, lo que congelaba la aplicación en un bucle infinito entre la redirección de login y la pantalla de acceso denegado.
* **Resolución:**
  1. El botón **"Ir a Iniciar Sesión"** en la pantalla de error ejecuta un `signOut()` completo de Supabase Auth para limpiar tokens corruptos.
  2. El Layout administrativo ([`app/operaciones/layout.tsx`](file:///c:/Users/Dereck/Desktop/rescate-ve/app/operaciones/layout.tsx)) cuenta con un mecanismo de **Auto-Sanado de Perfiles Huérfanos**. Si detecta una sesión válida pero sin perfil en base de datos, crea el perfil por defecto sobre la marcha (`rol: 'transportista'`).

---

## 7. Variables de Entorno Requeridas (`.env.local`)

El servidor y cliente web requieren la definición de las siguientes variables:

```env
# Conexión Pública de Supabase (Cliente)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica

# API de Muney Wallet (Backend - Stage/Prod)
MUNEY_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clave Secreta de Administración (Backend - Solo lectura del servidor)
SUPABASE_SERVICE_ROLE_KEY=tu-clave-secreta-service-role-aqui
```

---

## 8. Comandos de Operación Básicos

* **Instalación de Dependencias:** `npm install` o `pnpm install`
* **Correr en Entorno de Desarrollo:** `npm run dev`
* **Compilar para Producción:** `npm run build`
* **Iniciar Servidor de Producción:** `npm run start`
