import { NextResponse } from "next/server";
import { ashAiRateLimit, ashRateLimit } from "@/lib/ash-rate-limit";
import { ashParseFreeText, ashToneReply } from "@/lib/ash-gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, message, step, reporter_token } = body as {
      action?: "tone" | "parse";
      message?: string;
      step?: string;
      reporter_token?: string;
    };

    const rl = ashRateLimit(req, reporter_token);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec || 60) } }
      );
    }

    const text = String(message || "").trim().slice(0, 2000);
    if (!text) {
      return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
    }

    const aiRl = ashAiRateLimit(req, reporter_token);
    if (!aiRl.ok) {
      return NextResponse.json({
        success: true,
        fallback: true,
        message: null,
        parsed: null,
      });
    }

    if (action === "parse") {
      const parsed = await ashParseFreeText(text);
      return NextResponse.json({ success: true, parsed, fallback: !parsed });
    }

    const reply = await ashToneReply(text, step || "greeting");
    return NextResponse.json({
      success: true,
      message: reply,
      fallback: !reply,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    console.error("[Ash API]", msg);
    return NextResponse.json({ success: true, fallback: true, message: null });
  }
}
