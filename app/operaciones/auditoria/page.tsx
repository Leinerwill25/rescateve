"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TicketHistorial, Perfil } from "@/lib/types-operations";
import {
  History, Search, Filter, AlertTriangle, ShieldCheck, Clock,
  CheckCircle, XCircle, Phone, Truck, User, Calendar, Package
} from "lucide-react";

interface AuditEntry extends Omit<TicketHistorial, "accion"> {
  accion: string;
  perfil: Perfil | null;
  ticket_created_at?: string | null;
  ticket_descripcion?: string | null;
  ticket_fuente?: string | null;
}

type CasoFinalizado = {
  id: string;
  source: "ticket" | "traslado";
  descripcion: string | null;
  cantidad: string | null;
  origen_ref: string | null;
  destino_ref: string | null;
  contacto: string | null;
  cuando: string | null;
  created_at: string | null;
  updated_at: string | null;
  estado: string;
  tipo: string;
  operador: unknown;
  fuente?: string | null;
  evidencia_url?: string | null;
  transporte_nombre?: string | null;
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

/** Pagina resultados de Supabase más allá del tope por defecto (~1000). */
async function fetchAllPaged<T extends Record<string, unknown>>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (from < MAX_ROWS) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;
    const batch = data || [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function etiquetaFuente(fuente: string | null | undefined) {
  if (!fuente) return "Ticket";
  if (fuente === "ayuda_en_camino") return "Ayuda en Camino";
  if (fuente === "traslado") return "Traslado";
  if (fuente === "manual") return "Manual";
  if (fuente === "publico") return "Público / Ash";
  return fuente;
}

export default function AuditoriaLogisticaPage() {
  const [historial, setHistorial] = useState<AuditEntry[]>([]);
  const [casosCompletados, setCasosCompletados] = useState<CasoFinalizado[]>([]);
  const [casosSolventados, setCasosSolventados] = useState<CasoFinalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"auditoria" | "completados" | "solventados">("auditoria");

  const [searchTicket, setSearchTicket] = useState("");
  const [searchActor, setSearchActor] = useState("");
  const [filterAccion, setFilterAccion] = useState("todos");
  const [searchCaso, setSearchCaso] = useState("");

  const ACCIONES = [
    { value: "aprobado", label: "Aprobado" },
    { value: "asignado", label: "Asignado" },
    { value: "estado_cambiado", label: "Estado de viaje/visita" },
    { value: "match_acopio_reclamado", label: "Match acopio reclamado" },
    { value: "match_acopio_confirmado", label: "Match acopio confirmado" },
    { value: "match_acopio_rechazado", label: "Match acopio rechazado" },
    { value: "dividido", label: "Dividido" },
    { value: "reasignado", label: "Reasignado" },
    { value: "rechazado", label: "Descartado/Rechazado" },
    { value: "clasificado_auto", label: "Clasificado Auto" },
    { value: "reclasificado", label: "Reclasificado" },
  ];

  const cargarHistorial = async () => {
    setLoading(true);
    setAuditError(null);

    try {
      const histData = await fetchAllPaged<TicketHistorial & Record<string, unknown>>((from, to) =>
        supabase
          .from("ticket_historial")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to)
      );

      const actorIds = [
        ...new Set(histData.map((h) => h.actor).filter(Boolean)),
      ] as string[];

      const ticketIds = [
        ...new Set(histData.map((h) => h.ticket_id).filter(Boolean)),
      ] as string[];

      const perfilMap = new Map<string, Perfil>();
      if (actorIds.length > 0) {
        for (let i = 0; i < actorIds.length; i += 200) {
          const chunk = actorIds.slice(i, i + 200);
          const { data: perfiles, error: pErr } = await supabase
            .from("perfiles")
            .select("id, nombre, rol, telefono, activo, created_at")
            .in("id", chunk);
          if (pErr) throw pErr;
          for (const p of perfiles || []) perfilMap.set(p.id, p as Perfil);
        }
      }

      type TicketMeta = {
        id: string;
        created_at: string;
        descripcion: string | null;
        fuente: string | null;
      };
      const ticketMetaMap = new Map<string, TicketMeta>();
      if (ticketIds.length > 0) {
        for (let i = 0; i < ticketIds.length; i += 200) {
          const chunk = ticketIds.slice(i, i + 200);
          const { data: tickets, error: tkErr } = await supabase
            .from("tickets")
            .select("id, created_at, descripcion, fuente")
            .in("id", chunk);
          if (tkErr) throw tkErr;
          for (const t of tickets || []) {
            ticketMetaMap.set(t.id, t as TicketMeta);
          }
        }
      }

      setHistorial(
        histData.map((h) => {
          const meta = ticketMetaMap.get(h.ticket_id);
          return {
            ...h,
            accion: String(h.accion),
            perfil: h.actor ? perfilMap.get(h.actor) ?? null : null,
            ticket_created_at: meta?.created_at ?? null,
            ticket_descripcion: meta?.descripcion ?? null,
            ticket_fuente: meta?.fuente ?? null,
          } as AuditEntry;
        })
      );
    } catch (err: unknown) {
      console.error("Error al cargar historial:", err);
      setAuditError(`Error al cargar historial: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const ticketsCompletados = await fetchAllPaged<Record<string, unknown>>((from, to) =>
        supabase
          .from("tickets")
          .select(
            "id,created_at,updated_at,descripcion,fuente,estado,cantidad,origen_ref,destino_ref,contacto_solicitante,prioridad,cuando,evidencia_entrega_url,transporte_id,categoria_final,categoria_sugerida"
          )
          .eq("estado", "completado")
          .order("updated_at", { ascending: false })
          .range(from, to)
      );

      const transporteIds = [
        ...new Set(
          ticketsCompletados
            .map((t) => t.transporte_id as string | null)
            .filter(Boolean)
        ),
      ] as string[];

      const transporteMap = new Map<string, string>();
      if (transporteIds.length > 0) {
        for (let i = 0; i < transporteIds.length; i += 200) {
          const chunk = transporteIds.slice(i, i + 200);
          const { data: transportes, error: trErr } = await supabase
            .from("transportes")
            .select("id, nombre")
            .in("id", chunk);
          if (trErr) throw trErr;
          for (const tr of transportes || []) transporteMap.set(tr.id, tr.nombre);
        }
      }

      const fromTickets: CasoFinalizado[] = ticketsCompletados.map((t) => ({
        id: String(t.id),
        source: "ticket" as const,
        descripcion: (t.descripcion as string) || null,
        cantidad: (t.cantidad as string) || null,
        origen_ref: (t.origen_ref as string) || null,
        destino_ref: (t.destino_ref as string) || null,
        contacto: (t.contacto_solicitante as string) || null,
        cuando: (t.cuando as string) || null,
        created_at: (t.created_at as string) || null,
        updated_at: (t.updated_at as string) || null,
        estado: "completado",
        tipo:
          (t.categoria_final as string) ||
          (t.categoria_sugerida as string) ||
          (t.fuente as string) ||
          "ticket",
        operador: t.transporte_id
          ? { nombre: transporteMap.get(String(t.transporte_id)) || "Transportista asignado" }
          : null,
        fuente: (t.fuente as string) || null,
        evidencia_url: (t.evidencia_entrega_url as string) || null,
        transporte_nombre: t.transporte_id
          ? transporteMap.get(String(t.transporte_id)) || null
          : null,
      }));

      const trasData = await fetchAllPaged<Record<string, unknown>>((from, to) =>
        supabase
          .from("traslados")
          .select("*")
          .in("estado", ["completado", "solventado_externo"])
          .order("created_at", { ascending: false })
          .range(from, to)
      );

      const ticketIdsSet = new Set(fromTickets.map((c) => c.id));

      const fromTrasladosCompletados: CasoFinalizado[] = trasData
        .filter((t) => t.estado === "completado" && !ticketIdsSet.has(String(t.id)))
        .map((t) => ({
          id: String(t.id),
          source: "traslado" as const,
          descripcion: (t.descripcion as string) || null,
          cantidad: (t.cantidad as string) || null,
          origen_ref: (t.origen_ref as string) || null,
          destino_ref: (t.destino_ref as string) || null,
          contacto: (t.contacto as string) || null,
          cuando: (t.cuando as string) || null,
          created_at: (t.created_at as string) || null,
          updated_at: (t.created_at as string) || null,
          estado: "completado",
          tipo: (t.tipo as string) || "traslado",
          operador: t.operador,
          fuente: "traslado",
        }));

      const fromTrasladosSolventados: CasoFinalizado[] = trasData
        .filter((t) => t.estado === "solventado_externo")
        .map((t) => ({
          id: String(t.id),
          source: "traslado" as const,
          descripcion: (t.descripcion as string) || null,
          cantidad: (t.cantidad as string) || null,
          origen_ref: (t.origen_ref as string) || null,
          destino_ref: (t.destino_ref as string) || null,
          contacto: (t.contacto as string) || null,
          cuando: (t.cuando as string) || null,
          created_at: (t.created_at as string) || null,
          updated_at: (t.created_at as string) || null,
          estado: "solventado_externo",
          tipo: (t.tipo as string) || "traslado",
          operador: t.operador,
          fuente: "traslado",
        }));

      const completadosMerged = [...fromTickets, ...fromTrasladosCompletados].sort((a, b) => {
        const da = new Date(a.updated_at || a.created_at || 0).getTime();
        const db = new Date(b.updated_at || b.created_at || 0).getTime();
        return db - da;
      });

      setCasosCompletados(completadosMerged);
      setCasosSolventados(fromTrasladosSolventados);
    } catch (err: unknown) {
      console.error("Error al cargar casos finalizados:", err);
      setAuditError(`Error al cargar casos: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  const entriesFiltradas = historial.filter((e) => {
    if (searchTicket) {
      const q = searchTicket.toLowerCase();
      const hayId = e.ticket_id.toLowerCase().includes(q);
      const hayDesc = (e.ticket_descripcion || "").toLowerCase().includes(q);
      if (!hayId && !hayDesc) return false;
    }
    if (searchActor) {
      const nombre = e.perfil?.nombre || "Sistema / Auto";
      if (!nombre.toLowerCase().includes(searchActor.toLowerCase())) return false;
    }
    if (filterAccion !== "todos" && e.accion !== filterAccion) return false;
    return true;
  });

  const matchesCaso = (t: CasoFinalizado) => {
    if (!searchCaso) return true;
    const s = searchCaso.toLowerCase();
    return (
      t.id.toLowerCase().includes(s) ||
      (t.descripcion || "").toLowerCase().includes(s) ||
      (t.origen_ref || "").toLowerCase().includes(s) ||
      (t.destino_ref || "").toLowerCase().includes(s) ||
      (t.fuente || "").toLowerCase().includes(s) ||
      (t.transporte_nombre || "").toLowerCase().includes(s)
    );
  };

  const casosCompletadosFiltrados = casosCompletados.filter(matchesCaso);
  const casosSolventadosFiltrados = casosSolventados.filter(matchesCaso);

  const getAccionBadge = (accion: string, aValor: string | null) => {
    let label = accion.toUpperCase();
    let bg = "var(--surface-2)";
    let color = "var(--text-muted)";
    if (accion === "aprobado") { label = "✓ Aprobado"; bg = "var(--success-soft)"; color = "var(--success)"; }
    else if (accion === "asignado") { label = "⚡ Asignado"; bg = "#fef9c3"; color = "#b45309"; }
    else if (accion === "dividido") { label = "↗ Dividido"; bg = "#faf5ff"; color = "#7c3aed"; }
    else if (accion === "reasignado") { label = "↺ Reasignado"; bg = "#eff6ff"; color = "#2563eb"; }
    else if (accion === "rechazado") { label = "✕ Rechazado"; bg = "var(--emergency-soft)"; color = "var(--emergency)"; }
    else if (accion === "match_acopio_reclamado") { label = "📍 Reclamó acopio"; bg = "#ecfdf5"; color = "#047857"; }
    else if (accion === "match_acopio_confirmado") { label = "✓ Confirmó acopio"; bg = "var(--success-soft)"; color = "var(--success)"; }
    else if (accion === "match_acopio_rechazado") { label = "✕ Rechazó acopio"; bg = "var(--emergency-soft)"; color = "var(--emergency)"; }
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
    if (tipo === "personal_medico" || tipo === "traslado_personal") return { label: "🩺 Personal Médico", bg: "rgba(5,150,105,0.08)", color: "#059669", border: "rgba(5,150,105,0.2)" };
    if (tipo === "insumos" || tipo === "insumo_medico" || tipo === "insumo_basico") return { label: "🧰 Insumos", bg: "rgba(245,158,11,0.08)", color: "#d97706", border: "rgba(245,158,11,0.2)" };
    if (tipo === "alimentos") return { label: "🍞 Alimentos", bg: "rgba(249,115,22,0.08)", color: "#ea580c", border: "rgba(249,115,22,0.2)" };
    if (tipo === "ayuda_en_camino") return { label: "🛣️ Ayuda en Camino", bg: "rgba(14,165,233,0.08)", color: "#0284c7", border: "rgba(14,165,233,0.2)" };
    if (tipo === "publico") return { label: "🌿 Ash / Público", bg: "rgba(34,197,94,0.08)", color: "#15803d", border: "rgba(34,197,94,0.2)" };
    if (tipo === "traslado") return { label: "🚚 Traslado", bg: "rgba(37,99,235,0.08)", color: "#2563eb", border: "rgba(37,99,235,0.2)" };
    return { label: `📦 ${tipo}`, bg: "rgba(100,116,139,0.08)", color: "#475569", border: "rgba(100,116,139,0.2)" };
  };

  const parseOperador = (operador: unknown) => {
    if (!operador) return null;
    try {
      return typeof operador === "string"
        ? JSON.parse(operador)
        : operador as { nombre?: string; modelo?: string; placa?: string };
    } catch {
      return { nombre: String(operador) };
    }
  };

  const currentCasos = activeTab === "completados" ? casosCompletadosFiltrados : casosSolventadosFiltrados;
  const ticketsUnicosHistorial = new Set(historial.map((h) => h.ticket_id)).size;

  return (
    <div style={S.page} className="ops-page">
      <div style={S.pageHeader} className="ops-page-header">
        <div style={S.headerInner}>
          <div style={S.headerIcon}>
            <History size={22} color="#fff" />
          </div>
          <div>
            <h2 style={S.title}>Auditoría Logística</h2>
            <p style={S.subtitle}>
              Historial completo de acciones y tickets asistidos (operativos + traslados).
            </p>
          </div>
        </div>
        <button type="button" onClick={cargarHistorial} style={S.refreshBtn}>
          <span style={{ fontSize: 13 }}>↻ Actualizar</span>
        </button>
      </div>

      {auditError && (
        <div style={S.errorBanner}>
          <AlertTriangle size={16} />
          <span>{auditError}</span>
        </div>
      )}

      <div style={S.statsRow} className="ops-stats-row">
        <div style={S.statCard}>
          <div style={{ ...S.statDot, background: "var(--brand)" }} />
          <div>
            <div style={S.statNum}>{historial.length}</div>
            <div style={S.statLabel}>Acciones · {ticketsUnicosHistorial} tickets</div>
          </div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statDot, background: "var(--success)" }} />
          <div>
            <div style={S.statNum}>{casosCompletados.length}</div>
            <div style={S.statLabel}>Tickets / casos completados</div>
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

      <div style={S.tabsRow} className="ops-tabs">
        {[
          { key: "auditoria", icon: <History size={15} />, label: `Registro de Acciones (${historial.length})` },
          { key: "completados", icon: <CheckCircle size={15} />, label: `Completados (${casosCompletados.length})` },
          { key: "solventados", icon: <XCircle size={15} />, label: `Solventados por Fuera (${casosSolventados.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as "auditoria" | "completados" | "solventados")}
            style={activeTab === tab.key ? S.tabActive : S.tab}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "auditoria" && (
        <>
          <div style={S.filtersBar}>
            <div style={S.filterField} className="ops-filter-field">
              <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input value={searchTicket} onChange={(e) => setSearchTicket(e.target.value)} placeholder="ID o descripción..." style={S.filterInput} />
            </div>
            <div style={S.filterField} className="ops-filter-field">
              <User size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input value={searchActor} onChange={(e) => setSearchActor(e.target.value)} placeholder="Actor / Operador..." style={S.filterInput} />
            </div>
            <div style={S.filterField} className="ops-filter-field">
              <Filter size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <select value={filterAccion} onChange={(e) => setFilterAccion(e.target.value)} style={S.filterSelect}>
                <option value="todos">Todas las acciones</option>
                {ACCIONES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
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
                      <div style={S.timelineDates}>
                        {e.ticket_created_at && (
                          <div style={S.timelineDate} title="Fecha de creación del ticket">
                            <Calendar size={11} color="var(--brand)" />
                            <span>
                              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Creado: </span>
                              {new Date(e.ticket_created_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                        )}
                        <div style={S.timelineDate} title="Fecha de esta acción">
                          <Clock size={11} color="var(--text-muted)" />
                          <span>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Acción: </span>
                            {new Date(e.created_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
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
                      {e.ticket_descripcion && (
                        <p style={S.ticketDesc}>{e.ticket_descripcion}</p>
                      )}
                      <div style={S.timelineMeta}>
                        <code style={S.code}>{e.ticket_id.slice(0, 8)}…</code>
                        {e.ticket_fuente && (
                          <span style={S.fuenteChip}>{etiquetaFuente(e.ticket_fuente)}</span>
                        )}
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

      {(activeTab === "completados" || activeTab === "solventados") && (
        <>
          <div style={S.filtersBar}>
            <div style={{ ...S.filterField, flex: 1 }}>
              <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input
                value={searchCaso}
                onChange={(e) => setSearchCaso(e.target.value)}
                placeholder="Buscar por descripción, origen, destino, fuente o transportista..."
                style={S.filterInput}
              />
            </div>
          </div>

          {loading ? <Spinner /> : currentCasos.length === 0 ? <Empty message="No hay casos en este estado con los filtros indicados." /> : (
            <div style={S.cardsGrid} className="ops-cards-grid">
              {currentCasos.map((c) => {
                const op = parseOperador(c.operador);
                const tipo = getTipoInfo(c.tipo);
                const isCompletado = c.estado === "completado";
                return (
                  <div key={`${c.source}-${c.id}`} style={{ ...S.caseCard, borderTop: `3px solid ${isCompletado ? "var(--success)" : "#9ca3af"}` }}>
                    <div style={S.caseCardHeader}>
                      <span style={{ ...S.tipoBadge, background: tipo.bg, color: tipo.color, border: `1px solid ${tipo.border}` }}>
                        {tipo.label}
                      </span>
                      <span style={{ ...S.estadoBadge, background: isCompletado ? "rgba(5,150,105,0.1)" : "rgba(107,114,128,0.1)", color: isCompletado ? "#059669" : "#6b7280" }}>
                        {isCompletado ? "✓ COMPLETADO" : "✕ SOLVENTADO POR FUERA"}
                      </span>
                    </div>

                    {c.fuente && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={S.fuenteChip}>{etiquetaFuente(c.fuente)}</span>
                        <code style={{ ...S.code, marginLeft: 6 }}>{c.id.slice(0, 8)}…</code>
                      </div>
                    )}

                    <p style={S.caseDesc}>
                      {c.descripcion || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin descripción</span>}
                      {c.cantidad && <span style={S.caseQty}> · {c.cantidad}</span>}
                    </p>

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

                    <div style={S.caseFooter}>
                      {op?.nombre || c.transporte_nombre ? (
                        <div style={S.caseOperador}>
                          <Truck size={13} color="var(--brand)" />
                          <div>
                            <strong style={{ fontSize: 13 }}>{op?.nombre || c.transporte_nombre}</strong>
                            {op?.placa && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{op.modelo} · {op.placa}</div>}
                          </div>
                        </div>
                      ) : (
                        <div style={{ ...S.caseOperador, color: "var(--text-muted)", fontStyle: "italic" }}>
                          <Truck size={13} color="var(--text-muted)" /> Sin operador asignado
                        </div>
                      )}

                      <div style={S.caseContact}>
                        {c.created_at && (
                          <span style={S.contactChip} title="Fecha de creación">
                            <Calendar size={11} />
                            Creado: {new Date(c.created_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                        {c.updated_at && isCompletado && (
                          <span style={S.contactChip} title="Fecha de cierre">
                            <CheckCircle size={11} />
                            Cerrado: {new Date(c.updated_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                        {c.contacto && (
                          <span style={S.contactChip}>
                            <Phone size={11} />
                            {c.contacto}
                          </span>
                        )}
                        {c.cuando && (
                          <span style={S.contactChip}>
                            <Clock size={11} />
                            {c.cuando}
                          </span>
                        )}
                        {c.evidencia_url && (
                          <a href={c.evidencia_url} target="_blank" rel="noopener noreferrer" style={{ ...S.contactChip, color: "var(--brand)", textDecoration: "none" }}>
                            <Package size={11} /> Ver evidencia
                          </a>
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
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 16,
  },
  headerInner: { display: "flex", alignItems: "center", gap: 14 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12, background: "var(--brand)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: { margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--brand)" },
  subtitle: { margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" },
  refreshBtn: {
    padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
    background: "var(--surface)", cursor: "pointer", fontWeight: 600,
  },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
    background: "var(--emergency-soft)", color: "var(--emergency)", borderRadius: "var(--radius-sm)", fontSize: 13,
  },
  statsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  statCard: {
    display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
    minWidth: 160, flex: 1,
  },
  statDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  statNum: { fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 },
  statLabel: { fontSize: 11, color: "var(--text-muted)", marginTop: 2 },
  tabsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  tab: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)",
    fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text)",
  },
  tabActive: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--brand)", background: "var(--brand-soft)",
    fontSize: 13, fontWeight: 700, cursor: "pointer", color: "var(--brand)",
  },
  filtersBar: { display: "flex", gap: 10, flexWrap: "wrap" },
  filterField: {
    display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", minWidth: 180,
  },
  filterInput: {
    border: "none", outline: "none", background: "transparent", padding: "10px 0",
    fontSize: 13, width: "100%", color: "var(--text)",
  },
  filterSelect: {
    border: "none", outline: "none", background: "transparent", padding: "10px 0",
    fontSize: 13, width: "100%", color: "var(--text)",
  },
  timelineList: { display: "flex", flexDirection: "column", gap: 0, position: "relative" },
  timelineItem: { display: "flex", gap: 14, position: "relative", paddingBottom: 16, paddingLeft: 8 },
  timelineDot: {
    width: 10, height: 10, borderRadius: "50%", background: "var(--brand)",
    marginTop: 14, flexShrink: 0, zIndex: 1,
  },
  timelineLine: {
    position: "absolute", left: 12, top: 28, bottom: 0, width: 2, background: "var(--border)",
  },
  timelineCard: {
    flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", padding: "12px 14px",
  },
  timelineTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 },
  timelineDate: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" },
  timelineDates: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  timelineBody: { display: "flex", flexDirection: "column", gap: 6 },
  timelineActor: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  timelineMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ticketDesc: {
    margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.4,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  } as React.CSSProperties,
  fuenteChip: {
    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
    background: "var(--brand-soft)", color: "var(--brand)", textTransform: "uppercase",
  },
  code: {
    fontFamily: "monospace", background: "var(--surface-2)",
    padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "var(--text-muted)",
  },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  caseCard: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", overflow: "hidden", padding: 16,
    display: "flex", flexDirection: "column", gap: 10,
  },
  caseCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tipoBadge: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  estadoBadge: { fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999 },
  caseDesc: { margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 },
  caseQty: { fontWeight: 500, color: "var(--text-muted)", fontSize: 13 },
  caseRoute: { display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-2)", padding: 10, borderRadius: 8 },
  routeRow: { display: "flex", alignItems: "flex-start", gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0 },
  routeText: { fontSize: 12, color: "var(--text)", lineHeight: 1.35 },
  caseFooter: { display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 10 },
  caseOperador: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  caseContact: { display: "flex", flexWrap: "wrap", gap: 6 },
  contactChip: {
    display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11,
    padding: "4px 8px", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-muted)",
  },
};
