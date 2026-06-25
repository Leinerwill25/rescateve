"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { TIPOS } from "@/lib/types";
import { getReporterToken } from "@/lib/reporter-token";
import LocationPicker from "./LocationPicker";

export default function ReportForm({ onDone }: { onDone: () => void }) {
  const [tipo,           setTipo]           = useState("rescate");
  const [descripcion,    setDescripcion]    = useState("");
  const [referencia,     setReferencia]     = useState("");
  const [personas,       setPersonas]       = useState("");
  const [prioridad,      setPrioridad]      = useState("alta");
  const [contacto,       setContacto]       = useState("");
  const [lat,            setLat]            = useState<number | null>(null);
  const [lng,            setLng]            = useState<number | null>(null);
  // v2: quién reporta
  const [reporterNombre, setReporterNombre] = useState("");
  const [reporterContacto, setReporterContacto] = useState("");
  const [saving,         setSaving]         = useState(false);
  const [err,            setErr]            = useState<string | null>(null);
  const [success,        setSuccess]        = useState(false);

  async function submit() {
    setErr(null);
    if (lat == null || lng == null) {
      setErr("Marca la ubicación en el mapa. Usa el GPS o toca el mapa para colocar el pin.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("solicitudes_ayuda").insert({
      tipo,
      descripcion:            descripcion  || null,
      referencia:             referencia   || null,
      personas_afectadas:     personas ? parseInt(personas) : null,
      prioridad,
      contacto:               contacto     || null,
      latitud:                lat,
      longitud:               lng,
      // v2
      reportado_por_nombre:   reporterNombre.trim()   || null,
      reportado_por_contacto: reporterContacto.trim() || null,
      reporter_token:         getReporterToken(),
    });
    setSaving(false);
    if (error) {
      setErr("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
      return;
    }
    setSuccess(true);
    setTimeout(onDone, 2000);
  }

  if (success) {
    return (
      <div className="form">
        <div className="form__success" role="status" aria-live="polite">
          <span aria-hidden="true" style={{ fontSize: "24px" }}>✅</span>
          <div>
            <strong>Reporte publicado.</strong>
            <br />
            Ya aparece en el mapa. Redirigiendo…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form">
      <div className="form__header">
        <h2 className="form__title">Reportar un lugar que necesita ayuda</h2>
        <p className="form__subtitle">
          El reporte aparecerá en el mapa inmediatamente para que los rescatistas puedan llegar.
        </p>
      </div>

      <p className="form__required-note">Los campos marcados con * son obligatorios.</p>

      {/* Tipo de ayuda */}
      <div className="form__field">
        <label className="form__label form__label--required" htmlFor="tipo">
          Tipo de ayuda
        </label>
        <select id="tipo" className="form__select" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-required="true">
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div className="form__field">
        <label className="form__label" htmlFor="descripcion">¿Qué está pasando?</label>
        <textarea
          id="descripcion"
          className="form__textarea"
          rows={3}
          placeholder="Ej: Edificio colapsado, hay personas atrapadas en el 3.er piso"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      {/* Referencia */}
      <div className="form__field">
        <label className="form__label" htmlFor="referencia">Punto de referencia / dirección</label>
        <input
          id="referencia"
          className="form__input"
          placeholder="Ej: Av. Sucre, frente a la panadería La Espiga, Caracas"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
      </div>

      {/* Personas y Prioridad */}
      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="personas">Personas afectadas (aprox.)</label>
          <input
            id="personas"
            className="form__input"
            type="number"
            inputMode="numeric"
            placeholder="Ej: 5"
            value={personas}
            onChange={(e) => setPersonas(e.target.value)}
          />
        </div>
        <div className="form__field">
          <label className="form__label form__label--required" htmlFor="prioridad">Prioridad</label>
          <select id="prioridad" className="form__select" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} aria-required="true">
            <option value="alta">🔴 Alta — Riesgo de vida</option>
            <option value="media">🟡 Media — Urgente</option>
            <option value="baja">🔵 Baja — Puede esperar</option>
          </select>
        </div>
      </div>

      {/* Contacto de la emergencia */}
      <div className="form__field">
        <label className="form__label" htmlFor="contacto">Contacto en el lugar (teléfono o WhatsApp)</label>
        <input
          id="contacto"
          className="form__input"
          placeholder="Ej: 0414-1234567"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
        />
        <p className="form__hint">Opcional, pero ayuda a coordinar mejor el rescate.</p>
      </div>

      {/* Ubicación */}
      <div className="form__field">
        <label className="form__label form__label--required">Ubicación exacta del lugar</label>
        <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
      </div>

      {/* v2: quién reporta */}
      <div style={{
        background: "var(--brand-soft)",
        border: "1px solid rgba(30,58,138,.15)",
        borderRadius: "var(--radius)",
        padding: "var(--s4)",
        marginBottom: "var(--s4)",
      }}>
        <p style={{ margin: "0 0 var(--s3)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--brand)" }}>
          👤 Tus datos (opcional)
        </p>
        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="reporter_nombre">Tu nombre</label>
            <input
              id="reporter_nombre"
              className="form__input"
              placeholder="Ej: Carlos Martínez"
              value={reporterNombre}
              onChange={(e) => setReporterNombre(e.target.value)}
            />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="reporter_contacto">Tu contacto</label>
            <input
              id="reporter_contacto"
              className="form__input"
              placeholder="Ej: 0412-5554433"
              value={reporterContacto}
              onChange={(e) => setReporterContacto(e.target.value)}
            />
          </div>
        </div>
        <p className="form__hint">Opcional. Nos ayuda a contactarte y a verificar el reporte.</p>
      </div>

      {err && (
        <div className="form__error" role="alert">
          <span aria-hidden="true">⚠️</span><span>{err}</span>
        </div>
      )}

      <button className="btn btn--submit" onClick={submit} disabled={saving} aria-disabled={saving}>
        {saving ? <><span className="spinner" aria-hidden="true" /> Publicando en el mapa…</> : "Publicar en el mapa"}
      </button>
    </div>
  );
}
