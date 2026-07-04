import { NextResponse } from "next/server";
import { fetchReportesOperacionesData } from "@/lib/fetch-reportes-operaciones-data";
import { requireReportesApiKey } from "@/lib/reportes-api-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * API pública de reportes operacionales (protegida por REPORTES_API_KEY).
 * Header: X-Reportes-Key o Authorization: Bearer <key>
 */
export async function GET(req: Request) {
  const authError = await requireReportesApiKey(req, "/api/public/reportes");
  if (authError) return authError;

  try {
    const reporte = await fetchReportesOperacionesData();
    return NextResponse.json({ success: true, reporte });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al generar reportes";
    console.error("[Reportes API pública]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
