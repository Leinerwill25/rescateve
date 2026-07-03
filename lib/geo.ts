/**
 * Geocodificación y distancia — 100% gratuito.
 * - Nominatim (OpenStreetMap): sin API key, política de uso 1 req/s
 * - Haversine: distancia en línea recta (km)
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "RescateVE/1.0 (logistica humanitaria; contacto@rescateve.org)";

export type GeoPoint = { lat: number; lng: number };

const memCache = new Map<string, GeoPoint | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let lastNominatimCall = 0;

/** Distancia Haversine en km (gratis, sin API externa). */
export function distanciaKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function hashQuery(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Geocodifica texto de dirección vía Nominatim (OSM, gratuito). */
export async function geocodificar(direccion: string): Promise<GeoPoint | null> {
  const key = hashQuery(direccion);
  if (!key || key.length < 5) return null;
  if (memCache.has(key)) return memCache.get(key) ?? null;

  const elapsed = Date.now() - lastNominatimCall;
  if (elapsed < 1100) await sleep(1100 - elapsed);

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", `${direccion}, Venezuela`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ve");

    lastNominatimCall = Date.now();
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      memCache.set(key, null);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || !data[0]?.lat) {
      memCache.set(key, null);
      return null;
    }

    const point: GeoPoint = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
    memCache.set(key, point);
    return point;
  } catch {
    memCache.set(key, null);
    return null;
  }
}

/** Geocodifica en lote respetando rate limit (1/s). */
export async function geocodificarLote(
  direcciones: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, GeoPoint | null>> {
  const unique = [...new Set(direcciones.map(hashQuery).filter((d) => d.length >= 5))];
  const result = new Map<string, GeoPoint | null>();

  for (let i = 0; i < unique.length; i++) {
    const q = unique[i];
    result.set(q, await geocodificar(q));
    onProgress?.(i + 1, unique.length);
  }
  return result;
}

/** Extrae punto de centro Tuia911 si tiene coords. */
export function puntoCentroTuia(c: {
  lat?: number | null;
  lng?: number | null;
  direccion?: string | null;
  estado_geo?: string | null;
  municipio?: string | null;
}): GeoPoint | null {
  if (c.lat != null && c.lng != null) return { lat: c.lat, lng: c.lng };
  return null;
}

/** Texto para geocodificar un centro Tuia911 sin coords. */
export function textoUbicacionCentro(c: {
  direccion?: string | null;
  municipio?: string | null;
  estado_geo?: string | null;
}): string {
  return [c.direccion, c.municipio, c.estado_geo].filter(Boolean).join(", ");
}
