"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type LiveStats = {
  trasladosCompletados: number;
  insumosMovidos: number;
  transportistasActivos: number;
  solicitudesActivas: number;
  loading: boolean;
};

const TIPOS_INSUMO = new Set([
  "insumos",
  "insumo_medico",
  "insumo_basico",
  "alimentos",
  "carga",
  "personal_medico",
]);

const ESTADOS_COMPLETADO = new Set(["completado", "entregado"]);
const ESTADOS_ACTIVO = new Set(["aceptado", "en_camino", "asignado"]);

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
      const [trasladosRes, solicitudesRes] = await Promise.all([
        supabase
          .from("traslados")
          .select("id, estado, tipo, operador")
          .not("reporter_token", "is", null),
        supabase
          .from("solicitudes_ayuda")
          .select("id, estado")
          .neq("estado", "atendido"),
      ]);

      const traslados = trasladosRes.data || [];
      const operadores = new Set<string>();

      let trasladosCompletados = 0;
      let insumosMovidos = 0;
      let transportistasActivos = 0;

      for (const t of traslados) {
        if (ESTADOS_COMPLETADO.has(t.estado)) {
          trasladosCompletados++;
          if (TIPOS_INSUMO.has(t.tipo)) insumosMovidos++;
        }
        if (ESTADOS_ACTIVO.has(t.estado)) {
          transportistasActivos++;
          if (t.operador) {
            try {
              const op = typeof t.operador === "string" ? JSON.parse(t.operador) : t.operador;
              if (op?.nombre) operadores.add(String(op.nombre).trim());
            } catch {
              operadores.add(String(t.operador).slice(0, 40));
            }
          }
        }
      }

      setStats({
        trasladosCompletados,
        insumosMovidos,
        transportistasActivos: operadores.size > 0 ? operadores.size : transportistasActivos,
        solicitudesActivas: solicitudesRes.data?.length ?? 0,
        loading: false,
      });
    } catch {
      setStats((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel("live_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "traslados" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_ayuda" }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cargar]);

  return stats;
}
