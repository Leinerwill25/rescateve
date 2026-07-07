import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiSession } from "@/lib/auth-api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getApiSession(req);
    if (!session || session.rol !== "transportista") {
      return NextResponse.json({ error: "Solo transportistas pueden reclamar traslados." }, { status: 403 });
    }

    const body = await req.json();
    const {
      ticket_id,
      tuia_centro_id,
      tuia_centro_nombre,
      tuia_centro_tel,
      tuia_articulo,
      tuia_disponible,
      tuia_unidad,
      distancia_km,
      score_match,
      tuia_centro_lat,
      tuia_centro_lng,
    } = body;

    if (!ticket_id || !tuia_centro_id || !tuia_articulo) {
      return NextResponse.json({ error: "Faltan datos del match." }, { status: 400 });
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

    const { data, error } = await supabase.rpc("reclamar_match_acopio", {
      p_ticket_id: ticket_id,
      p_tuia_centro_id: tuia_centro_id,
      p_tuia_centro_nombre: tuia_centro_nombre || null,
      p_tuia_centro_tel: tuia_centro_tel || null,
      p_tuia_articulo: tuia_articulo,
      p_tuia_disponible: tuia_disponible ?? null,
      p_tuia_unidad: tuia_unidad || null,
      p_distancia_km: distancia_km ?? null,
      p_score_match: score_match ?? null,
      p_tuia_centro_lat: tuia_centro_lat ?? null,
      p_tuia_centro_lng: tuia_centro_lng ?? null,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, match_id: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al reclamar";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
