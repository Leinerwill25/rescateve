"use client";

import type { LiveStats } from "@/hooks/useLiveStats";

type LiveCountersProps = {
  stats: LiveStats;
  compact?: boolean;
};

function Counter({
  value,
  label,
  loading,
  compact,
}: {
  value: number;
  label: string;
  loading: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`live-counter${compact ? " live-counter--compact" : ""}`}>
      <span className="live-counter__value" aria-live="polite">
        {loading ? "—" : value.toLocaleString("es-VE")}
      </span>
      <span className="live-counter__label">{label}</span>
    </div>
  );
}

export default function LiveCounters({ stats, compact }: LiveCountersProps) {
  return (
    <div className={`live-counters${compact ? " live-counters--compact" : ""}`} aria-label="Métricas en vivo">
      <Counter value={stats.trasladosCompletados} label="Traslados completados" loading={stats.loading} compact={compact} />
      <Counter value={stats.insumosMovidos} label="Insumos movidos" loading={stats.loading} compact={compact} />
      <Counter value={stats.transportistasActivos} label="En ruta ahora" loading={stats.loading} compact={compact} />
    </div>
  );
}
