import { NextResponse } from "next/server";
import { isAdminApiRequest } from "@/lib/auth-admin-api";
import { cacheFetch } from "@/lib/server-cache";
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
      const health = await cacheFetch("tuia:health", () => fetchTuiaHealth(), 30_000);
      return NextResponse.json({ success: true, fetched_at: fetchedAt, ...health });
    }

    if (resource === "centros") {
      const limit = Number(searchParams.get("limit") || 100);
      const activo = searchParams.get("activo") || undefined;
      const tipo = searchParams.get("tipo") || undefined;
      const cacheKey = `tuia:centros:${limit}:${activo || ""}:${tipo || ""}`;

      const result = await cacheFetch(
        cacheKey,
        () => fetchTuiaCentros({ limit, activo, tipo }),
        45_000
      );

      return NextResponse.json({
        success: true,
        fetched_at: fetchedAt,
        message: result.message,
        data: result.data,
        meta: result.meta,
      });
    }

    if (resource === "insumos") {
      const limit = Number(searchParams.get("limit") || 100);
      const offset = Number(searchParams.get("offset") || 0) || undefined;
      const centro = searchParams.get("centro") || undefined;
      const categoria = searchParams.get("categoria") || undefined;
      const q = searchParams.get("q") || undefined;
      const cacheKey = `tuia:insumos:${limit}:${offset || 0}:${centro || ""}:${categoria || ""}:${q || ""}`;

      const result = await cacheFetch(
        cacheKey,
        () => fetchTuiaInsumos({ limit, offset, centro, categoria, q }),
        45_000
      );

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
