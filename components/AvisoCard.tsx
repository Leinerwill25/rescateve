"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Aviso, categoriaAvisoInfo } from "@/lib/types";

type Props = { aviso: Aviso; onReportado: () => void };

/** Normaliza número venezolano a formato wa.me/58XXXXXXXXXX */
function waLink(raw: string): string | null {
  let n = raw.replace(/[\s\-().+]/g, "");
  if (n.startsWith("04") && n.length === 11) n = "58" + n.slice(1);
  if (n.startsWith("584") && n.length === 12) return `https://wa.me/${n}`;
  return null;
}

function telLink(raw: string): string | null {
  const n = raw.replace(/[\s\-().]/g, "");
  if (/^\+?[\d]{7,15}$/.test(n)) return `tel:${n}`;
  return null;
}

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function AvisoCard({ aviso, onReportado }: Props) {
  const [imgError,    setImgError]    = useState(false);
  const [lightbox,    setLightbox]    = useState(false);
  const [reporting,   setReporting]   = useState(false);
  const [reported,    setReported]    = useState(false);

  const cat = categoriaAvisoInfo(aviso.categoria);
  const hasImg = !!aviso.imagen_url && !imgError;

  async function reportar() {
    if (reported || reporting) return;
    setReporting(true);
    const newCount = (aviso.reportes ?? 0) + 1;
    await supabase
      .from("avisos")
      .update({
        reportes: newCount,
        oculto:   newCount >= 3,
      })
      .eq("id", aviso.id);
    setReporting(false);
    setReported(true);
    if (newCount >= 3) onReportado();
  }

  return (
    <>
      <article
        className="aviso-card"
        style={{ "--cat-color": cat.color } as React.CSSProperties}
      >
        {/* Imagen */}
        {hasImg && (
          <div className="aviso-card__img-wrap" onClick={() => setLightbox(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={aviso.imagen_url!}
              alt={aviso.titulo ?? "Imagen del aviso"}
              className="aviso-card__img"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            <span className="aviso-card__img-hint" aria-hidden="true">🔍 Ver imagen</span>
          </div>
        )}

        <div className="aviso-card__body" style={!hasImg ? { borderLeft: `3px solid ${cat.color}`, paddingLeft: "var(--s3)" } : {}}>
          {/* Categoría + verificado */}
          <div className="aviso-card__top">
            <span className="aviso-card__cat-badge" style={{ background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}33` }}>
              {cat.emoji} {cat.label}
            </span>
            {aviso.verificado && (
              <span className="badge" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid rgba(22,163,74,.2)", marginLeft: "auto" }}>
                ✅ Verificado
              </span>
            )}
          </div>

          {/* Contenido */}
          {aviso.titulo && <h3 className="aviso-card__title">{aviso.titulo}</h3>}
          {aviso.descripcion && <p className="aviso-card__desc">{aviso.descripcion}</p>}

          {/* Contacto inteligente */}
          {aviso.contacto && (
            <div className="aviso-card__contact">
              {isUrl(aviso.contacto) ? (
                <a href={aviso.contacto} target="_blank" rel="noreferrer" className="aviso-card__action aviso-card__action--link">
                  🔗 Abrir enlace
                </a>
              ) : (
                <>
                  {telLink(aviso.contacto) && (
                    <a href={telLink(aviso.contacto)!} className="aviso-card__action aviso-card__action--tel">
                      📞 Llamar
                    </a>
                  )}
                  {waLink(aviso.contacto) && (
                    <a href={waLink(aviso.contacto)!} target="_blank" rel="noreferrer" className="aviso-card__action aviso-card__action--wa">
                      💬 WhatsApp
                    </a>
                  )}
                  {!telLink(aviso.contacto) && !waLink(aviso.contacto) && (
                    <span className="aviso-card__contact-raw">📞 {aviso.contacto}</span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="aviso-card__footer">
            <span className="aviso-card__time">
              🕐 {timeAgo(aviso.created_at)}
              {aviso.fuente && <> · <em>{aviso.fuente}</em></>}
            </span>
            <button
              className="aviso-card__report"
              onClick={reportar}
              disabled={reported || reporting}
              aria-label="Reportar este aviso como inapropiado"
            >
              {reported ? "Reportado" : "⚑ Reportar"}
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox imagen */}
      {lightbox && hasImg && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Imagen en pantalla completa"
          onClick={() => setLightbox(false)}
          style={{ alignItems: "center", padding: "var(--s4)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aviso.imagen_url!}
            alt={aviso.titulo ?? "Imagen del aviso"}
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "var(--radius)", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
