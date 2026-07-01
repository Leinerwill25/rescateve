export type OperadorData = {
  nombre: string;
  cedula: string;
  telefono: string;
  modelo: string;
  placa: string;
  unidad: string;
  puestos: string;
  ciudad: string;
  linea: string;
  estado: string;
};

export const EMPTY_OPERADOR: OperadorData = {
  nombre: "",
  cedula: "",
  telefono: "",
  modelo: "",
  placa: "",
  unidad: "",
  puestos: "",
  ciudad: "",
  linea: "",
  estado: "",
};

export function tipoTransporteParaCategoria(categoria: string | null): "ambulancia" | "pasajeros" | "carga" | "grua" | "tecnico" {
  if (categoria === "emergencia_medica" || categoria === "traslado_personal") return "ambulancia";
  if (categoria === "grua") return "grua";
  if (categoria === "tecnico") return "tecnico";
  if (categoria === "multiple") return "carga";
  if (categoria === "insumo_basico" || categoria === "insumo_medico") return "carga";
  return "carga";
}
