import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Eres Ash, un asistente cálido y sereno de Rescate VE, la iniciativa que coordina
el traslado de ayuda tras el terremoto en Venezuela. Tu único trabajo es ayudar a
la persona a registrar QUÉ necesita, de forma empática y en pocos pasos.

REGLAS:
- Habla claro, humano y tranquilo. Nada de tecnicismos. Tuteo venezolano amable.
- NO prometas que la ayuda llegará ni cuándo. Di que vas a registrar la solicitud
  y que el equipo la coordina.
- NO des consejos médicos ni de rescate. Solo recoge información.
- Si la persona describe algo de vida o muerte (atrapado, herido grave, no respira,
  hemorragia, parto), dile de inmediato que llame al 171 y marca prioridad alta.
- Guía con opciones simples (botones). Si la persona escribe libre, extrae los datos.
- Cuando tengas lo necesario, devuelve SOLO un JSON con los campos del ticket.
No inventes, no opines, no salgas de este rol.`;

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
}

export async function ashToneReply(userMessage: string, step: string): Promise<string | null> {
  const model = getModel();
  if (!model) return null;
  try {
    const result = await model.generateContent(
      `Paso actual del flujo: ${step}.\nLa persona escribió: "${userMessage}"\n\nResponde en 1-2 frases cálidas invitando a usar los botones o continuar. NO prometas ayuda en camino. Si detectas emergencia vital, menciona el 171.`
    );
    return result.response.text()?.trim() || null;
  } catch {
    return null;
  }
}

export type AshParsedFields = {
  rama?: "insumos" | "personal" | "unsure";
  subtipo?: string;
  para_quien?: "centro_acopio" | "refugio" | "persona_familia";
  cantidad?: "poco" | "medio" | "mucho";
  personas?: number;
  prioridad?: "alta" | "media" | "baja";
  nota?: string;
};

export async function ashParseFreeText(text: string): Promise<AshParsedFields | null> {
  const model = getModel();
  if (!model) return null;
  try {
    const result = await model.generateContent(
      `Extrae datos de esta solicitud. Devuelve SOLO JSON válido sin markdown, con campos opcionales:
{ "rama": "insumos"|"personal"|"unsure", "subtipo": string, "para_quien": "centro_acopio"|"refugio"|"persona_familia", "cantidad": "poco"|"medio"|"mucho", "personas": number, "prioridad": "alta"|"media"|"baja", "nota": string }

Texto: "${text.replace(/"/g, "'")}"`
    );
    const raw = result.response.text()?.trim() || "";
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(jsonStr) as AshParsedFields;
  } catch {
    return null;
  }
}
