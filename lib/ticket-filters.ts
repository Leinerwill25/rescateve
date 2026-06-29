import { Ticket } from "@/lib/types-operations";

export type FiltroOrigen = "todos" | "traslados" | "ayuda_en_camino";
export type FiltroExterno = "todos" | "pendiente" | "cubierta";
export type FiltroOrden = "recientes" | "importantes" | "criticos";

export type TrasladoFilterContext = {
  /** IDs de traslados creados desde la página pública (tienen reporter_token). */
  idsTrasladoPublico: Set<string>;
};

const EMPTY_CTX: TrasladoFilterContext = { idsTrasladoPublico: new Set() };

const MS_24H = 24 * 60 * 60 * 1000;

/**
 * Traslado logístico real:
 * - Ticket importado de un traslado público (fuente=traslado + reporter_token en traslados)
 * - Ticket manual marcado como traslado en operaciones (fuente=manual + cuando)
 */
export function esTicketTraslado(
  t: Ticket,
  ctx: TrasladoFilterContext = EMPTY_CTX
): boolean {
  if (t.fuente === "traslado") {
    return ctx.idsTrasladoPublico.has(t.id);
  }
  if (t.fuente === "manual" && t.cuando) {
    return true;
  }
  return false;
}

export function esTicketAEC(t: Ticket): boolean {
  return t.fuente === "ayuda_en_camino";
}

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
  filtroOrden: FiltroOrden,
  ctx: TrasladoFilterContext = EMPTY_CTX
): Ticket[] {
  let result = tickets.filter((t) => {
    if (filtroOrigen === "traslados" && !esTicketTraslado(t, ctx)) return false;
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

export function contarPorOrigen(
  tickets: Ticket[],
  ctx: TrasladoFilterContext = EMPTY_CTX
) {
  const traslados = tickets.filter((t) => esTicketTraslado(t, ctx)).length;
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

/** Construye el contexto de filtro a partir de IDs de traslados públicos. */
export function buildTrasladoCtx(ids: string[]): TrasladoFilterContext {
  return { idsTrasladoPublico: new Set(ids) };
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
