"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type KpiHeroNumberProps = {
  value: number;
  loading?: boolean;
  animate?: boolean;
  suffix?: string;
};

export function KpiHeroNumber({ value, loading, animate = true, suffix = "" }: KpiHeroNumberProps) {
  const { ref, visible } = useScrollReveal();
  const display = useCountUp(value, visible && animate && !loading, 1600);

  return (
    <span ref={ref} className="logistics-kpi-band__hero-value" aria-live="polite">
      {loading ? "—" : `${display.toLocaleString("es-VE")}${suffix}`}
    </span>
  );
}

type KpiSecondaryNumberProps = {
  value: string;
  loading?: boolean;
};

export function KpiSecondaryNumber({ value, loading }: KpiSecondaryNumberProps) {
  return (
    <span className="logistics-kpi-band__secondary-value" aria-live="polite">
      {loading ? "—" : value}
    </span>
  );
}
