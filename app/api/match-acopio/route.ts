import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getApiSession } from "@/lib/auth-api";
import { cacheFetch } from "@/lib/server-cache";
import { fetchTuiaCentros, fetchTuiaInsumos } from "@/lib/tuia911";
import {
  buildCentroPointsMap,
  calcularMatches,
  mergeNeedWithTicket,
  parseAecDescripcion,
  parseAecFromApiItem,
} from "@/lib/match-acopio";
import { geocodificar, GeoPoint } from "@/lib/geo";

const TICKET_COLS =
  "id,descripcion,estado,fuente_url,prioridad,fuente_id,ubicacion_externa,contacto_solicitante,categoria_externa,cantidad,origen_ref,destino_ref,origen_lat,origen_lng,destino_lat,destino_lng";

async function fetchAecNeedsEnriched() {
  return cacheFetch(
    "aec:needs",
    async () => {
      try {
        const res = await fetch("https://ayudaencamino.com/api/needs", {
          headers: { "User-Agent": "RescateVE-Match/1.0 (+https://rescate-ve.vercel.app)" },
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
    .select("id,ticket_id,estado,tuia_centro_nombre,tuia_articulo,distancia_km,reclamado_at,perfil:perfiles!perfil_id(nombre),transporte:transportes!transporte_id(nombre)")
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

    const { searchParams } = new URL(req.url);
    const limitNeeds = Math.min(Number(searchParams.get("limit") || 20), 50);
    const geocode = searchParams.get("geocode") === "true";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [ticketsPack, reclamosPack, tuiaData, aecApi] = await Promise.all([
      fetchTicketsAecPendientes(supabase, limitNeeds),
      fetchReclamosActivos(supabase),
      fetchTuiaData().catch(() => ({ centros: [] as never[], insumos: [] as never[] })),
      fetchAecNeedsEnriched(),
    ]);

    const ticketsRes = ticketsPack.data;
    const reclamos = reclamosPack.data;
    const schemaDegraded = ticketsPack.degraded || reclamosPack.degraded;
    const aecMap = aecApi;
    const centros = tuiaData.centros;
    const insumos = tuiaData.insumos;
    const reclamosByTicket = new Map(reclamos.map((r) => [r.ticket_id, r]));

    const ticketsFiltrados = ticketsPack.degraded
      ? (ticketsRes || []).filter((t) => !t.fuente_id || aecMap.has(t.fuente_id))
      : ticketsRes || [];

    const needsByTicket = new Map<string, ReturnType<typeof parseAecFromApiItem>>();
    for (const ticket of ticketsFiltrados) {
      const aecNeed = aecMap.get(ticket.fuente_id || "");
      if (aecNeed) {
        needsByTicket.set(
          ticket.id,
          mergeNeedWithTicket(aecNeed, ticket)
        );
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

    const destinoCache = new Map<string, GeoPoint | null>();
    if (geocode) {
      const uniqueUbic = [...new Set([...needsByTicket.values()].map((n) => n.ubicacion).filter((u) => u.length >= 5))].slice(0, 6);
      for (const ub of uniqueUbic) {
        destinoCache.set(ub, await geocodificar(ub));
      }
    }

    const centroPoints = await buildCentroPointsMap(centros, geocode, geocode ? 5 : 0);

    const items = [];

    for (const ticket of ticketsFiltrados) {
      const need = needsByTicket.get(ticket.id)!;
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
        need,
        destino_lat: destino?.lat ?? ticketLat,
        destino_lng: destino?.lng ?? ticketLng,
        matches,
        reclamo: reclamosByTicket.get(ticket.id) || null,
      });
    }

    items.sort((a, b) => {
      const scoreA = a.matches[0]?.score ?? 0;
      const scoreB = b.matches[0]?.score ?? 0;
      return scoreB - scoreA;
    });

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
      items,
    });
  } catch (err: unknown) {
    const message = extractError(err);
    console.error("[Match Acopio]", message, err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
