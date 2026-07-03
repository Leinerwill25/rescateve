import { NextResponse } from "next/server";
import { isAdminApiRequest } from "@/lib/auth-admin-api";
import {
  fetchTuiaCentros,
  fetchTuiaHealth,
  fetchTuiaInsumos,
} from "@/lib/tuia911";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!(await isAdminApiRequest(req))) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") || "centros";

    const fetchedAt = new Date().toISOString();

    if (resource === "health") {
      const health = await fetchTuiaHealth();
      return NextResponse.json({ success: true, fetched_at: fetchedAt, ...health });
    }

    if (resource === "centros") {
      const result = await fetchTuiaCentros({
        limit: Number(searchParams.get("limit") || 100),
        activo: searchParams.get("activo") || undefined,
        tipo: searchParams.get("tipo") || undefined,
      });
      return NextResponse.json({
        success: true,
        fetched_at: fetchedAt,
        message: result.message,
        data: result.data,
        meta: result.meta,
      });
    }

    if (resource === "insumos") {
      const result = await fetchTuiaInsumos({
        limit: Number(searchParams.get("limit") || 100),
        offset: Number(searchParams.get("offset") || 0) || undefined,
        centro: searchParams.get("centro") || undefined,
        categoria: searchParams.get("categoria") || undefined,
        q: searchParams.get("q") || undefined,
      });
      return NextResponse.json({
        success: true,
        fetched_at: fetchedAt,
        message: result.message,
        data: result.data,
        meta: result.meta,
      });
    }

    return NextResponse.json({ error: "resource invalido" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[Tuia Acopio API]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
