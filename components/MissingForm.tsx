"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getReporterToken } from "@/lib/reporter-token";
import LocationPicker from "./LocationPicker";

const MAX_MB = 10;
const MAX_PX = 1600;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        const ratio = Math.min(MAX_PX / width, MAX_PX / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("compression failed")),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function MissingForm({ onDone }: { onDone: () => void }) {
  const [nombre,         setNombre]         = useState("");
  const [edad,           setEdad]           = useState("");
  const [descripcion,    setDescripcion]    = useState("");
  const [ultima,         setUltima]         = useState("");
  const [contacto,       setContacto]       = useState("");
  const [lat,            setLat]            = useState<number | null>(null);
  const [lng,            setLng]            = useState<number | null>(null);
  const [file,           setFile]           = useState<File | null>(null);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // v2: quien reporta
  const [reporterNombre, setReporterNombre] = useState("");
  // v2: datos adicionales
  const [extraOpen,      setExtraOpen]      = useState(false);
  const [genero,         setGenero]         = useState("");
  const [estatura,       setEstatura]       = useState("");
  const [contextura,     setContextura]     = useState("");
  const [senas,          setSenas]          = useState("");
  const [condMedica,     setCondMedica]     = useState("");

  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFile(selected: File | null) {
    if (!selected) { setFile(null); setPreviewUrl(null); return; }
    if (!selected.type.startsWith("image/")) {
      setErr("Solo se permiten archivos de imagen.");
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setErr(`La imagen supera los ${MAX_MB} MB.`);
      return;
    }
    setErr(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function submit() {
    setErr(null);
    if (!nombre.trim())   return setErr("El nombre completo es obligatorio para identificar a la persona.");
    if (!contacto.trim()) return setErr("Deja un contacto para que puedan comunicarse contigo si encuentran a la persona.");
    setSaving(true);

    let foto_url: string | null = null;
    if (file) {
      try {
        const compressed = await compressImage(file);
        const ext  = file.type === "image/png" ? "png" : "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("desaparecidos")
          .upload(path, compressed, { contentType: `image/${ext}` });
        if (!upErr) {
          foto_url = supabase.storage.from("desaparecidos").getPublicUrl(path).data.publicUrl;
        } else {
          console.warn("Upload failed:", upErr);
        }
      } catch {
        // Fallback si falla compresión
        const path = `${crypto.randomUUID()}`;
        const { error: upErr } = await supabase.storage.from("desaparecidos").upload(path, file);
        if (!upErr) {
          foto_url = supabase.storage.from("desaparecidos").getPublicUrl(path).data.publicUrl;
        }
      }
    }

    const { error } = await supabase.from("personas_desaparecidas").insert({
      nombre,
      edad:                 edad ? parseInt(edad) : null,
      descripcion:          descripcion || null,
      ultima_ubicacion:     ultima      || null,
      contacto,
      foto_url,
      latitud:              lat,
      longitud:             lng,
      // v2
      reportado_por_nombre: reporterNombre.trim() || null,
      reporter_token:       getReporterToken(),
      genero:               genero     || null,
      estatura:             estatura   || null,
      contextura:           contextura || null,
      senas_particulares:   senas      || null,
      condicion_medica:     condMedica || null,
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
            La información ya aparece en el mapa. Redirigiendo…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form">
      <div className="form__header">
        <h2 className="form__title">Reportar persona desaparecida</h2>
        <p className="form__subtitle">
          El reporte aparecerá en el mapa para que rescatistas y familiares
          puedan coordinar la búsqueda.
        </p>
      </div>

      <p className="form__required-note">Los campos marcados con * son obligatorios.</p>

      {/* Nombre */}
      <div className="form__field">
        <label className="form__label form__label--required" htmlFor="nombre">Nombre completo</label>
        <input
          id="nombre"
          className="form__input"
          placeholder="Ej: María González"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-required="true"
          autoComplete="off"
        />
      </div>

      {/* Edad */}
      <div className="form__field">
        <label className="form__label" htmlFor="edad">Edad</label>
        <input
          id="edad"
          className="form__input"
          type="number"
          inputMode="numeric"
          placeholder="Ej: 34"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
        />
      </div>

      {/* Descripción física */}
      <div className="form__field">
        <label className="form__label" htmlFor="descripcion">Descripción física / vestimenta</label>
        <textarea
          id="descripcion"
          className="form__textarea"
          rows={3}
          placeholder="Ej: Estatura media, cabello negro, camisa azul, jeans claros"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <p className="form__hint">Cuanto más detallada, más fácil es identificar a la persona.</p>
      </div>

      {/* Última ubicación */}
      <div className="form__field">
        <label className="form__label" htmlFor="ultima">¿Dónde fue visto/a por última vez?</label>
        <textarea
          id="ultima"
          className="form__textarea"
          rows={2}
          placeholder="Ej: Salió hacia el trabajo en Sabana Grande, Caracas, a las 4 pm"
          value={ultima}
          onChange={(e) => setUltima(e.target.value)}
        />
      </div>

      {/* Contacto del familiar */}
      <div className="form__field">
        <label className="form__label form__label--required" htmlFor="contacto">Contacto del familiar o conocido</label>
        <input
          id="contacto"
          className="form__input"
          placeholder="Ej: 0414-1234567 (WhatsApp)"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          aria-required="true"
        />
        <p className="form__hint">Teléfono o WhatsApp donde puedan contactarte si hay novedades.</p>
      </div>

      {/* Foto — zona de carga visual */}
      <div className="form__field">
        <label className="form__label">Foto reciente (opcional pero muy útil)</label>
        <div
          className={`photo-upload${file ? " photo-upload--has-file" : ""}`}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
          role="button"
          tabIndex={0}
          aria-label="Seleccionar foto de la persona desaparecida"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {!file ? (
            <>
              <div className="photo-upload__icon" aria-hidden="true">📷</div>
              <p className="photo-upload__label">Toca aquí para subir una foto</p>
              <p className="photo-upload__hint">JPG, PNG o HEIC · Máx. 10 MB</p>
            </>
          ) : (
            <>
              <div className="photo-upload__icon" aria-hidden="true">✅</div>
              <p className="photo-upload__label">Foto seleccionada</p>
              {previewUrl && (
                <div className="photo-upload__preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Vista previa de la foto seleccionada" />
                </div>
              )}
              <p className="photo-upload__preview-name">{file.name}</p>
              <p className="photo-upload__hint" style={{ marginTop: "var(--s1)" }}>
                Toca para cambiar
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Sección colapsable: datos adicionales ── */}
      <div style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: "var(--s4)",
        overflow: "hidden",
      }}>
        <button
          type="button"
          onClick={() => setExtraOpen((v) => !v)}
          aria-expanded={extraOpen}
          aria-controls="datos-adicionales"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "var(--s3) var(--s4)",
            background: "var(--surface-2)",
            border: "none",
            fontFamily: "var(--font)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            color: "var(--text)",
            cursor: "pointer",
            minHeight: 48,
          }}
        >
          <span>📋 Datos adicionales (opcional)</span>
          <span aria-hidden="true">{extraOpen ? "▲" : "▼"}</span>
        </button>

        {extraOpen && (
          <div id="datos-adicionales" style={{ padding: "var(--s4)" }}>
            <p className="form__hint" style={{ marginBottom: "var(--s4)" }}>
              Esta información ayuda a identificar a la persona. Todos los campos son opcionales.
            </p>

            <div className="form__row">
              <div className="form__field">
                <label className="form__label" htmlFor="genero">Género</label>
                <select id="genero" className="form__select" value={genero} onChange={(e) => setGenero(e.target.value)}>
                  <option value="">— No especificar —</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form__field">
                <label className="form__label" htmlFor="estatura">Estatura aprox.</label>
                <input
                  id="estatura"
                  className="form__input"
                  placeholder="Ej: 1.65 m / alta"
                  value={estatura}
                  onChange={(e) => setEstatura(e.target.value)}
                />
              </div>
            </div>

            <div className="form__field">
              <label className="form__label" htmlFor="contextura">Contextura</label>
              <select id="contextura" className="form__select" value={contextura} onChange={(e) => setContextura(e.target.value)}>
                <option value="">— No especificar —</option>
                <option value="delgada">Delgada</option>
                <option value="media">Media</option>
                <option value="robusta">Robusta</option>
              </select>
            </div>

            <div className="form__field">
              <label className="form__label" htmlFor="senas">Señas particulares</label>
              <textarea
                id="senas"
                className="form__textarea"
                rows={2}
                placeholder="Ej: Tatuaje en el brazo derecho, cicatriz en la mejilla"
                value={senas}
                onChange={(e) => setSenas(e.target.value)}
              />
            </div>

            <div className="form__field">
              <label className="form__label" htmlFor="cond_medica">Condición médica relevante</label>
              <textarea
                id="cond_medica"
                className="form__textarea"
                rows={2}
                placeholder="Ej: Diabética, necesita insulina / Condición cardíaca"
                value={condMedica}
                onChange={(e) => setCondMedica(e.target.value)}
              />
              <p className="form__hint">Solo información que pueda urgir la atención de los rescatistas.</p>
            </div>
          </div>
        )}
      </div>

      {/* Ubicación */}
      <div className="form__field">
        <label className="form__label">
          Último lugar visto en el mapa{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opcional pero muy útil)</span>
        </label>
        <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
      </div>

      {/* v2: quien reporta */}
      <div style={{
        background: "var(--brand-soft)",
        border: "1px solid rgba(30,58,138,.15)",
        borderRadius: "var(--radius)",
        padding: "var(--s4)",
        marginBottom: "var(--s4)",
      }}>
        <p style={{ margin: "0 0 var(--s3)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--brand)" }}>
          👤 Quien hace el reporte (opcional)
        </p>
        <div className="form__field">
          <label className="form__label" htmlFor="reporter_nombre">Tu nombre</label>
          <input
            id="reporter_nombre"
            className="form__input"
            placeholder="Ej: José Rodríguez"
            value={reporterNombre}
            onChange={(e) => setReporterNombre(e.target.value)}
          />
        </div>
        <p className="form__hint">Opcional. Nos ayuda a contactarte y verificar el reporte.</p>
      </div>

      {err && (
        <div className="form__error" role="alert">
          <span aria-hidden="true">⚠️</span><span>{err}</span>
        </div>
      )}

      <button className="btn btn--submit" onClick={submit} disabled={saving} aria-disabled={saving}>
        {saving ? <><span className="spinner" aria-hidden="true" /> Publicando reporte…</> : "Publicar reporte"}
      </button>
    </div>
  );
}
