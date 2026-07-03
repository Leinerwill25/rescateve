export const TUIA911_BASE = process.env.TUIA911_API_BASE || "https://api.tuia911.com";

export type TuiaCentro = {
  id: string;
  nombre: string;
  tipo: "acopio" | "atencion" | string;
  estado_geo: string | null;
  municipio: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  telefono: string | null;
  activo: boolean;
  created_at: string;
};

export type TuiaInsumo = {
  centro_id: string;
  centro_nombre: string;
  articulo: string;
  categoria: string;
  subcategoria: string | null;
  unidad: string;
  disponible: number;
};

export type TuiaMeta = {
  limit: number;
  offset: number;
  count: number;
  has_more: boolean;
};

export type TuiaResponse<T> = {
  message: string;
  data: T;
  meta?: TuiaMeta;
};

function getApiKey(): string {
  const key = process.env.TUIA911_API_KEY;
  if (!key) {
    throw new Error("TUIA911_API_KEY no configurada en el servidor.");
  }
  return key;
}

export async function fetchTuia911<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<TuiaResponse<T>> {
  const url = new URL(path, TUIA911_BASE);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": getApiKey() },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tuia911 ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<TuiaResponse<T>>;
}

export async function fetchTuiaHealth() {
  const res = await fetch(`${TUIA911_BASE}/`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Tuia911 health ${res.status}`);
  return res.json() as Promise<TuiaResponse<{ status: string }>>;
}

export async function fetchTuiaCentros(params?: {
  limit?: number;
  activo?: string;
  tipo?: string;
}) {
  return fetchTuia911<TuiaCentro[]>("/api/centros", {
    limit: params?.limit ?? 100,
    activo: params?.activo,
    tipo: params?.tipo,
  });
}

export async function fetchTuiaInsumos(params?: {
  limit?: number;
  offset?: number;
  centro?: string;
  categoria?: string;
  q?: string;
}) {
  return fetchTuia911<TuiaInsumo[]>("/api/insumos", {
    limit: params?.limit ?? 100,
    offset: params?.offset,
    centro: params?.centro,
    categoria: params?.categoria,
    q: params?.q,
  });
}
