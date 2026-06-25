"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  desaparecidoId: string;
  nombre: string;
  onClose: () => void;
  onDone: () => void;
};

export default function EncontradoModal({ desaparecidoId, nombre, onClose, onDone }: Props) {
  const [nota,   setNota]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  async function confirmar() {
    setErr(null);
    setSaving(true);
    const { error } = await supabase
      .from("personas_desaparecidas")
      .update({
        estado:        "encontrado",
        encontrado_at: new Date().toISOString(),
        encontrado_nota: nota.trim() || null,
      })
      .eq("id", desaparecidoId);
    setSaving(false);
    if (error) {
      setErr("No se pudo actualizar. Revisa tu conexión e intenta de nuevo.");
      return;
    }
    onDone();
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="encontrado-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal__handle" aria-hidden="true" />
        <h2 className="modal__title" id="encontrado-modal-title">
          ✅ Marcar como encontrado/a
        </h2>
        <div className="modal__body">
          <p>
            Estás cerrando el reporte de búsqueda de <strong>{nombre}</strong>.
            El caso desaparecerá del mapa activo.
          </p>
          <div className="form__field" style={{ marginTop: "var(--s4)" }}>
            <label className="form__label" htmlFor="encontrado_nota">
              Nota de cierre (opcional)
            </label>
            <textarea
              id="encontrado_nota"
              className="form__textarea"
              rows={2}
              placeholder="Ej: Fue localizado en el refugio de Chacao, está bien"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <p className="form__hint">
              Si hay información médica sensible, no la incluyas aquí — queda registrada en esta nota de forma pública.
            </p>
          </div>
        </div>

        {err && (
          <div className="form__error" role="alert">
            <span aria-hidden="true">⚠️</span><span>{err}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)", marginTop: "var(--s5)" }}>
          <button className="btn btn--brand" onClick={confirmar} disabled={saving}>
            {saving ? <><span className="spinner" aria-hidden="true" /> Guardando…</> : "✅ Confirmar — fue encontrado/a"}
          </button>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", padding: "var(--s2)", fontFamily: "var(--font)" }}
          >
            Cancelar — seguir buscando
          </button>
        </div>
      </div>
    </div>
  );
}
