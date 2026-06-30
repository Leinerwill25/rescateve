"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import Kicker from "./Kicker";
import ProblemRouteAnimated from "./ProblemRouteAnimated";

export default function ProblemSection() {
  const { ref, visible } = useScrollReveal(0.12);

  return (
    <section
      ref={ref}
      className={`problem-band${visible ? " problem-band--visible" : ""}`}
      aria-labelledby="problem-title"
    >
      <div className="problem-band__bg" aria-hidden="true" />
      <ProblemRouteAnimated className="problem-band__route" />
      <div className="problem-band__inner">
        <Kicker light className="problem-band__kicker">El problema</Kicker>
        <h2 id="problem-title" className="problem-band__title">
          <span className="problem-band__title-line">La ayuda existe.</span>
          <span className="problem-band__title-line problem-band__highlight">
            Lo que falta es moverla.
          </span>
        </h2>
        <p className="problem-band__lead">
          Hay insumos en los centros de acopio, médicos dispuestos y transportistas listos.
          Lo que falta es coordinar el último tramo: mover recursos hasta las comunidades,
          hospitales y puntos de emergencia que aún esperan.
        </p>
        <p className="problem-band__note">
          <span className="problem-band__note-dot" aria-hidden="true" />
          Rescate VE es el tablero logístico de la red: visible, en tiempo real y verificable.
        </p>
      </div>
    </section>
  );
}
