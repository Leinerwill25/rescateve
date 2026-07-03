import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/** KPIs públicos vía service role (fallback cuando el cliente anon no puede leer tickets). */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("kpis_logistica");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al calcular KPIs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
