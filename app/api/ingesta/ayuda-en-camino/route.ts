import { NextResponse } from "next/server";
import { runIngestaAyudaEnCamino } from "@/lib/adapters/ayudaEnCamino";

export async function GET(req: Request) {
  try {
    // 1. Validar cabecera de autorización para Vercel Cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    console.log("[AEC Ingestion Cron] Iniciando corrida de ingesta...");
    const res = await runIngestaAyudaEnCamino();
    console.log(`[AEC Ingestion Cron] Completado con éxito: +${res.nuevos} nuevos, ~${res.actualizados} actualizados, *${res.cubiertos} cubiertos.`);

    return NextResponse.json({ success: true, ...res });

  } catch (err: any) {
    console.error("[AEC Ingestion Cron] ERROR:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
