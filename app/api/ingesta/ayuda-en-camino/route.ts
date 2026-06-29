import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runIngestaAyudaEnCamino } from "@/lib/adapters/ayudaEnCamino";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  if (!token || (cronSecret && token === cronSecret)) {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return false;
  }

  const { data: perfil } = await getSupabaseAdmin()
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  return perfil?.rol === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    console.log("[AEC Ingestion] Iniciando corrida de ingesta...");
    const res = await runIngestaAyudaEnCamino();
    console.log(`[AEC Ingestion] Completado con éxito: +${res.nuevos} nuevos, ~${res.actualizados} actualizados, *${res.cubiertos} cubiertos.`);

    return NextResponse.json({ success: true, ...res });

  } catch (err: any) {
    console.error("[AEC Ingestion] ERROR:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
