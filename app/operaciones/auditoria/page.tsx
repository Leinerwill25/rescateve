"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TicketHistorial, Perfil } from "@/lib/types-operations";
import { History, Search, Filter, AlertTriangle, ShieldCheck, Clock, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";

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
    
    // 1. Cargar Historial (Auditoría)
    try {
      const { data: histData, error: hErr } = await supabase
        .from("ticket_historial")
        .select(`
          *,
          perfil:actor (*)
        `)
        .order("created_at", { ascending: false });

      if (hErr) throw hErr;
      setHistorial((histData || []) as AuditEntry[]);
    } catch (err: any) {
      console.error("Error al cargar historial de auditoría:", err);
    }

    // 2. Cargar Traslados Finalizados
    try {
      const { data: trasData, error: tErr } = await supabase
        .from("traslados")
        .select("*")
        .in("estado", ["completado", "solventado_externo"])
        .order("id", { ascending: false });
        
      if (tErr) throw tErr;
      setTrasladosFinalizados(trasData || []);
    } catch (err: any) {
      console.error("Error al cargar traslados finalizados:", err);
      setAuditError(`Error al cargar casos: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const entriesFiltradas = historial.filter(e => {
    // Buscar por ticket_id
    if (searchTicket && !e.ticket_id.toLowerCase().includes(searchTicket.toLowerCase())) {
      return false;
    }
    // Buscar por actor (nombre)
    if (searchActor) {
      const nombreActor = e.perfil?.nombre || "Sistema / Auto";
      if (!nombreActor.toLowerCase().includes(searchActor.toLowerCase())) {
        return false;
      }
    }
    // Filtrar por acción
    if (filterAccion !== "todos" && e.accion !== filterAccion) {
      return false;
    }
    return true;
  });

  const casosCompletados = trasladosFinalizados.filter(t => {
    if (!t) return false;
    const matchesEstado = t.estado === "completado";
    if (!matchesEstado) return false;
    if (!searchCaso) return true;
    
    const searchLower = searchCaso.toLowerCase();
    const idMatches = t.id ? t.id.toLowerCase().includes(searchLower) : false;
    const descMatches = t.descripcion ? t.descripcion.toLowerCase().includes(searchLower) : false;
    const origMatches = t.origen_ref ? t.origen_ref.toLowerCase().includes(searchLower) : false;
    const destMatches = t.destino_ref ? t.destino_ref.toLowerCase().includes(searchLower) : false;
    
    return idMatches || descMatches || origMatches || destMatches;
  });

  const casosSolventados = trasladosFinalizados.filter(t => {
    if (!t) return false;
    const matchesEstado = t.estado === "solventado_externo";
    if (!matchesEstado) return false;
    if (!searchCaso) return true;
    
    const searchLower = searchCaso.toLowerCase();
    const idMatches = t.id ? t.id.toLowerCase().includes(searchLower) : false;
    const descMatches = t.descripcion ? t.descripcion.toLowerCase().includes(searchLower) : false;
    const origMatches = t.origen_ref ? t.origen_ref.toLowerCase().includes(searchLower) : false;
    const destMatches = t.destino_ref ? t.destino_ref.toLowerCase().includes(searchLower) : false;
    
    return idMatches || descMatches || origMatches || destMatches;
  });

  const getAccionBadge = (accion: string, aValor: string | null) => {
    let label = accion.toUpperCase();
    let bg = "var(--surface-2)";
    let color = "var(--text-muted)";

    if (accion === "aprobado") {
      label = "Aprobado";
      bg = "var(--success-soft)";
      color = "var(--success)";
    } else if (accion === "asignado") {
      label = "Asignado";
      bg = "#fef9c3";
      color = "#eab308";
    } else if (accion === "dividido") {
      label = "Dividido";
      bg = "#faf5ff";
      color = "#a855f7";
    } else if (accion === "rechazado") {
      label = "Rechazado";
      bg = "var(--emergency-soft)";
      color = "var(--emergency)";
    } else if (accion === "estado_cambiado") {
      label = `Estado: ${aValor || ""}`;
      if (aValor === "completado" || aValor === "entregado") {
        bg = "var(--success-soft)";
        color = "var(--success)";
      } else if (aValor === "en_camino") {
        bg = "#ecfeff";
        color = "#06b6d4";
      } else if (aValor === "aceptado") {
        bg = "#eff6ff";
        color = "#3b82f6";
      } else if (aValor === "rechazado") {
        bg = "var(--emergency-soft)";
        color = "var(--emergency)";
      }
    }

    return (
      <span style={{
        fontSize: "11px",
        fontWeight: 800,
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: bg,
        color: color,
        border: `1px solid ${color}20`
      }}>
        {label}
      </span>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Auditoría Logística y Registro</h2>
          <p style={styles.subtitle}>Trazabilidad en tiempo real sobre aprobaciones, asignaciones, casos completados y solventados por fuera.</p>
        </div>
      </div>

      {auditError && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "rgba(220, 38, 38, 0.1)",
          color: "var(--emergency)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          borderRadius: "var(--radius)",
          fontSize: "13px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <AlertTriangle size={16} />
          <span>{auditError}</span>
        </div>
      )}

      {/* Tabs de Navegación */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab("auditoria")} 
          style={activeTab === "auditoria" ? styles.tabButtonActive : styles.tabButton}
        >
          <History size={16} />
          <span>Registro de Acciones</span>
        </button>
        <button 
          onClick={() => setActiveTab("completados")} 
          style={activeTab === "completados" ? styles.tabButtonActive : styles.tabButton}
        >
          <CheckCircle size={16} />
          <span>Casos Completados ({casosCompletados.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab("solventados")} 
          style={activeTab === "solventados" ? styles.tabButtonActive : styles.tabButton}
        >
          <XCircle size={16} />
          <span>Solventados por Fuera ({casosSolventados.length})</span>
        </button>
      </div>

      {activeTab === "auditoria" && (
        <>
          {/* Barra de Filtros de Auditoría */}
          <div style={styles.filtersBar}>
            <div style={styles.filterField}>
              <Search size={16} color="var(--text-muted)" style={styles.icon} />
              <input
                type="text"
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                placeholder="Buscar por ID de Ticket..."
                style={styles.input}
              />
            </div>
            <div style={styles.filterField}>
              <Search size={16} color="var(--text-muted)" style={styles.icon} />
              <input
                type="text"
                value={searchActor}
                onChange={(e) => setSearchActor(e.target.value)}
                placeholder="Buscar por Actor / Operador..."
                style={styles.input}
              />
            </div>
            <div style={styles.filterField}>
              <Filter size={16} color="var(--text-muted)" style={styles.icon} />
              <select
                value={filterAccion}
                onChange={(e) => setFilterAccion(e.target.value)}
                style={styles.select}
              >
                <option value="todos">Todas las Acciones</option>
                {ACCIONES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={styles.center}><div style={styles.spinner}></div></div>
          ) : entriesFiltradas.length === 0 ? (
            <div style={styles.emptyContainer}>
              <AlertTriangle size={48} color="var(--text-muted)" />
              <h3>Sin Registros</h3>
              <p style={{ color: "var(--text-muted)" }}>No se encontraron entradas en el historial con los filtros indicados.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha / Hora</th>
                    <th style={styles.th}>Ticket ID</th>
                    <th style={styles.th}>Acción</th>
                    <th style={styles.th}>Actor / Operador</th>
                    <th style={styles.th}>Valores</th>
                    <th style={styles.th}>Detalles / Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesFiltradas.map((e) => (
                    <tr key={e.id} style={styles.tr}>
                      <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                        <div style={styles.timeRow}>
                          <Clock size={12} color="var(--text-muted)" />
                          <span>{new Date(e.created_at).toLocaleString("es-VE")}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <code style={styles.code}>{e.ticket_id.slice(0, 8)}...</code>
                      </td>
                      <td style={styles.td}>
                        {getAccionBadge(e.accion, e.a_valor)}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {e.perfil ? (
                            <>
                              <ShieldCheck size={14} color="var(--brand)" />
                              <span><strong>{e.perfil.nombre}</strong> ({e.perfil.rol.toUpperCase()})</span>
                            </>
                          ) : (
                            <>
                              <Clock size={14} color="var(--text-muted)" />
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Motor / Sistema</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {e.de_valor && <span>De: <code>{e.de_valor}</code> &rarr; </span>}
                        {e.a_valor && <span>A: <code>{e.a_valor}</code></span>}
                      </td>
                      <td style={styles.td}>
                        {e.nota || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin notas</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {(activeTab === "completados" || activeTab === "solventados") && (
        <>
          {/* Barra de Filtros de Casos */}
          <div style={styles.filtersBar}>
            <div style={{ ...styles.filterField, flex: 1 }}>
              <Search size={16} color="var(--text-muted)" style={styles.icon} />
              <input
                type="text"
                value={searchCaso}
                onChange={(e) => setSearchCaso(e.target.value)}
                placeholder="Buscar por ID, descripción, origen, destino..."
                style={styles.input}
              />
            </div>
          </div>

          {loading ? (
            <div style={styles.center}><div style={styles.spinner}></div></div>
          ) : (activeTab === "completados" ? casosCompletados.length : casosSolventados.length) === 0 ? (
            <div style={styles.emptyContainer}>
              <AlertTriangle size={48} color="var(--text-muted)" />
              <h3>Sin Casos</h3>
              <p style={{ color: "var(--text-muted)" }}>No se encontraron traslados en este estado con los filtros indicados.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID Traslado</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Descripción</th>
                    <th style={styles.th}>Origen / Destino</th>
                    <th style={styles.th}>Operador Asignado</th>
                    <th style={styles.th}>Contacto Solicitante</th>
                    <th style={styles.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === "completados" ? casosCompletados : casosSolventados).map((c) => {
                    let operadorInfo = null;
                    if (c.operador) {
                      try {
                        operadorInfo = typeof c.operador === 'string' ? JSON.parse(c.operador) : c.operador;
                      } catch (e) {
                        operadorInfo = { nombre: c.operador };
                      }
                    }
                    return (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>
                          <code style={styles.code}>{c.id.slice(0, 8)}...</code>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: c.tipo === "insumos" ? "var(--warning-soft)" : "var(--success-soft)",
                            color: c.tipo === "insumos" ? "var(--warning)" : "var(--success)",
                            border: "1px solid currentColor"
                          }}>
                            {c.tipo === "insumos" ? "Insumos" : "Personal Médico"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <strong>{c.descripcion || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Sin descripción</span>}</strong>
                        </td>
                        <td style={styles.td}>
                          <div><strong>Origen:</strong> {c.origen_ref || "N/A"}</div>
                          {c.destino_ref && <div><strong>Destino:</strong> {c.destino_ref}</div>}
                        </td>
                        <td style={styles.td}>
                          {operadorInfo ? (
                            <div>
                              <strong>{operadorInfo.nombre}</strong>
                              {operadorInfo.placa && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{operadorInfo.modelo} ({operadorInfo.placa})</div>}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin asignar</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {c.contacto || "N/A"}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: c.estado === "completado" ? "var(--success-soft)" : "var(--surface-2)",
                            color: c.estado === "completado" ? "var(--success)" : "var(--text-muted)",
                            border: "1px solid currentColor"
                          }}>
                            {c.estado === "completado" ? "COMPLETADO" : "SOLVENTADO POR FUERA"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabsContainer: {
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "12px",
    flexWrap: "wrap"
  },
  tabButton: {
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-muted)",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px"
  },
  tabButtonActive: {
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid var(--brand)",
    background: "rgba(37, 99, 235, 0.1)",
    color: "var(--brand)",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px"
  },
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  header: {
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s3)",
  },
  title: {
    margin: 0,
    fontSize: "var(--text-xl)",
    fontWeight: 800,
    color: "var(--brand)",
  },
  subtitle: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
  },
  filtersBar: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s3) var(--s4)",
    display: "flex",
    gap: "var(--s3)",
    flexWrap: "wrap",
    boxShadow: "var(--shadow-sm)",
  },
  filterField: {
    flex: 1,
    minWidth: "220px",
    display: "flex",
    alignItems: "center",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "0 var(--s3)",
    position: "relative",
  },
  icon: {
    marginRight: "8px",
    flexShrink: 0,
  },
  input: {
    background: "none",
    border: "none",
    padding: "8px 0",
    outline: "none",
    fontSize: "13px",
    width: "100%",
    color: "var(--text)",
  },
  select: {
    background: "none",
    border: "none",
    padding: "8px 0",
    outline: "none",
    fontSize: "13px",
    width: "100%",
    color: "var(--text)",
    cursor: "pointer",
    height: "36px",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid var(--border)",
    borderTop: "4px solid var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "60px var(--s4)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  tableWrapper: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "12px var(--s4)",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-muted)",
    fontWeight: 700,
  },
  tr: {
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "12px var(--s4)",
    verticalAlign: "middle",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
  },
  code: {
    fontFamily: "monospace",
    background: "var(--surface-2)",
    padding: "2px 4px",
    borderRadius: "var(--radius-sm)",
    fontSize: "11px",
  }
};
