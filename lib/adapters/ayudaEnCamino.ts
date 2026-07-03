import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const IN_CHUNK_SIZE = 150;

export type NecesidadExterna = {
  fuente_id: string;
  descripcion: string;
  categoria_externa?: string | null;
  ubicacion_externa?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  contacto?: string | null;       // dato sensible, uso interno
  estado_externo: "pendiente" | "cubierta";
  fuente_url: string;
};

/**
 * ObtenerNecesidades conecta con el backend de Ayuda en Camino
 * y normaliza el payload al formato estándar NecesidadExterna.
 */
export async function obtenerNecesidades(): Promise<NecesidadExterna[]> {
  const url = "https://ayudaencamino.com/api/needs";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RescateVE-Ingestion-Bot/1.0 (+https://rescate-ve.vercel.app; contacto@rescateve.org)"
      },
      // No cachear — siempre queremos datos frescos
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`Error HTTP al consultar Ayuda en Camino: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("La respuesta de la API no es un arreglo de necesidades válido.");
    }

    return data.map((item: any) => {
      const orgName    = item.organizacion?.nombre    || "Organización Desconocida";
      const orgState   = item.organizacion?.estado    || "";
      const orgCity    = item.organizacion?.ciudad    || "";
      const orgAddress = item.organizacion?.direccion || "";
      const itemDesc   = item.descripcion             || "";

      // Generar descripción rica detallando el insumo solicitado y el centro
      const descripcionRica = `[Artículo: ${item.nombreArticulo}] Cantidad: ${item.cantidadNecesaria}. ${itemDesc ? `Detalle: ${itemDesc}. ` : ""}Organización: ${orgName}`;

      // Normalizar la ubicación externa
      const ubicacion = [
        orgCity   ? orgCity   : null,
        orgState  ? orgState  : null,
        orgAddress ? `Dir: ${orgAddress}` : null
      ].filter(Boolean).join(", ");

      // Extraer contacto telefónico o correo
      const contacto = item.organizacion?.contactoTelefono || item.organizacion?.contactoEmail || null;

      // Evaluar si la necesidad ya fue satisfecha en el origen
      const estadoExterno: "pendiente" | "cubierta" =
        (item.status === "cumplida" || item.cantidadCumplida >= item.cantidadNecesaria)
          ? "cubierta"
          : "pendiente";

      return {
        fuente_id:        item.id.toString(),
        descripcion:      descripcionRica,
        categoria_externa: item.categoria || null,
        ubicacion_externa: ubicacion || null,
        latitud:           null,
        longitud:          null,
        contacto:          contacto,
        estado_externo:    estadoExterno,
        fuente_url:        `https://ayudaencamino.com/necesidades/${item.id}`
      };
    });
  } catch (err: any) {
    console.error("Error al obtener necesidades de Ayuda en Camino:", err.message);
    throw err;
  }
}

function dedupeNecesidades(necesidades: NecesidadExterna[]): NecesidadExterna[] {
  const map = new Map<string, NecesidadExterna>();
  for (const n of necesidades) {
    if (!n.fuente_id) continue;
    map.set(n.fuente_id, n);
  }
  return [...map.values()];
}

async function fetchTicketsAecExistentes(
  supabase: SupabaseClient,
  fuenteIds: string[]
) {
  if (!fuenteIds.length) return [];

  const rows: Array<{
    id: string;
    fuente_id: string;
    estado: string;
    estado_externo: string | null;
    transporte_id: string | null;
    medico_id: string | null;
    centro_acopio_id: string | null;
  }> = [];

  for (let i = 0; i < fuenteIds.length; i += IN_CHUNK_SIZE) {
    const chunk = fuenteIds.slice(i, i + IN_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, fuente_id, estado, estado_externo, transporte_id, medico_id, centro_acopio_id")
      .eq("fuente", "ayuda_en_camino")
      .in("fuente_id", chunk);

    if (error) throw error;
    if (data?.length) rows.push(...data);
  }

  return rows;
}

/**
 * runIngestaAyudaEnCamino ejecuta un ciclo completo de ingesta.
 *
 * Estrategia anti-duplicados:
 * ─ En lugar de hacer SELECT por cada item y decidir INSERT/UPDATE en JS,
 *   usamos un upsert masivo con onConflict en el índice único (fuente, fuente_id).
 * ─ El índice `uq_tickets_fuente` en la BD es la última línea de defensa:
 *   aunque dos corridas del cron coincidan, Postgres rechazará el segundo INSERT
 *   y el onConflict lo convertirá en UPDATE.
 * ─ Solo actualizamos campos seguros: estado_externo, descripcion, updated_at.
 *   Los campos que el admin edita (estado, transporte_id, etc.) NO se sobreescriben.
 */
export async function runIngestaAyudaEnCamino() {
  const supabase = getSupabaseAdmin();
  const necesidades = dedupeNecesidades(await obtenerNecesidades());
  let nuevos      = 0;
  let actualizados = 0;
  let cubiertos   = 0;

  const fuente_ids = necesidades.map((n) => n.fuente_id);

  let existentes: Awaited<ReturnType<typeof fetchTicketsAecExistentes>> = [];
  try {
    existentes = await fetchTicketsAecExistentes(supabase, fuente_ids);
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    await supabase.from("ingesta_log").insert({
      fuente: "ayuda_en_camino",
      error: `Error al consultar tickets existentes: ${msg}`,
      corrida_at: new Date().toISOString(),
    });
    throw fetchErr;
  }

  const existentesMap = new Map<string, (typeof existentes)[number]>(
    existentes.map((t) => [t.fuente_id, t])
  );

  // ── 2. Separar en nuevos vs. existentes ──
  const paraInsertar: any[]   = [];
  const paraActualizar: any[] = [];

  for (const nec of necesidades) {
    const existing = existentesMap.get(nec.fuente_id);

    if (!existing) {
      // CASO A — Ticket nuevo
      paraInsertar.push({
        fuente:             "ayuda_en_camino",
        fuente_id:          nec.fuente_id,
        descripcion:        nec.descripcion,
        contacto_solicitante: nec.contacto,
        categoria_externa:  nec.categoria_externa,
        ubicacion_externa:  nec.ubicacion_externa,
        estado_externo:     nec.estado_externo,
        fuente_url:         nec.fuente_url,
        capturado_at:       new Date().toISOString(),
        estado:             "en_validacion",
        requiere_revision:  true
      });
    } else {
      // CASO B — Ticket existente: solo actualizar campos de estado externo
      // Nunca sobreescribimos el trabajo que hizo el admin (estado interno, operador, etc.)
      const cambioEstadoExterno = nec.estado_externo !== existing.estado_externo;

      if (!cambioEstadoExterno) {
        // Sin cambios relevantes — no hace falta tocar la BD
        continue;
      }

      const payload: any = {
        estado_externo: nec.estado_externo,
        updated_at:     new Date().toISOString()
      };

      // Auto-cerrar si se cubrió en AEC y nadie la está atendiendo internamente
      if (
        nec.estado_externo === "cubierta" &&
        existing.estado !== "completado" &&
        !existing.transporte_id &&
        !existing.medico_id &&
        !existing.centro_acopio_id
      ) {
        payload.estado       = "completado";
        payload.notas_admin  = "Cerrado automáticamente: La necesidad fue marcada como cubierta en Ayuda en Camino.";
        cubiertos++;
      }

      paraActualizar.push({ id: existing.id, ...payload });
    }
  }

  // ── 3. INSERT de nuevos con upsert (ignora duplicados por carrera o caché incompleto) ──
  if (paraInsertar.length > 0) {
    const seen = new Set<string>();
    const uniqueInsert = paraInsertar.filter((row) => {
      if (seen.has(row.fuente_id)) return false;
      seen.add(row.fuente_id);
      return true;
    });

    const { data: inserted, error: insErr } = await supabase
      .from("tickets")
      .upsert(uniqueInsert, { onConflict: "fuente,fuente_id", ignoreDuplicates: true })
      .select("id");

    if (insErr) {
      console.error("[AEC] Error al insertar nuevos tickets:", insErr.message);
      throw new Error(`Error al insertar tickets: ${insErr.message}`);
    }
    nuevos = inserted?.length ?? 0;
  }

  // ── 4. UPDATEs individuales (solo filas que cambiaron de estado externo) ──
  for (const upd of paraActualizar) {
    const { id, ...payload } = upd;
    const { error: updErr } = await supabase
      .from("tickets")
      .update(payload)
      .eq("id", id);

    if (updErr) {
      console.error(`[AEC] Error al actualizar ticket ${id}:`, updErr.message);
    } else {
      actualizados++;
    }
  }

  // ── 5. Registrar corrida en bitácora ──
  await supabase.from("ingesta_log").insert({
    fuente:      "ayuda_en_camino",
    nuevos,
    actualizados,
    cubiertos,
    corrida_at:  new Date().toISOString()
  });

  console.log(`[AEC] Corrida completada: +${nuevos} nuevos, ~${actualizados} actualizados, ✓${cubiertos} cubiertos.`);
  return { success: true, nuevos, actualizados, cubiertos };
}

/**
 * pullNecesidades es el adaptador manual que ejecuta la ingesta
 * desde la vista de administración en tiempo real.
 */
export async function pullNecesidades() {
  try {
    const res = await runIngestaAyudaEnCamino();
    return { success: true, count: res.nuevos };
  } catch (err: any) {
    throw err;
  }
}
