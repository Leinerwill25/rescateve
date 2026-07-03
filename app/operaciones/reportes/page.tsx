"use client";

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReportesOperaciones } from "@/lib/operaciones-reportes";
import {
  BarChart3,
  RefreshCw,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Fuel,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={S.statCard}>
      <div style={S.statIcon}>{icon}</div>
      <div>
        <p style={S.statLabel}>{label}</p>
        <p style={S.statValue}>{value}</p>
        {sub && <p style={S.statSub}>{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <h3 style={S.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

export default function ReportesOperacionesPage() {
  const [reporte, setReporte] = useState<ReportesOperaciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión expirada");

      const res = await fetch("/api/operaciones/reportes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar reportes");
      setReporte(json.reporte);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) {
    return (
      <div style={S.center}>
        <div style={S.spinner} />
        <p>Generando reportes operacionales…</p>
      </div>
    );
  }

  if (error || !reporte) {
    return (
      <div style={S.center}>
        <AlertTriangle size={32} color="var(--emergency)" />
        <p>{error || "Sin datos"}</p>
        <button type="button" style={S.btn} onClick={cargar}>Reintentar</button>
      </div>
    );
  }

  const { necesidades: n, logistica: l } = reporte;
  const pct = n.porcentaje_atendidas;

  return (
    <div style={S.page} className="ops-page">
      <header style={S.header} className="ops-page-header">
        <div>
          <h2 style={S.title} className="ops-page-title">
            <BarChart3 size={24} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Reportes Operacionales
          </h2>
          <p style={S.subtitle} className="ops-page-subtitle">
            KPIs de necesidades, logística y cobertura · Actualizado{" "}
            {new Date(reporte.generado_at).toLocaleString("es-VE")}
          </p>
        </div>
        <button type="button" style={S.btn} onClick={cargar}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      <div style={S.grid4}>
        <StatCard label="Solicitudes recibidas" value={l.solicitudes_recibidas.total} sub={`AEC ${l.solicitudes_recibidas.aec} · Ash ${l.solicitudes_recibidas.ash} · Traslado ${l.solicitudes_recibidas.traslado}`} icon={<Package size={20} />} />
        <StatCard label="Necesidades verificadas (entregadas)" value={n.necesidades_verificadas} icon={<CheckCircle2 size={20} />} />
        <StatCard label="Solicitudes cubiertas" value={n.solicitudes_cubiertas} icon={<TrendingUp size={20} />} />
        <StatCard label="% atendidas (global)" value={`${pct.global}%`} sub={`AEC ${pct.aec}% · Ash ${pct.ash}% · Traslado ${pct.traslado}%`} icon={<BarChart3 size={20} />} />
      </div>

      <div style={S.grid4}>
        <StatCard label="Entregas completadas" value={l.entregas_completadas} sub={`${l.entregas_con_transportista} con transportista asignado`} icon={<CheckCircle2 size={20} color="#16a34a" />} />
        <StatCard label="Entregas / asignaciones fallidas" value={l.entregas_fallidas} icon={<XCircle size={20} color="#b91c1c" />} />
        <StatCard label="Voluntarios movilizados" value={l.voluntarios_movilizados} icon={<Truck size={20} />} />
        <StatCard label="Tiempo creación → asignación" value={n.tiempo_deteccion_hasta_asignacion_horas != null ? `${n.tiempo_deteccion_hasta_asignacion_horas} h` : "N/D"} sub={`Promedio traslados/Ash: ${l.tiempo_promedio_asignacion_horas ?? "N/D"} h`} icon={<Clock size={20} />} />
      </div>

      <div style={S.grid2}>
        <StatCard label="Combustible financiado" value={`$${l.combustible_financiado.costo_usd.toFixed(2)}`} sub={`${l.combustible_financiado.litros} L · ${l.combustible_financiado.solicitudes} solicitudes`} icon={<Fuel size={20} />} />
      </div>

      <Section title="Insumos más solicitados (Ayuda en Camino + Ash)">
        {n.insumos_criticos.length === 0 ? (
          <p style={S.empty}>Sin datos de insumos aún.</p>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Artículo / categoría</th>
                <th style={S.th}>Solicitudes</th>
              </tr>
            </thead>
            <tbody>
              {n.insumos_criticos.map((row) => (
                <tr key={row.articulo}>
                  <td style={S.td}>{row.articulo}</td>
                  <td style={S.td}><strong>{row.solicitudes}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <div style={S.twoCol}>
        <Section title="Solicitudes por zona">
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Zona</th>
                <th style={S.th}>Total</th>
                <th style={S.th}>Pendientes</th>
                <th style={S.th}>Completadas</th>
              </tr>
            </thead>
            <tbody>
              {n.solicitudes_por_zona.map((z) => (
                <tr key={z.zona}>
                  <td style={S.td}><MapPin size={12} style={{ marginRight: 4 }} />{z.zona}</td>
                  <td style={S.td}>{z.total}</td>
                  <td style={S.td}>{z.pendientes}</td>
                  <td style={S.td}>{z.completadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Zonas con déficit activo">
          {n.zonas_deficit_activo.length === 0 ? (
            <p style={S.empty}>No hay zonas con peticiones activas pendientes.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Zona</th>
                  <th style={S.th}>Peticiones activas</th>
                </tr>
              </thead>
              <tbody>
                {n.zonas_deficit_activo.map((z) => (
                  <tr key={z.zona}>
                    <td style={S.td}>{z.zona}</td>
                    <td style={{ ...S.td, color: "#b45309", fontWeight: 700 }}>{z.peticiones_activas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <Section title="Desempeño por transportista">
        <div style={S.twoCol}>
          <div>
            <h4 style={S.subTitle}>Solicitudes asignadas</h4>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Transporte</th><th style={S.th}>Asignadas</th></tr></thead>
              <tbody>
                {l.solicitudes_asignadas_por_transporte.slice(0, 15).map((r) => (
                  <tr key={r.transporte_id}><td style={S.td}>{r.nombre}</td><td style={S.td}>{r.asignadas}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={S.subTitle}>Viajes realizados</h4>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Transporte</th><th style={S.th}>Viajes</th><th style={S.th}>Km (ruta geocod.)</th></tr></thead>
              <tbody>
                {l.viajes_por_transporte.slice(0, 15).map((r) => {
                  const km = l.km_por_transporte.find((k) => k.transporte_id === r.transporte_id)?.km ?? 0;
                  return (
                    <tr key={r.transporte_id}>
                      <td style={S.td}>{r.nombre}</td>
                      <td style={S.td}>{r.viajes}</td>
                      <td style={S.td}>{km > 0 ? `${km} km` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Insumos transportados (entregas completadas)">
        {l.insumos_transportados.length === 0 ? (
          <p style={S.empty}>Aún no hay entregas registradas.</p>
        ) : (
          <div style={S.tableWrap} className="ops-table-wrap">
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Fecha</th>
                  <th style={S.th}>Transporte</th>
                  <th style={S.th}>Descripción</th>
                  <th style={S.th}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {l.insumos_transportados.map((r) => (
                  <tr key={r.ticket_id}>
                    <td style={S.td}>{new Date(r.fecha).toLocaleDateString("es-VE")}</td>
                    <td style={S.td}>{r.transporte}</td>
                    <td style={S.td}>{r.descripcion}</td>
                    <td style={S.td}>{r.cantidad || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Inventario en acopios (local + Tuia911)">
        {n.inventario.length === 0 ? (
          <p style={S.empty}>Sin inventario registrado.</p>
        ) : (
          <div style={S.tableWrap} className="ops-table-wrap">
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Fuente</th>
                  <th style={S.th}>Centro</th>
                  <th style={S.th}>Ítem</th>
                  <th style={S.th}>Stock</th>
                  <th style={S.th}>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {n.inventario.slice(0, 60).map((i, idx) => (
                  <tr key={`${i.fuente}-${i.centro}-${i.item}-${idx}`}>
                    <td style={S.td}>{i.fuente === "tuia911" ? "Tuia911" : "Local"}</td>
                    <td style={S.td}>{i.centro}</td>
                    <td style={S.td}>{i.item}</td>
                    <td style={S.td}>{i.cantidad} {i.unidad}</td>
                    <td style={S.td}>{i.actualizado_at ? new Date(i.actualizado_at).toLocaleString("es-VE") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Costo de combustible por traslado">
        {l.costo_combustible_por_traslado.length === 0 ? (
          <p style={S.empty}>Sin pagos de combustible registrados.</p>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Transporte</th>
                <th style={S.th}>Ticket</th>
                <th style={S.th}>Litros</th>
                <th style={S.th}>Costo USD</th>
              </tr>
            </thead>
            <tbody>
              {l.costo_combustible_por_traslado.slice(0, 30).map((r, i) => (
                <tr key={`${r.ticket_id}-${i}`}>
                  <td style={S.td}>{r.transporte}</td>
                  <td style={S.td}>{r.ticket_id?.slice(0, 8) || "—"}</td>
                  <td style={S.td}>{r.litros}</td>
                  <td style={S.td}>${r.costo_usd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <p style={S.footnote}>
        Kilómetros: suma por transportista de viajes aprobados con asignación (asignado → completado), ruta origen→destino geocodificada; si faltan coords en el ticket, se usa la distancia del match acopio confirmado. Zonas: municipio/ciudad desde geocodificación inversa (destino u origen).
      </p>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "var(--s4)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 },
  title: { margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--brand)" },
  subtitle: { margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" },
  btn: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  center: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 48, color: "var(--text-muted)" },
  spinner: { width: 36, height: 36, border: "4px solid var(--border)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 1s linear infinite" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  statCard: {
    display: "flex", gap: 12, padding: 16, background: "var(--surface)",
    border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)",
  },
  statIcon: { color: "var(--brand)", flexShrink: 0, marginTop: 2 },
  statLabel: { margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" },
  statValue: { margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--text)" },
  statSub: { margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" },
  section: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 16, boxShadow: "var(--shadow-sm)",
  },
  sectionTitle: { margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--text)" },
  subTitle: { margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--text-muted)" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--border)", fontWeight: 700, color: "var(--text-muted)" },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--border)", verticalAlign: "top" },
  empty: { margin: 0, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" },
  footnote: { fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", margin: 0 },
};
