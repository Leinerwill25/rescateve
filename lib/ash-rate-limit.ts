/** Rate-limit simple en memoria (por IP o token). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= maxRequests) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true };
}

function clientKey(req: Request, reporterToken?: string): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  return reporterToken ? `tok:${reporterToken}` : `ip:${ip}`;
}

export function ashRateLimit(req: Request, reporterToken?: string) {
  return checkRateLimit(clientKey(req, reporterToken), 30, 60_000);
}

export function ashAiRateLimit(req: Request, reporterToken?: string) {
  return checkRateLimit(`ai:${clientKey(req, reporterToken)}`, 12, 60_000);
}
