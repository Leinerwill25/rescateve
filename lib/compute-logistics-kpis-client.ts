import { supabase } from "@/lib/supabase";
import { withLogisticsKpisDefaults, type LogisticsKpis } from "@/lib/kpis-logistica";

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

type TicketRow = {
  id: string;
  estado: string;
  fuente: string;
  fuente_id?: string | null;
  descripcion?: string | null;
  created_at: string;
  cuando: string | null;
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
  a_valor?: string | null;
  created_at: string;
};

type MatchRow = {
  ticket_id: string;
  transporte_id: string | null;
  created_at: string;
  confirmado_at?: string | null;
  reclamado_at?: string | null;
};

type TrasladoOperadorRow = {
  id: string;
  operador: string | null;
  estado: string;
  operador_asignado_at?: string | null;
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

function esHistorialAsignacion(h: HistorialRow): boolean {
  if (h.accion === "asignado" || h.accion === "match_acopio_reclamado" || h.accion === "reasignado") {
    return true;
  }
  return h.accion === "estado_cambiado" && h.a_valor === "asignado";
}

function esHistorialConductor(h: HistorialRow): boolean {
  if (esHistorialAsignacion(h)) return true;
  if (h.accion === "match_acopio_confirmado") return true;
  return h.accion === "estado_cambiado" && h.a_valor === "aceptado";
}

/** Traslado logístico real (excluye AEC; incluye Ash). */
function esTicketTrasladoLogistico(t: TicketRow): boolean {
  if (t.fuente === "ayuda_en_camino") return false;
  if (t.fuente === "traslado") return true;
  if (t.fuente === "manual" && t.cuando) return true;
  if (t.fuente === "publico") {
    if (t.fuente_id?.startsWith("ash:")) return true;
    if (t.descripcion?.startsWith("[Ash")) return true;
  }
  return false;
}

function trasladoTieneOperador(tr: TrasladoOperadorRow): boolean {
  const op = (tr.operador ?? "").trim();
  return op !== "" && op !== "null";
}

/** Agrega KPIs desde tickets (fallback si el RPC no existe o falla). */
export function computeLogisticsKpisFromTickets(
  tickets: TicketRow[],
  historial: HistorialRow[],
  gasolina: GasolinaRow[] = [],
  transportesActivos = 0,
  matches: MatchRow[] = [],
  notificaciones: NotifRow[] = [],
  trasladosOperador: TrasladoOperadorRow[] = [],
): LogisticsKpis {
  const asignacionPorTicket = new Map<string, number>();
  const ticketsConNotif = new Set<string>();
  const ticketsConMatch = new Set<string>();
  const trasladoOperadorPorId = new Map<string, TrasladoOperadorRow>();

  for (const tr of trasladosOperador) {
    if (!trasladoTieneOperador(tr)) continue;
    trasladoOperadorPorId.set(tr.id, tr);
    if (tr.operador_asignado_at) {
      const ts = new Date(tr.operador_asignado_at).getTime();
      const prev = asignacionPorTicket.get(tr.id);
      if (prev == null || ts < prev) asignacionPorTicket.set(tr.id, ts);
    }
  }

  for (const h of historial) {
    if (!esHistorialAsignacion(h)) continue;
    const ts = new Date(h.created_at).getTime();
    const prev = asignacionPorTicket.get(h.ticket_id);
    if (prev == null || ts < prev) asignacionPorTicket.set(h.ticket_id, ts);
  }
  for (const m of matches) {
    if (!m.transporte_id) continue;
    ticketsConMatch.add(m.ticket_id);
    const ts = new Date(m.reclamado_at || m.created_at).getTime();
    const prev = asignacionPorTicket.get(m.ticket_id);
    if (prev == null || ts < prev) asignacionPorTicket.set(m.ticket_id, ts);
  }
  for (const n of notificaciones) {
    if (n.destinatario_tipo !== "transportista") continue;
    ticketsConNotif.add(n.ticket_id);
    const ts = new Date(n.created_at).getTime();
    const prev = asignacionPorTicket.get(n.ticket_id);
    if (prev == null || ts < prev) asignacionPorTicket.set(n.ticket_id, ts);
  }

  function inicioTicket(t: TicketRow): number {
    return new Date(t.created_at).getTime();
  }

  function tuvoConductor(t: TicketRow): boolean {
    if (t.transporte_id) return true;
    if (asignacionPorTicket.has(t.id)) return true;
    if (ticketsConMatch.has(t.id)) return true;
    if (ticketsConNotif.has(t.id)) return true;
    if (trasladoOperadorPorId.has(t.id)) return true;
    return historial.some((h) => h.ticket_id === t.id && esHistorialConductor(h));
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

    if (
      t.estado === "completado" &&
      esTicketTrasladoLogistico(t) &&
      tuvoConductor(t)
    ) {
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

  return withLogisticsKpisDefaults({
    traslados_completados,
    en_ruta_ahora,
    insumos_movidos,
    voluntarios_activos: transportesActivos,
    zonas_atendidas: zonas.size,
    tiempo_promedio_horas,
    litros_aportados,
    entregas_evidencia_pct,
    actualizado_at: new Date().toISOString(),
  });
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

  return withLogisticsKpisDefaults({
    traslados_completados,
    en_ruta_ahora,
    insumos_movidos,
    voluntarios_activos: 0,
    zonas_atendidas: zonas.size,
    tiempo_promedio_horas: null,
    litros_aportados,
    entregas_evidencia_pct: 0,
    actualizado_at: new Date().toISOString(),
  });
}

/** Lee tickets + historial y calcula KPIs alineados con operaciones. */
export async function fetchLogisticsKpisFallback(): Promise<LogisticsKpis> {
  const [ticketsRes, historialRes, gasolinaRes, transportesRes, matchesRes, notifRes, trasladosRes] =
    await Promise.all([
    supabase
      .from("tickets")
      .select(
        "id,estado,fuente,fuente_id,descripcion,created_at,cuando,transporte_id,categoria_final,categoria_sugerida,categoria_externa,destino_ref,ubicacion_externa,origen_ref,evidencia_entrega_url"
      ),
    supabase
      .from("ticket_historial")
      .select("ticket_id,accion,a_valor,created_at"),
    supabase.from("solicitudes_gasolina").select("estado, litros"),
    supabase.from("transportes").select("id").eq("activo", true),
    supabase
      .from("match_traslados_acopio")
      .select("ticket_id,transporte_id,created_at,confirmado_at,reclamado_at")
      .not("transporte_id", "is", null),
    supabase
      .from("notificaciones")
      .select("ticket_id,destinatario_tipo,created_at")
      .eq("destinatario_tipo", "transportista"),
    supabase
      .from("traslados")
      .select("id,operador,estado,operador_asignado_at")
      .not("operador", "is", null),
  ]);

  if (ticketsRes.error) throw ticketsRes.error;

  return computeLogisticsKpisFromTickets(
    (ticketsRes.data ?? []) as TicketRow[],
    (historialRes.data ?? []) as HistorialRow[],
    gasolinaRes.data ?? [],
    transportesRes.data?.length ?? 0,
    (matchesRes.data ?? []) as MatchRow[],
    (notifRes.data ?? []) as NotifRow[],
    (trasladosRes.data ?? []) as TrasladoOperadorRow[],
  );
}
