/** Campos de cobertura AEC almacenados en tickets. */
export type AecCoberturaFields = {
  aec_meta?: number | null;
  aec_recibidos?: number | null;
  aec_en_camino?: number | null;
  aec_contacto_nombre?: string | null;
};

export type AecOrganizacionContacto = {
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
};

export function calcAecFaltan(
  meta: number | null | undefined,
  recibidos: number | null | undefined
): number | null {
  if (meta == null || Number.isNaN(meta)) return null;
  return Math.max(0, meta - (recibidos ?? 0));
}

export function formatAecContacto(org: AecOrganizacionContacto): {
  nombre: string | null;
  linea: string | null;
} {
  const nombre = org.contactoNombre?.trim() || null;
  const tel = org.contactoTelefono?.trim() || null;
  const email = org.contactoEmail?.trim() || null;
  const partes = [tel, email].filter(Boolean);
  const linea =
    [nombre, ...partes].filter(Boolean).join(" · ") ||
    partes.join(" · ") ||
    null;
  return { nombre, linea };
}

export function formatAecCantidadResumen(
  meta: number | null | undefined,
  recibidos: number | null | undefined,
  enCamino: number | null | undefined
): string | null {
  if (meta == null) return null;
  const faltan = calcAecFaltan(meta, recibidos) ?? 0;
  return `Faltan ${faltan} de ${meta} uds.`;
}

export function aecUrgenciaToPrioridad(
  urgencia?: string | null
): "alta" | "media" | "baja" {
  const u = (urgencia || "").toLowerCase();
  if (u === "critica" || u === "alta") return "alta";
  if (u === "baja") return "baja";
  return "media";
}
