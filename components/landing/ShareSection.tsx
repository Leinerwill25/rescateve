"use client";

import { useState } from "react";
import { Share2, Check, Copy, Link2 } from "lucide-react";
import Reveal from "./Reveal";

const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://rescate-ve.vercel.app";
const SHARE_TITLE = "Rescate VE — Movemos la ayuda donde hace falta";
const SHARE_TEXT =
  "Rescate VE coordina traslados de insumos y apoyo logístico en Venezuela. " +
  "Si puedes transportar o conoces a alguien que necesita ayuda, entra aquí:";

export default function ShareSection() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const payload = { title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* usuario canceló */
      }
    }
    await copyLink();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT}\n${SHARE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback silencioso */
    }
  }

  return (
    <section className="share-band" aria-labelledby="share-title">
      <div className="share-band__inner">
        <Reveal>
          <h2 id="share-title" className="share-band__title">
            Compartir también es ayudar
          </h2>
          <p className="share-band__lead">
            Cada enlace compartido puede sumar un transportista o una solicitud más.
            La difusión es parte del rescate.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="share-band__actions">
            <button type="button" className="btn btn--share-primary" onClick={handleShare}>
              <Share2 size={18} aria-hidden="true" />
              Compartir Rescate VE
            </button>
            <button type="button" className="btn btn--share-ghost" onClick={copyLink} aria-live="polite">
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {copied ? "¡Copiado!" : "Copiar mensaje"}
            </button>
          </div>
          <p className="share-band__url">
            <Link2 size={14} aria-hidden="true" />
            <span>{SHARE_URL.replace(/^https?:\/\//, "")}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
