"use client";

import { useMemo } from "react";
import { useLogisticsKpis } from "@/hooks/useLogisticsKpis";
import Kicker from "./Kicker";
import Reveal from "./Reveal";
import RouteThread from "./RouteThread";
import { KpiHeroNumber, KpiSecondaryNumber } from "./KpiNumbers";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function formatTiempoPromedio(horas: number | null): string {
  if (horas == null || Number.isNaN(horas)) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  return `${horas.toLocaleString("es-VE", { maximumFractionDigits: 1 })} h`;
}

export default function LogisticsKpisSection() {
  const { kpis, loading } = useLogisticsKpis();

  const tiempoLabel = useMemo(
    () => formatTiempoPromedio(kpis.tiempo_promedio_horas),
    [kpis.tiempo_promedio_horas],
  );

  return (
    <section
      className="logistics-kpi-band"
      id="impacto"
      aria-labelledby="logistics-kpi-title"
    >
      <RouteThread variant="horizontal" className="logistics-kpi-band__route" />

      <div className="logistics-kpi-band__inner">
        <Reveal>
          <header className="logistics-kpi-band__header">
            <Kicker light className="logistics-kpi-band__kicker">
              Lo que hemos movido · en tiempo real
            </Kicker>
            <h2 id="logistics-kpi-title" className="logistics-kpi-band__title">
              La red logística en números
            </h2>
          </header>
        </Reveal>

        <Reveal delay={80}>
          <div className="logistics-kpi-band__hero-row" role="list" aria-label="Métricas principales">
            <div className="logistics-kpi-band__hero-stat" role="listitem">
              <KpiHeroNumber value={kpis.traslados_completados} loading={loading} />
              <span className="logistics-kpi-band__hero-label">Traslados completados</span>
            </div>

            <span className="logistics-kpi-band__divider" aria-hidden="true" />

            <div className="logistics-kpi-band__hero-stat" role="listitem">
              <KpiHeroNumber value={kpis.insumos_movidos} loading={loading} />
              <span className="logistics-kpi-band__hero-label">Insumos movidos</span>
            </div>

            <span className="logistics-kpi-band__divider" aria-hidden="true" />

            <div className="logistics-kpi-band__hero-stat" role="listitem">
              <KpiHeroNumber value={kpis.voluntarios_activos} loading={loading} />
              <span className="logistics-kpi-band__hero-label">Voluntarios activos</span>
            </div>

            <span className="logistics-kpi-band__divider" aria-hidden="true" />

            <div className="logistics-kpi-band__hero-stat" role="listitem">
              <KpiHeroNumber value={kpis.en_ruta_ahora} loading={loading} />
              <span className="logistics-kpi-band__hero-label logistics-kpi-band__hero-label--live">
                <span className="logistics-kpi-band__live-dot logistics-kpi-band__live-dot--pulse" aria-hidden="true" />
                En ruta ahora
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div
            className="logistics-kpi-band__secondary"
            role="list"
            aria-label="Métricas de apoyo"
          >
            <div className="logistics-kpi-band__secondary-stat" role="listitem">
              <KpiSecondaryNumber
                value={kpis.zonas_atendidas.toLocaleString("es-VE")}
                loading={loading}
              />
              <span className="logistics-kpi-band__secondary-label">Zonas atendidas</span>
            </div>
            <div className="logistics-kpi-band__secondary-stat" role="listitem">
              <KpiSecondaryNumber value={tiempoLabel} loading={loading} />
              <span className="logistics-kpi-band__secondary-label">
                Tiempo promedio hasta asignar transportista
              </span>
              {!loading && kpis.tiempo_promedio_horas == null && (
                <span className="logistics-kpi-band__secondary-hint">
                  Aún no hay viajes con transportista asignado en el sistema
                </span>
              )}
            </div>
            <div className="logistics-kpi-band__secondary-stat" role="listitem">
              <KpiSecondaryNumber
                value={`${Math.round(kpis.litros_aportados).toLocaleString("es-VE")} L`}
                loading={loading}
              />
              <span className="logistics-kpi-band__secondary-label">Litros de combustible aportados</span>
            </div>
            <div className="logistics-kpi-band__secondary-stat" role="listitem">
              <KpiSecondaryNumber
                value={`${kpis.entregas_evidencia_pct}%`}
                loading={loading}
              />
              <span className="logistics-kpi-band__secondary-label">Entregas con evidencia</span>
            </div>
          </div>

          <p className="logistics-kpi-band__updated">
            Actualizado {loading ? "…" : timeAgo(kpis.actualizado_at)}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
