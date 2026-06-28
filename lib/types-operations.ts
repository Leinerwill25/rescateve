export type RolUsuario = "admin" | "transportista" | "medico" | "acopio";

export type Perfil = {
  id: string;
  nombre: string | null;
  rol: RolUsuario;
  organizacion: string | null;
  telefono: string | null;
  activo: boolean;
  created_at: string;
};

export type Departamento = {
  id: string;
  clave: string;
  nombre: string;
  canal_intake: "in_app" | "whatsapp" | "llamada";
  contacto: string | null;
  iniciativa: string | null;
  activo: boolean;
};

export type Transporte = {
  id: string;
  perfil_id: string | null;
  nombre: string;
  tipo: "ambulancia" | "pasajeros" | "carga" | "grua" | "tecnico";
  zona: string | null;
  contacto: string | null;
  en_standby: boolean;
  activo: boolean;
};

export type PersonalMedico = {
  id: string;
  perfil_id: string | null;
  nombre: string;
  especialidad: string | null;
  zona: string | null;
  contacto: string | null;
  verificado: boolean;
  disponible: boolean;
  activo: boolean;
};

export type CentroAcopioOperativo = {
  id: string;
  nombre: string;
  direccion: string | null;
  perfil_id: string | null;
  latitud: number | null;
  longitud: number | null;
  contacto: string | null;
  fuente: string | null;
  activo: boolean;
};

export type InventarioAcopio = {
  id: string;
  centro_id: string;
  item: string;
  cantidad: number;
  unidad: string | null;
  actualizado_at: string;
};

export type InventarioMovimiento = {
  id: string;
  centro_id: string;
  item: string;
  cantidad: number;
  tipo_movimiento: "entrada" | "salida";
  destinatario_nombre: string | null;
  destinatario_apellido: string | null;
  destino_ref: string | null;
  retirado_por: string | null;
  created_at: string;
  creado_por: string | null;
};

export type ReglaClasificacion = {
  id: string;
  palabras_clave: string[];
  categoria: string;
  departamentos: string[];
  prioridad: "alta" | "media" | "baja";
  es_emergencia: boolean;
  activa: boolean;
  notas: string | null;
};

export type TicketEstado =
  | "en_validacion"
  | "aprobado"
  | "asignado"
  | "aceptado"
  | "en_camino"
  | "completado"
  | "rechazado";

export type Ticket = {
  id: string;
  created_at: string;
  updated_at: string;
  fuente: "ayuda_en_camino" | "manual" | "publico";
  fuente_id: string | null;
  descripcion: string;
  categoria_sugerida: string | null;
  departamentos_sugeridos: string[] | null;
  categoria_final: string | null;
  departamentos_final: string[] | null;
  requiere_revision: boolean;
  prioridad: "alta" | "media" | "baja";
  origen_ref: string | null;
  origen_lat: number | null;
  origen_lng: number | null;
  destino_ref: string | null;
  destino_lat: number | null;
  destino_lng: number | null;
  cantidad: string | null;
  contacto_solicitante: string | null;
  centro_acopio_id: string | null;
  transporte_id: string | null;
  medico_id: string | null;
  estado: TicketEstado;
  validado_por: string | null;
  validado_at: string | null;
  notas_admin: string | null;
};

export type TicketHistorial = {
  id: string;
  ticket_id: string;
  created_at: string;
  actor: string | null;
  accion:
    | "clasificado_auto"
    | "reclasificado"
    | "dividido"
    | "reasignado"
    | "aprobado"
    | "asignado"
    | "aceptado"
    | "rechazado"
    | "estado_cambiado";
  de_valor: string | null;
  a_valor: string | null;
  nota: string | null;
};

export type Notificacion = {
  id: string;
  ticket_id: string;
  created_at: string;
  destinatario_tipo: "transportista" | "medico" | "departamento";
  destinatario_id: string | null;
  canal: "in_app" | "whatsapp" | "llamada";
  mensaje: string | null;
  estado: "pendiente" | "enviada" | "leida";
};
