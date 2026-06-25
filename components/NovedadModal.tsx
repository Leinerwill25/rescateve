"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  desaparecidoId: string;
  nombre: string;
  onClose: () => void;
  onDone: () => void;
};

export default function NovedadModal({ desaparecidoId, nombre, onClose, onDone }: Props) {
  const [texto,         setTexto]         = useState("");
  const [autorNombre,   setAutorNombre]   = useState("");
  const [autorContacto, setAutorContacto] = useState("");
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState<string | null>(null);

  async function enviar() {
    setErr(null);
    if (!texto.trim()) {
      setErr("Escribe la información que quieres aportar.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("desaparecidos_actualizaciones").insert({
      desaparecido_id: desaparecidoId,
      texto:           texto.trim(),
      autor_nombre:    autorNombre.trim()   || null,
      autor_contacto:  autorContacto.trim() || null,
    });
    setSaving(false);
    if (error) {
      setErr("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
      return;
    }
    onDone();
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="novedad-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal__handle" aria-hidden="true" />
        <h2 className="modal__title" id="novedad-modal-title">
          📣 Agregar información sobre {nombre}
        </h2>
        <div className="modal__body">
          <p>
            ¿Tienes información nueva sobre esta persona? Agrégala aquí.
            No sobreescribe nada — queda como una pista en la línea de tiempo.
          </p>

          <div className="form__field">
            <label className="form__label form__label--required" htmlFor="novedad_texto">
              ¿Qué información nueva hay?
            </label>
            <textarea
              id="novedad_texto"
              className="form__textarea"
              rows={3}
              placeholder="Ej: Fue visto en el refugio del liceo Andrés Bello a las 3 pm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="form__row">
            <div className="form__field">
              <label className="form__label" htmlFor="autor_nombre">Tu nombre (opcional)</label>
              <input
                id="autor_nombre"
                className="form__input"
                placeholder="Ej: Ana Pérez"
                value={autorNombre}
                onChange={(e) => setAutorNombre(e.target.value)}
              />
            </div>
            <div className="form__field">
              <label className="form__label" htmlFor="autor_contacto">Tu contacto (opcional)</label>
              <input
                id="autor_contacto"
                className="form__input"
                placeholder="Ej: 0424-9876543"
                value={autorContacto}
                onChange={(e) => setAutorContacto(e.target.value)}
              />
            </div>
          </div>
          <p className="form__hint">Opcional. Nos ayuda a contactarte y verificar la información.</p>
        </div>

        {err && (
          <div className="form__error" role="alert">
            <span aria-hidden="true">⚠️</span><span>{err}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)", marginTop: "var(--s5)" }}>
          <button className="btn btn--brand" onClick={enviar} disabled={saving}>
            {saving ? <><span className="spinner" aria-hidden="true" /> Enviando…</> : "📣 Publicar información"}
          </button>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", padding: "var(--s2)", fontFamily: "var(--font)" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
