-- ==========================================
-- SCRIPT DE CREACIÓN DE ESQUEMA - RESCATE VE
-- ==========================================

-- Tabla: solicitudes_ayuda
CREATE TABLE IF NOT EXISTS solicitudes_ayuda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo TEXT NOT NULL,
    descripcion TEXT,
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    referencia TEXT,
    personas_afectadas INTEGER,
    prioridad TEXT CHECK (prioridad IN ('alta', 'media', 'baja')) NOT NULL,
    contacto TEXT,
    estado TEXT CHECK (estado IN ('pendiente', 'en_camino', 'atendido')) NOT NULL DEFAULT 'pendiente',
    reportado_por_nombre TEXT,
    reportado_por_contacto TEXT,
    reporter_token TEXT,
    respondido_por TEXT,
    en_camino_at TIMESTAMP WITH TIME ZONE,
    atendido_at TIMESTAMP WITH TIME ZONE,
    personas_rescatadas INTEGER
);

-- Tabla: personas_desaparecidas
CREATE TABLE IF NOT EXISTS personas_desaparecidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre TEXT NOT NULL,
    edad INTEGER,
    descripcion TEXT,
    ultima_ubicacion TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    foto_url TEXT,
    contacto TEXT NOT NULL,
    estado TEXT CHECK (estado IN ('desaparecido', 'encontrado')) NOT NULL DEFAULT 'desaparecido',
    reportado_por_nombre TEXT,
    reporter_token TEXT,
    genero TEXT,
    estatura TEXT,
    contextura TEXT,
    senas_particulares TEXT,
    condicion_medica TEXT,
    encontrado_at TIMESTAMP WITH TIME ZONE,
    encontrado_nota TEXT
);

-- Tabla: desaparecidos_actualizaciones
CREATE TABLE IF NOT EXISTS desaparecidos_actualizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    desaparecido_id UUID NOT NULL REFERENCES personas_desaparecidas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    autor_nombre TEXT,
    autor_contacto TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION
);

-- Tabla: rescatados
CREATE TABLE IF NOT EXISTS rescatados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    solicitud_id UUID REFERENCES solicitudes_ayuda(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    cedula TEXT NOT NULL,
    condicion TEXT CHECK (condicion IN ('ileso', 'herido', 'trasladado', ''))
);

-- Tabla: rescatados_publicos (Normalmente es una vista de "rescatados" sin campos sensibles como cédula, pero si es tabla se crea así)
CREATE TABLE IF NOT EXISTS rescatados_publicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    solicitud_id UUID REFERENCES solicitudes_ayuda(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    apellido TEXT,
    condicion TEXT
);

-- Tabla: avisos
CREATE TABLE IF NOT EXISTS avisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    categoria TEXT NOT NULL,
    titulo TEXT,
    descripcion TEXT,
    contacto TEXT,
    imagen_url TEXT,
    fuente TEXT,
    reporter_token TEXT,
    verificado BOOLEAN DEFAULT FALSE,
    reportes INTEGER DEFAULT 0,
    oculto BOOLEAN DEFAULT FALSE
);

-- Tabla: traslados
CREATE TABLE IF NOT EXISTS traslados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo TEXT NOT NULL,
    descripcion TEXT,
    cantidad TEXT,
    origen_ref TEXT,
    origen_lat DOUBLE PRECISION,
    origen_lng DOUBLE PRECISION,
    destino_ref TEXT,
    destino_lat DOUBLE PRECISION,
    destino_lng DOUBLE PRECISION,
    prioridad TEXT CHECK (prioridad IN ('alta', 'media', 'baja')) NOT NULL,
    contacto TEXT,
    cuando TEXT,
    estado TEXT CHECK (estado IN ('solicitado', 'asignado', 'en_camino', 'completado')) NOT NULL DEFAULT 'solicitado',
    operador TEXT,
    reporter_token TEXT
);

-- Tabla: pacientes_hospitales (Local cache)
CREATE TABLE IF NOT EXISTS pacientes_hospitales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital TEXT NOT NULL,
    nombre TEXT NOT NULL,
    edad INTEGER,
    estado TEXT CHECK (estado IN ('ingresado', 'dado_de_alta', 'trasladado')) NOT NULL,
    actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: solicitudes_gasolina
CREATE TABLE IF NOT EXISTS solicitudes_gasolina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    cedula TEXT NOT NULL,
    placa TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    motivo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    litros NUMERIC NOT NULL,
    estado TEXT CHECK (estado IN ('pendiente', 'suministrado')) NOT NULL DEFAULT 'pendiente'
);
