"use client";

import { ClipboardCheck, Truck, PackageCheck, Radio } from "lucide-react";
import Kicker from "./Kicker";
import Reveal from "./Reveal";

const STEPS = [
  {
    icon: Radio,
    title: "Se reporta la necesidad",
    desc: "Una comunidad, hospital o acopio solicita un traslado con origen, destino y contacto.",
  },
  {
    icon: ClipboardCheck,
    title: "La red lo valida",
    desc: "Operaciones revisa la solicitud y la clasifica según prioridad y tipo de recurso.",
  },
  {
    icon: Truck,
    title: "Un transportista lo lleva",
    desc: "Conductores y aliados verificados asumen la ruta hasta el punto de entrega.",
  },
  {
    icon: PackageCheck,
    title: "Se confirma la entrega",
    desc: "El transportista registra la entrega con evidencia. La ayuda llegó.",
  },
];

export default function HowItWorks() {
  return (
    <section className="landing-section landing-section--alt" id="como-funciona" aria-labelledby="how-title">
      <div className="landing-section__inner">
        <Reveal>
          <header className="landing-section__header landing-section__header--center">
            <Kicker className="landing-section__kicker-center">Cómo funciona</Kicker>
            <h2 id="how-title" className="landing-section__title landing-section__title--center">
              Del reporte a la entrega confirmada
            </h2>
            <p className="landing-section__lead landing-section__lead--center">
              Cuatro pasos. Sin tecnicismos. La logística conecta quien tiene la ayuda con quien la necesita.
            </p>
          </header>
        </Reveal>

        <ol className="how-flow__steps how-flow__steps--clean">
          {STEPS.map((step, index) => (
            <li key={step.title} className="how-flow__item">
              <Reveal delay={index * 70}>
                <article className="how-flow__card how-flow__card--clean">
                  <div className="how-flow__icon how-flow__icon--clean" aria-hidden="true">
                    <step.icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3 className="how-flow__title">{step.title}</h3>
                  <p className="how-flow__desc">{step.desc}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
