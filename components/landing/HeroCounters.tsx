"use client";

import type { LiveStats } from "@/hooks/useLiveStats";

type HeroCountersProps = {
  stats: LiveStats;
};

const ITEMS = [
  { key: "trasladosCompletados" as const, label: "Traslados" },
  { key: "insumosMovidos" as const, label: "Insumos movidos" },
  { key: "transportistasActivos" as const, label: "En ruta ahora" },
];

function formatValue(value: number) {
  return value.toLocaleString("es-VE");
}

export default function HeroCounters({ stats }: HeroCountersProps) {
  return (
    <div className="hero-stats" aria-label="Métricas en vivo">
      {ITEMS.map((item) => (
        <div key={item.key} className="hero-stats__item">
          <span className="hero-stats__label">{item.label}</span>
          <span className="hero-stats__value" aria-live="polite">
            {stats.loading ? "—" : formatValue(stats[item.key])}
          </span>
        </div>
      ))}
    </div>
  );
}
