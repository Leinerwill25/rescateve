import { supabase } from "@/lib/supabase";
import type { LogisticsKpis } from "@/lib/kpis-logistica";

const TIPOS_INSUMO = new Set([
  "insumos",
  "medicamentos",
  "alimentos",
  "insumo_medico",
  "insumo_basico",
  "carga",
  "personal_medico",
  "agua",
]);

const ESTADOS_COMPLETADO = new Set(["completado", "entregado"]);
const ESTADOS_EN_RUTA = new Set(["asignado", "aceptado", "en_camino"]);

type TrasladoRow = {
  estado: string;
  tipo: string;
  destino_ref: string | null;
  reporter_token: string | null;
};

type GasolinaRow = {
  estado: string;
  litros: number | string | null;
};

/** Agrega KPIs desde tablas legibles por anon (fallback si el RPC no existe). */
export function computeLogisticsKpisFromClient(
  traslados: TrasladoRow[],
  gasolina: GasolinaRow[] = [],
): LogisticsKpis {
  const publicos = traslados.filter((t) => t.reporter_token != null);

  let traslados_completados = 0;
  let insumos_movidos = 0;
  let en_ruta_ahora = 0;
  const zonas = new Set<string>();

  for (const t of publicos) {
    if (ESTADOS_COMPLETADO.has(t.estado)) {
      traslados_completados++;
      if (TIPOS_INSUMO.has(t.tipo)) insumos_movidos++;
      const ref = t.destino_ref?.trim();
      if (ref) zonas.add(ref);
    }
    if (ESTADOS_EN_RUTA.has(t.estado)) en_ruta_ahora++;
  }

  const litros_aportados = gasolina
    .filter((g) => g.estado === "suministrado")
    .reduce((sum, g) => sum + (Number(g.litros) || 0), 0);

  return {
    traslados_completados,
    en_ruta_ahora,
    insumos_movidos,
    voluntarios_activos: 0,
    zonas_atendidas: zonas.size,
    tiempo_promedio_horas: null,
    litros_aportados,
    entregas_evidencia_pct: 0,
    actualizado_at: new Date().toISOString(),
  };
}

/** Lee traslados + gasolina y calcula KPIs parciales sin RPC. */
export async function fetchLogisticsKpisFallback(): Promise<LogisticsKpis> {
  const [trasladosRes, gasolinaRes] = await Promise.all([
    supabase
      .from("traslados")
      .select("estado, tipo, destino_ref, reporter_token")
      .not("reporter_token", "is", null),
    supabase.from("solicitudes_gasolina").select("estado, litros"),
  ]);

  if (trasladosRes.error) throw trasladosRes.error;

  return computeLogisticsKpisFromClient(
    trasladosRes.data ?? [],
    gasolinaRes.data ?? [],
  );
}
