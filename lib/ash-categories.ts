/** Mapeo determinista de elecciones Ash → campos de ticket (mismo árbol que asistente v1). */

export type AshRama = "insumos" | "personal" | "unsure";

export type AshSubtipoInsumo =
  | "agua"
  | "alimentos"
  | "medicamentos"
  | "ropa"
  | "higiene"
  | "otro";

export type AshSubtipoPersonal =
  | "medicos"
  | "rescatistas"
  | "ayudantes"
  | "transporte"
  | "otro";

export type AshParaQuien = "centro_acopio" | "refugio" | "persona_familia";

export type AshCantidadRango = "poco" | "medio" | "mucho";

export const ASH_SUBTIPOS_INSUMOS: { value: AshSubtipoInsumo; label: string }[] = [
  { value: "agua", label: "Agua" },
  { value: "alimentos", label: "Alimentos" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "ropa", label: "Ropa" },
  { value: "higiene", label: "Higiene" },
  { value: "otro", label: "Otro" },
];

export const ASH_SUBTIPOS_PERSONAL: { value: AshSubtipoPersonal; label: string }[] = [
  { value: "medicos", label: "Médicos" },
  { value: "rescatistas", label: "Rescatistas" },
  { value: "ayudantes", label: "Ayudantes" },
  { value: "transporte", label: "Transporte" },
  { value: "otro", label: "Otro" },
];

export const ASH_PARA_QUIEN: { value: AshParaQuien; label: string }[] = [
  { value: "centro_acopio", label: "Centro de acopio" },
  { value: "refugio", label: "Refugio" },
  { value: "persona_familia", label: "Persona o familia" },
];

export const ASH_CANTIDAD: { value: AshCantidadRango; label: string }[] = [
  { value: "poco", label: "Poco" },
  { value: "medio", label: "Medio" },
  { value: "mucho", label: "Mucho" },
];

export function labelParaQuien(v: AshParaQuien): string {
  return ASH_PARA_QUIEN.find((p) => p.value === v)?.label || v;
}

export function labelCantidad(v: AshCantidadRango): string {
  return ASH_CANTIDAD.find((c) => c.value === v)?.label || v;
}

export function mapSubtipoToTicket(
  rama: AshRama,
  subtipo: string
): { categoria_sugerida: string; departamentos_sugeridos: string[] } {
  if (rama === "insumos") {
    if (subtipo === "medicamentos") {
      return { categoria_sugerida: "insumo_medico", departamentos_sugeridos: ["acopio", "transporte_carga"] };
    }
    return { categoria_sugerida: "insumo_basico", departamentos_sugeridos: ["acopio", "transporte_carga"] };
  }
  if (rama === "personal") {
    switch (subtipo) {
      case "medicos":
        return { categoria_sugerida: "traslado_personal", departamentos_sugeridos: ["personal_medico"] };
      case "rescatistas":
        return { categoria_sugerida: "rescate", departamentos_sugeridos: ["rescate_estructural"] };
      case "transporte":
        return { categoria_sugerida: "traslado_personal", departamentos_sugeridos: ["transporte_carga"] };
      case "ayudantes":
      case "otro":
      default:
        return { categoria_sugerida: "otro", departamentos_sugeridos: ["otro"] };
    }
  }
  return { categoria_sugerida: "otro", departamentos_sugeridos: ["otro"] };
}

export function buildDescripcionTicket(input: {
  rama: AshRama;
  subtipoLabel: string;
  paraQuien: AshParaQuien;
  cantidad: AshCantidadRango;
  personas?: number | null;
  nota?: string;
}): string {
  const ramaLabel = input.rama === "insumos" ? "Insumos" : input.rama === "personal" ? "Personal" : "Necesidad";
  const partes = [
    `[Ash · ${ramaLabel}: ${input.subtipoLabel}]`,
    `Para: ${labelParaQuien(input.paraQuien)}`,
    `Cantidad: ${labelCantidad(input.cantidad)}`,
  ];
  if (input.personas != null && input.personas > 0) {
    partes.push(`~${input.personas} personas`);
  }
  if (input.nota?.trim()) {
    partes.push(input.nota.trim());
  }
  return partes.join(" · ");
}
