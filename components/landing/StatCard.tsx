"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCountUp } from "@/hooks/useCountUp";

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  context: string;
  loading?: boolean;
  tone?: "blue" | "green" | "amber" | "slate";
  animate?: boolean;
};

export default function StatCard({
  icon,
  label,
  value,
  context,
  loading,
  tone = "blue",
  animate,
}: StatCardProps) {
  const { ref, visible } = useScrollReveal(0.2);
  const shouldAnimate = Boolean(animate && visible && !loading);
  const counted = useCountUp(value, shouldAnimate);

  const display = loading
    ? "—"
    : (shouldAnimate ? counted : value).toLocaleString("es-VE");

  return (
    <div ref={ref} className="stat-card stat-card--clean">
      <div className={`stat-card__icon stat-card__icon--${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value" aria-live="polite">{display}</p>
        <p className="stat-card__context">{context}</p>
      </div>
    </div>
  );
}
