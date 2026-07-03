/** Caché en memoria del servidor (TTL corto) para APIs externas lentas. */

type Entry = { data: unknown; expires: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit || hit.expires <= Date.now()) {
    if (hit) store.delete(key);
    return null;
  }
  return hit.data as T;
}

export function cacheSet(key: string, data: unknown, ttlMs = 45_000) {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 45_000
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  cacheSet(key, data, ttlMs);
  return data;
}
