/** Detección determinista de emergencias vitales (sin depender del LLM). */

const EMERGENCY_PATTERNS = [
  /\batrapad[oa]s?\b/i,
  /\bno\s+respira\b/i,
  /\bno\s+puede\s+respirar\b/i,
  /\bhemorrag/i,
  /\bsangrado\s+(grave|abundant)/i,
  /\bherid[oa]\s+grave/i,
  /\bmuriendo\b/i,
  /\bparto\b/i,
  /\bdesmayad[oa]\b/i,
  /\bsin\s+pulso\b/i,
  /\bconvulsion/i,
  /\bescombros.*persona/i,
  /\bpersona.*escombros/i,
  /\b171\b/,
];

export function detectarEmergenciaVital(texto: string): boolean {
  const t = texto.trim();
  if (!t) return false;
  return EMERGENCY_PATTERNS.some((re) => re.test(t));
}

export const MENSAJE_EMERGENCIA_171 =
  "⚠️ Si es una emergencia de vida o muerte, llama YA al **171** (línea de emergencias). Ash puede registrar tu solicitud, pero no reemplaza al 171.";
