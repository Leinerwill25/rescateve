"use client";

import { Truck, Package, Route, MapPin } from "lucide-react";
import type { LiveStats } from "@/hooks/useLiveStats";
import Kicker from "./Kicker";
import Reveal from "./Reveal";
import StatCard from "./StatCard";

type ImpactSectionProps = {
  stats: LiveStats;
};

export default function ImpactSection({ stats }: ImpactSectionProps) {
  return (
    <section className="landing-section landing-section--alt" id="impacto" aria-labelledby="impact-title">
      <div className="landing-section__inner">
        <Reveal>
          <header className="landing-section__header landing-section__header--center">
            <Kicker className="landing-section__kicker-center">Impacto en tiempo real</Kicker>
            <h2 id="impact-title" className="landing-section__title landing-section__title--center">
              La red está activa
            </h2>
            <p className="landing-section__lead landing-section__lead--center">
              Datos reales del tablero logístico. Transparencia en cada traslado coordinado.
            </p>
          </header>
        </Reveal>

        <div className="stat-card-grid">
          <StatCard
            icon={<Truck size={20} strokeWidth={1.75} />}
            label="Traslados completados"
            value={stats.trasladosCompletados}
            context="Entregas confirmadas en la plataforma"
            loading={stats.loading}
            tone="blue"
            animate
          />
          <StatCard
            icon={<Package size={20} strokeWidth={1.75} />}
            label="Insumos movidos"
            value={stats.insumosMovidos}
            context="Medicamentos, alimentos y carga humanitaria"
            loading={stats.loading}
            tone="green"
            animate
          />
          <StatCard
            icon={<Route size={20} strokeWidth={1.75} />}
            label="En ruta ahora"
            value={stats.transportistasActivos}
            context="Transportistas con viaje activo"
            loading={stats.loading}
            tone="amber"
            animate
          />
          <StatCard
            icon={<MapPin size={20} strokeWidth={1.75} />}
            label="Solicitudes activas"
            value={stats.solicitudesActivas}
            context="Emergencias y necesidades en el mapa"
            loading={stats.loading}
            tone="slate"
            animate
          />
        </div>
      </div>
    </section>
  );
}
