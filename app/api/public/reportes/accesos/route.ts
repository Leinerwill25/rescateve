import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireReportesApiKey } from "@/lib/reportes-api-auth";

export const dynamic = "force-dynamic";

export type ReportesApiAcceso = {
  id: string;
  ip_address: string;
  user_agent: string | null;
  endpoint: string;
  metodo: string;
  autorizado: boolean;
  created_at: string;
};

/**
 * Registro de IPs y accesos a la API pública de reportes.
 * Misma autenticación que /api/public/reportes.
 */
export async function GET(req: Request) {
  const authError = await requireReportesApiKey(req, "/api/public/reportes/accesos");
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10), 1), 500);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

    const supabase = getSupabaseAdmin();
    const { data, error, count } = await supabase
      .from("reportes_api_accesos")
      .select("id,ip_address,user_agent,endpoint,metodo,autorizado,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const ipsUnicas = new Set((data || []).map((row) => row.ip_address));

    return NextResponse.json({
      success: true,
      total: count ?? 0,
      limit,
      offset,
      ips_unicas_en_pagina: ipsUnicas.size,
      accesos: (data || []) as ReportesApiAcceso[],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al consultar accesos";
    console.error("[Reportes API accesos]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
