"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, Truck, PackageCheck, Radio } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import Kicker from "./Kicker";

const STEPS = [
  {
    icon: Radio,
    title: "Se reporta la necesidad",
    desc: "Una comunidad, hospital o acopio solicita un traslado con origen, destino y contacto.",
    variant: "report" as const,
  },
  {
    icon: ClipboardCheck,
    title: "La red lo valida",
    desc: "Operaciones revisa la solicitud y la clasifica según prioridad y tipo de recurso.",
    variant: "validate" as const,
  },
  {
    icon: Truck,
    title: "Un transportista lo lleva",
    desc: "Conductores y aliados verificados asumen la ruta hasta el punto de entrega.",
    variant: "transport" as const,
  },
  {
    icon: PackageCheck,
    title: "Se confirma la entrega",
    desc: "El transportista registra la entrega con evidencia. La ayuda llegó.",
    variant: "deliver" as const,
  },
];

function StepIcon({ icon: Icon, variant }: { icon: LucideIcon; variant: (typeof STEPS)[number]["variant"] }) {
  return (
    <div className={`how-flow-journey__icon how-flow-journey__icon--${variant}`}>
      {variant === "report" && (
        <>
          <span className="how-flow-journey__ripple" aria-hidden="true" />
          <span className="how-flow-journey__ripple how-flow-journey__ripple--delay" aria-hidden="true" />
        </>
      )}
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

export default function HowItWorks() {
  const { ref, visible } = useScrollReveal(0.1);

  return (
    <section className="landing-section landing-section--alt" id="como-funciona" aria-labelledby="how-title">
      <div className="landing-section__inner">
        <header className="landing-section__header landing-section__header--center">
          <Kicker className="landing-section__kicker-center">Cómo funciona</Kicker>
          <h2 id="how-title" className="landing-section__title landing-section__title--center">
            Del reporte a la entrega confirmada
          </h2>
          <p className="landing-section__lead landing-section__lead--center">
            Cuatro pasos. Sin tecnicismos. La logística conecta quien tiene la ayuda con quien la necesita.
          </p>
        </header>

        <div
          ref={ref}
          className={`how-flow-journey${visible ? " how-flow-journey--visible" : ""}`}
        >
          <div className="how-flow-journey__route-layer" aria-hidden="true">
            <div className="how-flow-journey__track how-flow-journey__track--desktop">
              <div className="how-flow-journey__track-fill" />
            </div>
            <div className="how-flow-journey__track how-flow-journey__track--mobile">
              <div className="how-flow-journey__track-fill how-flow-journey__track-fill--vertical" />
            </div>
            <span className="how-flow-journey__traveler how-flow-journey__traveler--desktop">
              <span className="how-flow-journey__traveler-core" />
            </span>
            <span className="how-flow-journey__traveler how-flow-journey__traveler--mobile">
              <span className="how-flow-journey__traveler-core" />
            </span>
          </div>

          <ol className="how-flow-journey__steps">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="how-flow-journey__step"
                style={{ "--step-i": index } as CSSProperties}
              >
                <span className="how-flow-journey__node" />
                <article className="how-flow-journey__card">
                  <span className="how-flow-journey__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <StepIcon icon={step.icon} variant={step.variant} />
                  <h3 className="how-flow-journey__title">{step.title}</h3>
                  <p className="how-flow-journey__desc">{step.desc}</p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
