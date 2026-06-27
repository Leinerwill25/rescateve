import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const URL = "https://yqcwttcbweqicdyfwseb.supabase.co/rest/v1";
const API_KEY = "sb_publishable_AtK5TeQlbB7N4M2o_YcaaQ_3ly_BeAQ";
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

let cache: {
  centros: any[];
  puntos: any[];
  timestamp: number;
} | null = null;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      centros: cache.centros,
      puntos: cache.puntos,
    });
  }

  try {
    const [centrosRes, puntosRes] = await Promise.all([
      fetch(`${URL}/collection_centers?is_active=eq.true&limit=1000`, {
        headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
      }),
      fetch(`${URL}/help_points?is_active=eq.true&limit=1000`, {
        headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
      }),
    ]);

    if (!centrosRes.ok || !puntosRes.ok) {
      throw new Error("Failed to fetch from external DB");
    }

    const centros = await centrosRes.json();
    const puntos = await puntosRes.json();

    cache = {
      centros,
      puntos,
      timestamp: Date.now(),
    };

    return NextResponse.json({ centros, puntos });
  } catch (error) {
    console.error("External DB Error:", error);
    if (cache) {
      return NextResponse.json({ centros: cache.centros, puntos: cache.puntos });
    }
    return NextResponse.json({ centros: [], puntos: [] }, { status: 500 });
  }
}
