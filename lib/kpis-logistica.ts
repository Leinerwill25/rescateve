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

/** Valores mostrados cuando no hay datos calculados aún. */
export const DEFAULT_TIEMPO_ASIGNACION_MINUTOS = 5;
export const DEFAULT_TIEMPO_ASIGNACION_HORAS = DEFAULT_TIEMPO_ASIGNACION_MINUTOS / 60;
export const DEFAULT_ENTREGAS_EVIDENCIA_PCT = 100;

export function withLogisticsKpisDefaults(kpis: LogisticsKpis): LogisticsKpis {
  const tiempo =
    kpis.tiempo_promedio_horas == null || Number.isNaN(kpis.tiempo_promedio_horas)
      ? DEFAULT_TIEMPO_ASIGNACION_HORAS
      : kpis.tiempo_promedio_horas;
  const evidencia =
    kpis.entregas_evidencia_pct > 0 ? kpis.entregas_evidencia_pct : DEFAULT_ENTREGAS_EVIDENCIA_PCT;

  return { ...kpis, tiempo_promedio_horas: tiempo, entregas_evidencia_pct: evidencia };
}

export const EMPTY_LOGISTICS_KPIS: LogisticsKpis = withLogisticsKpisDefaults({
  traslados_completados: 0,
  en_ruta_ahora: 0,
  insumos_movidos: 0,
  voluntarios_activos: 0,
  zonas_atendidas: 0,
  tiempo_promedio_horas: null,
  litros_aportados: 0,
  entregas_evidencia_pct: 0,
  actualizado_at: new Date().toISOString(),
});

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
