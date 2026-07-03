"use client";

import "./ash.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Minus, Send, X, Phone } from "lucide-react";
import { getReporterToken } from "@/lib/reporter-token";
import {
  applyFreeText,
  applyParsedFields,
  applyQuickReply,
  createAshDraft,
  getQuickReplies,
  markDone,
  setContacto,
  setUbicacion,
  type AshDraft,
} from "@/lib/ash-flow";
import { loadAshDraft, saveAshDraft, clearAshDraft } from "@/lib/ash-storage";
import { detectarEmergenciaVital, MENSAJE_EMERGENCIA_171 } from "@/lib/ash-emergency";
import AshAvatar from "./AshAvatar";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type Props = {
  open: boolean;
  onClose: () => void;
  onMinimize: () => void;
};

export default function AshChat({ open, onClose, onMinimize }: Props) {
  const [draft, setDraft] = useState<AshDraft | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactNombre, setContactNombre] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const saved = loadAshDraft();
    if (saved && saved.step !== "done") {
      setDraft(saved);
      setContactNombre(saved.contacto_nombre);
      setContactTel(saved.contacto_solicitante);
      setLocLat(saved.destino_lat);
      setLocLng(saved.destino_lng);
    } else {
      const fresh = createAshDraft(getReporterToken());
      setDraft(fresh);
      saveAshDraft(fresh);
    }
  }, [open]);

  useEffect(() => {
    if (draft) saveAshDraft(draft);
  }, [draft]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [draft?.messages, typing]);

  const updateDraft = useCallback((updater: (d: AshDraft) => AshDraft) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  }, []);

  const callAshAi = useCallback(async (text: string, step: string, action: "tone" | "parse") => {
    if (!draft) return null;
    try {
      const res = await fetch("/api/ash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          message: text,
          step,
          reporter_token: draft.reporter_token,
        }),
      });
      const json = await res.json();
      return json;
    } catch {
      return null;
    }
  }, [draft]);

  const handleQuickReply = async (value: string) => {
    if (!draft || submitting) return;
    setError(null);

    if (draft.step === "resumen" && value === "enviar") {
      await handleSubmit();
      return;
    }

    let next = applyQuickReply(draft, value);
    setDraft(next);
    saveAshDraft(next);
  };

  const handleSendText = async () => {
    if (!draft || !input.trim() || submitting) return;
    const text = input.trim();
    setInput("");
    setError(null);

    let next = applyFreeText(draft, text);

    if (detectarEmergenciaVital(text)) {
      next = { ...next, prioridad: "alta" };
    }

    setTyping(true);
    const [toneRes, parseRes] = await Promise.all([
      callAshAi(text, draft.step, "tone"),
      draft.step === "greeting" || draft.step === "detail" ? callAshAi(text, draft.step, "parse") : null,
    ]);
    setTyping(false);

    if (parseRes?.parsed) {
      next = applyParsedFields(next, parseRes.parsed);
      if (parseRes.parsed.prioridad === "alta") next.prioridad = "alta";
    } else if (toneRes?.message && !getQuickReplies(next).length) {
      next = {
        ...next,
        messages: [
          ...next.messages,
          {
            id: `ai_${Date.now()}`,
            role: "ash",
            text: toneRes.message,
            ts: Date.now(),
          },
        ],
      };
    }

    setDraft(next);
    saveAshDraft(next);
  };

  const handleUbicacionConfirm = () => {
    if (!draft || locLat == null || locLng == null) {
      setError("Marca un punto en el mapa o usa el GPS.");
      return;
    }
    const next = setUbicacion(draft, locLat, locLng);
    setDraft(next);
    saveAshDraft(next);
  };

  const handleContactoConfirm = () => {
    if (!draft || !contactTel.trim()) {
      setError("Necesitamos un teléfono o WhatsApp para coordinar.");
      return;
    }
    const next = setContacto(draft, contactNombre, contactTel);
    setDraft(next);
    saveAshDraft(next);
  };

  const handleSubmit = async () => {
    if (!draft || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ash/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo registrar");

      const done = markDone(draft);
      setDraft(done);
      clearAshDraft();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOmitPersonas = () => {
    if (!draft) return;
    const next = applyFreeText(draft, "omitir");
    setDraft(next);
  };

  if (!open || !draft) return null;

  const quickReplies = getQuickReplies(draft);
  const showInput = !["ubicacion", "contacto", "done"].includes(draft.step);
  const showPersonasOmit = draft.step === "personas";

  return (
    <div className="ash-panel" role="dialog" aria-label="Chat con Ash">
      <header className="ash-panel__header">
        <div className="ash-panel__header-info">
          <AshAvatar size={40} />
          <div>
            <strong>Ash</strong>
            <span className="ash-panel__status">{typing ? "escribiendo…" : "en línea"}</span>
          </div>
        </div>
        <div className="ash-panel__header-actions">
          <button type="button" className="ash-icon-btn" onClick={onMinimize} aria-label="Minimizar">
            <Minus size={18} />
          </button>
          <button type="button" className="ash-icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="ash-panel__messages" ref={scrollRef}>
        {draft.messages.map((m) => (
          <div
            key={m.id}
            className={`ash-bubble ash-bubble--${m.role}`}
          >
            {m.role === "ash" && <AshAvatar size={28} />}
            <div className="ash-bubble__text">{m.text}</div>
          </div>
        ))}
        {draft.prioridad === "alta" && (
          <div className="ash-emergency" role="alert">
            <Phone size={16} />
            <span>{MENSAJE_EMERGENCIA_171.replace(/\*\*/g, "")}</span>
            <a href="tel:171" className="ash-emergency__call">Llamar al 171</a>
          </div>
        )}
        {typing && (
          <div className="ash-bubble ash-bubble--ash">
            <AshAvatar size={28} />
            <div className="ash-bubble__text ash-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {draft.step === "ubicacion" && (
        <div className="ash-widget">
          <p className="ash-widget__label">Marca dónde se necesita la ayuda</p>
          <LocationPicker lat={locLat} lng={locLng} onChange={(la, ln) => { setLocLat(la); setLocLng(ln); }} />
          <button type="button" className="ash-btn ash-btn--primary" onClick={handleUbicacionConfirm}>
            Confirmar ubicación
          </button>
        </div>
      )}

      {draft.step === "contacto" && (
        <div className="ash-widget">
          <p className="ash-widget__label">Contacto (solo para coordinar, no se publica)</p>
          <input
            type="text"
            className="ash-input"
            placeholder="Nombre (opcional)"
            value={contactNombre}
            onChange={(e) => setContactNombre(e.target.value)}
          />
          <input
            type="tel"
            className="ash-input"
            placeholder="Teléfono o WhatsApp *"
            value={contactTel}
            onChange={(e) => setContactTel(e.target.value)}
            required
          />
          <button type="button" className="ash-btn ash-btn--primary" onClick={handleContactoConfirm}>
            Continuar
          </button>
        </div>
      )}

      {error && <p className="ash-error" role="alert">{error}</p>}

      {quickReplies.length > 0 && draft.step !== "done" && (
        <div className="ash-quick-replies">
          {quickReplies.map((q) => (
            <button
              key={q.id}
              type="button"
              className="ash-quick-btn"
              onClick={() => handleQuickReply(q.value)}
              disabled={submitting}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {showPersonasOmit && (
        <div className="ash-quick-replies">
          <button type="button" className="ash-quick-btn" onClick={handleOmitPersonas}>
            No sé / omitir
          </button>
        </div>
      )}

      {showInput && (
        <form
          className="ash-input-bar"
          onSubmit={(e) => { e.preventDefault(); handleSendText(); }}
        >
          <input
            type="text"
            className="ash-input"
            placeholder="Escribe aquí (opcional)…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={submitting || draft.step === "done"}
            aria-label="Mensaje para Ash"
          />
          <button type="submit" className="ash-send-btn" disabled={!input.trim() || submitting} aria-label="Enviar">
            <Send size={18} />
          </button>
        </form>
      )}

      {submitting && <p className="ash-submitting">Registrando tu solicitud…</p>}
    </div>
  );
}
