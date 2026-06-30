"use client";

import Link from "next/link";
import { Truck, UserPlus, Warehouse, ArrowRight } from "lucide-react";
import Kicker from "./Kicker";
import Reveal from "./Reveal";

type ProfileCtasProps = {
  onSolicitarTraslado: () => void;
  onVerMapa: () => void;
  onEmergencia?: () => void;
};

const PROFILES = [
  {
    icon: Truck,
    title: "Necesito un traslado",
    desc: "Solicita mover insumos, medicamentos, personal o carga entre dos puntos.",
    action: "solicitar" as const,
  },
  {
    icon: UserPlus,
    title: "Soy transportista voluntario",
    desc: "Registra tu vehículo y únete a la red de conductores que mueven la ayuda.",
    action: "voluntarios" as const,
    href: "/voluntarios",
  },
  {
    icon: Warehouse,
    title: "Soy centro de acopio",
    desc: "Gestiona inventario y movimientos desde la consola. Contacta a operaciones para activar tu cuenta.",
    action: "login" as const,
    href: "/login",
  },
];

export default function ProfileCtas({ onSolicitarTraslado, onVerMapa, onEmergencia }: ProfileCtasProps) {
  return (
    <section className="landing-section landing-section--clean" id="sumarse" aria-labelledby="cta-title">
      <div className="landing-section__inner">
        <Reveal>
          <header className="landing-section__header landing-section__header--center">
            <Kicker className="landing-section__kicker-center">Cómo puedes ser parte</Kicker>
            <h2 id="cta-title" className="landing-section__title landing-section__title--center">
              ¿Cómo quieres sumarte?
            </h2>
            <p className="landing-section__lead landing-section__lead--center">
              Cada perfil tiene su camino. Elige el tuyo y conecta con la red logística.
            </p>
          </header>
        </Reveal>

        <div className="profile-grid">
          {PROFILES.map((p, index) => (
            <Reveal key={p.title} delay={index * 80} className="profile-grid__cell">
              <article className="profile-card profile-card--clean">
                <div className="profile-card__icon profile-card__icon--clean" aria-hidden="true">
                  <p.icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="profile-card__title">{p.title}</h3>
                <p className="profile-card__desc">{p.desc}</p>
                <div className="profile-card__footer">
                  {p.action === "solicitar" ? (
                    <button type="button" className="btn btn--primary btn--block" onClick={onSolicitarTraslado}>
                      Solicitar ahora
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ) : p.action === "voluntarios" ? (
                    <Link href={p.href!} className="btn btn--primary btn--block">
                      Registrarme
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  ) : (
                    <Link href={p.href!} className="btn btn--outline btn--block">
                      Acceder a la consola
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="landing-section__note">
          También puedes explorar el{" "}
          <button type="button" className="landing-inline-link" onClick={onVerMapa}>mapa colaborativo</button>
          {" "}con emergencias, refugios y centros de acopio, o{" "}
          <button type="button" className="landing-inline-link" onClick={() => onEmergencia?.()}>reportar una emergencia</button>.
        </p>
      </div>
    </section>
  );
}
