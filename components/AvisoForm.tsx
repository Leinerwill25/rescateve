"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORIAS_AVISO } from "@/lib/types";
import { getReporterToken } from "@/lib/reporter-token";

type Props = { onDone: () => void; onCancel: () => void };

const MAX_MB = 5;
const MAX_PX = 1600;

/** Redimensiona una imagen en cliente usando Canvas antes de subir */
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

export default function AvisoForm({ onDone, onCancel }: Props) {
  const [categoria,    setCategoria]    = useState("emergencias");
  const [titulo,       setTitulo]       = useState("");
  const [descripcion,  setDescripcion]  = useState("");
  const [contacto,     setContacto]     = useState("");
  const [fuente,       setFuente]       = useState("");
  const [file,         setFile]         = useState<File | null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState<string | null>(null);
  const [success,      setSuccess]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File | null) {
    if (!selected) { setFile(null); setPreviewUrl(null); return; }
    if (!selected.type.startsWith("image/")) {
      setErr("Solo se permiten archivos de imagen (JPG, PNG, HEIC, etc.).");
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setErr(`La imagen supera los ${MAX_MB} MB. Elige una más pequeña o comprime antes de subir.`);
      return;
    }
    setErr(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function submit() {
    setErr(null);
    if (!titulo.trim() && !file) {
      setErr("Agrega al menos un título o una imagen para publicar el aviso.");
      return;
    }
    setSaving(true);

    let imagen_url: string | null = null;
    if (file) {
      try {
        const compressed = await compressImage(file);
        const ext  = file.type === "image/png" ? "png" : "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avisos")
          .upload(path, compressed, { contentType: `image/${ext}` });
        if (upErr) {
          // Si el bucket no existe, continuamos sin imagen
          console.warn("Upload failed:", upErr.message);
        } else {
          imagen_url = supabase.storage.from("avisos").getPublicUrl(path).data.publicUrl;
        }
      } catch {
        // Compresión falló — intentar subir original
        const path = `${crypto.randomUUID()}`;
        const { error: upErr } = await supabase.storage.from("avisos").upload(path, file);
        if (!upErr) {
          imagen_url = supabase.storage.from("avisos").getPublicUrl(path).data.publicUrl;
        }
      }
    }

    const { error } = await supabase.from("avisos").insert({
      categoria,
      titulo:        titulo.trim()      || null,
      descripcion:   descripcion.trim() || null,
      contacto:      contacto.trim()    || null,
      fuente:        fuente.trim()      || null,
      imagen_url,
      reporter_token: getReporterToken(),
    });
    setSaving(false);
    if (error) {
      setErr("No se pudo publicar. Revisa tu conexión e intenta de nuevo.");
      return;
    }
    setSuccess(true);
    setTimeout(onDone, 1800);
  }

  if (success) {
    return (
      <div className="form">
        <div className="form__success" role="status" aria-live="polite">
          <span aria-hidden="true" style={{ fontSize: 24 }}>✅</span>
          <div><strong>Aviso publicado.</strong><br />Ya aparece en el feed.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="form">
      <div className="form__header">
        <h2 className="form__title">Publicar un aviso</h2>
        <p className="form__subtitle">
          Comparte información útil para la comunidad: contactos, refugios, donaciones, etc.
        </p>
      </div>

      {/* Aviso de moderación */}
      <div style={{
        background: "var(--warning-soft)",
        border: "1px solid rgba(217,119,6,.25)",
        borderRadius: "var(--radius)",
        padding: "var(--s3) var(--s4)",
        marginBottom: "var(--s4)",
        fontSize: "var(--text-xs)",
        color: "#92400E",
        lineHeight: 1.5,
      }}>
        ⚠️ <strong>Antes de publicar:</strong> No subas imágenes con contenido gráfico, datos
        personales de terceros sin permiso, ni información sin verificar. Los avisos reportados
        3 veces se ocultan automáticamente.
      </div>

      <p className="form__required-note">Al menos una categoría + título o imagen son obligatorios.</p>

      {/* Categoría */}
      <div className="form__field">
        <label className="form__label form__label--required" htmlFor="av_categoria">Categoría</label>
        <select id="av_categoria" className="form__select" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-required="true">
          {CATEGORIAS_AVISO.map((c) => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Imagen */}
      <div className="form__field">
        <label className="form__label">Imagen (opcional · máx. {MAX_MB} MB)</label>
        <div
          className={`photo-upload${file ? " photo-upload--has-file" : ""}`}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
          role="button" tabIndex={0}
          aria-label="Seleccionar imagen para el aviso"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {!file ? (
            <>
              <div className="photo-upload__icon" aria-hidden="true">🖼️</div>
              <p className="photo-upload__label">Toca aquí para subir una imagen</p>
              <p className="photo-upload__hint">JPG, PNG, HEIC · Máx. {MAX_MB} MB · Se comprime automáticamente</p>
            </>
          ) : (
            <>
              <div className="photo-upload__icon" aria-hidden="true">✅</div>
              <p className="photo-upload__label">Imagen seleccionada</p>
              {previewUrl && (
                <div className="photo-upload__preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Vista previa" />
                </div>
              )}
              <p className="photo-upload__preview-name">{file.name}</p>
              <p className="photo-upload__hint" style={{ marginTop: "var(--s1)" }}>Toca para cambiar</p>
            </>
          )}
        </div>
      </div>

      {/* Título */}
      <div className="form__field">
        <label className="form__label" htmlFor="av_titulo">Título</label>
        <input id="av_titulo" className="form__input" placeholder="Ej: Hospital El Algodonal operativo — urgencias activas" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      {/* Descripción */}
      <div className="form__field">
        <label className="form__label" htmlFor="av_desc">Descripción</label>
        <textarea id="av_desc" className="form__textarea" rows={3} placeholder="Información adicional, horarios, dirección, cómo llegar…" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>

      {/* Contacto */}
      <div className="form__field">
        <label className="form__label" htmlFor="av_contacto">Contacto (teléfono, WhatsApp o enlace)</label>
        <input id="av_contacto" className="form__input" placeholder="Ej: 0212-4056789 o https://..." value={contacto} onChange={(e) => setContacto(e.target.value)} />
        <p className="form__hint">Usa líneas oficiales o de organizaciones, no datos privados de personas.</p>
      </div>

      {/* Fuente */}
      <div className="form__field">
        <label className="form__label" htmlFor="av_fuente">Fuente (opcional)</label>
        <input id="av_fuente" className="form__input" placeholder="Ej: Protección Civil Miranda · @cuenta_oficial" value={fuente} onChange={(e) => setFuente(e.target.value)} />
      </div>

      {err && (
        <div className="form__error" role="alert">
          <span aria-hidden="true">⚠️</span><span>{err}</span>
        </div>
      )}

      <button className="btn btn--submit" onClick={submit} disabled={saving} aria-disabled={saving}>
        {saving ? <><span className="spinner" aria-hidden="true" />Publicando…</> : "Publicar aviso"}
      </button>
      <button
        onClick={onCancel}
        style={{ width: "100%", marginTop: "var(--s3)", background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", cursor: "pointer", padding: "var(--s2)", fontFamily: "var(--font)" }}
      >
        Cancelar
      </button>
    </div>
  );
}
