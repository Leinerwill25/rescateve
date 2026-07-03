import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiSession } from "@/lib/auth-api";
import { computeReportesOperaciones, type InventarioRow } from "@/lib/operaciones-reportes";
import { fetchTuiaInsumos } from "@/lib/tuia911";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TICKET_COLS =
  "id,created_at,updated_at,fuente,fuente_id,descripcion,cantidad,estado,categoria_externa,ubicacion_externa,estado_externo,origen_ref,origen_lat,origen_lng,destino_ref,destino_lat,destino_lng,transporte_id,capturado_at,evidencia_entrega_url";
export async function GET(req: Request) {
  try {
    const session = await getApiSession(req);
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "Solo administradores pueden ver reportes." }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Falta configuración de Supabase en el servidor." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [ticketsRes, historialRes, transportesRes, matchesRes, gasolinaRes, inventarioRes] =
      await Promise.all([
        admin.from("tickets").select(TICKET_COLS).order("created_at", { ascending: false }).limit(5000),
        admin
          .from("ticket_historial")
          .select("ticket_id,created_at,accion,a_valor")
          .order("created_at", { ascending: false })
          .limit(15000),
        admin.from("transportes").select("id,nombre,activo"),
        admin
          .from("match_traslados_acopio")
          .select("ticket_id,transporte_id,estado,distancia_km,tuia_articulo"),
        admin
          .from("solicitudes_gasolina")
          .select("id,ticket_id,transporte_id,litros,estado,created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        admin
          .from("inventario_acopio")
          .select("item,cantidad,unidad,actualizado_at,centro:centros_acopio(nombre)")
          .order("actualizado_at", { ascending: false })
          .limit(500),
      ]);

    if (ticketsRes.error) throw ticketsRes.error;
    if (historialRes.error) throw historialRes.error;
    if (transportesRes.error) throw transportesRes.error;

    const inventarioRaw = inventarioRes.error ? [] : inventarioRes.data || [];
    const inventario: InventarioRow[] = inventarioRaw.map((row) => {
      const centro = row.centro;
      const centroObj = Array.isArray(centro) ? centro[0] ?? null : centro;
      return {
        item: row.item,
        cantidad: row.cantidad,
        unidad: row.unidad,
        actualizado_at: row.actualizado_at,
        centro: centroObj,
        fuente: "local" as const,
      };
    });

    if (process.env.TUIA911_API_KEY) {
      try {
        const tuiaRes = await fetchTuiaInsumos({ limit: 200 });
        const tuiaItems = tuiaRes.data || [];
        const now = new Date().toISOString();
        for (const ins of tuiaItems) {
          if (ins.disponible <= 0) continue;
          inventario.push({
            item: ins.articulo,
            cantidad: ins.disponible,
            unidad: ins.unidad || "uds",
            actualizado_at: now,
            centro: { nombre: `${ins.centro_nombre} (Tuia911)` },
            fuente: "tuia911",
          });
        }
      } catch (tuiaErr) {
        console.warn("[Reportes Operaciones] Tuia911 inventario omitido:", tuiaErr);
      }
    }
    const reporte = computeReportesOperaciones({
      tickets: ticketsRes.data || [],
      historial: historialRes.data || [],
      transportes: transportesRes.data || [],
      matches: matchesRes.error ? [] : matchesRes.data || [],
      gasolina: gasolinaRes.error ? [] : gasolinaRes.data || [],
      inventario,
    });

    return NextResponse.json({ success: true, reporte });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al generar reportes";
    console.error("[Reportes Operaciones]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
