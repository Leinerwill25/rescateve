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
  "medicinas",
  "ropa",
]);

const ESTADOS_COMPLETADO = new Set(["completado", "entregado"]);
const ESTADOS_EN_RUTA = new Set(["asignado", "aceptado", "en_camino"]);
const ACCIONES_ASIGNACION = new Set(["asignado", "match_acopio_reclamado"]);

type TicketRow = {
  id: string;
  estado: string;
  fuente: string;
  created_at: string;
  aec_created_at: string | null;
  transporte_id: string | null;
  categoria_final: string | null;
  categoria_sugerida: string | null;
  categoria_externa: string | null;
  destino_ref: string | null;
  ubicacion_externa: string | null;
  origen_ref: string | null;
  evidencia_entrega_url: string | null;
};

type HistorialRow = {
  ticket_id: string;
  accion: string;
  created_at: string;
};

type MatchRow = {
  ticket_id: string;
  transporte_id: string | null;
  created_at: string;
};

type NotifRow = {
  ticket_id: string;
  destinatario_tipo: string;
  created_at: string;
};

type GasolinaRow = {
  estado: string;
  litros: number | string | null;
};

function esInsumoTicket(t: TicketRow): boolean {
  if (["traslado", "ayuda_en_camino", "manual", "publico"].includes(t.fuente)) {
    const cat = (t.categoria_final || t.categoria_sugerida || t.categoria_externa || "").toLowerCase();
    if (!cat) return t.fuente !== "publico";
    if (TIPOS_INSUMO.has(cat)) return true;
    return /insumo|alimento|medic|ropa|carga|agua/.test(cat);
  }
  return false;
}

function zonaTicket(t: TicketRow): string | null {
  const z = (t.destino_ref || t.ubicacion_externa || t.origen_ref || "").trim();
  return z || null;
}

function inicioTicket(t: TicketRow): number {
  return new Date(t.aec_created_at || t.created_at).getTime();
}

/** Agrega KPIs desde tickets (fallback si el RPC no existe o falla). */
export function computeLogisticsKpisFromTickets(
  tickets: TicketRow[],
  historial: HistorialRow[],
  gasolina: GasolinaRow[] = [],
  transportesActivos = 0,
  matches: MatchRow[] = [],
  notificaciones: NotifRow[] = [],
): LogisticsKpis {
  const asignacionPorTicket = new Map<string, number>();

  for (const h of historial) {
    if (!ACCIONES_ASIGNACION.has(h.accion)) continue;
    const ts = new Date(h.created_at).getTime();
    const prev = asignacionPorTicket.get(h.ticket_id);
    if (prev == null || ts < prev) asignacionPorTicket.set(h.ticket_id, ts);
  }
  for (const m of matches) {
    if (!m.transporte_id) continue;
    const ts = new Date(m.created_at).getTime();
    const prev = asignacionPorTicket.get(m.ticket_id);
    if (prev == null || ts < prev) asignacionPorTicket.set(m.ticket_id, ts);
  }
  for (const n of notificaciones) {
    if (n.destinatario_tipo !== "transportista") continue;
    const ts = new Date(n.created_at).getTime();
    const prev = asignacionPorTicket.get(n.ticket_id);
    if (prev == null || ts < prev) asignacionPorTicket.set(n.ticket_id, ts);
  }

  let traslados_completados = 0;
  let insumos_movidos = 0;
  let en_ruta_ahora = 0;
  let conEvidencia = 0;
  const zonas = new Set<string>();
  const horasAsignacion: number[] = [];

  for (const t of tickets) {
    if (t.estado === "completado") {
      traslados_completados++;
      if (esInsumoTicket(t)) insumos_movidos++;
      const z = zonaTicket(t);
      if (z) zonas.add(z);
      if (t.evidencia_entrega_url?.trim()) conEvidencia++;
    }
    if (ESTADOS_EN_RUTA.has(t.estado) && t.transporte_id) en_ruta_ahora++;

    if (t.transporte_id) {
      const asignadoAt = asignacionPorTicket.get(t.id);
      if (asignadoAt != null) {
        const horas = (asignadoAt - inicioTicket(t)) / 3_600_000;
        if (horas >= 0) horasAsignacion.push(horas);
      }
    }
  }

  const litros_aportados = gasolina
    .filter((g) => g.estado === "suministrado")
    .reduce((sum, g) => sum + (Number(g.litros) || 0), 0);

  const tiempo_promedio_horas =
    horasAsignacion.length > 0
      ? Math.round((horasAsignacion.reduce((a, b) => a + b, 0) / horasAsignacion.length) * 10) / 10
      : null;

  const entregas_evidencia_pct =
    traslados_completados > 0
      ? Math.round((100 * conEvidencia) / traslados_completados)
      : 0;

  return {
    traslados_completados,
    en_ruta_ahora,
    insumos_movidos,
    voluntarios_activos: transportesActivos,
    zonas_atendidas: zonas.size,
    tiempo_promedio_horas,
    litros_aportados,
    entregas_evidencia_pct,
    actualizado_at: new Date().toISOString(),
  };
}

/** @deprecated Usar computeLogisticsKpisFromTickets cuando sea posible. */
export function computeLogisticsKpisFromClient(
  traslados: Array<{ estado: string; tipo: string; destino_ref: string | null; reporter_token: string | null }>,
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

/** Lee tickets + historial y calcula KPIs alineados con operaciones. */
export async function fetchLogisticsKpisFallback(): Promise<LogisticsKpis> {
  const [ticketsRes, historialRes, gasolinaRes, transportesRes, matchesRes, notifRes] =
    await Promise.all([
    supabase
      .from("tickets")
      .select(
        "id,estado,fuente,created_at,aec_created_at,transporte_id,categoria_final,categoria_sugerida,categoria_externa,destino_ref,ubicacion_externa,origen_ref,evidencia_entrega_url"
      ),
    supabase
      .from("ticket_historial")
      .select("ticket_id,accion,created_at")
      .in("accion", ["asignado", "match_acopio_reclamado"]),
    supabase.from("solicitudes_gasolina").select("estado, litros"),
    supabase.from("transportes").select("id").eq("activo", true),
    supabase
      .from("match_traslados_acopio")
      .select("ticket_id,transporte_id,created_at")
      .not("transporte_id", "is", null),
    supabase
      .from("notificaciones")
      .select("ticket_id,destinatario_tipo,created_at")
      .eq("destinatario_tipo", "transportista"),
  ]);

  if (ticketsRes.error) throw ticketsRes.error;

  return computeLogisticsKpisFromTickets(
    (ticketsRes.data ?? []) as TicketRow[],
    (historialRes.data ?? []) as HistorialRow[],
    gasolinaRes.data ?? [],
    transportesRes.data?.length ?? 0,
    (matchesRes.data ?? []) as MatchRow[],
    (notifRes.data ?? []) as NotifRow[],
  );
}
