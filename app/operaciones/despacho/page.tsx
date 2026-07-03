"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, CentroAcopioOperativo, InventarioAcopio, Transporte, PersonalMedico, Departamento } from "@/lib/types-operations";
import { 
  Truck, 
  User, 
  Map, 
  Phone, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Navigation,
  FileText,
  UserCheck,
  Package,
  Calendar,
  X,
  UserPlus
} from "lucide-react";
import { esTicketTraslado, esTicketAEC, contarPorOrigen, buildTrasladoCtx, TrasladoFilterContext } from "@/lib/ticket-filters";
import { AecCoberturaPanel } from "@/components/operaciones/AecCoberturaPanel";
import OperadorRegistroModal from "@/components/OperadorRegistroModal";
import { EMPTY_OPERADOR, OperadorData, tipoTransporteParaCategoria } from "@/lib/operador";

export default function TableroDespachoPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [acopios, setAcopios] = useState<CentroAcopioOperativo[]>([]);
  const [inventarios, setInventarios] = useState<InventarioAcopio[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [medicos, setMedicos] = useState<PersonalMedico[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);

  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "traslados" | "ayuda_en_camino">("todos");
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);
  const [trasladoCtx, setTrasladoCtx] = useState<TrasladoFilterContext>(buildTrasladoCtx([]));

  // Asignaciones locales en UI (por ticket id)
  const [selectedAcopio, setSelectedAcopio] = useState<Record<string, string>>({});
  const [selectedTransporte, setSelectedTransporte] = useState<Record<string, string>>({});
  const [selectedMedico, setSelectedMedico] = useState<Record<string, string>>({});

  // Modal de Alerta / Confirmación personalizado
  const [customModal, setCustomModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showCustomAlert = (message: string, title: string = "Notificación") => {
    return new Promise<void>((resolve) => {
      setCustomModal({
        show: true,
        title,
        message,
        type: "alert",
        onConfirm: () => {
          setCustomModal(null);
          resolve();
        }
      });
    });
  };

  const showCustomConfirm = (message: string, title: string = "Confirmación") => {
    return new Promise<boolean>((resolve) => {
      setCustomModal({
        show: true,
        title,
        message,
        type: "confirm",
        onConfirm: () => {
          setCustomModal(null);
          resolve(true);
        },
        onCancel: () => {
          setCustomModal(null);
          resolve(false);
        }
      });
    });
  };

  // Detalle del Inventario seleccionado (modal o panel)
  const [viewInventarioCentro, setViewInventarioCentro] = useState<CentroAcopioOperativo | null>(null);

  // WhatsApp Handoff modal/texto
  const [whatsappText, setWhatsappText] = useState<string | null>(null);

  // Registro rápido de conductor nuevo desde la card de despacho
  const [nuevoConductorTicketId, setNuevoConductorTicketId] = useState<string | null>(null);
  const [operadorData, setOperadorData] = useState<OperadorData>(EMPTY_OPERADOR);
  const [guardandoConductor, setGuardandoConductor] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [tRes, acRes, trRes, medRes, depRes, trPubRes] = await Promise.all([
        supabase.from("tickets")
          .select("*")
          .in("estado", ["aprobado", "asignado", "aceptado", "en_camino", "completado"])
          .order("prioridad", { ascending: false })
          .order("updated_at", { ascending: false }),
        supabase.from("centros_acopio").select("*").eq("activo", true),
        supabase.from("transportes").select("*").eq("activo", true),
        supabase.from("personal_medico").select("*").eq("activo", true),
        supabase.from("departamentos").select("*").eq("activo", true),
        supabase.from("traslados").select("id").not("reporter_token", "is", null),
      ]);

      if (tRes.data) setTickets(tRes.data as Ticket[]);
      setTrasladoCtx(buildTrasladoCtx((trPubRes.data || []).map((r) => r.id)));
      if (acRes.data) setAcopios(acRes.data as CentroAcopioOperativo[]);
      if (trRes.error) console.error("Error cargando transportes:", trRes.error);
      if (trRes.data) setTransportes(trRes.data as Transporte[]);
      if (medRes.data) setMedicos(medRes.data as PersonalMedico[]);
      if (depRes.data) setDepartamentos(depRes.data as Departamento[]);

      // Cargar inventarios
      const { data: invData } = await supabase.from("inventario_acopio").select("*");
      if (invData) setInventarios(invData as InventarioAcopio[]);

    } catch (err) {
      console.error("Error al cargar tablero:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // Suscripción realtime
    const ch = supabase
      .channel("tablero_despacho")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        cargarDatos();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const focusId = params.get("focus");
      if (focusId) {
        setHighlightedTicketId(focusId);
        // Scroll to the card after the data finishes loading
        setTimeout(() => {
          const el = document.getElementById(`ticket-${focusId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 800);
      }
    }
  }, [loading]);

  const tipoSugeridoParaCategoria = (categoria: string | null, tipo: string) => {
    if (!categoria) return true;
    if (categoria === "emergencia_medica" || categoria === "traslado_personal") {
      return tipo === "ambulancia" || tipo === "pasajeros";
    }
    if (categoria === "insumo_basico" || categoria === "insumo_medico") {
      return tipo === "carga" || tipo === "pasajeros";
    }
    if (categoria === "grua") return tipo === "grua";
    if (categoria === "tecnico") return tipo === "tecnico";
    return true;
  };

  const obtenerTransportesParaAsignar = (categoria: string | null, asignadoId?: string | null) => {
    const score = (t: Transporte) => {
      let s = 0;
      if (tipoSugeridoParaCategoria(categoria, t.tipo)) s += 10;
      return s;
    };

    // Solo transportistas activos y disponibles (en_standby); excepción: el ya asignado al ticket
    let pool = transportes.filter((t) => t.en_standby);
    if (asignadoId && !pool.some((t) => t.id === asignadoId)) {
      const asignado = transportes.find((t) => t.id === asignadoId);
      if (asignado) pool = [asignado, ...pool];
    }

    return [...pool].sort(
      (a, b) => score(b) - score(a) || a.nombre.localeCompare(b.nombre, "es")
    );
  };

  const etiquetaTransporte = (t: Transporte, categoria: string | null) => {
    const partes = [`${t.nombre} (${t.tipo.toUpperCase()})`];
    if (!t.en_standby) partes.push("no disponible");
    else if (!tipoSugeridoParaCategoria(categoria, t.tipo)) partes.push("otro tipo");
    return partes.join(" · ");
  };

  const abrirNuevoConductor = (ticketId: string) => {
    setOperadorData(EMPTY_OPERADOR);
    setNuevoConductorTicketId(ticketId);
  };

  const handleGuardarNuevoConductor = async () => {
    if (!nuevoConductorTicketId) return;
    if (!operadorData.nombre.trim()) {
      await showCustomAlert("Ingrese al menos el nombre del conductor o entidad.");
      return;
    }

    const ticket = tickets.find((t) => t.id === nuevoConductorTicketId);
    const tipo = tipoTransporteParaCategoria(ticket?.categoria_final ?? null);
    const ticketId = nuevoConductorTicketId;

    setGuardandoConductor(true);
    try {
      const { data: nuevoTransporte, error } = await supabase
        .from("transportes")
        .insert({
          nombre: operadorData.nombre.trim(),
          tipo,
          contacto: operadorData.telefono.trim() || null,
          cedula: operadorData.cedula.trim() || null,
          modelo: operadorData.modelo.trim() || null,
          placa: operadorData.placa.trim() || null,
          zona: operadorData.ciudad.trim() || operadorData.estado.trim() || null,
          ciudad: operadorData.ciudad.trim() || null,
          en_standby: true,
          activo: true,
          perfil_id: null,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (ticket && (ticket.fuente === "traslado" || esTicketTraslado(ticket, trasladoCtx))) {
        const trasladoId = ticket.fuente_id || ticket.id;
        await supabase
          .from("traslados")
          .update({ operador: JSON.stringify(operadorData) })
          .eq("id", trasladoId);
      }

      setTransportes((prev) => [...prev, nuevoTransporte as Transporte]);
      setSelectedTransporte((prev) => ({ ...prev, [ticketId]: nuevoTransporte.id }));
      setNuevoConductorTicketId(null);
      setOperadorData(EMPTY_OPERADOR);
      await showCustomAlert(
        "Conductor registrado y seleccionado. Revise los demás recursos y pulse Confirmar Despacho.",
        "Conductor agregado"
      );
    } catch (err: any) {
      await showCustomAlert(`Error al registrar conductor: ${err.message}`);
    } finally {
      setGuardandoConductor(false);
    }
  };

  // ASIGNAR RECURSOS
  const handleAsignar = async (ticketId: string) => {
    const acopioId = selectedAcopio[ticketId] || null;
    const transporteId = selectedTransporte[ticketId] || null;
    const medicoId = selectedMedico[ticketId] || null;

    if (!acopioId && !transporteId && !medicoId) {
      showCustomAlert("Por favor seleccione al menos un recurso para asignar.");
      return;
    }

    try {
      const { error } = await supabase.rpc("asignar_ticket", {
        p_id: ticketId,
        p_transporte: transporteId,
        p_medico: medicoId,
        p_acopio: acopioId
      });

      if (error) throw error;
      showCustomAlert("Recursos asignados con éxito y notificaciones enviadas.");
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al asignar recursos: ${err.message}`);
    }
  };

  const transporteDelTicket = (ticket: Ticket) =>
    ticket.transporte_id ? transportes.find((tr) => tr.id === ticket.transporte_id) ?? null : null;

  /** Traslado gestionado desde despacho: sin ficha de transporte o conductor externo sin panel. */
  const puedeGestionarViajeAdmin = (ticket: Ticket) => {
    if (!["asignado", "aceptado", "en_camino"].includes(ticket.estado)) return false;
    const tr = transporteDelTicket(ticket);
    return !tr || !tr.perfil_id;
  };

  const handleAvanzarEstadoAdmin = async (ticketId: string, nuevoEstado: "en_camino" | "completado") => {
    const etiqueta = nuevoEstado === "en_camino" ? "EN CAMINO" : "ENTREGADO / FINALIZADO";
    if (!(await showCustomConfirm(`¿Marcar este traslado como ${etiqueta}?`, "Confirmar avance"))) return;

    const ticket = tickets.find((t) => t.id === ticketId);
    try {
      const { error } = await supabase.rpc("actualizar_estado_ticket", {
        p_id: ticketId,
        p_estado: nuevoEstado,
      });
      if (error) throw error;

      if (ticket?.transporte_id) {
        await supabase
          .from("transportes")
          .update({ en_standby: nuevoEstado === "completado" })
          .eq("id", ticket.transporte_id);
      }

      await showCustomAlert(
        nuevoEstado === "en_camino"
          ? "Traslado marcado como en camino."
          : "Traslado finalizado correctamente.",
        "Estado actualizado"
      );
      cargarDatos();
    } catch (err: unknown) {
      await showCustomAlert(`Error al actualizar estado: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  };

  // HANDOFF WHATSAPP
  const generarHandoff = (ticket: Ticket) => {
    const origenMap = ticket.origen_lat && ticket.origen_lng 
      ? `https://www.google.com/maps/search/?api=1&query=${ticket.origen_lat},${ticket.origen_lng}` 
      : null;
    
    const destinoMap = ticket.destino_lat && ticket.destino_lng 
      ? `https://www.google.com/maps/search/?api=1&query=${ticket.destino_lat},${ticket.destino_lng}` 
      : null;

    const acopio = acopios.find(a => a.id === ticket.centro_acopio_id);
    const transporte = transportes.find(t => t.id === ticket.transporte_id);
    const medico = medicos.find(m => m.id === ticket.medico_id);

    const txt = `*RESCATE VE — SOLICITUD DESPACHADA* 🛡️\n` +
      `---------------------------------\n` +
      `*ID Ticket:* ${ticket.id.slice(0, 8)}\n` +
      `*Categoría:* ${ticket.categoria_final?.toUpperCase()}\n` +
      `*Prioridad:* ${ticket.prioridad.toUpperCase()}\n` +
      `*Necesidad:* ${ticket.descripcion}\n` +
      (ticket.cantidad ? `*Cantidad:* ${ticket.cantidad}\n` : "") +
      `*Contacto Solicitante:* ${ticket.contacto_solicitante || "No provisto"}\n` +
      `---------------------------------\n` +
      `*UBICACIÓN Y LOGÍSTICA*\n` +
      `*Origen:* ${ticket.origen_ref || "Mapa"}\n` +
      (origenMap ? `*Mapa Origen:* ${origenMap}\n` : "") +
      (ticket.destino_ref ? `*Destino:* ${ticket.destino_ref}\n` : "") +
      (destinoMap ? `*Mapa Destino:* ${destinoMap}\n` : "") +
      `---------------------------------\n` +
      `*ASIGNACIONES DE SOPORTE*\n` +
      (acopio ? `*Acopio:* ${acopio.nombre}\n` : "") +
      (transporte ? `*Transportista:* ${transporte.nombre} (${transporte.contacto || "Sin contacto"})\n` : "") +
      (medico ? `*Médico SafeCare:* ${medico.nombre} (${medico.contacto || "Sin contacto"})\n` : "") +
      `---------------------------------\n` +
      `*Estado:* ${ticket.estado.toUpperCase()}`;

    setWhatsappText(txt);
  };

  const handleCopyWhatsapp = () => {
    if (!whatsappText) return;
    navigator.clipboard.writeText(whatsappText);
    showCustomAlert("Texto copiado al portapapeles. Listo para enviar.");
    setWhatsappText(null);
  };

  const conteos = contarPorOrigen(tickets, trasladoCtx);
  const ticketsFiltrados = tickets.filter(t => {
    if (filtroOrigen === "traslados" && !esTicketTraslado(t, trasladoCtx)) return false;
    if (filtroOrigen === "ayuda_en_camino" && !esTicketAEC(t)) return false;
    if (filterEstado === "todos") return true;
    return t.estado === filterEstado;
  });

  const ESTADOS_MAP: Record<string, { label: string, color: string, bg: string }> = {
    aprobado: { label: "Aprobado", color: "#3b82f6", bg: "#eff6ff" },
    asignado: { label: "Asignado", color: "#eab308", bg: "#fef9c3" },
    aceptado: { label: "Aceptado", color: "#06b6d4", bg: "#ecfeff" },
    en_camino: { label: "En Camino", color: "#a855f7", bg: "#faf5ff" },
    completado: { label: "Entregado", color: "var(--success)", bg: "var(--success-soft)" },
  };

  return (
    <div style={styles.page} className="ops-page">
      <div style={styles.header} className="ops-page-header">
        <div>
          <h2 style={styles.title} className="ops-page-title">Tablero de Despacho Logístico</h2>
          <p style={styles.subtitle} className="ops-page-subtitle">Gestione rutas, asigne transportes, médicos y acopios a tickets aprobados.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
          <div style={styles.filterGroup}>
            <span style={{ fontSize: "11px", fontWeight: 700, alignSelf: "center", padding: "0 6px", color: "var(--text-muted)" }}>Origen:</span>
            <button 
              type="button"
              style={filtroOrigen === "todos" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFiltroOrigen("todos")}
            >
              Todos ({conteos.total})
            </button>
            <button 
              type="button"
              style={filtroOrigen === "traslados" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFiltroOrigen("traslados")}
            >
              Solo Traslados ({conteos.traslados})
            </button>
            <button 
              type="button"
              style={filtroOrigen === "ayuda_en_camino" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFiltroOrigen("ayuda_en_camino")}
            >
              Ayuda en Camino ({conteos.aec})
            </button>
          </div>

          <div style={styles.filterGroup}>
            <span style={{ fontSize: "11px", fontWeight: 700, alignSelf: "center", padding: "0 6px", color: "var(--text-muted)" }}>Estado:</span>
            <button 
              type="button"
              style={filterEstado === "todos" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFilterEstado("todos")}
            >
              Todos ({tickets.length})
            </button>
            <button 
              type="button"
              style={filterEstado === "aprobado" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFilterEstado("aprobado")}
            >
              Aprobados ({tickets.filter(t => t.estado === "aprobado").length})
            </button>
            <button 
              type="button"
              style={filterEstado === "asignado" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFilterEstado("asignado")}
            >
              Asignados ({tickets.filter(t => t.estado === "asignado").length})
            </button>
            <button 
              type="button"
              style={filterEstado === "en_camino" ? styles.btnFilterActive : styles.btnFilter}
              onClick={() => setFilterEstado("en_camino")}
            >
              En Camino ({tickets.filter(t => t.estado === "en_camino").length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.center}>
          <div style={styles.spinner}></div>
        </div>
      ) : ticketsFiltrados.length === 0 ? (
        <div style={styles.emptyContainer}>
          <CheckCircle2 size={48} color="var(--success)" />
          <h3>Tablero Despejado</h3>
          <p style={{ color: "var(--text-muted)" }}>No hay tickets activos en este estado.</p>
        </div>
      ) : (
        <div style={styles.grid} className="ops-ticket-grid">
          {ticketsFiltrados.map((t) => {
            const estadoInfo = ESTADOS_MAP[t.estado] || { label: t.estado, color: "var(--text)", bg: "var(--surface-2)" };
            const transportesAsignables = obtenerTransportesParaAsignar(
              t.categoria_final,
              selectedTransporte[t.id] || t.transporte_id
            );
            const medDisponibles = medicos.filter(m => m.disponible && m.verificado);
            const origenMapUrl = t.origen_lat && t.origen_lng
              ? `https://www.google.com/maps/dir/?api=1&origin=${t.origen_lat},${t.origen_lng}&destination=${t.destino_lat || t.origen_lat},${t.destino_lng || t.origen_lng}`
              : null;

            return (
              <div 
                key={t.id} 
                id={`ticket-${t.id}`}
                style={{
                  ...styles.card,
                  ...(highlightedTicketId === t.id ? {
                    borderColor: "var(--brand)",
                    boxShadow: "0 0 16px rgba(37, 99, 235, 0.4)",
                    transform: "scale(1.01)",
                    transition: "all 0.3s ease",
                    borderWidth: "2px"
                  } : {})
                }}
              >
                {/* Cabecera Tarjeta */}
                <div style={styles.cardHeader}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      ...styles.badgeEstado,
                      color: estadoInfo.color,
                      backgroundColor: estadoInfo.bg,
                      border: `1px solid ${estadoInfo.color}40`
                    }}>
                      {estadoInfo.label}
                    </span>
                    <span style={t.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                      {t.prioridad.toUpperCase()}
                    </span>

                    {t.fuente === "ayuda_en_camino" && (
                      <>
                        <span style={{
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "#2563eb",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                        }}>
                          AEC · {t.estado_externo === "cubierta" ? "Cubierta" : "Pendiente"}
                        </span>
                        {t.fuente_url && (
                          <a 
                            href={t.fuente_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{
                              fontSize: "11px",
                              color: "var(--brand)",
                              fontWeight: 700,
                              textDecoration: "none",
                              marginLeft: "2px"
                            }}
                          >
                            Origen ↗
                          </a>
                        )}
                      </>
                    )}

                    {t.fuente === "traslado" && (
                      <span style={{
                        background: "rgba(59, 130, 246, 0.1)",
                        color: "#2563eb",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                      }}>
                        Traslado Público
                      </span>
                    )}
                  </div>
                  <span style={styles.ticketId}>ID: {t.id.slice(0, 8)}</span>
                </div>

                {/* Info Solicitud */}
                <div style={styles.cardBody}>
                  <h4 style={styles.desc}>{t.descripcion}</h4>

                  {t.ubicacion_externa && (
                    <p style={{
                      margin: "4px 0 8px 0",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      background: "var(--surface-2)",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "3px solid var(--border)",
                    }}>
                      <strong>📍 Ubicación (Origen):</strong> {t.ubicacion_externa}
                    </p>
                  )}

                  {t.categoria_externa && (
                    <p style={{
                      margin: "4px 0 8px 0",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      background: "var(--surface-2)",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "3px solid var(--border)",
                    }}>
                      <strong>🏷️ Categoría (Origen):</strong> {t.categoria_externa}
                    </p>
                  )}

                  {esTicketAEC(t) && t.aec_meta != null && (
                    <AecCoberturaPanel ticket={t} />
                  )}

                  {t.cantidad && !esTicketAEC(t) && (
                    <p style={styles.itemQuantity}><strong>Cantidad solicitada:</strong> {t.cantidad}</p>
                  )}

                  <div style={styles.metaRow}>
                    {(!esTicketAEC(t) || t.aec_meta == null) && (
                      <div style={styles.metaItem}>
                        <Phone size={14} />
                        <span>{t.contacto_solicitante || "Sin número"}</span>
                      </div>
                    )}
                    <div style={styles.metaItem}>
                      <Map size={14} />
                      <span>Ori: {t.origen_ref || "En mapa"}</span>
                    </div>
                    {t.destino_ref && (
                      <div style={styles.metaItem}>
                        <Navigation size={14} />
                        <span>Dest: {t.destino_ref}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ruteo de Botones Rápidos */}
                <div style={styles.quickActions}>
                  {origenMapUrl && (
                    <a href={origenMapUrl} target="_blank" rel="noopener noreferrer" style={styles.btnLink}>
                      <Map size={14} />
                      <span>Ruta A→B</span>
                    </a>
                  )}

                  {t.categoria_final === "emergencia_medica" && (
                    <>
                      <a href="tel:171" style={styles.btnEmergencyCall}>
                        <Phone size={14} />
                        <span>Llamar al 171</span>
                      </a>
                      <button 
                        style={styles.btnSecondarySmall} 
                        onClick={() => showCustomAlert("Notificación enviada a SafeCare y Venemergencia.")}
                      >
                        <UserCheck size={14} />
                        <span>Aviso Aliado</span>
                      </button>
                    </>
                  )}

                  {(t.estado === "asignado" || t.estado === "aceptado" || t.estado === "en_camino") && (
                    <button style={styles.btnHandoff} onClick={() => generarHandoff(t)}>
                      <FileText size={14} />
                      <span>WhatsApp Handoff</span>
                    </button>
                  )}
                </div>

                {/* Despacho inicial: solo tickets aprobados pendientes de asignar */}
                {t.estado === "aprobado" && (
                  <div style={styles.sourcingBox}>
                    <h5 style={styles.sourcingTitle}>Despacho de Recursos</h5>
                    
                    {/* Acopio e inventario */}
                    <div style={styles.selectGroup}>
                      <label style={styles.selectLabel}>Centro de Acopio Insumos</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <select
                          value={selectedAcopio[t.id] || t.centro_acopio_id || ""}
                          onChange={(e) => setSelectedAcopio({ ...selectedAcopio, [t.id]: e.target.value })}
                          style={styles.select}
                        >
                          <option value="">-- No requiere o manual --</option>
                          {acopios.map(a => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                          ))}
                        </select>
                        {(selectedAcopio[t.id] || t.centro_acopio_id) && (
                          <button 
                            type="button"
                            title="Ver inventario"
                            style={styles.btnIcon}
                            onClick={() => {
                              const cid = selectedAcopio[t.id] || t.centro_acopio_id;
                              const match = acopios.find(a => a.id === cid);
                              if (match) setViewInventarioCentro(match);
                            }}
                          >
                            <Package size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Transporte */}
                    <div style={styles.selectGroup}>
                      <label style={styles.selectLabel}>Asignar Transportista (Sugerido)</label>
                      <div style={styles.selectRow}>
                        <select
                          value={selectedTransporte[t.id] || t.transporte_id || ""}
                          onChange={(e) => setSelectedTransporte({ ...selectedTransporte, [t.id]: e.target.value })}
                          style={{ ...styles.select, flex: 1, minWidth: 0 }}
                        >
                          <option value="">-- Sin transporte asignado --</option>
                          {transportesAsignables.length === 0 ? (
                            <option value="" disabled>Sin transportistas disponibles</option>
                          ) : (
                            transportesAsignables.map((tr) => (
                              <option key={tr.id} value={tr.id}>
                                {etiquetaTransporte(tr, t.categoria_final)}
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="button"
                          style={styles.btnNuevoConductor}
                          onClick={() => abrirNuevoConductor(t.id)}
                          title="Registrar un conductor nuevo con datos del vehículo"
                        >
                          <UserPlus size={14} />
                          <span>Nuevo conductor</span>
                        </button>
                      </div>
                    </div>

                    {/* Personal Médico */}
                    {(t.categoria_final === "emergencia_medica" || t.categoria_final === "traslado_personal") && (
                      <div style={styles.selectGroup}>
                        <label style={styles.selectLabel}>Personal Médico (SafeCare)</label>
                        <select
                          value={selectedMedico[t.id] || t.medico_id || ""}
                          onChange={(e) => setSelectedMedico({ ...selectedMedico, [t.id]: e.target.value })}
                          style={styles.select}
                        >
                          <option value="">-- Sin personal médico --</option>
                          {medDisponibles.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} ({m.especialidad || "General"}) - {m.zona || "General"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      style={styles.btnAsignar} 
                      onClick={() => handleAsignar(t.id)}
                    >
                      <Play size={14} />
                      <span>Confirmar Despacho</span>
                    </button>
                  </div>
                )}

                {puedeGestionarViajeAdmin(t) && (
                  <div style={styles.adminViajeBox}>
                    <p style={styles.adminViajeHint}>
                      {transporteDelTicket(t)
                        ? "Conductor sin acceso al panel — marque el avance del traslado aquí."
                        : "Traslado en seguimiento manual — marque si va en camino o si ya finalizó."}
                    </p>
                    <div style={styles.adminViajeActions}>
                      {(t.estado === "asignado" || t.estado === "aceptado") && (
                        <button
                          type="button"
                          style={styles.btnEnCamino}
                          onClick={() => handleAvanzarEstadoAdmin(t.id, "en_camino")}
                        >
                          <Navigation size={14} />
                          <span>Va en camino</span>
                        </button>
                      )}
                      {t.estado === "en_camino" && (
                        <button
                          type="button"
                          style={styles.btnFinalizarTraslado}
                          onClick={() => handleAvanzarEstadoAdmin(t.id, "completado")}
                        >
                          <CheckCircle2 size={14} />
                          <span>Finalizó el traslado</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Si ya fue asignado, muestra a quién */}
                {t.estado !== "aprobado" && (t.centro_acopio_id || t.transporte_id || t.medico_id) && (
                  <div style={styles.asignadoBox}>
                    <h5 style={{ margin: "0 0 4px 0", fontSize: "11px", color: "var(--text-muted)" }}>Recursos asignados</h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "12px" }}>
                      {t.centro_acopio_id && (
                        <span>📦 <strong>Acopio:</strong> {acopios.find(a => a.id === t.centro_acopio_id)?.nombre || "Cargando..."}</span>
                      )}
                      {t.transporte_id && (
                        <span>🚗 <strong>Transporte:</strong> {transportes.find(tr => tr.id === t.transporte_id)?.nombre || "Cargando..."}</span>
                      )}
                      {t.medico_id && (
                        <span>🩺 <strong>Médico:</strong> {medicos.find(m => m.id === t.medico_id)?.nombre || "Cargando..."}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Inventario Acopio */}
      {viewInventarioCentro && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Inventario disponible</h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{viewInventarioCentro.nombre}</span>
              </div>
              <button style={styles.closeBtn} onClick={() => setViewInventarioCentro(null)}><X size={18} /></button>
            </div>
            <div style={{ ...styles.modalBody, maxHeight: "300px", overflowY: "auto" }}>
              {inventarios.filter(i => i.centro_id === viewInventarioCentro.id).length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", margin: "20px 0" }}>
                  Sin insumos registrados en este centro.
                </p>
              ) : (
                <div className="ops-table-wrap">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Item</th>
                      <th style={styles.th}>Cantidad</th>
                      <th style={styles.th}>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventarios.filter(i => i.centro_id === viewInventarioCentro.id).map(i => (
                      <tr key={i.id} style={styles.tr}>
                        <td style={styles.td}><strong>{i.item}</strong></td>
                        <td style={styles.td}>{i.cantidad}</td>
                        <td style={styles.td}>{i.unidad || "Unidades"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button style={styles.btnSecondary} onClick={() => setViewInventarioCentro(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WhatsApp Handoff */}
      {whatsappText && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "500px" }} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>WhatsApp Handoff generado</h3>
              <button style={styles.closeBtn} onClick={() => setWhatsappText(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Copie el texto estructurado a continuación para enviarlo a los aliados de transporte/médicos por WhatsApp.
              </p>
              <pre style={styles.pre}>
                {whatsappText}
              </pre>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button style={styles.btnSecondary} onClick={() => setWhatsappText(null)}>Cerrar</button>
              <button style={styles.btnPrimary} onClick={handleCopyWhatsapp}>Copiar Texto</button>
            </div>
          </div>
        </div>
      )}
      <OperadorRegistroModal
        open={!!nuevoConductorTicketId}
        title="Registrar nuevo conductor"
        subtitle="Complete los datos del conductor y del vehículo. Quedará disponible para asignar a este despacho."
        data={operadorData}
        onChange={setOperadorData}
        onClose={() => {
          if (guardandoConductor) return;
          setNuevoConductorTicketId(null);
          setOperadorData(EMPTY_OPERADOR);
        }}
        onSave={handleGuardarNuevoConductor}
        saving={guardandoConductor}
        saveLabel="Registrar y seleccionar"
      />

      {/* Modal de Alerta / Confirmación Personalizado */}
      {customModal && customModal.show && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "420px", width: "95%" }} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>{customModal.title}</h3>
              <button 
                type="button" 
                style={styles.closeBtn} 
                onClick={() => {
                  if (customModal.onCancel) customModal.onCancel();
                  else customModal.onConfirm();
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text)" }}>{customModal.message}</p>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              {customModal.type === "confirm" && (
                <button 
                  type="button" 
                  style={styles.btnSecondary} 
                  onClick={() => {
                    if (customModal.onCancel) customModal.onCancel();
                    else customModal.onConfirm();
                  }}
                >
                  Cancelar
                </button>
              )}
              <button 
                type="button" 
                style={styles.btnPrimary} 
                onClick={customModal.onConfirm}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s3)",
    flexWrap: "wrap",
    gap: "12px",
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
  filterGroup: {
    display: "flex",
    gap: "4px",
    background: "var(--surface-2)",
    padding: "4px",
    borderRadius: "var(--radius-sm)",
  },
  btnFilter: {
    background: "none",
    border: "none",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-xs)",
    fontWeight: 700,
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition)",
  },
  btnFilterActive: {
    background: "var(--surface)",
    border: "none",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-xs)",
    fontWeight: 800,
    color: "var(--brand)",
    boxShadow: "var(--shadow-sm)",
    cursor: "default",
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
  grid: {
    gap: "var(--s4)",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    boxShadow: "var(--shadow)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeEstado: {
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-pill)",
    textTransform: "uppercase",
  },
  badgeAlta: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
  },
  badgeMedia: {
    background: "var(--warning-soft)",
    color: "var(--warning)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
  },
  ticketId: {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  desc: {
    margin: 0,
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--text)",
    lineHeight: 1.4,
  },
  itemQuantity: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text)",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--s2) var(--s4)",
    marginTop: "4px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  quickActions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
  },
  btnLink: {
    background: "var(--brand-soft)",
    color: "var(--brand)",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "1px solid rgba(15,76,129,.1)",
  },
  btnEmergencyCall: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "1px solid rgba(225,29,72,.1)",
  },
  btnSecondarySmall: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    padding: "5px 10px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  btnHandoff: {
    background: "var(--success-soft)",
    color: "var(--success)",
    border: "1px solid rgba(13,148,136,.1)",
    padding: "5px 10px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  sourcingBox: {
    background: "var(--surface-2)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--s3)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s2)",
    marginTop: "4px",
    border: "1px solid var(--border)",
  },
  sourcingTitle: {
    margin: "0 0 4px 0",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--brand)",
    textTransform: "uppercase",
  },
  selectGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  selectRow: {
    display: "flex",
    gap: "8px",
    alignItems: "stretch",
    flexWrap: "wrap",
  },
  btnNuevoConductor: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px dashed var(--brand)",
    background: "var(--surface)",
    color: "var(--brand)",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  selectLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted)",
  },
  select: {
    padding: "6px 10px",
    fontSize: "12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface)",
    flex: 1,
  },
  btnIcon: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  btnAsignar: {
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    boxShadow: "var(--shadow-sm)",
    marginTop: "4px",
  },
  asignadoBox: {
    background: "var(--brand-soft)",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    borderLeft: "4px solid var(--brand)",
    marginTop: "4px",
  },
  adminViajeBox: {
    background: "#faf5ff",
    border: "1px solid rgba(168, 85, 247, 0.25)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  adminViajeHint: {
    margin: 0,
    fontSize: "11px",
    color: "#7e22ce",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  adminViajeActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  btnEnCamino: {
    background: "#a855f7",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnFinalizarTraslado: {
    background: "var(--success)",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    background: "var(--surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    width: "100%",
    maxWidth: "450px",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
    padding: "var(--s5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s2)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--s3)",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
  },
  btnPrimary: {
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "8px",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-muted)",
  },
  tr: {
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "8px",
  },
  pre: {
    background: "var(--surface-2)",
    padding: "var(--s3)",
    borderRadius: "var(--radius-sm)",
    fontSize: "11px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    maxHeight: "250px",
    overflowY: "auto",
    border: "1px solid var(--border)",
  }
};
