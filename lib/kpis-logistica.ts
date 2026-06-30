export type LogisticsKpis = {
  traslados_completados: number;
  en_ruta_ahora: number;
  insumos_movidos: number;
  voluntarios_activos: number;
  zonas_atendidas: number;
  tiempo_promedio_horas: number | null;
  litros_aportados: number;
  entregas_evidencia_pct: number;
  actualizado_at: string;
};

export const EMPTY_LOGISTICS_KPIS: LogisticsKpis = {
  traslados_completados: 0,
  en_ruta_ahora: 0,
  insumos_movidos: 0,
  voluntarios_activos: 0,
  zonas_atendidas: 0,
  tiempo_promedio_horas: null,
  litros_aportados: 0,
  entregas_evidencia_pct: 0,
  actualizado_at: new Date().toISOString(),
};

export type VoluntarioPublico = {
  id: string;
  nombre_publico: string;
  tipo: string;
  ciudad: string | null;
  created_at: string;
};

export const TIPO_VEHICULO_LABEL: Record<string, string> = {
  pasajeros: "Pasajeros",
  carga: "Carga",
  ambulancia: "Ambulancia",
  grua: "Grúa",
  tecnico: "Técnico / moto",
};
