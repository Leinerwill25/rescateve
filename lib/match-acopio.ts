import type { TuiaCentro, TuiaInsumo } from "@/lib/tuia911";
import {
  distanciaKm,
  geocodificar,
  GeoPoint,
  puntoCentroTuia,
  textoUbicacionCentro,
} from "@/lib/geo";

export type AecNeedParsed = {
  articulo: string;
  cantidad: number | null;
  organizacion: string;
  ubicacion: string;
  contactoNombre: string | null;
  contactoTel: string | null;
  contactoEmail: string | null;
  categoria: string | null;
};

export type MatchInsumoSugerido = {
  centro_id: string;
  centro_nombre: string;
  centro_telefono: string | null;
  centro_direccion: string | null;
  centro_lat: number | null;
  centro_lng: number | null;
  articulo: string;
  categoria: string;
  disponible: number;
  unidad: string;
  distancia_km: number | null;
  score: number;
  stock_suficiente: boolean;
};

const STOP_WORDS = new Set([
  "de", "la", "el", "en", "y", "a", "los", "las", "un", "una", "del", "con", "para", "por",
]);

const CATEGORIA_MAP: Record<string, string[]> = {
  medicinas: ["medicina"],
  medicina: ["medicina"],
  alimentos: ["alimento"],
  alimento: ["alimento"],
  agua: ["agua"],
  higiene: ["lenceria", "alimento"],
  otro: [],
};

export function parseAecDescripcion(descripcion: string): Partial<AecNeedParsed> {
  const articuloMatch = descripcion.match(/\[Artículo:\s*([^\]]+)\]/i);
  const cantMatch = descripcion.match(/Cantidad:\s*([\d.,]+)/i);
  const orgMatch = descripcion.match(/Organización:\s*(.+)$/i);

  return {
    articulo: articuloMatch?.[1]?.trim() || descripcion.slice(0, 120),
    cantidad: cantMatch ? parseFloat(cantMatch[1].replace(",", ".")) : null,
    organizacion: orgMatch?.[1]?.trim() || "Organización AEC",
  };
}

export function parseAecFromApiItem(item: {
  nombreArticulo?: string;
  cantidadNecesaria?: number;
  categoria?: string;
  organizacion?: {
    nombre?: string;
    estado?: string;
    ciudad?: string;
    direccion?: string;
    contactoNombre?: string;
    contactoTelefono?: string;
    contactoEmail?: string;
  };
}): AecNeedParsed {
  const org = item.organizacion || {};
  const ubicacion = [org.ciudad, org.estado, org.direccion ? `Dir: ${org.direccion}` : null]
    .filter(Boolean)
    .join(", ");

  return {
    articulo: item.nombreArticulo || "Artículo",
    cantidad: item.cantidadNecesaria ?? null,
    organizacion: org.nombre || "Organización",
    ubicacion,
    contactoNombre: org.contactoNombre || null,
    contactoTel: org.contactoTelefono || null,
    contactoEmail: org.contactoEmail || null,
    categoria: item.categoria || null,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreTexto(needTokens: string[], articulo: string): number {
  if (!needTokens.length) return 0;
  const artTokens = new Set(tokenize(articulo));
  let hits = 0;
  for (const t of needTokens) {
    if (artTokens.has(t)) hits++;
    else if ([...artTokens].some((a) => a.includes(t) || t.includes(a))) hits += 0.5;
  }
  return Math.min(1, hits / Math.min(needTokens.length, 5));
}

function scoreUbicacionTexto(needUbic: string, centro: TuiaCentro): number {
  const n = needUbic.toLowerCase();
  let s = 0;
  if (centro.municipio && n.includes(centro.municipio.toLowerCase().replace(/,/g, ""))) s += 0.4;
  if (centro.estado_geo && n.includes(centro.estado_geo.toLowerCase().split(",")[0])) s += 0.3;
  return Math.min(1, s);
}

function scoreDistancia(km: number | null): number {
  if (km == null) return 0.15;
  if (km <= 5) return 1;
  if (km <= 15) return 0.8;
  if (km <= 30) return 0.6;
  if (km <= 60) return 0.4;
  if (km <= 100) return 0.2;
  return 0.05;
}

export async function resolverPuntoDestino(ubicacion: string): Promise<GeoPoint | null> {
  return geocodificar(ubicacion);
}

const centroGeoCache = new Map<string, GeoPoint | null>();

export async function resolverPuntoCentro(centro: TuiaCentro): Promise<GeoPoint | null> {
  const direct = puntoCentroTuia(centro);
  if (direct) return direct;

  if (centroGeoCache.has(centro.id)) return centroGeoCache.get(centro.id) ?? null;

  const texto = textoUbicacionCentro(centro);
  const pt = texto.length >= 5 ? await geocodificar(texto) : null;
  centroGeoCache.set(centro.id, pt);
  return pt;
}

export async function calcularMatches(
  need: AecNeedParsed,
  insumos: TuiaInsumo[],
  centros: TuiaCentro[],
  destino: GeoPoint | null,
  limit = 5
): Promise<MatchInsumoSugerido[]> {
  const centrosMap = new Map(centros.map((c) => [c.id, c]));
  const needTokens = tokenize(need.articulo);
  const catsNeed = CATEGORIA_MAP[need.categoria?.toLowerCase() || ""] || [];

  const candidatos: MatchInsumoSugerido[] = [];

  for (const ins of insumos) {
    if (ins.disponible <= 0) continue;

    const centro = centrosMap.get(ins.centro_id);
    if (!centro || !centro.activo) continue;

    const textScore = scoreTexto(needTokens, ins.articulo);
    if (textScore < 0.15 && catsNeed.length && !catsNeed.includes(ins.categoria)) continue;
    if (textScore < 0.1 && !catsNeed.includes(ins.categoria)) continue;

    let distKm: number | null = null;
    if (destino) {
      const origen = await resolverPuntoCentro(centro);
      if (origen) distKm = Math.round(distanciaKm(origen, destino) * 10) / 10;
    }

    const catBonus = catsNeed.includes(ins.categoria) ? 0.15 : 0;
    const locText = scoreUbicacionTexto(need.ubicacion, centro);
    const distScore = scoreDistancia(distKm);
    const stockOk = need.cantidad == null || ins.disponible >= need.cantidad;
    const stockBonus = stockOk ? 0.1 : -0.2;

    const score =
      textScore * 0.45 +
      distScore * 0.3 +
      locText * 0.15 +
      catBonus +
      stockBonus;

    if (score < 0.12) continue;

    candidatos.push({
      centro_id: ins.centro_id,
      centro_nombre: ins.centro_nombre || centro.nombre,
      centro_telefono: centro.telefono,
      centro_direccion: centro.direccion,
      centro_lat: centro.lat,
      centro_lng: centro.lng,
      articulo: ins.articulo,
      categoria: ins.categoria,
      disponible: ins.disponible,
      unidad: ins.unidad,
      distancia_km: distKm,
      score: Math.round(score * 100) / 100,
      stock_suficiente: stockOk,
    });
  }

  candidatos.sort((a, b) => b.score - a.score || (a.distancia_km ?? 999) - (b.distancia_km ?? 999));

  const seen = new Set<string>();
  const deduped: MatchInsumoSugerido[] = [];
  for (const c of candidatos) {
    const key = `${c.centro_id}:${c.articulo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
    if (deduped.length >= limit) break;
  }

  return deduped;
}
