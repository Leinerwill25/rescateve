"use client";

import { useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Wrench, Stethoscope, ExternalLink, Bus, HeartHandshake } from "lucide-react";
import Kicker from "./Kicker";
import Reveal from "./Reveal";

type AllyCategory = "transporte" | "salud";

type Ally = {
  name: string;
  role: string;
  category: AllyCategory;
  logo?: string;
  icon?: LucideIcon;
  href?: string;
  host?: string;
};

const ALLIES: Ally[] = [
  {
    name: "Nueve Once",
    role: "Transporte de pasajeros y rutas urbanas en la red logística.",
    category: "transporte",
    logo: "/logo-nueveonce.png",
    href: "https://nueveonce.com",
    host: "nueveonce.com",
  },
  {
    name: "Tu Gruero",
    role: "Grúas y rescate vehicular en carretera.",
    category: "transporte",
    logo: "/logo-tu-gruero.png",
    href: "https://tugruero.com",
    host: "tugruero.com",
  },
  {
    name: "Tilín",
    role: "Soporte técnico y logística en campo.",
    category: "transporte",
    icon: Wrench,
    href: "https://tilinapp.com",
    host: "tilinapp.com",
  },
  {
    name: "En la Parada",
    role: "Red de rutas y paradas para movilidad urbana.",
    category: "transporte",
    icon: Bus,
  },
  {
    name: "Ayuda en Camino",
    role: "Coordinación de ayuda humanitaria y necesidades por zona.",
    category: "salud",
    icon: HeartHandshake,
    href: "https://ayudaencamino.com/necesidades?utm_source=ig&utm_medium=social&utm_content=link_in_bio",
    host: "ayudaencamino.com",
  },
  {
    name: "SafeCare",
    role: "Personal médico verificado y roster clínico.",
    category: "salud",
    icon: Stethoscope,
  },
];

type Filter = "todos" | "transporte" | "salud";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todo" },
  { id: "transporte", label: "Transporte" },
  { id: "salud", label: "Salud" },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function AllyLogo({ ally }: { ally: Ally }) {
  if (ally.logo) {
    return (
      <Image
        src={ally.logo}
        alt={`Logo de ${ally.name}`}
        width={96}
        height={40}
        className="ally-card__logo-img"
      />
    );
  }

  const Icon = ally.icon ?? Wrench;
  return (
    <span className="ally-card__logo-fallback" aria-hidden="true">
      <Icon size={24} strokeWidth={1.75} />
      <span>{initials(ally.name)}</span>
    </span>
  );
}

export default function AlliesSection() {
  const [filter, setFilter] = useState<Filter>("todos");
  const visible = ALLIES.filter((a) => filter === "todos" || a.category === filter);

  return (
    <section className="landing-section landing-section--clean" aria-labelledby="allies-title">
      <div className="landing-section__inner">
        <Reveal>
          <header className="landing-section__header landing-section__header--center">
            <Kicker className="landing-section__kicker-center">Quienes lo hacen posible</Kicker>
            <h2 id="allies-title" className="landing-section__title landing-section__title--center">
              Aliados de transporte y salud
            </h2>
            <p className="landing-section__lead landing-section__lead--center">
              Empresas y equipos que aportan operación y alcance para mover ayuda con rapidez.
            </p>
          </header>
        </Reveal>

        <Reveal delay={60}>
          <div className="filter-pills" role="group" aria-label="Filtrar aliados">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-pill${filter === f.id ? " filter-pill--active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        <ul className="ally-grid">
          {visible.map((a, index) => (
            <li key={a.name} className="ally-grid__item">
              <Reveal delay={index * 60} className="ally-grid__cell">
                <article className="ally-card">
                  <span className="ally-card__tag">
                    {a.category === "salud" ? "Salud" : "Transporte"}
                  </span>
                  <div className="ally-card__main">
                    <div className="ally-card__logo-wrap">
                      <AllyLogo ally={a} />
                    </div>
                    <div className="ally-card__body">
                      <h3 className="ally-card__name">{a.name}</h3>
                      <p className="ally-card__role">{a.role}</p>
                    </div>
                  </div>
                  {a.href && (
                    <a
                      href={a.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ally-card__visit"
                      aria-label={`Visitar ${a.name} en ${a.host}`}
                    >
                      <span className="ally-card__visit-text">
                        <span className="ally-card__visit-label">{a.name}</span>
                        <span className="ally-card__visit-host">{a.host}</span>
                      </span>
                      <ExternalLink size={15} className="ally-card__visit-icon" aria-hidden="true" />
                    </a>
                  )}
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <p className="landing-section__footnote">
          Parte de la red <strong>Juntos por Venezuela</strong> · Cada asignación es trazable y verificable.
        </p>
      </div>
    </section>
  );
}
