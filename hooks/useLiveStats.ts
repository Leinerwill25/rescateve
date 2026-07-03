"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LogisticsKpis } from "@/lib/kpis-logistica";

export type LiveStats = {
  trasladosCompletados: number;
  insumosMovidos: number;
  transportistasActivos: number;
  solicitudesActivas: number;
  loading: boolean;
};

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

async function fetchKpisPublicos(): Promise<LogisticsKpis | null> {
  const { data, error } = await supabase.rpc("kpis_logistica");
  if (!error && data) {
    const parsed = parseKpis(data);
    if (parsed) return parsed;
  }
  const res = await fetch("/api/public/kpis", { cache: "no-store" });
  if (!res.ok) return null;
  return parseKpis(await res.json());
}

export function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>({
    trasladosCompletados: 0,
    insumosMovidos: 0,
    transportistasActivos: 0,
    solicitudesActivas: 0,
    loading: true,
  });

  const cargar = useCallback(async () => {
    try {
      const [kpis, solicitudesRes] = await Promise.all([
        fetchKpisPublicos(),
        supabase.from("solicitudes_ayuda").select("id").neq("estado", "atendido"),
      ]);

      if (kpis) {
        setStats({
          trasladosCompletados: kpis.traslados_completados,
          insumosMovidos: kpis.insumos_movidos,
          transportistasActivos: kpis.en_ruta_ahora,
          solicitudesActivas: solicitudesRes.data?.length ?? 0,
          loading: false,
        });
      } else {
        setStats((s) => ({ ...s, loading: false }));
      }
    } catch {
      setStats((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel("live_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_ayuda" }, cargar)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [cargar]);

  return stats;
}
