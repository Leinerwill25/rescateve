import { getSupabaseAdmin } from "@/lib/supabase-admin";

const KEY_HEADER = "x-reportes-key";

export function getReportesApiKey(): string {
  return process.env.REPORTES_API_KEY?.trim() || "";
}

export function extractReportesApiKey(req: Request): string | null {
  const header = req.headers.get(KEY_HEADER)?.trim();
  if (header) return header;

  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const url = new URL(req.url);
  return url.searchParams.get("key")?.trim() || null;
}

export function validateReportesApiKey(req: Request): boolean {
  const expected = getReportesApiKey();
  if (!expected) return false;
  const provided = extractReportesApiKey(req);
  return !!provided && provided === expected;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export async function logReportesApiAccess(options: {
  req: Request;
  endpoint: string;
  autorizado: boolean;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const userAgent = options.req.headers.get("user-agent");
    await supabase.from("reportes_api_accesos").insert({
      ip_address: getClientIp(options.req),
      user_agent: userAgent ? userAgent.slice(0, 500) : null,
      endpoint: options.endpoint,
      metodo: options.req.method,
      autorizado: options.autorizado,
    });
  } catch (err) {
    console.warn("[Reportes API] No se pudo registrar acceso:", err);
  }
}

export async function requireReportesApiKey(
  req: Request,
  endpoint: string
): Promise<Response | null> {
  if (!getReportesApiKey()) {
    return new Response(
      JSON.stringify({ error: "API de reportes no configurada en el servidor." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const autorizado = validateReportesApiKey(req);
  await logReportesApiAccess({ req, endpoint, autorizado });

  if (!autorizado) {
    return new Response(JSON.stringify({ error: "Clave de API inválida o ausente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
