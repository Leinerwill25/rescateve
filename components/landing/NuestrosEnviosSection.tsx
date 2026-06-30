"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import Kicker from "./Kicker";
import Reveal from "./Reveal";

type MediaKind = "image" | "video";

type ShipmentMedia = {
  id: string;
  kind: MediaKind;
  file: string;
  alt: string;
  caption: string;
  area: string;
};

const mediaSrc = (file: string) => `/${encodeURI(file)}`;

const SHIPMENT_MEDIA: ShipmentMedia[] = [
  {
    id: "v-load",
    kind: "video",
    file: "WhatsApp Video 2026-06-30 at 12.18.40 PM.mp4",
    alt: "Voluntarios cargando insumos en vehículo",
    caption: "Carga coordinada",
    area: "hero",
  },
  {
    id: "img-moto-boxes",
    kind: "image",
    file: "WhatsApp Image 2026-06-30 at 12.13.32 PM.jpeg",
    alt: "Motocicleta con cajas de ayuda",
    caption: "Moto cargada",
    area: "moto",
  },
  {
    id: "img-team",
    kind: "image",
    file: "WhatsApp Image 2026-06-30 at 12.18.40 PM.jpeg",
    alt: "Equipo de voluntarios en chalecos amarillos",
    caption: "En calle",
    area: "team",
  },
  {
    id: "v-van",
    kind: "video",
    file: "WhatsApp Video 2026-06-30 at 12.18.03 PM.mp4",
    alt: "Voluntario junto a van de distribución",
    caption: "Punto de entrega",
    area: "van",
  },
  {
    id: "img-distribution",
    kind: "image",
    file: "WhatsApp Image 2026-06-30 at 12.18.39 PM.jpeg",
    alt: "Punto de acopio con sacos e insumos",
    caption: "Acopio en campo",
    area: "dist",
  },
  {
    id: "img-motos",
    kind: "image",
    file: "WhatsApp Image 2026-06-30 at 12.13.31 PM.jpeg",
    alt: "Motos preparadas para distribución",
    caption: "Flota lista",
    area: "motos",
  },
  {
    id: "v-night",
    kind: "video",
    file: "WhatsApp Video 2026-06-30 at 12.14.36 PM.mp4",
    alt: "Traslado nocturno en ruta",
    caption: "Ruta activa",
    area: "night",
  },
  {
    id: "img-app",
    kind: "image",
    file: "WhatsApp Image 2026-06-30 at 12.17.04 PM.jpeg",
    alt: "Coordinación logística desde el móvil",
    caption: "Coordinación",
    area: "app",
  },
];

function ShipmentTile({
  item,
  index,
  onOpen,
}: {
  item: ShipmentMedia;
  index: number;
  onOpen: (item: ShipmentMedia) => void;
}) {
  const src = mediaSrc(item.file);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnter = () => {
    const v = videoRef.current;
    if (v) void v.play().catch(() => {});
  };

  const handleLeave = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <button
      type="button"
      className="shipments-mosaic__tile"
      data-area={item.area}
      style={{ "--ship-i": index } as React.CSSProperties}
      onClick={() => onOpen(item)}
      onMouseEnter={item.kind === "video" ? handleEnter : undefined}
      onMouseLeave={item.kind === "video" ? handleLeave : undefined}
      onFocus={item.kind === "video" ? handleEnter : undefined}
      onBlur={item.kind === "video" ? handleLeave : undefined}
      aria-label={`Ver: ${item.caption}`}
    >
      <span className="shipments-mosaic__frame">
        {item.kind === "image" ? (
          <Image
            src={src}
            alt={item.alt}
            fill
            sizes="(max-width: 768px) 45vw, 180px"
            className="shipments-mosaic__media"
          />
        ) : (
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            loop
            preload="metadata"
            className="shipments-mosaic__media"
            aria-hidden="true"
          />
        )}
        <span className="shipments-mosaic__veil" aria-hidden="true" />
        {item.kind === "video" && (
          <span className="shipments-mosaic__play" aria-hidden="true">
            <Play size={14} fill="currentColor" />
          </span>
        )}
        <span className="shipments-mosaic__tag">{item.kind === "video" ? "Video" : "Foto"}</span>
        <span className="shipments-mosaic__label">{item.caption}</span>
      </span>
    </button>
  );
}

export default function NuestrosEnviosSection() {
  const [active, setActive] = useState<ShipmentMedia | null>(null);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active, close]);

  return (
    <section className="shipments-section" id="nuestros-envios" aria-labelledby="shipments-title">
      <div className="shipments-section__glow" aria-hidden="true" />
      <div className="shipments-section__inner">
        <div className="shipments-section__layout">
          <Reveal className="shipments-section__copy">
            <Kicker className="shipments-section__kicker">En campo</Kicker>
            <h2 id="shipments-title" className="shipments-section__title">
              Nuestros envíos
            </h2>
            <p className="shipments-section__lead">
              Traslados reales de la red — motos, acopios y rutas coordinadas.
            </p>
            <p className="shipments-section__hint">Toca una pieza para ampliar</p>
          </Reveal>

          <div className="shipments-mosaic" role="list">
            {SHIPMENT_MEDIA.map((item, index) => (
              <Reveal key={item.id} delay={index * 40} className="shipments-mosaic__cell">
                <ShipmentTile item={item} index={index} onOpen={setActive} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {active && (
        <div
          className="shipments-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={active.caption}
          onClick={close}
        >
          <div className="shipments-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="shipments-lightbox__close"
              onClick={close}
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>
            <div className="shipments-lightbox__stage">
              {active.kind === "image" ? (
                <Image
                  src={mediaSrc(active.file)}
                  alt={active.alt}
                  width={1200}
                  height={900}
                  className="shipments-lightbox__image"
                  priority
                />
              ) : (
                <video
                  src={mediaSrc(active.file)}
                  controls
                  autoPlay
                  playsInline
                  className="shipments-lightbox__video"
                />
              )}
            </div>
            <p className="shipments-lightbox__caption">{active.caption}</p>
          </div>
        </div>
      )}
    </section>
  );
}
