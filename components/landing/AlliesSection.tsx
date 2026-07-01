"use client";

import Image from "next/image";
import { ExternalLink, Lock, Sparkles } from "lucide-react";
import {
  ALLY_SHOWCASE_SLIDES,
  DONA_VENEZUELA_URL,
  type AllyShowcaseSlide,
} from "@/lib/alliesShowcase";
import Kicker from "./Kicker";

const slide = ALLY_SHOWCASE_SLIDES.find((s) => s.id === "en-la-parada")!;

function isAllyAvailable(item: AllyShowcaseSlide) {
  return item.available !== false;
}

function AllyCardThumb({ item }: { item: AllyShowcaseSlide }) {
  const available = isAllyAvailable(item);
  const isParada = item.id === "en-la-parada";

  return (
    <button
      type="button"
      className={`allies-showcase__card${isParada ? " allies-showcase__card--active" : ""}${!available ? " allies-showcase__card--locked" : ""}`}
      disabled={!available}
      aria-label={
        available ? `Ver aliado: ${item.name}` : `${item.name} — próximamente`
      }
      aria-current={isParada ? "true" : undefined}
      aria-disabled={!available}
    >
      <span className="allies-showcase__card-media">
        <Image
          src={item.cardImage}
          alt=""
          fill
          unoptimized
          sizes={isParada ? "320px" : "160px"}
          className="allies-showcase__card-img"
          style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
        />
        <span className="allies-showcase__card-shade" aria-hidden="true" />
        {!available && (
          <span className="allies-showcase__card-lock" aria-hidden="true">
            <Lock size={16} />
            <span>Próximamente</span>
          </span>
        )}
      </span>
      <span className="allies-showcase__card-meta">
        <span className="allies-showcase__card-cat">
          {item.category === "salud" ? "Salud" : "Transporte"}
        </span>
        <span className="allies-showcase__card-name">{item.name}</span>
      </span>
    </button>
  );
}

export default function AlliesSection() {
  return (
    <section
      className="allies-showcase"
      id="aliados"
      aria-labelledby="allies-title"
    >
      <div className="allies-showcase__bg" aria-hidden="true">
        <div className="allies-showcase__bg-slide allies-showcase__bg-slide--active">
          <Image
            src={slide.bgImage}
            alt=""
            fill
            priority
            unoptimized
            className="allies-showcase__bg-img"
            sizes="100vw"
          />
        </div>
        <div className="hero-split__overlay" />
      </div>

      <div className="allies-showcase__inner">
        <header className="allies-showcase__section-head">
          <Kicker light className="allies-showcase__section-kicker">
            Quienes lo hacen posible
          </Kicker>
          <h2 id="allies-title" className="allies-showcase__section-title">
            Aliados de transporte y salud
          </h2>
        </header>

        <div className="allies-showcase__layout">
          <div className="allies-showcase__copy">
            <div className="allies-showcase__brand">
              <span className="allies-showcase__featured-badge">
                <Sparkles size={14} aria-hidden="true" />
                Aliado principal
              </span>

              {slide.logo && (
                <div className="allies-showcase__logo-wrap">
                  <Image
                    src={slide.logo}
                    alt={`Logo de ${slide.name}`}
                    width={88}
                    height={88}
                    unoptimized
                    priority
                    className="allies-showcase__logo"
                  />
                </div>
              )}
            </div>

            <p className="allies-showcase__kicker">{slide.kicker}</p>
            <h3 className="allies-showcase__title">{slide.title}</h3>
            <p className="allies-showcase__desc">{slide.description}</p>

            {slide.stats && slide.stats.length > 0 && (
              <ul className="allies-showcase__stats">
                {slide.stats.map((s) => (
                  <li key={s.label}>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {slide.benefit && (
              <div className="allies-showcase__benefit">
                <p>
                  {slide.benefit.split("DonaVenezuela.com")[0]}
                  <a
                    href={DONA_VENEZUELA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="allies-showcase__link"
                  >
                    DonaVenezuela.com
                  </a>
                  {slide.benefit.split("DonaVenezuela.com")[1] ?? ""}
                </p>
              </div>
            )}

            {slide.href && (
              <a
                href={slide.href}
                target="_blank"
                rel="noopener noreferrer"
                className="allies-showcase__cta"
              >
                Conocer {slide.name}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
          </div>

          <div className="allies-showcase__rail" aria-label="Aliados de la red">
            <p className="allies-showcase__rail-hint">
              Más aliados se sumarán pronto a la red.
            </p>
            <div className="allies-showcase__cards">
              {ALLY_SHOWCASE_SLIDES.map((item) => (
                <AllyCardThumb key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        <div className="allies-showcase__controls allies-showcase__controls--solo">
          <div className="allies-showcase__index" aria-live="polite">
            <span className="allies-showcase__index-current">01</span>
            <span className="allies-showcase__index-sep">/</span>
            <span className="allies-showcase__index-total">01</span>
            <span className="allies-showcase__index-label">activo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
