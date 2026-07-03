import { esTicketAEC, esTicketAsh, esTicketTraslado } from "@/lib/ticket-filters";
import { costoEstimadoUSD } from "@/lib/combustible-utils";
import { distanciaKm, type GeoPoint } from "@/lib/geo";
import type { Ticket } from "@/lib/types-operations";

export type SegmentoFuente = "aec" | "ash" | "traslado" | "otro";

export type TicketRow = Pick<
  Ticket,
  | "id"
  | "created_at"
  | "updated_at"
  | "fuente"
  | "fuente_id"
  | "descripcion"
  | "cantidad"
  | "estado"
  | "categoria_externa"
  | "ubicacion_externa"
  | "estado_externo"
  | "origen_ref"
  | "origen_lat"
  | "origen_lng"
  | "destino_ref"
  | "destino_lat"
  | "destino_lng"
  | "transporte_id"
  | "cuando"
  | "capturado_at"
  | "evidencia_entrega_url"
>;

export type HistorialRow = {
  ticket_id: string;
  created_at: string;
  accion: string;
  a_valor: string | null;
};

export type TransporteRow = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type MatchRow = {
  ticket_id: string;
  transporte_id: string | null;
  estado: string;
  distancia_km: number | null;
  tuia_articulo: string | null;
  reclamado_at?: string | null;
  created_at?: string | null;
};

export type TrasladoReporteRow = {
  id: string;
  estado: string;
  operador: string | null;
  operador_asignado_at?: string | null;
  reporter_token?: string | null;
};

export type NotificacionReporteRow = {
  ticket_id: string;
  created_at: string;
  destinatario_tipo: string;
};

export type GasolinaRow = {
  id: string;
  ticket_id: string | null;
  transporte_id: string | null;
  litros: number | string | null;
  estado: string;
  created_at: string;
};

export type InventarioRow = {
  item: string;
  cantidad: number | string | null;
  unidad: string | null;
  actualizado_at: string | null;
  centro: { nombre: string } | null;
  fuente?: "local" | "tuia911";
};

export type FiltroReporteFuente = "todos" | "aec" | "ash" | "traslado";

export type EntregaReporte = {
  ticket_id: string;
  descripcion: string;
  cantidad: string | null;
  transporte: string;
  fecha: string;
  segmento: SegmentoFuente;
};

/** Estadísticas filtrables por origen del ticket. */
export type ReportePorFuente = {
  fuente: FiltroReporteFuente;
  label: string;
  solicitudes_recibidas: number;
  entregas_completadas: number;
  entregas_con_transportista: number;
  entregas_sin_transportista: number;
  solicitudes_cubiertas: number;
  pct_atendidas: number;
  necesidades_verificadas: number;
  entregas_fallidas: number;
  tiempo_asignacion_horas: number | null;
  voluntarios_movilizados: number;
  solicitudes_por_zona: Array<{ zona: string; total: number; pendientes: number; completadas: number }>;
  insumos_criticos: Array<{ articulo: string; solicitudes: number }>;
  zonas_deficit_activo: Array<{ zona: string; peticiones_activas: number }>;
  insumos_transportados: EntregaReporte[];
  solicitudes_asignadas_por_transporte: Array<{ transporte_id: string; nombre: string; asignadas: number }>;
  viajes_por_transporte: Array<{ transporte_id: string; nombre: string; viajes: number }>;
  km_por_transporte: Array<{ transporte_id: string; nombre: string; km: number }>;
};

export type ReportesOperaciones = {
  generado_at: string;
  por_fuente: Record<FiltroReporteFuente, ReportePorFuente>;
  necesidades: {
    solicitudes_por_zona: Array<{ zona: string; total: number; pendientes: number; completadas: number }>;
    necesidades_verificadas: number;
    insumos_criticos: Array<{ articulo: string; solicitudes: number }>;
    solicitudes_cubiertas: number;
    zonas_deficit_activo: Array<{ zona: string; peticiones_activas: number }>;
    porcentaje_atendidas: {
      global: number;
      aec: number;
      ash: number;
      traslado: number;
    };
    tiempo_deteccion_hasta_asignacion_horas: number | null;
    inventario: Array<{
      centro: string;
      item: string;
      cantidad: number;
      unidad: string;
      actualizado_at: string | null;
      fuente: "local" | "tuia911";
    }>;
  };
  logistica: {
    solicitudes_recibidas: { total: number; aec: number; ash: number; traslado: number };
    solicitudes_asignadas_por_transporte: Array<{ transporte_id: string; nombre: string; asignadas: number }>;
    viajes_por_transporte: Array<{ transporte_id: string; nombre: string; viajes: number }>;
    km_por_transporte: Array<{ transporte_id: string; nombre: string; km: number }>;
    insumos_transportados: Array<{
      ticket_id: string;
      descripcion: string;
      cantidad: string | null;
      transporte: string;
      fecha: string;
    }>;
    voluntarios_movilizados: number;
    entregas_completadas: number;
    entregas_con_transportista: number;
    entregas_sin_transportista: number;
    entregas_fallidas: number;
    tiempo_promedio_asignacion_horas: number | null;
    costo_combustible_por_traslado: Array<{
      ticket_id: string | null;
      transporte: string;
      litros: number;
      costo_usd: number;
    }>;
    combustible_financiado: { litros: number; costo_usd: number; solicitudes: number };
  };
};

const ESTADOS_ACTIVOS = new Set(["en_validacion", "aprobado", "asignado", "aceptado", "en_camino"]);
const ESTADOS_ASIGNADOS = new Set(["asignado", "aceptado", "en_camino", "completado"]);
/** Viaje aprobado con transportista ya asignado (cuenta para kilometraje). */
const ESTADOS_VIAJE_CON_TRANSPORTE = new Set(["asignado", "aceptado", "en_camino", "completado"]);
const ESTADOS_MATCH_VIAJE = new Set(["confirmado", "en_camino", "completado"]);

export function segmentoTicket(t: TicketRow): SegmentoFuente {
  if (esTicketAEC(t as Ticket)) return "aec";
  if (esTicketAsh(t as Ticket)) return "ash";
  if (esTicketTraslado(t as Ticket)) return "traslado";
  return "otro";
}

function limpiarRefGeocodificada(ref: string | null | undefined): string {
  if (!ref?.trim()) return "";
  return ref.replace(/^Coordenadas:\s*/i, "").replace(/,?\s*Dir:\s*.+$/i, "").trim();
}

/** Extrae municipio/ciudad desde texto de geocodificación inversa (Nominatim). */
function extraerMunicipioDesdeRef(ref: string): string {
  const parts = ref.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return ref.slice(0, 60);
  const estadoIdx = parts.findIndex((p) =>
    /venezuela|distrito capital|carabobo|miranda|zulia|aragua|anzoátegui|bolívar|lara|falcón|portuguesa|yaracuy|cojedes|guárico|monagas|sucre|nueva esparta|trujillo|mérida|táchira|apure|amazonas|delta amacuro|vargas/i.test(p)
  );
  if (estadoIdx > 0) return parts[estadoIdx - 1];
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0];
}

function extraerZonaDesdeUbicacionExterna(ubicacion: string): string {
  const sinDir = ubicacion.replace(/,?\s*Dir:\s*.+$/i, "").trim();
  const parts = sinDir.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[0];
  return sinDir.slice(0, 60) || "Sin zona registrada";
}

/** Zona derivada de ubicación geocodificada (destino > origen > AEC estructurado). */
export function extraerZona(t: TicketRow): string {
  const destino = limpiarRefGeocodificada(t.destino_ref);
  const origen = limpiarRefGeocodificada(t.origen_ref);

  if (destino) return extraerMunicipioDesdeRef(destino);
  if (origen) return extraerMunicipioDesdeRef(origen);

  if (t.ubicacion_externa?.trim()) {
    return extraerZonaDesdeUbicacionExterna(t.ubicacion_externa);
  }

  if (t.destino_lat != null && t.destino_lng != null) {
    return `${t.destino_lat.toFixed(4)}, ${t.destino_lng.toFixed(4)}`;
  }
  if (t.origen_lat != null && t.origen_lng != null) {
    return `${t.origen_lat.toFixed(4)}, ${t.origen_lng.toFixed(4)}`;
  }

  return "Sin geocodificación";
}

function puntoTicket(lat: number | null | undefined, lng: number | null | undefined): GeoPoint | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Kilometraje de ruta origen → destino (coords geocodificadas en el ticket). */
export function calcularKmRuta(t: TicketRow): number | null {
  const origen = puntoTicket(t.origen_lat, t.origen_lng);
  const destino = puntoTicket(t.destino_lat, t.destino_lng);
  if (!origen || !destino) return null;
  if (origen.lat === destino.lat && origen.lng === destino.lng) return null;
  return Math.round(distanciaKm(origen, destino) * 10) / 10;
}

function kmViajeTicket(
  t: TicketRow,
  matchesByTicket: Map<string, MatchRow[]>
): number | null {
  const ruta = calcularKmRuta(t);
  if (ruta != null && ruta > 0) return ruta;

  if (!t.transporte_id) return null;
  const ticketMatches = matchesByTicket.get(t.id) || [];
  const matchViaje = ticketMatches.find(
    (m) =>
      m.transporte_id === t.transporte_id &&
      m.distancia_km != null &&
      ESTADOS_MATCH_VIAJE.has(m.estado)
  );
  if (matchViaje?.distancia_km != null) {
    return Math.round(Number(matchViaje.distancia_km) * 10) / 10;
  }
  return null;
}

function buildMatchesByTicket(matches: MatchRow[]): Map<string, MatchRow[]> {
  const map = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const list = map.get(m.ticket_id) || [];
    list.push(m);
    map.set(m.ticket_id, list);
  }
  return map;
}

function extraerArticuloAec(descripcion: string): string | null {
  const m = descripcion.match(/\[Artículo:\s*([^\]]+)\]/i);
  return m?.[1]?.trim() || null;
}


function buildAsignacionMap(
  historial: HistorialRow[],
  matches: MatchRow[] = [],
  traslados: TrasladoReporteRow[] = [],
  notificaciones: NotificacionReporteRow[] = []
): Map<string, number> {
  const map = new Map<string, number>();
  const setMin = (ticketId: string, ts: number) => {
    const prev = map.get(ticketId);
    if (prev == null || ts < prev) map.set(ticketId, ts);
  };

  for (const h of historial) {
    const esAsignacion =
      h.accion === "asignado" ||
      h.accion === "match_acopio_reclamado" ||
      h.accion === "reasignado" ||
      (h.accion === "estado_cambiado" && h.a_valor === "asignado");
    if (!esAsignacion) continue;
    setMin(h.ticket_id, new Date(h.created_at).getTime());
  }
  for (const m of matches) {
    if (!m.transporte_id) continue;
    const raw = m.reclamado_at || m.created_at;
    if (!raw) continue;
    setMin(m.ticket_id, new Date(raw).getTime());
  }
  for (const n of notificaciones) {
    if (n.destinatario_tipo !== "transportista") continue;
    setMin(n.ticket_id, new Date(n.created_at).getTime());
  }
  for (const tr of traslados) {
    if (!tr.operador_asignado_at) continue;
    setMin(tr.id, new Date(tr.operador_asignado_at).getTime());
  }
  return map;
}

function pct(atendidas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((atendidas / total) * 1000) / 10;
}

function avgHours(diffs: number[]): number | null {
  if (!diffs.length) return null;
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round((avg / 3_600_000) * 10) / 10;
}

function operadorNombre(operador: string | null | undefined): string | null {
  const raw = (operador ?? "").trim();
  if (!raw || raw === "null") return null;
  try {
    const parsed = JSON.parse(raw) as { nombre?: string };
    if (parsed?.nombre?.trim()) return parsed.nombre.trim();
  } catch {
    /* texto plano legacy */
  }
  return raw;
}

function buildTrasladoById(traslados: TrasladoReporteRow[]): Map<string, TrasladoReporteRow> {
  return new Map(traslados.map((tr) => [tr.id, tr]));
}

function nombreConductorTicket(
  t: TicketRow,
  transporteNombre: Map<string, string>,
  trasladoById: Map<string, TrasladoReporteRow>
): string {
  if (t.transporte_id) return transporteNombre.get(t.transporte_id) || "Transporte";
  const op = operadorNombre(trasladoById.get(t.id)?.operador);
  if (op) return op;
  if (t.estado_externo === "cubierta") return "Cubierto en Ayuda en Camino";
  return "—";
}

function tuvoConductorTicket(
  t: TicketRow,
  trasladoById: Map<string, TrasladoReporteRow>
): boolean {
  if (t.transporte_id) return true;
  return operadorNombre(trasladoById.get(t.id)?.operador) != null;
}

const LABEL_FUENTE: Record<FiltroReporteFuente, string> = {
  todos: "Todos (AEC + Ash + Traslados)",
  aec: "Ayuda en Camino",
  ash: "Ash",
  traslado: "Traslados logísticos",
};

function computeReportePorFuente(
  fuente: FiltroReporteFuente,
  subset: TicketRow[],
  ctx: {
    historial: HistorialRow[];
    matches: MatchRow[];
    asignacionAt: Map<string, number>;
    matchesByTicket: Map<string, MatchRow[]>;
    transporteNombre: Map<string, string>;
    trasladoById: Map<string, TrasladoReporteRow>;
  }
): ReportePorFuente {
  const { historial, matches, asignacionAt, matchesByTicket, transporteNombre, trasladoById } = ctx;
  const ids = new Set(subset.map((t) => t.id));

  const porZona = new Map<string, { total: number; pendientes: number; completadas: number }>();
  const articuloCount = new Map<string, number>();
  const tiemposAsignacion: number[] = [];
  let solicitudes_cubiertas = 0;
  let necesidades_verificadas = 0;

  for (const t of subset) {
    const seg = segmentoTicket(t);
    const zona = extraerZona(t);
    const z = porZona.get(zona) || { total: 0, pendientes: 0, completadas: 0 };
    z.total++;
    if (t.estado === "completado") {
      z.completadas++;
      necesidades_verificadas++;
    } else if (ESTADOS_ACTIVOS.has(t.estado)) {
      z.pendientes++;
    }
    if (t.estado === "completado" || t.estado_externo === "cubierta") solicitudes_cubiertas++;
    porZona.set(zona, z);

    if (seg === "aec") {
      const art = extraerArticuloAec(t.descripcion) || t.categoria_externa || "Sin categoría";
      articuloCount.set(art, (articuloCount.get(art) || 0) + 1);
    } else if (seg === "ash") {
      const art = t.cantidad?.split(" · ")[0] || t.descripcion.slice(0, 80);
      articuloCount.set(art, (articuloCount.get(art) || 0) + 1);
    }

    const asign = asignacionAt.get(t.id);
    if (asign && (seg === "traslado" || seg === "ash")) {
      tiemposAsignacion.push(asign - new Date(t.created_at).getTime());
    }
  }

  const asignadasMap = new Map<string, number>();
  const viajesMap = new Map<string, number>();
  const kmMap = new Map<string, number>();

  for (const t of subset) {
    const conductorId = t.transporte_id;
    if (!conductorId) continue;
    if (ESTADOS_ASIGNADOS.has(t.estado)) {
      asignadasMap.set(conductorId, (asignadasMap.get(conductorId) || 0) + 1);
    }
    if (t.estado === "completado") {
      viajesMap.set(conductorId, (viajesMap.get(conductorId) || 0) + 1);
    }
  }

  for (const t of subset) {
    if (!t.transporte_id || !ESTADOS_VIAJE_CON_TRANSPORTE.has(t.estado)) continue;
    const km = kmViajeTicket(t, matchesByTicket);
    if (km == null || km <= 0) continue;
    kmMap.set(t.transporte_id, (kmMap.get(t.transporte_id) || 0) + km);
  }

  const entregas_completadas = subset.filter((t) => t.estado === "completado").length;
  const entregas_con_transportista = subset.filter(
    (t) => t.estado === "completado" && tuvoConductorTicket(t, trasladoById)
  ).length;
  const entregas_sin_transportista = entregas_completadas - entregas_con_transportista;

  const entregas_fallidas =
    historial.filter(
      (h) =>
        ids.has(h.ticket_id) &&
        (h.accion === "match_acopio_rechazado" || h.accion === "rechazado")
    ).length + matches.filter((m) => ids.has(m.ticket_id) && m.estado === "cancelado").length;

  const voluntarios_movilizados = new Set(
    subset
      .filter((t) => t.estado === "completado" && t.transporte_id)
      .map((t) => t.transporte_id)
  ).size;

  const insumos_transportados = subset
    .filter((t) => t.estado === "completado")
    .map((t) => ({
      ticket_id: t.id,
      descripcion: t.descripcion.slice(0, 200),
      cantidad: t.cantidad,
      transporte: nombreConductorTicket(t, transporteNombre, trasladoById),
      fecha: t.updated_at,
      segmento: segmentoTicket(t),
    }))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 100);

  const completadas = subset.filter((t) => t.estado === "completado").length;

  return {
    fuente,
    label: LABEL_FUENTE[fuente],
    solicitudes_recibidas: subset.length,
    entregas_completadas,
    entregas_con_transportista,
    entregas_sin_transportista,
    solicitudes_cubiertas,
    pct_atendidas: pct(completadas, subset.length),
    necesidades_verificadas,
    entregas_fallidas,
    tiempo_asignacion_horas: avgHours(tiemposAsignacion),
    voluntarios_movilizados,
    solicitudes_por_zona: [...porZona.entries()]
      .map(([zona, v]) => ({ zona, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25),
    insumos_criticos: [...articuloCount.entries()]
      .map(([articulo, solicitudes]) => ({ articulo, solicitudes }))
      .sort((a, b) => b.solicitudes - a.solicitudes)
      .slice(0, 20),
    zonas_deficit_activo: [...porZona.entries()]
      .map(([zona, v]) => ({ zona, peticiones_activas: v.pendientes }))
      .filter((z) => z.peticiones_activas > 0)
      .sort((a, b) => b.peticiones_activas - a.peticiones_activas)
      .slice(0, 15),
    insumos_transportados,
    solicitudes_asignadas_por_transporte: [...asignadasMap.entries()]
      .map(([transporte_id, asignadas]) => ({
        transporte_id,
        nombre: transporteNombre.get(transporte_id) || "Transporte",
        asignadas,
      }))
      .sort((a, b) => b.asignadas - a.asignadas),
    viajes_por_transporte: [...viajesMap.entries()]
      .map(([transporte_id, viajes]) => ({
        transporte_id,
        nombre: transporteNombre.get(transporte_id) || "Transporte",
        viajes,
      }))
      .sort((a, b) => b.viajes - a.viajes),
    km_por_transporte: [...kmMap.entries()]
      .map(([transporte_id, km]) => ({
        transporte_id,
        nombre: transporteNombre.get(transporte_id) || "Transporte",
        km: Math.round(km * 10) / 10,
      }))
      .sort((a, b) => b.km - a.km),
  };
}

export function computeReportesOperaciones(input: {
  tickets: TicketRow[];
  historial: HistorialRow[];
  transportes: TransporteRow[];
  matches: MatchRow[];
  gasolina: GasolinaRow[];
  inventario: InventarioRow[];
  traslados?: TrasladoReporteRow[];
  notificaciones?: NotificacionReporteRow[];
}): ReportesOperaciones {
  const { tickets, historial, transportes, matches, gasolina, inventario } = input;
  const traslados = input.traslados ?? [];
  const notificaciones = input.notificaciones ?? [];
  const transporteNombre = new Map(transportes.map((t) => [t.id, t.nombre]));
  const asignacionAt = buildAsignacionMap(historial, matches, traslados, notificaciones);
  const matchesByTicket = buildMatchesByTicket(matches);
  const trasladoById = buildTrasladoById(traslados);

  const logisticos = tickets.filter((t) => {
    const s = segmentoTicket(t);
    return s === "aec" || s === "ash" || s === "traslado";
  });

  const ctx = {
    historial,
    matches,
    asignacionAt,
    matchesByTicket,
    transporteNombre,
    trasladoById,
  };

  const por_fuente: Record<FiltroReporteFuente, ReportePorFuente> = {
    todos: computeReportePorFuente("todos", logisticos, ctx),
    aec: computeReportePorFuente("aec", logisticos.filter((t) => segmentoTicket(t) === "aec"), ctx),
    ash: computeReportePorFuente("ash", logisticos.filter((t) => segmentoTicket(t) === "ash"), ctx),
    traslado: computeReportePorFuente(
      "traslado",
      logisticos.filter((t) => segmentoTicket(t) === "traslado"),
      ctx
    ),
  };

  const todos = por_fuente.todos;

  const gasSuministrada = gasolina.filter((g) => g.estado === "suministrado");
  const litrosTotal = gasSuministrada.reduce((s, g) => s + (Number(g.litros) || 0), 0);

  const costo_combustible_por_traslado = gasolina
    .filter((g) => g.estado === "suministrado")
    .map((g) => {
      const litros = Number(g.litros) || 0;
      return {
        ticket_id: g.ticket_id,
        transporte: g.transporte_id ? transporteNombre.get(g.transporte_id) || "—" : "—",
        litros,
        costo_usd: costoEstimadoUSD(litros),
      };
    });

  return {
    generado_at: new Date().toISOString(),
    por_fuente,
    necesidades: {
      solicitudes_por_zona: todos.solicitudes_por_zona,
      necesidades_verificadas: todos.necesidades_verificadas,
      insumos_criticos: todos.insumos_criticos,
      solicitudes_cubiertas: todos.solicitudes_cubiertas,
      zonas_deficit_activo: todos.zonas_deficit_activo,
      porcentaje_atendidas: {
        global: por_fuente.todos.pct_atendidas,
        aec: por_fuente.aec.pct_atendidas,
        ash: por_fuente.ash.pct_atendidas,
        traslado: por_fuente.traslado.pct_atendidas,
      },
      tiempo_deteccion_hasta_asignacion_horas: por_fuente.todos.tiempo_asignacion_horas,
      inventario: inventario.map((i) => ({
        centro: i.centro?.nombre || "Centro",
        item: i.item,
        cantidad: Number(i.cantidad) || 0,
        unidad: i.unidad || "uds",
        actualizado_at: i.actualizado_at,
        fuente: i.fuente || "local",
      })),
    },
    logistica: {
      solicitudes_recibidas: {
        total: todos.solicitudes_recibidas,
        aec: por_fuente.aec.solicitudes_recibidas,
        ash: por_fuente.ash.solicitudes_recibidas,
        traslado: por_fuente.traslado.solicitudes_recibidas,
      },
      solicitudes_asignadas_por_transporte: todos.solicitudes_asignadas_por_transporte,
      viajes_por_transporte: todos.viajes_por_transporte,
      km_por_transporte: todos.km_por_transporte,
      insumos_transportados: todos.insumos_transportados,
      voluntarios_movilizados: todos.voluntarios_movilizados || transportes.filter((t) => t.activo).length,
      entregas_completadas: todos.entregas_completadas,
      entregas_con_transportista: todos.entregas_con_transportista,
      entregas_sin_transportista: todos.entregas_sin_transportista,
      entregas_fallidas: todos.entregas_fallidas,
      tiempo_promedio_asignacion_horas: todos.tiempo_asignacion_horas,
      costo_combustible_por_traslado,
      combustible_financiado: {
        litros: Math.round(litrosTotal * 10) / 10,
        costo_usd: costoEstimadoUSD(litrosTotal),
        solicitudes: gasSuministrada.length,
      },
    },
  };
}
