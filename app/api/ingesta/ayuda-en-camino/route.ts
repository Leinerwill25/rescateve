import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth-api";
import { runIngestaAyudaEnCamino } from "@/lib/adapters/ayudaEnCamino";

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const session = await getApiSession(req);
  return session?.rol === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    console.log("[AEC Ingestion] Iniciando corrida de ingesta...");
    const resetCola = new URL(req.url).searchParams.get("reset") === "1";
    const res = await runIngestaAyudaEnCamino({ resetCola });
    console.log(
      `[AEC Ingestion] Completado: purga=${res.eliminados}, +${res.nuevos} nuevos, ~${res.actualizados} actualizados, *${res.cubiertos} cubiertos, API=${res.total_api}.`
    );

    return NextResponse.json({ success: true, ...res });

  } catch (err: any) {
    console.error("[AEC Ingestion] ERROR:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
