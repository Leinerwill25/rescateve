import { NextResponse } from "next/server";
import { ashRateLimit } from "@/lib/ash-rate-limit";
import { insertAshTickets } from "@/lib/ash-submit";
import type { AshDraft } from "@/lib/ash-flow";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const draft = body.draft as AshDraft | undefined;

    if (!draft?.grupo_id || !draft.reporter_token) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    const rl = ashRateLimit(req, draft.reporter_token);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta en un momento." },
        { status: 429 }
      );
    }

    if (!draft.items?.length) {
      return NextResponse.json({ error: "No hay ítems para registrar." }, { status: 400 });
    }

    if (draft.destino_lat == null || draft.destino_lng == null) {
      return NextResponse.json({ error: "Falta la ubicación en el mapa." }, { status: 400 });
    }

    if (!draft.contacto_solicitante?.trim()) {
      return NextResponse.json({ error: "Falta un teléfono de contacto." }, { status: 400 });
    }

    if (draft.items.length > 10) {
      return NextResponse.json({ error: "Máximo 10 ítems por solicitud." }, { status: 400 });
    }

    const { ids, count } = await insertAshTickets(draft);

    if (count === 0) {
      return NextResponse.json({
        success: true,
        grupo_id: draft.grupo_id,
        ticket_ids: ids,
        count: 0,
        message: "La solicitud ya estaba registrada.",
      });
    }

    return NextResponse.json({
      success: true,
      grupo_id: draft.grupo_id,
      ticket_ids: ids,
      count,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al registrar solicitud";
    console.error("[Ash Submit]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
