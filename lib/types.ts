export type Solicitud = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  referencia: string | null;
  personas_afectadas: number | null;
  prioridad: "alta" | "media" | "baja";
  contacto: string | null;
  estado: "pendiente" | "en_camino" | "atendido";
  // v2: quién reporta
  reportado_por_nombre: string | null;
  reportado_por_contacto: string | null;
  reporter_token: string | null;
  // v2: ciclo de atención
  respondido_por: string | null;
  en_camino_at: string | null;
  atendido_at: string | null;
  personas_rescatadas: number | null;
};

export type Desaparecido = {
  id: string;
  created_at: string;
  nombre: string;
  edad: number | null;
  descripcion: string | null;
  ultima_ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  foto_url: string | null;
  contacto: string;
  estado: "desaparecido" | "encontrado";
  // v2: quién reporta
  reportado_por_nombre: string | null;
  reporter_token: string | null;
  // v2: datos adicionales opcionales
  genero: string | null;
  estatura: string | null;
  contextura: string | null;
  senas_particulares: string | null;
  condicion_medica: string | null;
  // v2: cierre
  encontrado_at: string | null;
  encontrado_nota: string | null;
};

/** Novedad/pista sobre un desaparecido */
export type Actualizacion = {
  id: string;
  created_at: string;
  desaparecido_id: string;
  texto: string;
  autor_nombre: string | null;
  autor_contacto: string | null;
  latitud: number | null;
  longitud: number | null;
};

/** Rescatado leído desde rescatados_publicos (sin cédula ni foto) */
export type RescatadoPublico = {
  id: string;
  created_at: string;
  solicitud_id: string;
  nombre: string;
  apellido: string | null;
  condicion: string | null;
};

/** Input para insertar en rescatados (incluye campos sensibles que no se leen públicamente) */
export type RescatadoInput = {
  nombre: string;
  apellido: string;
  cedula: string;
  condicion: "ileso" | "herido" | "trasladado" | "";
};

export const TIPOS: { value: string; label: string; color: string; emoji: string }[] = [
  { value: "rescate",          label: "Rescate (personas atrapadas)",  color: "#dc2626", emoji: "🆘" },
  { value: "paramedico",       label: "Paramédicos / heridos",         color: "#ea580c", emoji: "🚑" },
  { value: "ambulancia",       label: "Ambulancia",                    color: "#e11d48", emoji: "🚨" },
  { value: "proteccion_civil", label: "Protección Civil",              color: "#2563eb", emoji: "🛟" },
  { value: "bomberos",         label: "Bomberos",                      color: "#b91c1c", emoji: "🚒" },
  { value: "agua",             label: "Agua",                          color: "#0891b2", emoji: "💧" },
  { value: "alimentos",        label: "Alimentos",                     color: "#16a34a", emoji: "🍞" },
  { value: "refugio",          label: "Refugio",                       color: "#7c3aed", emoji: "⛺" },
  { value: "otro",             label: "Otro",                          color: "#475569", emoji: "📍" },
];

/** Aviso comunitario */
export type Aviso = {
  id: string;
  created_at: string;
  categoria: string;
  titulo: string | null;
  descripcion: string | null;
  contacto: string | null;
  imagen_url: string | null;
  fuente: string | null;
  reporter_token: string | null;
  verificado: boolean;
  reportes: number;
  oculto: boolean;
};

export const CATEGORIAS_AVISO = [
  { value: "emergencias", label: "Contactos de emergencia", emoji: "🚨", color: "#dc2626" },
  { value: "hospitales",  label: "Hospitales y salud",       emoji: "🏥", color: "#0891b2" },
  { value: "acopio",      label: "Acopio y donaciones",      emoji: "📦", color: "#16a34a" },
  { value: "refugios",    label: "Refugios",                 emoji: "⛺", color: "#7c3aed" },
  { value: "mascotas",    label: "Mascotas",                 emoji: "🐾", color: "#d97706" },
  { value: "familiares",  label: "Reconexión familiar",      emoji: "👨‍👩‍👧", color: "#2563eb" },
  { value: "transporte",  label: "Transporte",               emoji: "🚗", color: "#4f46e5" },
  { value: "otros",       label: "Otros avisos",             emoji: "ℹ️",  color: "#475569" },
];

export const categoriaAvisoInfo = (v: string) =>
  CATEGORIAS_AVISO.find((c) => c.value === v) ?? CATEGORIAS_AVISO[CATEGORIAS_AVISO.length - 1];

export const tipoInfo = (v: string) =>
  TIPOS.find((t) => t.value === v) ?? TIPOS[TIPOS.length - 1];

// ================================================================
// TRASLADOS
// ================================================================
export type Traslado = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
  cantidad: string | null;
  origen_ref: string | null;
  origen_lat: number | null;
  origen_lng: number | null;
  destino_ref: string | null;
  destino_lat: number | null;
  destino_lng: number | null;
  prioridad: "alta" | "media" | "baja";
  contacto: string | null;
  cuando: string | null;
  estado: "solicitado" | "asignado" | "en_camino" | "completado" | "solventado_externo";
  operador: string | null;
  reporter_token: string | null;
};

export const TIPOS_TRASLADO = [
  { value: "persona",         label: "Persona / paciente",      emoji: "🧑🦽" },
  { value: "personal_medico", label: "Personal médico",         emoji: "🩺" },
  { value: "medicamentos",    label: "Medicamentos",            emoji: "💊" },
  { value: "agua",            label: "Agua",                    emoji: "💧" },
  { value: "alimentos",       label: "Alimentos",               emoji: "🍞" },
  { value: "insumos",         label: "Insumos médicos",         emoji: "🧰" },
  { value: "otro",            label: "Otro",                    emoji: "📦" },
];

export const tipoTrasladoInfo = (v: string) =>
  TIPOS_TRASLADO.find((t) => t.value === v) ?? TIPOS_TRASLADO[TIPOS_TRASLADO.length - 1];

// ================================================================
// HOSPITALES
// ================================================================
export type PacientePublico = {
  id: string;
  hospital: string;
  nombre: string;
  edad: number | null;
  estado: "ingresado" | "dado_de_alta" | "trasladado";
  actualizado_at: string;
};

// ================================================================
// EXTERNAL API (yqcwttcbweqicdyfwseb)
// ================================================================
export type CentroAcopio = {
  id: string;
  name: string;
  organization: string | null;
  address: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  schedule: string | null;
  supply_types: string[];
  accepts_volunteers: boolean;
  notes: string | null;
};

export type PuntoAyuda = {
  id: string;
  name: string;
  address: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  needs: string[];
  status: string;
  people_affected: number | null;
  notes: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
};

// ================================================================
// GASOLINA
// ================================================================
export type SolicitudGasolina = {
  id: string;
  created_at: string;
  nombre: string;
  apellido: string;
  cedula: string;
  placa: string;
  marca: string;
  modelo: string;
  motivo: string;
  telefono: string;
  litros: number;
  estado: "pendiente" | "suministrado" | "pendiente_autorizacion" | "rechazado";
  traslado_id?: string | null;
  ticket_id?: string | null;
  transporte_id?: string | null;
  solicitante_perfil_id?: string | null;
  origen?: "publico" | "transportista" | null;
  tipo_vehiculo?: "moto" | "carro" | "autobus" | null;
  banco?: string | null;
  order_id?: string | null;
  quote_id?: string | null;
  payout_status?: "pendiente" | "exitoso" | "fallido" | null;
  payout_error?: string | null;
};

export type Rate = {
  code: string;
  rate: number;
  curr_date: string;
  curr_time: string;
  rate_datetime: string;
};
