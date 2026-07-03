"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TuiaCentro, TuiaInsumo, TuiaMeta } from "@/lib/tuia911";
import {
  Warehouse,
  Package,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Radio,
  AlertCircle,
  ChevronRight,
  Filter,
} from "lucide-react";

type Tab = "centros" | "insumos";

const REFRESH_MS = 30_000;

const CATEGORIAS = [
  { value: "", label: "Todas las categorías" },
  { value: "medicina", label: "Medicina" },
  { value: "alimento", label: "Alimento" },
  { value: "agua", label: "Agua" },
  { value: "lenceria", label: "Lencería" },
];

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TuiaAcopioPage() {
  const [tab, setTab] = useState<Tab>("centros");
  const [centros, setCentros] = useState<TuiaCentro[]>([]);
  const [insumos, setInsumos] = useState<TuiaInsumo[]>([]);
  const [metaCentros, setMetaCentros] = useState<TuiaMeta | null>(null);
  const [metaInsumos, setMetaInsumos] = useState<TuiaMeta | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [filtroTipo, setFiltroTipo] = useState<"" | "acopio" | "atencion">("");
  const [buscarCentro, setBuscarCentro] = useState("");
  const [centroSel, setCentroSel] = useState("");
  const [categoria, setCategoria] = useState("");
  const [buscarInsumo, setBuscarInsumo] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(buscarInsumo.trim()), 400);
    return () => clearTimeout(t);
  }, [buscarInsumo]);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const fetchApi = useCallback(
    async (resource: string, params: Record<string, string> = {}) => {
      const token = await getToken();
      if (!token) throw new Error("Sesión expirada. Vuelva a iniciar sesión.");

      const qs = new URLSearchParams({ resource, ...params });
      const res = await fetch(`/api/tuia-acopio?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      return json;
    },
    [getToken]
  );

  const cargarCentros = useCallback(async () => {
    const params: Record<string, string> = { limit: "100" };
    if (filtroTipo) params.tipo = filtroTipo;
    const json = await fetchApi("centros", params);
    setCentros(json.data || []);
    setMetaCentros(json.meta || null);
    return json.fetched_at as string;
  }, [fetchApi, filtroTipo]);

  const cargarInsumos = useCallback(async () => {
    const params: Record<string, string> = { limit: "150" };
    if (centroSel) params.centro = centroSel;
    if (categoria) params.categoria = categoria;
    if (debouncedQ) params.q = debouncedQ;
    const json = await fetchApi("insumos", params);
    setInsumos(json.data || []);
    setMetaInsumos(json.meta || null);
    return json.fetched_at as string;
  }, [fetchApi, centroSel, categoria, debouncedQ]);

  const cargarTodo = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [healthJson, tsCentros, tsInsumos] = await Promise.all([
          fetchApi("health"),
          cargarCentros(),
          cargarInsumos(),
        ]);
        setHealthOk(healthJson?.data?.status === "ok");
        setLastSync(tsCentros || tsInsumos || new Date().toISOString());
        setCountdown(REFRESH_MS / 1000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cargar datos Tuia911";
        setError(msg);
        setHealthOk(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchApi, cargarCentros, cargarInsumos]
  );

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          cargarTodo(true);
          return REFRESH_MS / 1000;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [autoRefresh, cargarTodo]);

  const centrosFiltrados = useMemo(() => {
    const q = buscarCentro.trim().toLowerCase();
    if (!q) return centros;
    return centros.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.municipio || "").toLowerCase().includes(q) ||
        (c.estado_geo || "").toLowerCase().includes(q) ||
        (c.direccion || "").toLowerCase().includes(q)
    );
  }, [centros, buscarCentro]);

  const stats = useMemo(() => {
    const acopios = centros.filter((c) => c.tipo === "acopio").length;
    const atencion = centros.filter((c) => c.tipo === "atencion").length;
    const stockTotal = insumos.reduce((acc, i) => acc + (Number(i.disponible) || 0), 0);
    const categorias = new Set(insumos.map((i) => i.categoria)).size;
    return { acopios, atencion, stockTotal, categorias, lineas: insumos.length };
  }, [centros, insumos]);

  const verInventarioCentro = (centroId: string) => {
    setCentroSel(centroId);
    setTab("insumos");
    setBuscarInsumo("");
  };

  const centroNombre = (id: string) =>
    centros.find((c) => c.id === id)?.nombre || insumos[0]?.centro_nombre || id.slice(0, 8);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Warehouse size={22} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Acopio Tuia911
          </h2>
          <p style={styles.subtitle}>
            Centros de acopio e inventario en vivo desde la red Tuia911 · actualización automática cada 30 s
          </p>
        </div>
        <div style={styles.headerActions}>
          <label style={styles.liveToggle}>
            <Radio size={14} color={autoRefresh ? "#16a34a" : "var(--text-muted)"} />
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => {
                setAutoRefresh(e.target.checked);
                if (e.target.checked) setCountdown(REFRESH_MS / 1000);
              }}
            />
            <span>En vivo</span>
            {autoRefresh && (
              <span style={styles.countdown}>{countdown}s</span>
            )}
          </label>
          <button
            type="button"
            style={styles.btnRefresh}
            onClick={() => cargarTodo(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={styles.statsRow} className="ops-stats-row-auto">
        <div style={styles.statCard}>
          <span style={styles.statLabel}>API Tuia911</span>
          <span style={{ ...styles.statValue, color: healthOk ? "#16a34a" : "var(--emergency)" }}>
            {healthOk === null ? "…" : healthOk ? "Conectada" : "Error"}
          </span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Centros acopio</span>
          <span style={styles.statValue}>{stats.acopios}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Puntos atención</span>
          <span style={styles.statValue}>{stats.atencion}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Líneas inventario</span>
          <span style={styles.statValue}>{stats.lineas}{metaInsumos?.has_more ? "+" : ""}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Última sync</span>
          <span style={{ ...styles.statValue, fontSize: "14px" }}>
            {lastSync ? fmtHora(lastSync) : "—"}
          </span>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          type="button"
          style={tab === "centros" ? styles.tabActive : styles.tabBtn}
          onClick={() => setTab("centros")}
        >
          <MapPin size={16} /> Centros ({centrosFiltrados.length})
        </button>
        <button
          type="button"
          style={tab === "insumos" ? styles.tabActive : styles.tabBtn}
          onClick={() => setTab("insumos")}
        >
          <Package size={16} /> Inventario ({insumos.length}{metaInsumos?.has_more ? "+" : ""})
        </button>
      </div>

      {tab === "centros" && (
        <>
          <div style={styles.filters}>
            <div style={styles.searchWrap}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="search"
                placeholder="Buscar centro, municipio, dirección…"
                value={buscarCentro}
                onChange={(e) => setBuscarCentro(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as "" | "acopio" | "atencion")}
              style={styles.select}
            >
              <option value="">Todos los tipos</option>
              <option value="acopio">Solo acopio</option>
              <option value="atencion">Solo atención</option>
            </select>
          </div>

          {loading ? (
            <div style={styles.center}><div style={styles.spinner} /></div>
          ) : centrosFiltrados.length === 0 ? (
            <div style={styles.empty}>No hay centros que coincidan con el filtro.</div>
          ) : (
            <div style={styles.cardList}>
              {centrosFiltrados.map((c) => (
                <article key={c.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div>
                      <span style={{
                        ...styles.badge,
                        background: c.tipo === "acopio" ? "#eff6ff" : "#f0fdf4",
                        color: c.tipo === "acopio" ? "#2563eb" : "#16a34a",
                      }}>
                        {c.tipo === "acopio" ? "Acopio" : "Atención"}
                      </span>
                      <h3 style={styles.cardTitle}>{c.nombre}</h3>
                      <p style={styles.cardMeta}>
                        {[c.estado_geo, c.municipio].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      style={styles.btnVerInv}
                      onClick={() => verInventarioCentro(c.id)}
                    >
                      Ver inventario <ChevronRight size={14} />
                    </button>
                  </div>
                  {c.direccion && (
                    <p style={styles.cardRow}>
                      <MapPin size={14} /> {c.direccion}
                    </p>
                  )}
                  {c.telefono && (
                    <p style={styles.cardRow}>
                      <Phone size={14} /> {c.telefono}
                    </p>
                  )}
                  {(c.lat != null && c.lng != null) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.mapLink}
                    >
                      Abrir en mapa ({c.lat.toFixed(4)}, {c.lng.toFixed(4)})
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
          {metaCentros && (
            <p style={styles.metaLine}>
              Mostrando {metaCentros.count} centros{metaCentros.has_more ? " (hay más disponibles)" : ""}.
            </p>
          )}
        </>
      )}

      {tab === "insumos" && (
        <>
          <div style={styles.filters}>
            <div style={styles.searchWrap}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="search"
                placeholder="Buscar artículo (ej. harina, agua)…"
                value={buscarInsumo}
                onChange={(e) => setBuscarInsumo(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <select
              value={centroSel}
              onChange={(e) => setCentroSel(e.target.value)}
              style={styles.select}
            >
              <option value="">Todos los centros</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={styles.select}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.value || "all"} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {(centroSel || categoria || debouncedQ) && (
              <button
                type="button"
                style={styles.btnClear}
                onClick={() => {
                  setCentroSel("");
                  setCategoria("");
                  setBuscarInsumo("");
                }}
              >
                <Filter size={14} /> Limpiar filtros
              </button>
            )}
          </div>

          {centroSel && (
            <p style={styles.filterHint}>
              Filtrando inventario de: <strong>{centroNombre(centroSel)}</strong>
            </p>
          )}

          {loading ? (
            <div style={styles.center}><div style={styles.spinner} /></div>
          ) : insumos.length === 0 ? (
            <div style={styles.empty}>No hay insumos con los filtros actuales.</div>
          ) : (
            <div className="ops-table-wrap">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Artículo</th>
                    <th style={styles.th}>Centro</th>
                    <th style={styles.th}>Categoría</th>
                    <th style={styles.th}>Subcategoría</th>
                    <th style={styles.th}>Disponible</th>
                    <th style={styles.th}>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((item, idx) => (
                    <tr key={`${item.centro_id}-${item.articulo}-${idx}`} style={styles.tr}>
                      <td style={styles.td}><strong>{item.articulo}</strong></td>
                      <td style={styles.td}>{item.centro_nombre}</td>
                      <td style={styles.td}>
                        <span style={styles.catBadge}>{item.categoria}</span>
                      </td>
                      <td style={styles.td}>{item.subcategoria || "—"}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: item.disponible > 0 ? "#16a34a" : "var(--emergency)" }}>
                        {item.disponible}
                      </td>
                      <td style={styles.td}>{item.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {metaInsumos && (
            <p style={styles.metaLine}>
              {metaInsumos.count} líneas mostradas
              {metaInsumos.has_more ? " · Hay más resultados en Tuia911 (aumente limit o refine filtros)" : ""}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "var(--s4)" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s3)",
  },
  title: { margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--brand)" },
  subtitle: { margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" },
  headerActions: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  liveToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
    cursor: "pointer",
  },
  countdown: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#16a34a",
    background: "#f0fdf4",
    padding: "2px 6px",
    borderRadius: "var(--radius-pill)",
  },
  btnRefresh: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm)",
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    fontSize: "13px",
  },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" },
  statCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statLabel: { fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" },
  statValue: { fontSize: "20px", fontWeight: 800, color: "var(--text)" },
  tabs: { display: "flex", gap: "8px", flexWrap: "wrap" },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  tabActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--brand)",
    background: "#eff6ff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    color: "var(--brand)",
  },
  filters: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: "200px",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    flex: 1,
    fontSize: "13px",
    background: "transparent",
  },
  select: {
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    fontSize: "13px",
    background: "var(--surface)",
    minWidth: "160px",
  },
  btnClear: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "8px 12px",
    border: "none",
    background: "none",
    color: "var(--brand)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  filterHint: { margin: 0, fontSize: "13px", color: "var(--text-muted)" },
  center: { display: "flex", justifyContent: "center", padding: "48px" },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid var(--border)",
    borderTopColor: "var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  empty: {
    textAlign: "center",
    padding: "48px",
    color: "var(--text-muted)",
    background: "var(--surface)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
  },
  cardList: { display: "flex", flexDirection: "column", gap: "12px" },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    boxShadow: "var(--shadow-sm)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    textTransform: "uppercase",
    display: "inline-block",
    marginBottom: "6px",
  },
  cardTitle: { margin: "0 0 4px", fontSize: "15px", fontWeight: 700 },
  cardMeta: { margin: 0, fontSize: "12px", color: "var(--text-muted)" },
  cardRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "8px 0 0",
    fontSize: "13px",
    color: "var(--text)",
  },
  mapLink: { display: "inline-block", marginTop: "8px", fontSize: "12px", color: "var(--brand)" },
  btnVerInv: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--brand)",
    background: "var(--surface)",
    color: "var(--brand)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "2px solid var(--border)",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
  },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "10px 12px", verticalAlign: "top" },
  catBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    background: "var(--surface-2)",
  },
  metaLine: { margin: 0, fontSize: "12px", color: "var(--text-muted)" },
};
