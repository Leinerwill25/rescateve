import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getApiSession } from "@/lib/auth-api";
import { cacheFetch } from "@/lib/server-cache";
import { fetchTuiaCentros, fetchTuiaInsumos } from "@/lib/tuia911";
import {
  buildCentroPointsMap,
  calcularMatches,
  detectTicketOrigenMatch,
  mergeNeedWithTicket,
  parseAecDescripcion,
  parseAecFromApiItem,
  parseAshTicketNeed,
  parseTrasladoTicketNeed,
  type TicketOrigenMatch,
} from "@/lib/match-acopio";
import { AEC_NEEDS_URL, getAecApiHeaders } from "@/lib/aec-api";
import { distanciaKm, geocodificar, GeoPoint } from "@/lib/geo";

/** Radio (km) para considerar una necesidad "cerca" del transportista. */
const RADIO_CERCA_KM = 40;
/** Máximo de necesidades cercanas a mostrar al transportista. */
const MAX_CERCANOS = 20;
/** Fallback cuando no hay ninguna necesidad cerca. */
const MAX_VARIADOS = 10;

type TicketMatchRow = {
  id: string;
  fuente: string;
  fuente_id?: string | null;
  descripcion: string;
  cuando?: string | null;
  destino_lat: number | null;
  destino_lng: number | null;
  origen_lat: number | null;
  origen_lng: number | null;
};

/** Selección variada: intercala necesidades de distintos orígenes (AEC, Ash, traslado). */
function seleccionVariada<T extends TicketMatchRow>(tickets: T[], max: number): T[] {
  const grupos: Record<TicketOrigenMatch, T[]> = { aec: [], ash: [], traslado: [] };
  for (const t of tickets) {
    const origen = detectTicketOrigenMatch(t);
    (grupos[origen] ?? grupos.aec).push(t);
  }
  const orden: TicketOrigenMatch[] = ["traslado", "ash", "aec"];
  const resultado: T[] = [];
  let quedan = true;
  while (resultado.length < max && quedan) {
    quedan = false;
    for (const origen of orden) {
      const grupo = grupos[origen];
      if (grupo.length > 0) {
        resultado.push(grupo.shift()!);
        quedan = true;
        if (resultado.length >= max) break;
      }
    }
  }
  return resultado;
}

function ticketCoords(t: TicketMatchRow): GeoPoint | null {
  const lat = t.destino_lat ?? t.origen_lat;
  const lng = t.destino_lng ?? t.origen_lng;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

const TICKET_COLS =
  "id,descripcion,estado,fuente,fuente_url,prioridad,fuente_id,ubicacion_externa,contacto_solicitante,categoria_externa,categoria_sugerida,categoria_final,cantidad,origen_ref,destino_ref,origen_lat,origen_lng,destino_lat,destino_lng,transporte_id";

async function fetchAecNeedsEnriched() {
  return cacheFetch(
    "aec:needs",
    async () => {
      try {
        const res = await fetch(AEC_NEEDS_URL, {
          headers: getAecApiHeaders(),
          next: { revalidate: 60 },
        });
        if (!res.ok) return new Map<string, ReturnType<typeof parseAecFromApiItem>>();
        const data = await res.json();
        if (!Array.isArray(data)) return new Map();
        const map = new Map<string, ReturnType<typeof parseAecFromApiItem>>();
        for (const item of data) {
          if (item.status === "cumplida") continue;
          map.set(String(item.id), parseAecFromApiItem(item));
        }
        return map;
      } catch {
        return new Map();
      }
    },
    60_000
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Error desconocido";
}

async function fetchTicketsAshTraslado(supabase: SupabaseClient, limit: number) {
  const estados = ["en_validacion", "aprobado", "asignado"];
  const perSource = Math.ceil(limit / 2);

  const [ashRes, trasladoRes] = await Promise.all([
    supabase
      .from("tickets")
      .select(TICKET_COLS)
      .eq("fuente", "publico")
      .like("fuente_id", "ash:%")
      .in("estado", estados)
      .neq("estado", "completado")
      .order("prioridad", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("tickets")
      .select(TICKET_COLS)
      .eq("fuente", "traslado")
      .in("estado", estados)
      .order("prioridad", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(perSource),
  ]);

  if (ashRes.error) throw ashRes.error;
  if (trasladoRes.error) throw trasladoRes.error;

  const seen = new Set<string>();
  const merged: typeof ashRes.data = [];
  for (const t of [...(ashRes.data || []), ...(trasladoRes.data || [])]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    merged.push(t);
  }
  return merged;
}

async function fetchTicketsAecPendientes(
  supabase: SupabaseClient,
  limit: number
) {
  let query = supabase
    .from("tickets")
    .select(TICKET_COLS)
    .eq("fuente", "ayuda_en_camino")
    .neq("estado", "completado")
    .neq("estado", "rechazado")
    .order("prioridad", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const withExterno = await query.eq("estado_externo", "pendiente");

  if (!withExterno.error) {
    return { data: withExterno.data || [], degraded: false };
  }

  if (withExterno.error.code === "42703") {
    const fallback = await supabase
      .from("tickets")
      .select(TICKET_COLS)
      .eq("fuente", "ayuda_en_camino")
      .neq("estado", "completado")
      .neq("estado", "rechazado")
      .order("prioridad", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallback.error) throw fallback.error;
    return { data: fallback.data || [], degraded: true };
  }

  throw withExterno.error;
}

async function fetchReclamosActivos(supabase: SupabaseClient) {
  const res = await supabase
    .from("match_traslados_acopio")
    .select("id,ticket_id,estado,perfil_id,tuia_centro_nombre,tuia_centro_tel,tuia_articulo,distancia_km,reclamado_at,perfil:perfiles!perfil_id(nombre),transporte:transportes!transporte_id(nombre)")
    .in("estado", ["reclamado", "confirmado", "en_camino"])
    .order("reclamado_at", { ascending: false });

  if (res.error) {
    if (res.error.code === "PGRST205" || res.error.code === "42P01") {
      return { data: [] as never[], degraded: true };
    }
    throw res.error;
  }
  return { data: res.data || [], degraded: false };
}

async function fetchTuiaData() {
  return cacheFetch(
    "tuia:centros+insumos",
    async () => {
      const [centrosRes, insumosRes] = await Promise.all([
        fetchTuiaCentros({ limit: 100, tipo: "acopio" }),
        fetchTuiaInsumos({ limit: 200 }),
      ]);
      return {
        centros: centrosRes.data || [],
        insumos: insumosRes.data || [],
      };
    },
    45_000
  );
}

export async function GET(req: Request) {
  try {
    const session = await getApiSession(req);
    if (!session || (session.rol !== "admin" && session.rol !== "transportista")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const esTransportista = session.rol === "transportista";
    const { searchParams } = new URL(req.url);
    const limitNeeds = Math.min(Number(searchParams.get("limit") || 20), 50);
    const geocode = searchParams.get("geocode") === "true";

    const latParam = Number(searchParams.get("lat"));
    const lngParam = Number(searchParams.get("lng"));
    const origenTransportista: GeoPoint | null =
      Number.isFinite(latParam) && Number.isFinite(lngParam)
        ? { lat: latParam, lng: lngParam }
        : null;

    // El transportista rankea por cercanía sobre un pool más amplio de candidatos.
    const fetchLimit = esTransportista ? 50 : limitNeeds;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [ticketsPack, ashTrasladoTickets, reclamosPack, tuiaData, aecApi] = await Promise.all([
      fetchTicketsAecPendientes(supabase, fetchLimit),
      fetchTicketsAshTraslado(supabase, fetchLimit),
      fetchReclamosActivos(supabase),
      fetchTuiaData().catch(() => ({ centros: [] as never[], insumos: [] as never[] })),
      fetchAecNeedsEnriched(),
    ]);

    const ticketsRes = [...(ticketsPack.data || []), ...ashTrasladoTickets];
    const reclamos = reclamosPack.data;
    const schemaDegraded = ticketsPack.degraded || reclamosPack.degraded;
    const aecMap = aecApi;
    const centros = tuiaData.centros;
    const insumos = tuiaData.insumos;
    const reclamosByTicket = new Map(reclamos.map((r) => [r.ticket_id, r]));

    let descartadosConTransportista = 0;
    let descartadosSinAecApi = 0;

    const ticketsFiltrados = ticketsPack.degraded
      ? (ticketsRes || []).filter((t) => {
          const origen = detectTicketOrigenMatch(t);
          if (origen === "ash" || origen === "traslado") return true;
          const keep = !t.fuente_id || aecMap.has(t.fuente_id);
          if (!keep) descartadosSinAecApi++;
          return keep;
        })
      : (ticketsRes || []).filter((t) => {
          if (t.transporte_id && !reclamosByTicket.has(t.id)) {
            descartadosConTransportista++;
            return false;
          }
          return true;
        });

    // Ranking por cercanía para transportista:
    //  - Con ubicación: hasta 20 necesidades dentro del radio, ordenadas por distancia.
    //  - Sin ninguna cerca (o sin ubicación): 10 necesidades variadas.
    const distanciaByTicket = new Map<string, number>();
    let seleccionModo: "cercania" | "variado" | "todos" = "todos";
    let ticketsParaMostrar = ticketsFiltrados;

    if (esTransportista) {
      if (origenTransportista) {
        const conDistancia: Array<{ ticket: (typeof ticketsFiltrados)[number]; dist: number }> = [];
        for (const t of ticketsFiltrados) {
          const coords = ticketCoords(t);
          if (!coords) continue;
          const dist = distanciaKm(origenTransportista, coords);
          distanciaByTicket.set(t.id, Math.round(dist * 10) / 10);
          conDistancia.push({ ticket: t, dist });
        }
        const cercanos = conDistancia
          .filter((c) => c.dist <= RADIO_CERCA_KM)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, MAX_CERCANOS);

        if (cercanos.length > 0) {
          seleccionModo = "cercania";
          ticketsParaMostrar = cercanos.map((c) => c.ticket);
        } else {
          seleccionModo = "variado";
          ticketsParaMostrar = seleccionVariada(ticketsFiltrados, MAX_VARIADOS);
        }
      } else {
        seleccionModo = "variado";
        ticketsParaMostrar = seleccionVariada(ticketsFiltrados, MAX_VARIADOS);
      }
    }

    const needsByTicket = new Map<string, ReturnType<typeof parseAecFromApiItem>>();
    const origenByTicket = new Map<string, TicketOrigenMatch>();

    for (const ticket of ticketsParaMostrar) {
      const origen = detectTicketOrigenMatch(ticket);
      origenByTicket.set(ticket.id, origen);

      if (origen === "ash") {
        needsByTicket.set(ticket.id, mergeNeedWithTicket(parseAshTicketNeed(ticket), ticket));
      } else if (origen === "traslado") {
        needsByTicket.set(ticket.id, mergeNeedWithTicket(parseTrasladoTicketNeed(ticket), ticket));
      } else {
        const aecNeed = aecMap.get(ticket.fuente_id || "");
        if (aecNeed) {
          needsByTicket.set(ticket.id, mergeNeedWithTicket(aecNeed, ticket));
        } else {
          const parsed = parseAecDescripcion(ticket.descripcion);
          needsByTicket.set(
            ticket.id,
            mergeNeedWithTicket(
              {
                articulo: parsed.articulo || ticket.descripcion,
                cantidad: parsed.cantidad ?? null,
                cantidadTexto: parsed.cantidadTexto ?? null,
                organizacion: parsed.organizacion || "Organización AEC",
                ubicacion: "",
                contactoNombre: null,
                contactoTel: null,
                contactoEmail: null,
                categoria: ticket.categoria_externa ?? null,
              },
              ticket
            )
          );
        }
      }
    }

    const destinoCache = new Map<string, GeoPoint | null>();
    if (geocode) {
      const uniqueUbic = [...new Set([...needsByTicket.values()].map((n) => n.ubicacion).filter((u) => u.length >= 5))].slice(0, 6);
      for (const ub of uniqueUbic) {
        destinoCache.set(ub, await geocodificar(ub));
      }
    }

    const centroPoints = await buildCentroPointsMap(centros, geocode, geocode ? 5 : 0);

    const items = [];

    for (const ticket of ticketsParaMostrar) {
      const need = needsByTicket.get(ticket.id);
      if (!need) continue;
      const destino = geocode && need.ubicacion ? destinoCache.get(need.ubicacion) ?? null : null;
      const ticketLat = ticket.destino_lat ?? ticket.origen_lat ?? null;
      const ticketLng = ticket.destino_lng ?? ticket.origen_lng ?? null;

      const matches = await calcularMatches(need, insumos, centros, destino, centroPoints, 5);

      items.push({
        ticket: {
          id: ticket.id,
          descripcion: ticket.descripcion,
          estado: ticket.estado,
          fuente_url: ticket.fuente_url,
          prioridad: ticket.prioridad,
        },
        origen: origenByTicket.get(ticket.id) || "aec",
        distancia_origen_km: distanciaByTicket.get(ticket.id) ?? null,
        need,
        destino_lat: destino?.lat ?? ticketLat,
        destino_lng: destino?.lng ?? ticketLng,
        matches,
        reclamo: reclamosByTicket.get(ticket.id) || null,
      });
    }

    if (seleccionModo === "cercania") {
      // Prioriza las necesidades más cercanas al transportista.
      items.sort((a, b) => {
        const da = a.distancia_origen_km ?? Number.POSITIVE_INFINITY;
        const db = b.distancia_origen_km ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else {
      items.sort((a, b) => {
        const scoreA = a.matches[0]?.score ?? 0;
        const scoreB = b.matches[0]?.score ?? 0;
        return scoreB - scoreA;
      });
    }

    const conMatchAutomatico = items.filter((i) => i.matches.length > 0).length;
    const aecPendientes = ticketsPack.data?.length ?? 0;
    const ashTraslado = ashTrasladoTickets.length;

    return NextResponse.json({
      success: true,
      fetched_at: new Date().toISOString(),
      geocoding: geocode ? "nominatim_osm_gratis" : "skipped_fast",
      schema_degraded: schemaDegraded,
      schema_hint: schemaDegraded
        ? "Ejecute migraciones 20260629_ingesta_ayuda_en_camino.sql y 20260716_match_acopio_aec_tuia.sql en Supabase."
        : null,
      total: items.length,
      reclamos_activos: reclamos.length,
      diagnostico: {
        aec_pendientes: aecPendientes,
        ash_traslado: ashTraslado,
        total_candidatos: ticketsRes.length,
        descartados_con_transportista: descartadosConTransportista,
        descartados_sin_aec_api: descartadosSinAecApi,
        con_match_automatico: conMatchAutomatico,
        sin_match_automatico: items.length - conMatchAutomatico,
        mostrados: items.length,
        seleccion_modo: seleccionModo,
        con_ubicacion: !!origenTransportista,
        radio_km: RADIO_CERCA_KM,
        insumos_tuia: insumos.length,
        centros_tuia: centros.length,
      },
      items,
    });
  } catch (err: unknown) {
    const message = extractError(err);
    console.error("[Match Acopio]", message, err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
