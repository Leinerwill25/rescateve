import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiSession } from "@/lib/auth-api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getApiSession(req);
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
    }

    const { match_id } = await req.json();
    if (!match_id) {
      return NextResponse.json({ error: "match_id requerido" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.rpc("confirmar_match_acopio", { p_match_id: match_id });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al confirmar";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
