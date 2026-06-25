"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { RescatadoInput } from "@/lib/types";

type Props = {
  solicitudId: string;
  estadoActual: "pendiente" | "en_camino" | "atendido";
  onClose: () => void;
  onDone: () => void;
};

const CONDICION_OPTS = [
  { value: "",          label: "— Sin especificar —" },
  { value: "ileso",     label: "Ileso/a" },
  { value: "herido",    label: "Herido/a" },
  { value: "trasladado",label: "Trasladado/a a centro médico" },
];

const emptyRescatado = (): RescatadoInput => ({
  nombre: "", apellido: "", cedula: "", condicion: "",
});

export default function AtenderModal({ solicitudId, estadoActual, onClose, onDone }: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  // ── Paso "en camino" ──
  const [respondidoPor, setRespondidoPor] = useState("");

  // ── Paso "atendido" ──
  const [hayRescatados, setHayRescatados]     = useState<boolean | null>(null);
  const [numRescatados, setNumRescatados]     = useState("");
  const [rescatados, setRescatados]           = useState<RescatadoInput[]>([emptyRescatado()]);

  // ────────────────────────────────────────
  // Acción: marcar EN CAMINO
  // ────────────────────────────────────────
  async function marcarEnCamino() {
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from("solicitudes_ayuda")
      .update({
        estado: "en_camino",
        en_camino_at: new Date().toISOString(),
        respondido_por: respondidoPor.trim() || null,
      })
      .eq("id", solicitudId);
    setSaving(false);
    if (error) { setErr("No se pudo actualizar. Revisa tu conexión e intenta de nuevo."); return; }
    onDone();
  }

  // ────────────────────────────────────────
  // Acción: marcar ATENDIDO
  // ────────────────────────────────────────
  async function marcarAtendido() {
    setErr(null);
    if (hayRescatados && rescatados.some((r) => !r.nombre.trim())) {
      setErr("El nombre es obligatorio para cada persona rescatada.");
      return;
    }
    setSaving(true);

    // 1. Actualizar solicitud
    const { error: solErr } = await supabase
      .from("solicitudes_ayuda")
      .update({
        estado: "atendido",
        atendido_at: new Date().toISOString(),
        personas_rescatadas: hayRescatados
          ? numRescatados ? parseInt(numRescatados) : rescatados.length
          : 0,
      })
      .eq("id", solicitudId);

    if (solErr) {
      setSaving(false);
      setErr("No se pudo actualizar. Revisa tu conexión e intenta de nuevo.");
      return;
    }

    // 2. Insertar rescatados si los hay (incluye cédula — no se lee públicamente)
    if (hayRescatados && rescatados.length > 0) {
      const rows = rescatados
        .filter((r) => r.nombre.trim())
        .map((r) => ({
          solicitud_id: solicitudId,
          nombre:    r.nombre.trim(),
          apellido:  r.apellido.trim()  || null,
          cedula:    r.cedula.trim()    || null,
          condicion: r.condicion        || null,
        }));
      if (rows.length > 0) {
        await supabase.from("rescatados").insert(rows);
        // Si falla la inserción de rescatados no bloqueamos — el estado ya fue actualizado
      }
    }

    setSaving(false);
    onDone();
  }

  // ────────────────────────────────────────
  // Helpers para lista de rescatados
  // ────────────────────────────────────────
  function updateRescatado(i: number, field: keyof RescatadoInput, value: string) {
    setRescatados((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }
  function addRescatado() { setRescatados((prev) => [...prev, emptyRescatado()]); }
  function removeRescatado(i: number) {
    setRescatados((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atender-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal__handle" aria-hidden="true" />

        {/* ── PASO 1: pendiente → en_camino ── */}
        {estadoActual === "pendiente" && (
          <>
            <h2 className="modal__title" id="atender-modal-title">
              🚑 Ayuda en camino
            </h2>
            <div className="modal__body">
              <p>
                Al confirmar, este punto aparecerá marcado como <strong>"Ayuda en camino"</strong>
                en el mapa para que otros rescatistas no dupliquen el esfuerzo.
              </p>
              <div className="form__field" style={{ marginTop: "var(--s4)" }}>
                <label className="form__label" htmlFor="respondido_por">
                  ¿Quién responde? (opcional)
                </label>
                <input
                  id="respondido_por"
                  className="form__input"
                  placeholder="Ej: Unidad Bomberos 7 / Carlos Rodríguez"
                  value={respondidoPor}
                  onChange={(e) => setRespondidoPor(e.target.value)}
                />
                <p className="form__hint">
                  Ayuda a coordinar. Visible en el popup del mapa.
                </p>
              </div>
            </div>
            {err && (
              <div className="form__error" role="alert">
                <span aria-hidden="true">⚠️</span><span>{err}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--s3)", marginTop: "var(--s5)" }}>
              <button className="btn btn--brand" style={{ flex: 1 }} onClick={marcarEnCamino} disabled={saving}>
                {saving ? <><span className="spinner" aria-hidden="true" /> Guardando…</> : "🚑 Confirmar — voy en camino"}
              </button>
            </div>
            <button
              onClick={onClose}
              style={{ width: "100%", marginTop: "var(--s3)", background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", padding: "var(--s2)", fontFamily: "var(--font)" }}
            >
              Cancelar
            </button>
          </>
        )}

        {/* ── PASO 2: en_camino → atendido ── */}
        {estadoActual === "en_camino" && (
          <>
            <h2 className="modal__title" id="atender-modal-title">
              ✓ Emergencia atendida
            </h2>
            <div className="modal__body">
              <p>Registra el resultado de la atención.</p>

              {/* ¿Se rescataron personas? */}
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "var(--s2)" }}>
                ¿Se rescataron personas?
              </p>
              <div style={{ display: "flex", gap: "var(--s3)", marginBottom: "var(--s4)" }}>
                <button
                  className={`btn ${hayRescatados === true ? "btn--brand" : ""}`}
                  style={{ flex: 1, border: "1.5px solid var(--border)", background: hayRescatados === true ? "var(--brand)" : "var(--surface-2)", color: hayRescatados === true ? "#fff" : "var(--text)", minHeight: 44 }}
                  onClick={() => setHayRescatados(true)}
                >
                  ✅ Sí
                </button>
                <button
                  className={`btn`}
                  style={{ flex: 1, border: "1.5px solid var(--border)", background: hayRescatados === false ? "var(--surface-2)" : "var(--surface)", color: "var(--text)", minHeight: 44 }}
                  onClick={() => setHayRescatados(false)}
                >
                  ➖ No / Solo asistencia
                </button>
              </div>

              {/* Lista de rescatados */}
              {hayRescatados === true && (
                <div>
                  <div className="form__field">
                    <label className="form__label" htmlFor="num_rescatados">
                      Número total de personas rescatadas
                    </label>
                    <input
                      id="num_rescatados"
                      className="form__input"
                      type="number"
                      inputMode="numeric"
                      placeholder="Ej: 4"
                      value={numRescatados}
                      onChange={(e) => setNumRescatados(e.target.value)}
                    />
                  </div>

                  <p style={{ fontWeight: 600, color: "var(--text)", margin: "var(--s4) 0 var(--s2)" }}>
                    Registro de personas rescatadas (opcional)
                  </p>
                  <p className="form__hint" style={{ marginBottom: "var(--s3)" }}>
                    Agrega los datos que tengas. El nombre es el único campo obligatorio.
                  </p>

                  {rescatados.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "var(--s3)",
                        marginBottom: "var(--s3)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s2)" }}>
                        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                          Persona {i + 1}
                        </span>
                        {rescatados.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRescatado(i)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "var(--text-sm)", padding: "2px 4px" }}
                            aria-label={`Eliminar persona ${i + 1}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="form__row" style={{ marginBottom: "var(--s2)" }}>
                        <div>
                          <label className="form__label form__label--required" htmlFor={`nombre_${i}`}>Nombre</label>
                          <input id={`nombre_${i}`} className="form__input" placeholder="Ej: María" value={r.nombre} onChange={(e) => updateRescatado(i, "nombre", e.target.value)} aria-required="true" />
                        </div>
                        <div>
                          <label className="form__label" htmlFor={`apellido_${i}`}>Apellido</label>
                          <input id={`apellido_${i}`} className="form__input" placeholder="Ej: González" value={r.apellido} onChange={(e) => updateRescatado(i, "apellido", e.target.value)} />
                        </div>
                      </div>
                      <div className="form__field" style={{ marginBottom: "var(--s2)" }}>
                        <label className="form__label" htmlFor={`cedula_${i}`}>Cédula (opcional)</label>
                        <input id={`cedula_${i}`} className="form__input" placeholder="Ej: V-12345678" value={r.cedula} onChange={(e) => updateRescatado(i, "cedula", e.target.value)} />
                        <p className="form__hint">Solo para identificación oficial. No se publica.</p>
                      </div>
                      <div className="form__field">
                        <label className="form__label" htmlFor={`condicion_${i}`}>Condición</label>
                        <select id={`condicion_${i}`} className="form__select" value={r.condicion} onChange={(e) => updateRescatado(i, "condicion", e.target.value as RescatadoInput["condicion"])}>
                          {CONDICION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addRescatado}
                    style={{
                      width: "100%",
                      padding: "var(--s2) var(--s3)",
                      background: "none",
                      border: "1.5px dashed var(--border)",
                      borderRadius: "var(--radius)",
                      color: "var(--brand)",
                      fontWeight: 600,
                      fontSize: "var(--text-sm)",
                      cursor: "pointer",
                      fontFamily: "var(--font)",
                      minHeight: 44,
                    }}
                  >
                    + Agregar otra persona
                  </button>
                </div>
              )}
            </div>

            {err && (
              <div className="form__error" role="alert" style={{ marginTop: "var(--s3)" }}>
                <span aria-hidden="true">⚠️</span><span>{err}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)", marginTop: "var(--s5)" }}>
              <button
                className="btn btn--primary"
                onClick={marcarAtendido}
                disabled={saving || hayRescatados === null}
                aria-disabled={saving || hayRescatados === null}
              >
                {saving ? <><span className="spinner" aria-hidden="true" /> Guardando…</> : "✓ Confirmar — emergencia atendida"}
              </button>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", padding: "var(--s2)", fontFamily: "var(--font)" }}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
