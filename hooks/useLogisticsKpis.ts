"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchLogisticsKpisFallback } from "@/lib/compute-logistics-kpis-client";
import { EMPTY_LOGISTICS_KPIS, type LogisticsKpis } from "@/lib/kpis-logistica";

const REFRESH_MS = 45_000;

function parseKpis(raw: unknown): LogisticsKpis | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  return {
    traslados_completados: Number(d.traslados_completados) || 0,
    en_ruta_ahora: Number(d.en_ruta_ahora) || 0,
    insumos_movidos: Number(d.insumos_movidos) || 0,
    voluntarios_activos: Number(d.voluntarios_activos) || 0,
    zonas_atendidas: Number(d.zonas_atendidas) || 0,
    tiempo_promedio_horas:
      d.tiempo_promedio_horas == null ? null : Number(d.tiempo_promedio_horas),
    litros_aportados: Number(d.litros_aportados) || 0,
    entregas_evidencia_pct: Number(d.entregas_evidencia_pct) || 0,
    actualizado_at: String(d.actualizado_at ?? new Date().toISOString()),
  };
}

export function useLogisticsKpis() {
  const [kpis, setKpis] = useState<LogisticsKpis>(EMPTY_LOGISTICS_KPIS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"rpc" | "fallback">("rpc");

  const cargar = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("kpis_logistica");
      if (!error && data) {
        const parsed = parseKpis(data);
        if (parsed) {
          setKpis(parsed);
          setSource("rpc");
          return;
        }
      }

      if (error && process.env.NODE_ENV === "development") {
        console.warn("[KPIs] RPC kpis_logistica no disponible, usando fallback:", error.message);
      }

      const fallback = await fetchLogisticsKpisFallback();
      setKpis(fallback);
      setSource("fallback");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[KPIs] Error cargando métricas:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const timer = window.setInterval(cargar, REFRESH_MS);
    const ch = supabase
      .channel("logistics_kpis")
      .on("postgres_changes", { event: "*", schema: "public", table: "traslados" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "transportes" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_gasolina" }, cargar)
      .subscribe();
    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [cargar]);

  return { kpis, loading, source, refresh: cargar };
}
