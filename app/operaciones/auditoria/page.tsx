"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TicketHistorial, Perfil } from "@/lib/types-operations";
import {
  History, Search, Filter, AlertTriangle, ShieldCheck, Clock,
  CheckCircle, XCircle, MapPin, Phone, Truck, User, Package, Calendar
} from "lucide-react";

interface AuditEntry extends TicketHistorial {
  perfil: Perfil | null;
}

export default function AuditoriaLogisticaPage() {
  const [historial, setHistorial] = useState<AuditEntry[]>([]);
  const [trasladosFinalizados, setTrasladosFinalizados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"auditoria" | "completados" | "solventados">("auditoria");

  // Filtros
  const [searchTicket, setSearchTicket] = useState("");
  const [searchActor, setSearchActor] = useState("");
  const [filterAccion, setFilterAccion] = useState("todos");
  const [searchCaso, setSearchCaso] = useState("");

  const ACCIONES = [
    { value: "aprobado", label: "Aprobado" },
    { value: "asignado", label: "Asignado" },
    { value: "estado_cambiado", label: "Estado de viaje/visita" },
    { value: "dividido", label: "Dividido" },
    { value: "rechazado", label: "Descartado/Rechazado" },
    { value: "clasificado_auto", label: "Clasificado Auto" },
    { value: "reclasificado", label: "Reclasificado" },
  ];

  const cargarHistorial = async () => {
    setLoading(true);
    setAuditError(null);

    try {
      const { data: histData, error: hErr } = await supabase
        .from("ticket_historial")
        .select(`*, perfil:actor (*)`)
        .order("created_at", { ascending: false });
      if (hErr) throw hErr;
      setHistorial((histData || []) as AuditEntry[]);
    } catch (err: any) {
      console.error("Error al cargar historial:", err);
    }

    try {
      const { data: trasData, error: tErr } = await supabase
        .from("traslados")
        .select("*")
        .in("estado", ["completado", "solventado_externo"])
        .order("id", { ascending: false });
      if (tErr) throw tErr;
      setTrasladosFinalizados(trasData || []);
    } catch (err: any) {
      console.error("Error al cargar traslados:", err);
      setAuditError(`Error al cargar casos: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  const entriesFiltradas = historial.filter(e => {
    if (searchTicket && !e.ticket_id.toLowerCase().includes(searchTicket.toLowerCase())) return false;
    if (searchActor) {
      const nombre = e.perfil?.nombre || "Sistema / Auto";
      if (!nombre.toLowerCase().includes(searchActor.toLowerCase())) return false;
    }
    if (filterAccion !== "todos" && e.accion !== filterAccion) return false;
    return true;
  });

  const matchesCaso = (t: any) => {
    if (!searchCaso) return true;
    const s = searchCaso.toLowerCase();
    return (
      (t.id && t.id.toLowerCase().includes(s)) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(s)) ||
      (t.origen_ref && t.origen_ref.toLowerCase().includes(s)) ||
      (t.destino_ref && t.destino_ref.toLowerCase().includes(s))
    );
  };

  const casosCompletados = trasladosFinalizados.filter(t => t && t.estado === "completado" && matchesCaso(t));
  const casosSolventados = trasladosFinalizados.filter(t => t && t.estado === "solventado_externo" && matchesCaso(t));

  const getAccionBadge = (accion: string, aValor: string | null) => {
    let label = accion.toUpperCase();
    let bg = "var(--surface-2)";
    let color = "var(--text-muted)";
    if (accion === "aprobado") { label = "✓ Aprobado"; bg = "var(--success-soft)"; color = "var(--success)"; }
    else if (accion === "asignado") { label = "⚡ Asignado"; bg = "#fef9c3"; color = "#b45309"; }
    else if (accion === "dividido") { label = "↗ Dividido"; bg = "#faf5ff"; color = "#7c3aed"; }
    else if (accion === "rechazado") { label = "✕ Rechazado"; bg = "var(--emergency-soft)"; color = "var(--emergency)"; }
    else if (accion === "estado_cambiado") {
      label = `→ ${aValor || ""}`;
      if (aValor === "completado" || aValor === "entregado") { bg = "var(--success-soft)"; color = "var(--success)"; }
      else if (aValor === "en_camino") { bg = "#ecfeff"; color = "#0891b2"; }
      else if (aValor === "aceptado") { bg = "#eff6ff"; color = "#2563eb"; }
      else if (aValor === "rechazado") { bg = "var(--emergency-soft)"; color = "var(--emergency)"; }
    } else if (accion === "clasificado_auto") { label = "🤖 Auto-Clasif."; bg = "#f0fdf4"; color = "#15803d"; }
    else if (accion === "reclasificado") { label = "✏ Reclasificado"; bg = "#fefce8"; color = "#a16207"; }
    return (
      <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: bg, color, letterSpacing: "0.02em" }}>
        {label}
      </span>
    );
  };

  const getTipoInfo = (tipo: string) => {
    if (tipo === "personal_medico") return { label: "🩺 Personal Médico", bg: "rgba(5,150,105,0.08)", color: "#059669", border: "rgba(5,150,105,0.2)" };
    if (tipo === "insumos" || tipo === "insumo_medico" || tipo === "insumo_basico") return { label: "🧰 Insumos", bg: "rgba(245,158,11,0.08)", color: "#d97706", border: "rgba(245,158,11,0.2)" };
    if (tipo === "alimentos") return { label: "🍞 Alimentos", bg: "rgba(249,115,22,0.08)", color: "#ea580c", border: "rgba(249,115,22,0.2)" };
    return { label: `📦 ${tipo}`, bg: "rgba(100,116,139,0.08)", color: "#475569", border: "rgba(100,116,139,0.2)" };
  };

  const parseOperador = (operador: any) => {
    if (!operador) return null;
    try { return typeof operador === "string" ? JSON.parse(operador) : operador; }
    catch { return { nombre: operador }; }
  };

  const currentCasos = activeTab === "completados" ? casosCompletados : casosSolventados;

  return (
    <div style={S.page} className="ops-page">
      {/* Header */}
      <div style={S.pageHeader} className="ops-page-header">
        <div style={S.headerInner}>
          <div style={S.headerIcon}>
            <History size={22} color="#fff" />
          </div>
          <div>
            <h2 style={S.title}>Auditoría Logística</h2>
            <p style={S.subtitle}>Registro de acciones, casos completados y solventados por fuera.</p>
          </div>
        </div>
        <button onClick={cargarHistorial} style={S.refreshBtn}>
          <span style={{ fontSize: 13 }}>↻ Actualizar</span>
        </button>
      </div>

      {auditError && (
        <div style={S.errorBanner}>
          <AlertTriangle size={16} />
          <span>{auditError}</span>
        </div>
      )}

      {/* Stats summary */}
      <div style={S.statsRow} className="ops-stats-row">
        <div style={S.statCard}>
          <div style={{ ...S.statDot, background: "var(--brand)" }} />
          <div>
            <div style={S.statNum}>{historial.length}</div>
            <div style={S.statLabel}>Acciones Registradas</div>
          </div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statDot, background: "var(--success)" }} />
          <div>
            <div style={S.statNum}>{casosCompletados.length}</div>
            <div style={S.statLabel}>Casos Completados</div>
          </div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statDot, background: "#6b7280" }} />
          <div>
            <div style={S.statNum}>{casosSolventados.length}</div>
            <div style={S.statLabel}>Solventados por Fuera</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabsRow} className="ops-tabs">
        {[
          { key: "auditoria", icon: <History size={15} />, label: "Registro de Acciones" },
          { key: "completados", icon: <CheckCircle size={15} />, label: `Completados (${casosCompletados.length})` },
          { key: "solventados", icon: <XCircle size={15} />, label: `Solventados por Fuera (${casosSolventados.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={activeTab === tab.key ? S.tabActive : S.tab}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── AUDITORÍA ─────────────────────────── */}
      {activeTab === "auditoria" && (
        <>
          <div style={S.filtersBar}>
            <div style={S.filterField} className="ops-filter-field">
              <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input value={searchTicket} onChange={e => setSearchTicket(e.target.value)} placeholder="ID de ticket..." style={S.filterInput} />
            </div>
            <div style={S.filterField} className="ops-filter-field">
              <User size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input value={searchActor} onChange={e => setSearchActor(e.target.value)} placeholder="Actor / Operador..." style={S.filterInput} />
            </div>
            <div style={S.filterField} className="ops-filter-field">
              <Filter size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <select value={filterAccion} onChange={e => setFilterAccion(e.target.value)} style={S.filterSelect}>
                <option value="todos">Todas las acciones</option>
                {ACCIONES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? <Spinner /> : entriesFiltradas.length === 0 ? <Empty message="No hay acciones registradas con estos filtros." /> : (
            <div style={S.timelineList}>
              {entriesFiltradas.map((e, i) => (
                <div key={e.id} style={S.timelineItem}>
                  <div style={S.timelineDot} />
                  {i < entriesFiltradas.length - 1 && <div style={S.timelineLine} />}
                  <div style={S.timelineCard}>
                    <div style={S.timelineTop}>
                      {getAccionBadge(e.accion, e.a_valor)}
                      <div style={S.timelineDate}>
                        <Clock size={11} color="var(--text-muted)" />
                        <span>{new Date(e.created_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                    </div>
                    <div style={S.timelineBody}>
                      <div style={S.timelineActor}>
                        {e.perfil ? (
                          <><ShieldCheck size={13} color="var(--brand)" /><strong>{e.perfil.nombre}</strong><span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-2)", padding: "1px 6px", borderRadius: 20 }}>{e.perfil.rol}</span></>
                        ) : (
                          <><Clock size={13} color="var(--text-muted)" /><span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Motor automático</span></>
                        )}
                      </div>
                      <div style={S.timelineMeta}>
                        <code style={S.code}>{e.ticket_id.slice(0, 8)}…</code>
                        {(e.de_valor || e.a_valor) && (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                            {e.de_valor && <span>{e.de_valor} <span style={{ color: "var(--brand)" }}>→</span> </span>}
                            {e.a_valor && <strong style={{ color: "var(--text)" }}>{e.a_valor}</strong>}
                          </span>
                        )}
                        {e.nota && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.nota}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── COMPLETADOS / SOLVENTADOS ─────────── */}
      {(activeTab === "completados" || activeTab === "solventados") && (
        <>
          <div style={S.filtersBar}>
            <div style={{ ...S.filterField, flex: 1 }}>
              <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input value={searchCaso} onChange={e => setSearchCaso(e.target.value)} placeholder="Buscar por descripción, origen, destino..." style={S.filterInput} />
            </div>
          </div>

          {loading ? <Spinner /> : currentCasos.length === 0 ? <Empty message="No hay casos en este estado con los filtros indicados." /> : (
            <div style={S.cardsGrid} className="ops-cards-grid">
              {currentCasos.map(c => {
                const op = parseOperador(c.operador);
                const tipo = getTipoInfo(c.tipo);
                const isCompletado = c.estado === "completado";
                return (
                  <div key={c.id} style={{ ...S.caseCard, borderTop: `3px solid ${isCompletado ? "var(--success)" : "#9ca3af"}` }}>
                    {/* Card Header */}
                    <div style={S.caseCardHeader}>
                      <span style={{ ...S.tipoBadge, background: tipo.bg, color: tipo.color, border: `1px solid ${tipo.border}` }}>
                        {tipo.label}
                      </span>
                      <span style={{ ...S.estadoBadge, background: isCompletado ? "rgba(5,150,105,0.1)" : "rgba(107,114,128,0.1)", color: isCompletado ? "#059669" : "#6b7280" }}>
                        {isCompletado ? "✓ COMPLETADO" : "✕ SOLVENTADO POR FUERA"}
                      </span>
                    </div>

                    {/* Descripción */}
                    <p style={S.caseDesc}>
                      {c.descripcion || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin descripción</span>}
                      {c.cantidad && <span style={S.caseQty}> · {c.cantidad}</span>}
                    </p>

                    {/* Ruta */}
                    <div style={S.caseRoute}>
                      <div style={S.routeRow}>
                        <span style={{ ...S.routeDot, background: "var(--brand)" }} />
                        <span style={S.routeText}><strong>Origen:</strong> {c.origen_ref || "N/A"}</span>
                      </div>
                      {c.destino_ref && (
                        <div style={S.routeRow}>
                          <span style={{ ...S.routeDot, background: "var(--success)" }} />
                          <span style={S.routeText}><strong>Destino:</strong> {c.destino_ref}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={S.caseFooter}>
                      {op ? (
                        <div style={S.caseOperador}>
                          <Truck size={13} color="var(--brand)" />
                          <div>
                            <strong style={{ fontSize: 13 }}>{op.nombre}</strong>
                            {op.placa && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{op.modelo} · {op.placa}</div>}
                          </div>
                        </div>
                      ) : (
                        <div style={{ ...S.caseOperador, color: "var(--text-muted)", fontStyle: "italic" }}>
                          <Truck size={13} color="var(--text-muted)" /> Sin operador asignado
                        </div>
                      )}

                      <div style={S.caseContact}>
                        {c.contacto && (
                          <span style={S.contactChip}>
                            <Phone size={11} />
                            {c.contacto}
                          </span>
                        )}
                        {c.cuando && (
                          <span style={S.contactChip}>
                            <Calendar size={11} />
                            {c.cuando}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px" }}>
      <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTop: "3px solid var(--brand)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={24} color="var(--text-muted)" />
      </div>
      <strong style={{ fontSize: 15, color: "var(--text)" }}>Sin resultados</strong>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{message}</p>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "linear-gradient(135deg, var(--brand) 0%, #1e40af 100%)",
    borderRadius: "var(--radius)", padding: "20px 24px",
    boxShadow: "0 4px 20px rgba(37,99,235,0.2)",
  },
  headerInner: { display: "flex", alignItems: "center", gap: 16 },
  headerIcon: {
    width: 44, height: 44, borderRadius: "12px",
    background: "rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(8px)",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" },
  subtitle: { margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  refreshBtn: {
    padding: "8px 16px", borderRadius: "var(--radius-sm)",
    background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff", cursor: "pointer", backdropFilter: "blur(8px)",
    transition: "all 0.2s", fontWeight: 600,
  },
  errorBanner: {
    padding: "12px 16px", background: "rgba(220,38,38,0.08)",
    color: "var(--emergency)", border: "1px solid rgba(220,38,38,0.25)",
    borderRadius: "var(--radius)", fontSize: 13, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 8,
  },
  statsRow: { gap: 12 },
  statCard: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px 20px",
    display: "flex", alignItems: "center", gap: 14,
    boxShadow: "var(--shadow-sm)",
  },
  statDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  statNum: { fontSize: 24, fontWeight: 800, lineHeight: 1.1 },
  statLabel: { fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginTop: 2 },
  tabsRow: {
    display: "flex", gap: 6, borderBottom: "2px solid var(--border)",
    paddingBottom: 0, flexWrap: "wrap",
  },
  tab: {
    padding: "10px 18px", borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: "none", background: "transparent", color: "var(--text-muted)",
    display: "inline-flex", alignItems: "center", gap: 7,
    transition: "all 0.15s", borderBottom: "2px solid transparent",
    marginBottom: -2,
  },
  tabActive: {
    padding: "10px 18px", borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    border: "none", background: "var(--surface)", color: "var(--brand)",
    display: "inline-flex", alignItems: "center", gap: 7,
    transition: "all 0.15s", borderBottom: "2px solid var(--brand)",
    marginBottom: -2, boxShadow: "0 -2px 8px rgba(37,99,235,0.07)",
  },
  filtersBar: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "12px 16px",
    display: "flex", gap: 10, flexWrap: "wrap",
    boxShadow: "var(--shadow-sm)",
  },
  filterField: {
    flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8,
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: "0 12px",
  },
  filterInput: {
    background: "none", border: "none", padding: "8px 0",
    outline: "none", fontSize: 13, width: "100%", color: "var(--text)",
  },
  filterSelect: {
    background: "none", border: "none", padding: "8px 0",
    outline: "none", fontSize: 13, width: "100%", color: "var(--text)",
    cursor: "pointer",
  },
  // Timeline (auditoria)
  timelineList: { display: "flex", flexDirection: "column", gap: 0, position: "relative", paddingLeft: 28 },
  timelineItem: { position: "relative", paddingBottom: 16, paddingLeft: 16 },
  timelineDot: {
    position: "absolute", left: -8, top: 14, width: 10, height: 10,
    borderRadius: "50%", background: "var(--brand)", border: "2px solid var(--surface)",
    boxShadow: "0 0 0 3px rgba(37,99,235,0.15)",
  },
  timelineLine: {
    position: "absolute", left: -4, top: 24, bottom: 0, width: 2,
    background: "var(--border)",
  },
  timelineCard: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "12px 16px",
    boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.2s",
  },
  timelineTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  timelineDate: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" },
  timelineBody: { display: "flex", flexDirection: "column", gap: 6 },
  timelineActor: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  timelineMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  code: {
    fontFamily: "monospace", background: "var(--surface-2)",
    padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "var(--text-muted)",
  },
  // Cards (completados/solventados)
  cardsGrid: { gap: 16 },
  caseCard: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", overflow: "hidden",
    boxShadow: "var(--shadow-sm)", transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex", flexDirection: "column", gap: 0,
  },
  caseCardHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  tipoBadge: {
    fontSize: 12, fontWeight: 700, padding: "3px 10px",
    borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4,
  },
  estadoBadge: {
    fontSize: 11, fontWeight: 800, padding: "3px 10px",
    borderRadius: 20, letterSpacing: "0.04em",
  },
  caseDesc: {
    margin: 0, padding: "14px 16px 10px", fontSize: 13, lineHeight: 1.5,
    fontWeight: 500, color: "var(--text)", flex: 1,
    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  caseQty: { color: "var(--text-muted)", fontWeight: 400 },
  caseRoute: { padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 5 },
  routeRow: { display: "flex", alignItems: "flex-start", gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0 },
  routeText: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 },
  caseFooter: {
    borderTop: "1px solid var(--border)", padding: "12px 16px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  caseOperador: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  caseContact: { display: "flex", gap: 6, flexWrap: "wrap" },
  contactChip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
    background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: 20, padding: "2px 8px",
  },
};
