import {
  type AshParaQuien,
  type AshRama,
  ASH_PARA_QUIEN,
  ASH_SUBTIPOS_INSUMOS,
  ASH_SUBTIPOS_PERSONAL,
  buildDescripcionTicket,
  labelParaQuien,
  mapSubtipoToTicket,
} from "@/lib/ash-categories";
import { detectarEmergenciaVital } from "@/lib/ash-emergency";

export type AshStep =
  | "greeting"
  | "detail"
  | "para_quien"
  | "detalle"
  | "personas"
  | "ubicacion"
  | "contacto"
  | "resumen"
  | "done";

export type AshMessageRole = "ash" | "user" | "system";

export type AshMessage = {
  id: string;
  role: AshMessageRole;
  text: string;
  ts: number;
};

export type AshItem = {
  rama: AshRama;
  subtipo: string;
  subtipoLabel: string;
  para_quien: AshParaQuien;
  detalle: string;
  personas: number | null;
  nota?: string;
};

export type AshDraft = {
  grupo_id: string;
  reporter_token: string;
  step: AshStep;
  items: AshItem[];
  rama: AshRama | null;
  subtipo: string | null;
  subtipoLabel: string | null;
  para_quien: AshParaQuien | null;
  detalle: string | null;
  personas: number | null;
  destino_ref: string | null;
  destino_lat: number | null;
  destino_lng: number | null;
  contacto_nombre: string;
  contacto_solicitante: string;
  prioridad: "alta" | "media" | "baja";
  messages: AshMessage[];
  minimized: boolean;
  open: boolean;
};

export type AshQuickReply = {
  id: string;
  label: string;
  value: string;
};

function msgId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function mensajePasoDetalle(rama: AshRama | null): string {
  if (rama === "personal") {
    return "Describe con detalle qué personal o apoyo necesitas: especialidad, cantidad, horario, condiciones…";
  }
  return "Describe con detalle qué necesitas: artículos, cantidades, presentaciones, marcas o medicamentos específicos…";
}

export function createAshDraft(reporterToken: string): AshDraft {
  return {
    grupo_id: crypto.randomUUID(),
    reporter_token: reporterToken,
    step: "greeting",
    items: [],
    rama: null,
    subtipo: null,
    subtipoLabel: null,
    para_quien: null,
    detalle: null,
    personas: null,
    destino_ref: null,
    destino_lat: null,
    destino_lng: null,
    contacto_nombre: "",
    contacto_solicitante: "",
    prioridad: "media",
    messages: [
      {
        id: msgId(),
        role: "ash",
        text: "Hola, soy Ash 🌿. Estoy aquí para ayudarte a pedir lo que necesitas. ¿Qué necesitas hoy?",
        ts: Date.now(),
      },
    ],
    minimized: false,
    open: false,
  };
}

export function appendMessage(draft: AshDraft, role: AshMessageRole, text: string): AshDraft {
  return {
    ...draft,
    messages: [...draft.messages, { id: msgId(), role, text, ts: Date.now() }],
  };
}

export function getQuickReplies(draft: AshDraft): AshQuickReply[] {
  switch (draft.step) {
    case "greeting":
      return [
        { id: "insumos", label: "Insumos", value: "insumos" },
        { id: "personal", label: "Personal", value: "personal" },
        { id: "unsure", label: "No estoy seguro", value: "unsure" },
      ];
    case "detail":
      if (draft.rama === "insumos") {
        return ASH_SUBTIPOS_INSUMOS.map((s) => ({ id: s.value, label: s.label, value: s.value }));
      }
      if (draft.rama === "personal") {
        return ASH_SUBTIPOS_PERSONAL.map((s) => ({ id: s.value, label: s.label, value: s.value }));
      }
      return [];
    case "para_quien":
      return ASH_PARA_QUIEN.map((p) => ({ id: p.value, label: p.label, value: p.value }));
    case "resumen":
      return [
        { id: "mas", label: "Sí, algo más", value: "mas" },
        { id: "enviar", label: "No, enviar", value: "enviar" },
      ];
    default:
      return [];
  }
}

function resetItemFields(draft: AshDraft): AshDraft {
  return {
    ...draft,
    rama: null,
    subtipo: null,
    subtipoLabel: null,
    para_quien: null,
    detalle: null,
    personas: null,
  };
}

function subtipoLabelFor(rama: AshRama, subtipo: string): string {
  if (rama === "insumos") {
    return ASH_SUBTIPOS_INSUMOS.find((s) => s.value === subtipo)?.label || subtipo;
  }
  if (rama === "personal") {
    return ASH_SUBTIPOS_PERSONAL.find((s) => s.value === subtipo)?.label || subtipo;
  }
  return subtipo;
}

function advanceAfterPersonas(draft: AshDraft): AshDraft {
  if (draft.destino_lat != null && draft.destino_lng != null) {
    if (!draft.contacto_solicitante?.trim()) {
      return appendMessage(
        { ...draft, step: "contacto" },
        "ash",
        "¿Un teléfono o WhatsApp para coordinar? Es solo para el equipo — no se publica."
      );
    }
    let d = commitCurrentItem({ ...draft, step: "resumen" });
    return appendMessage(d, "ash", buildResumenMessage(d));
  }
  return appendMessage(
    { ...draft, step: "ubicacion" },
    "ash",
    "¿Dónde se necesita? Marca el punto en el mapa (GPS o pin)."
  );
}

export function applyQuickReply(draft: AshDraft, value: string): AshDraft {
  let d = appendMessage(draft, "user", quickReplyLabel(draft, value));

  switch (draft.step) {
    case "greeting": {
      const rama = value as AshRama;
      d = { ...d, rama, step: "detail" };
      if (rama === "insumos") {
        d = appendMessage(
          d,
          "ash",
          "Perfecto. ¿Qué tipo de insumo necesitas? Puedes elegir una opción o escribir con detalle."
        );
      } else if (rama === "personal") {
        d = appendMessage(
          d,
          "ash",
          "Entendido. ¿Qué tipo de apoyo necesitas? Puedes elegir o describirlo con tus palabras."
        );
      } else {
        d = appendMessage(d, "ash", "Cuéntame con tus palabras qué necesitas:");
      }
      return d;
    }
    case "detail": {
      const subtipo = value;
      const subtipoLabel = subtipoLabelFor(draft.rama || "unsure", subtipo);
      d = { ...d, subtipo, subtipoLabel, step: "para_quien" };
      return appendMessage(d, "ash", "¿Para quién es esta necesidad?");
    }
    case "para_quien": {
      d = { ...d, para_quien: value as AshParaQuien, step: "detalle" };
      return appendMessage(d, "ash", mensajePasoDetalle(d.rama));
    }
    case "resumen":
      if (value === "mas") {
        d = resetItemFields({ ...d, step: "greeting" });
        return appendMessage(d, "ash", "Vale, agreguemos otro ítem. ¿Qué más necesitas?");
      }
      return d;
    default:
      return d;
  }
}

function quickReplyLabel(draft: AshDraft, value: string): string {
  return getQuickReplies(draft).find((q) => q.value === value)?.label || value;
}

export function applyFreeText(draft: AshDraft, text: string): AshDraft {
  const trimmed = text.trim();
  if (!trimmed) return draft;

  let d = appendMessage(draft, "user", trimmed);

  if (detectarEmergenciaVital(trimmed)) {
    d = { ...d, prioridad: "alta" };
    d = appendMessage(
      d,
      "system",
      "⚠️ Si es una emergencia de vida o muerte, llama YA al 171. Voy a registrar tu solicitud para que el equipo la coordine."
    );
  }

  switch (draft.step) {
    case "greeting":
      d = {
        ...d,
        rama: "unsure",
        subtipo: "otro",
        subtipoLabel: trimmed.slice(0, 120),
        step: "para_quien",
      };
      return appendMessage(d, "ash", "Gracias por contarme. ¿Para quién es esta necesidad?");

    case "detail":
      if (draft.rama === "unsure") {
        d = {
          ...d,
          rama: "unsure",
          subtipo: "otro",
          subtipoLabel: trimmed.slice(0, 120),
          step: "para_quien",
        };
        return appendMessage(d, "ash", "Gracias por contarme. ¿Para quién es esta necesidad?");
      }
      d = {
        ...d,
        subtipo: "otro",
        subtipoLabel: trimmed.slice(0, 120),
        step: "para_quien",
      };
      return appendMessage(d, "ash", "¿Para quién es esta necesidad?");

    case "detalle":
      if (trimmed.length < 3) {
        return appendMessage(
          d,
          "ash",
          "Por favor describe con más detalle: qué artículos, cantidades o medicamentos necesitas."
        );
      }
      d = { ...d, detalle: trimmed, step: "personas" };
      return appendMessage(
        d,
        "ash",
        "¿Para cuántas personas es? Escribe un número o toca «No sé / omitir»."
      );

    case "personas":
      if (/omitir|no\s*s[eé]|skip/i.test(trimmed)) {
        d = { ...d, personas: null };
        return advanceAfterPersonas(d);
      }
      {
        const n = parseInt(trimmed.replace(/\D/g, ""), 10);
        d = { ...d, personas: Number.isFinite(n) && n > 0 ? n : null };
        return advanceAfterPersonas(d);
      }

    case "ubicacion":
      d = { ...d, destino_ref: trimmed, step: "contacto" };
      return appendMessage(
        d,
        "ash",
        "¿Un teléfono o WhatsApp para coordinar? Es solo para el equipo — no se publica."
      );

    case "contacto": {
      d = { ...d, contacto_solicitante: trimmed, step: "resumen" };
      d = commitCurrentItem(d);
      return appendMessage(d, "ash", buildResumenMessage(d));
    }

    default:
      return appendMessage(
        d,
        "ash",
        "Escribe tu respuesta en el cuadro de texto de abajo."
      );
  }
}

export function applyParsedFields(
  draft: AshDraft,
  fields: Partial<{
    rama: AshRama;
    subtipo: string;
    para_quien: AshParaQuien;
    detalle: string;
    personas: number;
    prioridad: "alta" | "media" | "baja";
    nota: string;
  }>
): AshDraft {
  let d = { ...draft };
  if (fields.prioridad === "alta") d.prioridad = "alta";
  if (fields.rama) d.rama = fields.rama;
  if (fields.subtipo) {
    d.subtipo = fields.subtipo;
    d.subtipoLabel = subtipoLabelFor(fields.rama || d.rama || "unsure", fields.subtipo);
  }
  if (fields.para_quien) d.para_quien = fields.para_quien;
  if (fields.detalle) d.detalle = fields.detalle;
  if (fields.personas != null) d.personas = fields.personas;

  if (d.rama && d.subtipo && d.para_quien && d.detalle && d.step !== "resumen" && d.step !== "done") {
    if (!d.destino_lat) d.step = "ubicacion";
    else if (!d.contacto_solicitante) d.step = "contacto";
    else {
      d = commitCurrentItem(d);
      d.step = "resumen";
    }
  }
  return d;
}

export function setUbicacion(
  draft: AshDraft,
  lat: number,
  lng: number,
  ref?: string
): AshDraft {
  const refFinal = ref?.trim() || draft.destino_ref?.trim() || "";
  let d: AshDraft = {
    ...draft,
    destino_lat: lat,
    destino_lng: lng,
    destino_ref: refFinal,
    step: "contacto",
  };
  const refMsg = refFinal ? `\n📍 ${refFinal}` : "";
  d = appendMessage(
    d,
    "ash",
    `Ubicación guardada ✓${refMsg}\n¿Un teléfono o WhatsApp para coordinar? Es solo para el equipo — no se publica.`
  );
  return d;
}

export function setContacto(draft: AshDraft, nombre: string, telefono: string): AshDraft {
  let d: AshDraft = {
    ...draft,
    contacto_nombre: nombre.trim(),
    contacto_solicitante: telefono.trim(),
    step: "resumen",
  };
  d = commitCurrentItem(d);
  d = appendMessage(d, "ash", buildResumenMessage(d));
  return d;
}

function resolveItemDetalle(item: AshItem & { cantidad?: unknown }): string {
  if (item.detalle?.trim()) return item.detalle.trim();
  if (typeof item.cantidad === "string" && item.cantidad.trim()) {
    const c = item.cantidad.trim();
    const rango: Record<string, string> = {
      poco: "Cantidad aproximada: poco",
      medio: "Cantidad aproximada: medio",
      mucho: "Cantidad aproximada: mucho",
    };
    return rango[c] || c;
  }
  return item.subtipoLabel?.trim() || "Sin detalle especificado";
}

function commitCurrentItem(draft: AshDraft): AshDraft {
  if (!draft.rama || !draft.subtipo || !draft.para_quien || !draft.detalle?.trim()) return draft;
  const item: AshItem = {
    rama: draft.rama,
    subtipo: draft.subtipo,
    subtipoLabel: draft.subtipoLabel || draft.subtipo,
    para_quien: draft.para_quien,
    detalle: draft.detalle.trim(),
    personas: draft.personas,
  };
  return {
    ...draft,
    items: [...draft.items, item],
    rama: null,
    subtipo: null,
    subtipoLabel: null,
    para_quien: null,
    detalle: null,
    personas: null,
  };
}

function buildResumenMessage(draft: AshDraft): string {
  const lines = draft.items.map((it, i) => {
    const pers = it.personas ? ` · ~${it.personas} pers.` : "";
    return `${i + 1}. ${it.subtipoLabel} → ${labelParaQuien(it.para_quien)}\n   ${resolveItemDetalle(it)}${pers}`;
  });
  const ubic = draft.destino_ref ? `\n📍 ${draft.destino_ref}` : "";
  const contacto = draft.contacto_solicitante
    ? `\n📞 ${draft.contacto_nombre ? `${draft.contacto_nombre} · ` : ""}${draft.contacto_solicitante}`
    : "";
  return `Esto es lo que tengo registrado:\n\n${lines.join("\n")}${ubic}${contacto}\n\n¿Necesitas algo más?`;
}

export function buildTicketPayloads(draft: AshDraft) {
  const ubicRef = draft.destino_ref?.trim() || null;
  const normalized = normalizeAshDraft(draft as AshDraft & { cantidad?: unknown });

  return normalized.items.map((item, index) => {
    const detalle = resolveItemDetalle(item as AshItem & { cantidad?: unknown });
    const { categoria_sugerida, departamentos_sugeridos } = mapSubtipoToTicket(
      item.rama,
      item.subtipo
    );
    const descripcion = buildDescripcionTicket({
      rama: item.rama,
      subtipoLabel: item.subtipoLabel,
      paraQuien: item.para_quien,
      detalle,
      personas: item.personas,
      ubicacion: ubicRef,
    });
    const cantidadStr = [
      item.subtipoLabel,
      detalle,
      item.personas ? `${item.personas} personas` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const contacto = [draft.contacto_nombre, draft.contacto_solicitante]
      .filter(Boolean)
      .join(" · ");

    return {
      fuente: "publico" as const,
      fuente_id: `ash:${draft.grupo_id}:${index}`,
      descripcion,
      categoria_sugerida,
      departamentos_sugeridos,
      prioridad: draft.prioridad,
      origen_ref: ubicRef,
      origen_lat: draft.destino_lat,
      origen_lng: draft.destino_lng,
      destino_ref: ubicRef,
      destino_lat: draft.destino_lat,
      destino_lng: draft.destino_lng,
      cantidad: cantidadStr || null,
      contacto_solicitante: contacto || null,
      grupo_id: draft.grupo_id,
      para_quien: item.para_quien,
      estado: "en_validacion" as const,
    };
  });
}

export function markDone(draft: AshDraft): AshDraft {
  return appendMessage(
    { ...draft, step: "done" },
    "ash",
    "Listo, ya registré tu solicitud. El equipo de Rescate VE la va a revisar y coordinar. 🤍"
  );
}

/** Migra borradores guardados con el flujo anterior (poco/medio/mucho). */
export function normalizeAshDraft(raw: AshDraft & { cantidad?: unknown; step?: string }): AshDraft {
  const d = { ...raw } as AshDraft & { cantidad?: unknown };
  if (d.step === ("cantidad" as AshStep)) {
    d.step = "detalle";
  }
  if (!d.detalle && d.cantidad != null) {
    d.detalle = null;
  }
  delete d.cantidad;
  for (const item of d.items || []) {
    const it = item as AshItem & { cantidad?: unknown };
    if (!it.detalle?.trim()) {
      it.detalle = resolveItemDetalle(it);
    }
    delete it.cantidad;
  }
  return d;
}

export function inputPlaceholderForStep(step: AshStep): string {
  switch (step) {
    case "greeting":
      return "Ej: necesito medicamentos para mi abuela…";
    case "detail":
      return "O escribe qué necesitas con detalle…";
    case "detalle":
      return "Ej: 5kg arroz, 2 aceite, harina pan, 3 viales insulina NPH…";
    case "personas":
      return "Número de personas (ej: 4)";
    case "contacto":
      return "Teléfono o WhatsApp";
    default:
      return "Escribe aquí…";
  }
}
