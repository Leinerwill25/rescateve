import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiSession } from "@/lib/auth-api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getApiSession(req);
    if (!session || session.rol !== "transportista") {
      return NextResponse.json({ error: "Solo transportistas pueden responder reclamos." }, { status: 403 });
    }

    const body = await req.json();
    const { match_id, aceptar, nota } = body;

    if (!match_id) {
      return NextResponse.json({ error: "Falta match_id." }, { status: 400 });
    }

    if (aceptar !== true && aceptar !== false) {
      return NextResponse.json({ error: "Indique aceptar: true o false." }, { status: 400 });
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

    const { error } = await supabase.rpc("responder_reclamo_acopio", {
      p_match_id: match_id,
      p_aceptar: aceptar,
      p_nota: nota || null,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al responder reclamo";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
