"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Truck,
  ArrowRight,
  Map,
  Package,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LiveStats } from "@/hooks/useLiveStats";
import { HERO_CAROUSEL_MS, HERO_SLIDES } from "@/lib/heroSlides";
import BrandLogo from "@/components/BrandLogo";
import HeroCounters from "./HeroCounters";

type LandingHeroProps = {
  stats: LiveStats;
  onSolicitarTraslado: () => void;
  onVerMapa: () => void;
};

const TRASLADO_TIPOS = [
  {
    icon: Package,
    title: "Insumos y medicinas",
    desc: "Del acopio al punto de necesidad",
  },
  {
    icon: Users,
    title: "Personal y equipos",
    desc: "Médicos y brigadas verificadas",
  },
];

export default function LandingHero({ stats, onSolicitarTraslado, onVerMapa }: LandingHeroProps) {
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number) => {
    setActive((index + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, HERO_CAROUSEL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[active];

  return (
    <section
      className="hero-split"
      aria-labelledby="hero-title"
      aria-roledescription="carrusel"
    >
      <div className="hero-split__visual">
        <div className="hero-carousel__track" aria-hidden="true">
          {HERO_SLIDES.map((item, index) => (
            <div
              key={item.id}
              className={`hero-carousel__slide${index === active ? " hero-carousel__slide--active" : ""}`}
            >
              <Image
                src={item.image}
                alt=""
                fill
                priority={index === 0}
                className="hero-split__img"
                style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
                sizes="(max-width: 900px) 100vw, 58vw"
              />
            </div>
          ))}
        </div>

        <div className="hero-split__overlay" aria-hidden="true" />

        <div className="hero-carousel__progress" aria-hidden="true">
          <span
            key={active}
            className="hero-carousel__progress-bar"
            style={{ animationDuration: `${HERO_CAROUSEL_MS}ms` }}
          />
        </div>

        <div key={slide.id} className="hero-split__copy hero-split__copy--enter">
          <div className="hero-badge">
            <BrandLogo size={28} className="hero-badge__logo" priority />
            <span className="hero-badge__text">Venezuela necesita logística hoy</span>
          </div>

          <HeroCounters stats={stats} />

          <p className="hero-split__kicker">{slide.kicker}</p>
          <h1 id="hero-title" className="hero-split__title">
            {slide.title}
          </h1>
          <p className="hero-split__subtitle">{slide.subtitle}</p>
        </div>

        <div className="hero-carousel__controls">
          <button
            type="button"
            className="hero-carousel__nav"
            onClick={prev}
            aria-label="Diapositiva anterior"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hero-carousel__nav"
            onClick={next}
            aria-label="Diapositiva siguiente"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="hero-carousel__dots" role="tablist" aria-label="Diapositivas del hero">
          {HERO_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={`hero-carousel__dot${index === active ? " hero-carousel__dot--active" : ""}`}
              aria-selected={index === active}
              aria-label={`${item.kicker}: ${item.title}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {slide.alt}. {slide.title}
        </p>
      </div>

      <div className="hero-split__panel">
        <div className="hero-panel">
          <div className="hero-panel__head">
            <span className="hero-panel__badge">Acción inmediata</span>
            <h2 className="hero-panel__title">SOLICITA UN TRASLADO</h2>
            <p className="hero-panel__lead">
              Insumos, medicamentos, personal o carga entre dos puntos. La red asigna un transportista verificado.
            </p>
          </div>

          <div className="hero-panel__field">
            <span className="hero-panel__field-label">¿Qué necesitas mover?</span>
            <ul className="hero-panel__options">
              {TRASLADO_TIPOS.map((tipo) => {
                const Icon = tipo.icon;
                return (
                  <li key={tipo.title} className="hero-panel__option">
                    <span className="hero-panel__option-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="hero-panel__option-text">
                      <span className="hero-panel__option-title">{tipo.title}</span>
                      <span className="hero-panel__option-desc">{tipo.desc}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="hero-panel__field">
            <span className="hero-panel__field-label">Destino</span>
            <div className="hero-panel__dest">
              <span className="hero-panel__dest-icon" aria-hidden="true">
                <Map size={18} strokeWidth={1.75} />
              </span>
              <span className="hero-panel__dest-text">
                <span className="hero-panel__dest-title">Mapa en vivo</span>
                <span className="hero-panel__dest-desc">Origen y destino trazados por operaciones</span>
              </span>
              <ShieldCheck size={18} className="hero-panel__dest-check" aria-hidden="true" />
            </div>
          </div>

          <div className="hero-panel__actions">
            <button type="button" className="btn btn--primary btn--lg btn--block hero-panel__cta" onClick={onSolicitarTraslado}>
              <Truck size={20} aria-hidden="true" />
              Solicitar traslado
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn--hero-ghost btn--block" onClick={onVerMapa}>
              <Map size={18} aria-hidden="true" />
              Ver mapa en vivo
            </button>
          </div>

          <p className="hero-panel__note">
            Parte de la red <strong>Juntos por Venezuela</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
