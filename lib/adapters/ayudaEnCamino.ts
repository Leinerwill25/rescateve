import { AEC_NEEDS_URL, getAecApiHeaders } from "@/lib/aec-api";
import {
  aecUrgenciaToPrioridad,
  formatAecCantidadResumen,
  formatAecContacto,
} from "@/lib/aec-cobertura";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const IN_CHUNK_SIZE = 150;

export type AecApiNeedItem = {
  id: number;
  nombreArticulo?: string;
  categoria?: string;
  descripcion?: string;
  cantidadNecesaria?: number;
  cantidadComprometida?: number;
  cantidadCumplida?: number;
  urgencia?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  organizacion?: {
    nombre?: string;
    estado?: string;
    ciudad?: string;
    direccion?: string;
    contactoNombre?: string;
    contactoTelefono?: string;
    contactoEmail?: string;
  };
};

export type NecesidadExterna = {
  fuente_id: string;
  descripcion: string;
  categoria_externa?: string | null;
  ubicacion_externa?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  contacto?: string | null;
  estado_externo: "pendiente" | "cubierta";
  fuente_url: string;
  aec_meta: number | null;
  aec_recibidos: number | null;
  aec_en_camino: number | null;
  aec_contacto_nombre: string | null;
  cantidad_resumen: string | null;
  prioridad: "alta" | "media" | "baja";
  aec_created_at: string | null;
};

export function mapAecItemToNecesidad(item: AecApiNeedItem): NecesidadExterna {
  const org = item.organizacion || {};
  const orgName = org.nombre || "Organización Desconocida";
  const orgState = org.estado || "";
  const orgCity = org.ciudad || "";
  const orgAddress = org.direccion || "";
  const itemDesc = item.descripcion || "";

  const meta = item.cantidadNecesaria ?? null;
  const recibidos = item.cantidadCumplida ?? 0;
  const enCamino = item.cantidadComprometida ?? 0;
  const { nombre: contactoNombre, linea: contactoLinea } = formatAecContacto(org);

  const descripcionRica = `[Artículo: ${item.nombreArticulo}] Cantidad: ${meta ?? "N/D"}. ${itemDesc ? `Detalle: ${itemDesc}. ` : ""}Organización: ${orgName}`;

  const ubicacion = [
    orgCity ? orgCity : null,
    orgState ? orgState : null,
    orgAddress ? `Dir: ${orgAddress}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const estadoExterno: "pendiente" | "cubierta" =
    item.status === "cumplida" ||
    (meta != null && recibidos >= meta)
      ? "cubierta"
      : "pendiente";

  return {
    fuente_id: item.id.toString(),
    descripcion: descripcionRica,
    categoria_externa: item.categoria || null,
    ubicacion_externa: ubicacion || null,
    latitud: null,
    longitud: null,
    contacto: contactoLinea,
    estado_externo: estadoExterno,
    fuente_url: `https://ayudaencamino.com/necesidades/${item.id}`,
    aec_meta: meta,
    aec_recibidos: recibidos,
    aec_en_camino: enCamino,
    aec_contacto_nombre: contactoNombre,
    cantidad_resumen: formatAecCantidadResumen(meta, recibidos, enCamino),
    prioridad: aecUrgenciaToPrioridad(item.urgencia),
    aec_created_at: item.createdAt || null,
  };
}

function ticketPayloadFromNecesidad(nec: NecesidadExterna, extra: Record<string, unknown> = {}) {
  return {
    descripcion: nec.descripcion,
    contacto_solicitante: nec.contacto,
    categoria_externa: nec.categoria_externa,
    ubicacion_externa: nec.ubicacion_externa,
    estado_externo: nec.estado_externo,
    fuente_url: nec.fuente_url,
    cantidad: nec.cantidad_resumen,
    aec_meta: nec.aec_meta,
    aec_recibidos: nec.aec_recibidos,
    aec_en_camino: nec.aec_en_camino,
    aec_contacto_nombre: nec.aec_contacto_nombre,
    aec_created_at: nec.aec_created_at,
    ...extra,
  };
}

/**
 * ObtenerNecesidades conecta con el backend de Ayuda en Camino
 * y normaliza el payload al formato estándar NecesidadExterna.
 */
export async function obtenerNecesidades(): Promise<NecesidadExterna[]> {
  try {
    const res = await fetch(AEC_NEEDS_URL, {
      headers: getAecApiHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Error HTTP al consultar Ayuda en Camino: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("La respuesta de la API no es un arreglo de necesidades válido.");
    }

    return data.map((item: AecApiNeedItem) => mapAecItemToNecesidad(item));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error al obtener necesidades de Ayuda en Camino:", msg);
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

/** Elimina tickets AEC en cola sin operador asignado (resincronización limpia). */
export async function purgeTicketsAecCola(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from("tickets")
    .delete()
    .eq("fuente", "ayuda_en_camino")
    .eq("estado", "en_validacion")
    .is("transporte_id", null)
    .is("medico_id", null)
    .is("centro_acopio_id", null)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export type IngestaAecResult = {
  success: true;
  nuevos: number;
  actualizados: number;
  cubiertos: number;
  eliminados: number;
  total_api: number;
};

/**
 * runIngestaAyudaEnCamino ejecuta un ciclo completo de ingesta.
 * Con resetCola=true borra primero los tickets AEC en cola sin asignar.
 */
export async function runIngestaAyudaEnCamino(opts?: {
  resetCola?: boolean;
}): Promise<IngestaAecResult> {
  const supabase = getSupabaseAdmin();
  let eliminados = 0;

  if (opts?.resetCola) {
    eliminados = await purgeTicketsAecCola(supabase);
    console.log(`[AEC] Purga cola: ${eliminados} tickets eliminados.`);
  }

  const necesidades = dedupeNecesidades(await obtenerNecesidades());
  let nuevos = 0;
  let actualizados = 0;
  let cubiertos = 0;

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

  const existentesMap = new Map(
    existentes.map((t) => [t.fuente_id, t])
  );

  const paraInsertar: Record<string, unknown>[] = [];
  const paraActualizar: { id: string; payload: Record<string, unknown> }[] = [];

  for (const nec of necesidades) {
    const existing = existentesMap.get(nec.fuente_id);
    const syncPayload = ticketPayloadFromNecesidad(nec, {
      updated_at: new Date().toISOString(),
    });

    if (!existing) {
      paraInsertar.push({
        fuente: "ayuda_en_camino",
        fuente_id: nec.fuente_id,
        ...syncPayload,
        capturado_at: new Date().toISOString(),
        estado: "en_validacion",
        requiere_revision: true,
        prioridad: nec.prioridad,
      });
      continue;
    }

    const payload: Record<string, unknown> = { ...syncPayload };

    if (
      nec.estado_externo === "cubierta" &&
      existing.estado !== "completado" &&
      !existing.transporte_id &&
      !existing.medico_id &&
      !existing.centro_acopio_id
    ) {
      payload.estado = "completado";
      payload.notas_admin =
        "Cerrado automáticamente: La necesidad fue marcada como cubierta en Ayuda en Camino.";
      cubiertos++;
    }

    paraActualizar.push({ id: existing.id, payload });
  }

  if (paraInsertar.length > 0) {
    const seen = new Set<string>();
    const uniqueInsert = paraInsertar.filter((row) => {
      const fid = String(row.fuente_id);
      if (seen.has(fid)) return false;
      seen.add(fid);
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

  for (const { id, payload } of paraActualizar) {
    const { error: updErr } = await supabase.from("tickets").update(payload).eq("id", id);
    if (updErr) {
      console.error(`[AEC] Error al actualizar ticket ${id}:`, updErr.message);
    } else {
      actualizados++;
    }
  }

  await supabase.from("ingesta_log").insert({
    fuente: "ayuda_en_camino",
    nuevos,
    actualizados,
    cubiertos,
    corrida_at: new Date().toISOString(),
  });

  console.log(
    `[AEC] Corrida completada: -${eliminados} purga, +${nuevos} nuevos, ~${actualizados} actualizados, ✓${cubiertos} cubiertos (${necesidades.length} en API).`
  );

  return {
    success: true,
    nuevos,
    actualizados,
    cubiertos,
    eliminados,
    total_api: necesidades.length,
  };
}

export async function pullNecesidades() {
  const res = await runIngestaAyudaEnCamino();
  return { success: true, count: res.nuevos };
}
