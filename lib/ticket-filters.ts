import { Ticket } from "@/lib/types-operations";

export type FiltroOrigen = "todos" | "traslados" | "ayuda_en_camino";
export type FiltroExterno = "todos" | "pendiente" | "cubierta";
export type FiltroOrden = "recientes" | "importantes" | "criticos";

const MS_24H = 24 * 60 * 60 * 1000;

/** Ticket de traslado logístico (mapa público, manual logístico o backfill). */
export function esTicketTraslado(t: Ticket): boolean {
  if (t.fuente === "traslado") return true;
  if (t.fuente === "manual") {
    if (t.cuando || t.destino_ref) return true;
    const cat = t.categoria_final || t.categoria_sugerida || "";
    return ["insumo_basico", "insumo_medico", "traslado_personal"].includes(cat);
  }
  return false;
}

export function esTicketAEC(t: Ticket): boolean {
  return t.fuente === "ayuda_en_camino";
}

/** Sin respuesta interna ni cobertura en origen tras 24 h. */
export function esTicketCritico(t: Ticket): boolean {
  if (t.estado !== "en_validacion") return false;
  const edad = Date.now() - new Date(t.created_at).getTime();
  if (edad < MS_24H) return false;
  if (esTicketAEC(t) && t.estado_externo === "cubierta") return false;
  return true;
}

export function esTicketImportante(t: Ticket): boolean {
  return t.prioridad === "alta" || t.requiere_revision;
}

function prioridadRank(p: string): number {
  if (p === "alta") return 3;
  if (p === "media") return 2;
  return 1;
}

export function filtrarTickets(
  tickets: Ticket[],
  filtroOrigen: FiltroOrigen,
  filtroExterno: FiltroExterno,
  filtroOrden: FiltroOrden
): Ticket[] {
  let result = tickets.filter((t) => {
    if (filtroOrigen === "traslados" && !esTicketTraslado(t)) return false;
    if (filtroOrigen === "ayuda_en_camino" && !esTicketAEC(t)) return false;

    if (filtroExterno !== "todos" && esTicketAEC(t)) {
      const estExt = t.estado_externo || "pendiente";
      if (estExt !== filtroExterno) return false;
    }

    if (filtroOrden === "importantes" && !esTicketImportante(t)) return false;
    if (filtroOrden === "criticos" && !esTicketCritico(t)) return false;

    return true;
  });

  result = [...result].sort((a, b) => {
    if (filtroOrden === "criticos") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (filtroOrden === "importantes") {
      const pr = prioridadRank(b.prioridad) - prioridadRank(a.prioridad);
      if (pr !== 0) return pr;
      if (a.requiere_revision !== b.requiere_revision) {
        return a.requiere_revision ? -1 : 1;
      }
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return result;
}

export function contarPorOrigen(tickets: Ticket[]) {
  const traslados = tickets.filter(esTicketTraslado).length;
  const aec = tickets.filter(esTicketAEC).length;
  return { total: tickets.length, traslados, aec };
}

export function contarPorEstadoExterno(tickets: Ticket[], scope: FiltroOrigen) {
  const base =
    scope === "ayuda_en_camino"
      ? tickets.filter(esTicketAEC)
      : scope === "traslados"
        ? []
        : tickets.filter(esTicketAEC);

  return {
    todos: base.length,
    pendiente: base.filter((t) => (t.estado_externo || "pendiente") === "pendiente").length,
    cubierta: base.filter((t) => t.estado_externo === "cubierta").length,
  };
}

export const PAGE_SIZE_COLA = 20;

export function paginar<T>(items: T[], pagina: number, pageSize = PAGE_SIZE_COLA) {
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaSegura - 1) * pageSize;
  return {
    items: items.slice(inicio, inicio + pageSize),
    total,
    totalPaginas,
    pagina: paginaSegura,
    inicio: total === 0 ? 0 : inicio + 1,
    fin: Math.min(inicio + pageSize, total),
  };
}
