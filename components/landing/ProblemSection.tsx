import Kicker from "./Kicker";
import RouteThread from "./RouteThread";

export default function ProblemSection() {
  return (
    <section className="problem-band" aria-labelledby="problem-title">
      <RouteThread variant="footer" className="problem-band__route" />
      <div className="problem-band__inner">
        <Kicker light className="problem-band__kicker">El problema</Kicker>
        <h2 id="problem-title" className="problem-band__title">
          La ayuda existe.
          <span className="problem-band__highlight"> Lo que falta es moverla.</span>
        </h2>
        <p className="problem-band__lead">
          Hay insumos en los centros de acopio, médicos dispuestos y transportistas listos.
          Lo que falta es coordinar el último tramo: mover recursos hasta las comunidades,
          hospitales y puntos de emergencia que aún esperan.
        </p>
        <p className="problem-band__note">
          Rescate VE es el tablero logístico de la red: visible, en tiempo real y verificable.
        </p>
      </div>
    </section>
  );
}
