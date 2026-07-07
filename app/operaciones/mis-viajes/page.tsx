"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, Transporte } from "@/lib/types-operations";
import { useOperationsAuth } from "../AuthContext";
import { BANCOS_PAGO_MOVIL, costoEstimadoUSD, tipoVehiculoDesdeTransporte } from "@/lib/combustible-utils";
import { uploadEntregaImage, validateImageFile } from "@/lib/image-utils";
import { 
  Truck, 
  CheckCircle, 
  AlertTriangle,
  Play,
  RotateCcw,
  Compass,
  Fuel,
  Camera,
  ImagePlus,
  X,
} from "lucide-react";
import {
  ViajeTransportistaDetalle,
  ViajeTransportistaResumen,
  buildViajeMapUrl,
  type MatchAcopioViaje,
} from "@/components/operaciones/ViajeTransportistaDetalle";
import { RutaTrasladoAcopio } from "@/components/operaciones/RutaTrasladoAcopio";

export default function MisViajesPage() {
  const { perfil } = useOperationsAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transporteFicha, setTransporteFicha] = useState<Transporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [gasTicket, setGasTicket] = useState<Ticket | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [gasError, setGasError] = useState("");
  const [gasForm, setGasForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    telefono: "",
    banco: "0102",
    litros: "",
    marca: "",
  });
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<Set<string>>(new Set());
  const [fotoRecordatorioOpen, setFotoRecordatorioOpen] = useState(false);
  const [entregaTicket, setEntregaTicket] = useState<Ticket | null>(null);
  const [entregaFile, setEntregaFile] = useState<File | null>(null);
  const [entregaPreview, setEntregaPreview] = useState<string | null>(null);
  const [entregaLoading, setEntregaLoading] = useState(false);
  const [entregaError, setEntregaError] = useState("");
  const entregaFileRef = useRef<HTMLInputElement>(null);
  type MatchAcopioInfo = MatchAcopioViaje & {
    id: string;
    ticket_id: string;
    estado: string;
  };
  const [matchByTicket, setMatchByTicket] = useState<Map<string, MatchAcopioInfo>>(new Map());
  const [rechazoTicketId, setRechazoTicketId] = useState<string | null>(null);
  const [rechazoNota, setRechazoNota] = useState("");
  const [rechazoLoading, setRechazoLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [marcandoRecogido, setMarcandoRecogido] = useState<string | null>(null);
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
  const cargarDatos = async () => {
    if (!perfil) return;
    setLoading(true);
    try {
      // 1. Obtener la ficha del transporte de este usuario
      const { data: trData } = await supabase
        .from("transportes")
        .select("*")
        .eq("perfil_id", perfil.id)
        .maybeSingle();

      if (trData) {
        setTransporteFicha(trData as Transporte);
        
        // 2. Obtener los tickets asignados a este transporte.
        // La política RLS asegura que solo lea los propios.
        const { data: ticketsData, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("transporte_id", trData.id)
          .in("estado", ["asignado", "aceptado", "en_camino", "completado"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTickets((ticketsData || []) as Ticket[]);

        const ids = (ticketsData || []).map((t) => t.id);
        if (ids.length > 0) {
          const [{ data: sols }, { data: matches }] = await Promise.all([
            supabase
              .from("solicitudes_gasolina")
              .select("ticket_id")
              .in("ticket_id", ids)
              .in("estado", ["pendiente", "pendiente_autorizacion"]),
            supabase
              .from("match_traslados_acopio")
              .select("id,ticket_id,estado,tuia_centro_nombre,tuia_centro_tel,tuia_articulo,tuia_centro_lat,tuia_centro_lng,insumos_recogidos_at")
              .in("ticket_id", ids)
              .in("estado", ["reclamado", "confirmado", "en_camino"]),
          ]);
          setSolicitudesPendientes(new Set((sols || []).map((s) => s.ticket_id).filter(Boolean)));
          const matchMap = new Map<string, MatchAcopioInfo>();
          for (const m of matches || []) {
            matchMap.set(m.ticket_id, m as MatchAcopioInfo);
          }
          setMatchByTicket(matchMap);
        } else {
          setSolicitudesPendientes(new Set());
          setMatchByTicket(new Map());
        }
      } else {
        setTransporteFicha(null);
        setTickets([]);
        setSolicitudesPendientes(new Set());
        setMatchByTicket(new Map());
      }
    } catch (err) {
      console.error("Error al cargar viajes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // Realtime para actualizar cuando el admin reasigne o agregue
    const ch = supabase
      .channel("mis_viajes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        cargarDatos();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [perfil]);

  // Ubicación del transportista para trazar la ruta hacia el acopio
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }, []);

  const marcarRecogido = async (matchId: string) => {
    setMarcandoRecogido(matchId);
    try {
      const { error } = await supabase.rpc("marcar_insumos_recogidos", { p_match_id: matchId });
      if (error) throw error;
      await cargarDatos();
    } catch (err: unknown) {
      showCustomAlert(`Error al marcar la recogida: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setMarcandoRecogido(null);
    }
  };

  const openGasolinaModal = (t: Ticket) => {
    if (!transporteFicha) return;
    setGasForm({
      nombre: "",
      apellido: "",
      cedula: "",
      telefono: "",
      banco: "0102",
      litros: "",
      marca: transporteFicha.nombre,
    });
    setGasError("");
    setGasTicket(t);
  };

  const submitGasolina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gasTicket || !transporteFicha) return;
    setGasError("");
    setGasLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión expirada. Vuelva a iniciar sesión.");

      const res = await fetch("/api/combustible/solicitar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticketId: gasTicket.id,
          ...gasForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar solicitud.");

      setGasTicket(null);
      await showCustomAlert(
        data.requiereAutorizacion
          ? "Solicitud registrada. Supera el límite de litros y requiere autorización del administrador antes del pago."
          : "Solicitud enviada al administrador. Recibirá el pago en la gasolinera una vez aprobada."
      );
      cargarDatos();
    } catch (err: any) {
      setGasError(err.message);
    } finally {
      setGasLoading(false);
    }
  };

  const handleCambiarEstado = async (ticketId: string, nuevoEstado: string) => {
    if (nuevoEstado === "rechazado") {
      setRechazoTicketId(ticketId);
      setRechazoNota("");
      return;
    }

    const confirmMsg = `¿Cambiar el estado del viaje a ${nuevoEstado.toUpperCase()}?`;
    if (!(await showCustomConfirm(confirmMsg))) return;

    const match = matchByTicket.get(ticketId);
    if (nuevoEstado === "aceptado" && match?.estado === "reclamado") {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/match-acopio/responder", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ match_id: match.id, aceptar: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await supabase.rpc("actualizar_disponibilidad_transporte", { p_en_standby: false });
        showCustomAlert("Viaje confirmado correctamente.");
        cargarDatos();
      } catch (err: unknown) {
        showCustomAlert(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
      }
      return;
    }

    try {
      const { error } = await supabase.rpc("actualizar_estado_ticket", {
        p_id: ticketId,
        p_estado: nuevoEstado,
      });

      if (error) throw error;

      if (nuevoEstado === "aceptado") {
        await supabase.rpc("actualizar_disponibilidad_transporte", { p_en_standby: false });
      }

      showCustomAlert("Estado actualizado correctamente.");
      cargarDatos();
    } catch (err: unknown) {
      showCustomAlert(`Error al actualizar estado: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  };

  const submitRechazo = async () => {
    if (!rechazoTicketId || rechazoNota.trim().length < 5) return;
    setRechazoLoading(true);
    try {
      const match = matchByTicket.get(rechazoTicketId);
      if (match?.estado === "reclamado") {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/match-acopio/responder", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ match_id: match.id, aceptar: false, nota: rechazoNota.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const { error } = await supabase.rpc("actualizar_estado_ticket", {
          p_id: rechazoTicketId,
          p_estado: "rechazado",
          p_nota: rechazoNota.trim(),
        });
        if (error) throw error;
      }
      setRechazoTicketId(null);
      setRechazoNota("");
      showCustomAlert("Rechazo registrado. El administrador fue notificado.");
      cargarDatos();
    } catch (err: unknown) {
      showCustomAlert(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setRechazoLoading(false);
    }
  };

  const iniciarViaje = async (ticketId: string) => {
    if (!(await showCustomConfirm("¿Confirma que va en camino hacia el punto de entrega?"))) return;

    try {
      const { error } = await supabase.rpc("actualizar_estado_ticket", {
        p_id: ticketId,
        p_estado: "en_camino",
      });
      if (error) throw error;
      await cargarDatos();
      setFotoRecordatorioOpen(true);
    } catch (err: any) {
      showCustomAlert(`Error al iniciar viaje: ${err.message}`);
    }
  };

  const openEntregaModal = (t: Ticket) => {
    setEntregaTicket(t);
    setEntregaFile(null);
    setEntregaPreview(null);
    setEntregaError("");
  };

  const handleEntregaFile = (file: File | null) => {
    if (!file) {
      setEntregaFile(null);
      setEntregaPreview(null);
      return;
    }
    const err = validateImageFile(file);
    if (err) {
      setEntregaError(err);
      return;
    }
    setEntregaError("");
    setEntregaFile(file);
    setEntregaPreview(URL.createObjectURL(file));
  };

  const submitEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregaTicket || !entregaFile) {
      setEntregaError("Debe adjuntar una foto de la entrega realizada.");
      return;
    }

    setEntregaLoading(true);
    setEntregaError("");

    try {
      const url = await uploadEntregaImage(entregaTicket.id, entregaFile);
      const { error } = await supabase.rpc("actualizar_estado_ticket", {
        p_id: entregaTicket.id,
        p_estado: "completado",
        p_evidencia_url: url,
      });
      if (error) throw error;

      await supabase.rpc("actualizar_disponibilidad_transporte", { p_en_standby: true });

      setEntregaTicket(null);
      setEntregaFile(null);
      setEntregaPreview(null);
      await showCustomAlert("Entrega registrada con éxito. ¡Gracias por su trabajo!");
      cargarDatos();
    } catch (err: any) {
      setEntregaError(err.message || "Error al registrar entrega.");
    } finally {
      setEntregaLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.center}><div style={styles.spinner}></div></div>;
  }

  if (!transporteFicha) {
    return (
      <div style={styles.emptyContainer}>
        <AlertTriangle size={48} color="var(--warning)" />
        <h3>Ficha de Transporte no encontrada</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Su usuario no está asociado a ningún vehículo activo. Solicite al administrador configurar su ficha de transporte.
        </p>
      </div>
    );
  }

  const activos = tickets.filter(t => t.estado !== "completado");
  const completados = tickets.filter(t => t.estado === "completado");

  return (
    <div style={styles.page} className="ops-page">
      <div style={styles.header} className="ops-page-header">
        <div>
          <h2 style={styles.title} className="ops-page-title">Mis Viajes Asignados</h2>
          <p style={styles.subtitle} className="ops-page-subtitle">
            Vehículo: <strong>{transporteFicha.nombre}</strong> | Tipo: {transporteFicha.tipo.toUpperCase()}
            {" · "}
            <span style={{ color: transporteFicha.en_standby ? "var(--success)" : "var(--warning)", fontWeight: 700 }}>
              {transporteFicha.en_standby ? "Disponible para traslados" : "Inactivo en despacho"}
            </span>
          </p>
        </div>
      </div>

      {/* Viajes Activos */}
      <h3 style={styles.sectionTitle}>Viajes en Curso / Pendientes</h3>
      {activos.length === 0 ? (
        <div style={styles.emptyCard}>
          <CheckCircle size={32} color="var(--success)" />
          <p style={{ margin: 0, fontWeight: 600 }}>Sin entregas pendientes. ¡Buen trabajo!</p>
        </div>
      ) : (
        <div style={styles.list}>
          {activos.map(t => {
            const mapUrl = buildViajeMapUrl(t);
            const match = matchByTicket.get(t.id);

            return (
              <div key={t.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={t.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                    Prioridad {t.prioridad.toUpperCase()}
                  </span>
                  <span style={styles.badgeEstado}>{t.estado.toUpperCase()}</span>
                </div>

                <div style={styles.cardBody}>
                  <ViajeTransportistaDetalle
                    ticket={t}
                    match={match ?? null}
                    showContactHint={t.estado === "asignado" && match?.estado === "reclamado"}
                  />

                  {match && t.estado !== "completado" && (
                    <RutaTrasladoAcopio
                      ticket={t}
                      match={match}
                      coords={coords}
                      onRecogido={marcarRecogido}
                      marcando={marcandoRecogido === match.id}
                    />
                  )}

                  {t.estado === "en_camino" && (
                    <div style={styles.fotoBanner}>
                      <Camera size={18} />
                      <span>Al entregar, tome una <strong>foto del insumo entregado</strong> como comprobante.</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={styles.cardActions} className="ops-card-actions">
                  {mapUrl && (
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={styles.btnNav}>
                      <Compass size={16} />
                      <span>Cómo Llegar (GPS)</span>
                    </a>
                  )}

                  {t.estado === "asignado" && (
                    <>
                      <button style={styles.btnDanger} onClick={() => handleCambiarEstado(t.id, "rechazado")}>
                        <RotateCcw size={16} />
                        <span>Rechazar</span>
                      </button>
                      <button style={styles.btnPrimary} onClick={() => handleCambiarEstado(t.id, "aceptado")}>
                        <CheckCircle size={16} />
                        <span>Aceptar Viaje</span>
                      </button>
                    </>
                  )}

                  {t.estado === "aceptado" && (
                    <button style={styles.btnSuccess} onClick={() => iniciarViaje(t.id)}>
                      <Play size={16} />
                      <span>Iniciar Viaje (En camino)</span>
                    </button>
                  )}

                  {(t.estado === "aceptado" || t.estado === "en_camino") && (
                    solicitudesPendientes.has(t.id) ? (
                      <span style={styles.btnGasPending}>⛽ Solicitud pendiente de aprobación</span>
                    ) : (
                      <button style={styles.btnGas} onClick={() => openGasolinaModal(t)}>
                        <Fuel size={16} />
                        <span>Solicitar Combustible</span>
                      </button>
                    )
                  )}

                  {t.estado === "en_camino" && (
                    <button style={styles.btnSuccess} onClick={() => openEntregaModal(t)}>
                      <CheckCircle size={16} />
                      <span>Marcar Entregado</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historial completados */}
      <h3 style={{ ...styles.sectionTitle, marginTop: "var(--s4)" }}>Entregas Realizadas</h3>
      {completados.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>No has completado entregas recientemente.</p>
      ) : (
        <div style={styles.tableWrapper} className="ops-table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Detalle de Entrega</th>
                <th style={styles.th}>Ubicación</th>
                <th style={styles.th}>Evidencia</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {completados.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(c.updated_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <ViajeTransportistaResumen ticket={c} />
                  </td>
                  <td style={styles.td}>
                    {c.destino_ref || c.ubicacion_externa || c.origen_ref || "En mapa"}
                  </td>
                  <td style={styles.td}>
                    {c.evidencia_entrega_url ? (
                      <a href={c.evidencia_entrega_url} target="_blank" rel="noopener noreferrer" style={styles.evidenciaLink}>
                        📷 Ver foto
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}><span style={styles.completedTag}>Entregado</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal grande: recordatorio de foto al ir en camino */}
      {fotoRecordatorioOpen && (
        <div style={styles.fotoAlertOverlay}>
          <div style={styles.fotoAlertModal}>
            <div style={styles.fotoAlertIconWrap}>
              <Camera size={48} strokeWidth={1.5} />
            </div>
            <h2 style={styles.fotoAlertTitle}>¡Importante!</h2>
            <p style={styles.fotoAlertText}>
              Cuando realice la entrega del insumo, <strong>debe tomar una fotografía</strong> en el momento como comprobante.
            </p>
            <p style={styles.fotoAlertSub}>
              Al marcar como entregado, el sistema le pedirá cargar esa foto. Sin ella no podrá cerrar el viaje.
            </p>
            <button type="button" style={styles.fotoAlertBtn} onClick={() => setFotoRecordatorioOpen(false)}>
              Entendido, tomaré la foto
            </button>
          </div>
        </div>
      )}

      {/* Modal evidencia de entrega */}
      {entregaTicket && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "440px", width: "95%" }} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>📦 Confirmar entrega</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEntregaTicket(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitEntrega}>
              <div style={styles.modalBody}>
                <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Suba una foto que demuestre que el insumo fue entregado en destino.
                </p>
                <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 600 }}>
                  {entregaTicket.descripcion?.slice(0, 100)}
                  {(entregaTicket.descripcion?.length || 0) > 100 ? "…" : ""}
                </p>

                {entregaError && (
                  <p style={{ color: "var(--emergency)", fontSize: "13px", margin: "0 0 12px" }}>{entregaError}</p>
                )}

                <input
                  ref={entregaFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => handleEntregaFile(e.target.files?.[0] || null)}
                />

                {entregaPreview ? (
                  <div style={styles.previewWrap}>
                    <img src={entregaPreview} alt="Vista previa entrega" style={styles.previewImg} />
                    <button
                      type="button"
                      style={styles.previewChangeBtn}
                      onClick={() => entregaFileRef.current?.click()}
                    >
                      Cambiar foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    style={styles.uploadZone}
                    onClick={() => entregaFileRef.current?.click()}
                  >
                    <ImagePlus size={36} color="var(--brand)" />
                    <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--brand)" }}>
                      Tomar o seleccionar foto
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      JPG, PNG · máx. 5 MB
                    </span>
                  </button>
                )}
              </div>
              <div style={styles.modalActions} className="ops-modal-actions">
                <button type="button" style={styles.btnSecondary} onClick={() => setEntregaTicket(null)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btnPrimary, opacity: entregaFile ? 1 : 0.5 }}
                  disabled={entregaLoading || !entregaFile}
                >
                  {entregaLoading ? "Subiendo…" : "Confirmar entrega"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal combustible — datos de la gasolinera */}
      {gasTicket && transporteFicha && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "480px", width: "95%" }} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>⛽ Solicitar Combustible</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setGasTicket(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitGasolina}>
              <div style={{ ...styles.modalBody, maxHeight: "65vh", overflowY: "auto" }}>
                <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--emergency)", background: "var(--emergency-soft)", padding: "10px", borderRadius: "var(--radius-sm)" }}>
                  Ingrese el <strong>Pago Móvil de la gasolinera</strong>, no sus datos personales. El pago se enviará directamente a la estación de servicio.
                </p>

                {gasError && (
                  <p style={{ color: "var(--emergency)", fontSize: "13px", margin: "0 0 12px" }}>{gasError}</p>
                )}

                <div style={styles.formSection}>
                  <p style={styles.formSectionTitle}>Datos Pago Móvil — Gasolinera</p>
                  <div style={styles.formRow} className="ops-form-row">
                    <div style={styles.formField}>
                      <label style={styles.label}>Nombre titular</label>
                      <input style={styles.input} value={gasForm.nombre} onChange={(e) => setGasForm({ ...gasForm, nombre: e.target.value })} required />
                    </div>
                    <div style={styles.formField}>
                      <label style={styles.label}>Apellido titular</label>
                      <input style={styles.input} value={gasForm.apellido} onChange={(e) => setGasForm({ ...gasForm, apellido: e.target.value })} required />
                    </div>
                  </div>
                  <div style={styles.formRow} className="ops-form-row">
                    <div style={styles.formField}>
                      <label style={styles.label}>Cédula titular cuenta</label>
                      <input style={styles.input} value={gasForm.cedula} onChange={(e) => setGasForm({ ...gasForm, cedula: e.target.value })} placeholder="V-12345678" required />
                    </div>
                    <div style={styles.formField}>
                      <label style={styles.label}>Teléfono Pago Móvil</label>
                      <input style={styles.input} value={gasForm.telefono} onChange={(e) => setGasForm({ ...gasForm, telefono: e.target.value })} placeholder="0414-0000000" required />
                    </div>
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.label}>Banco</label>
                    <select style={styles.input} value={gasForm.banco} onChange={(e) => setGasForm({ ...gasForm, banco: e.target.value })} required>
                      {BANCOS_PAGO_MOVIL.map((b) => (
                        <option key={b.code} value={b.code}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formSection}>
                  <p style={styles.formSectionTitle}>Su vehículo (referencia)</p>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    {transporteFicha.nombre} · Placa {transporteFicha.placa || "S/D"} · {transporteFicha.modelo || "—"} · {tipoVehiculoDesdeTransporte(transporteFicha).toUpperCase()}
                  </p>
                </div>

                <div style={styles.formField}>
                  <label style={styles.label}>Litros a cargar</label>
                  <input type="number" style={styles.input} min="1" step="0.1" value={gasForm.litros} onChange={(e) => setGasForm({ ...gasForm, litros: e.target.value })} required />
                  {gasForm.litros && !isNaN(parseFloat(gasForm.litros)) && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                      Costo estimado: <strong>${costoEstimadoUSD(parseFloat(gasForm.litros)).toFixed(2)} USD</strong>
                    </p>
                  )}
                </div>
              </div>
              <div style={styles.modalActions} className="ops-modal-actions">
                <button type="button" style={styles.btnSecondary} onClick={() => setGasTicket(null)}>Cancelar</button>
                <button type="submit" style={styles.btnPrimary} disabled={gasLoading}>
                  {gasLoading ? "Enviando…" : "Enviar al Administrador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rechazoTicketId && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "420px", width: "95%" }} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Motivo del rechazo</h3>
              <button type="button" style={styles.closeBtn} onClick={() => { setRechazoTicketId(null); setRechazoNota(""); }}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
                Indique por qué no puede realizar este viaje. El administrador recibirá una notificación.
              </p>
              <textarea
                value={rechazoNota}
                onChange={(e) => setRechazoNota(e.target.value)}
                placeholder="Ej: El acopio no tiene stock disponible…"
                rows={4}
                style={{ ...styles.input, width: "100%", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => { setRechazoTicketId(null); setRechazoNota(""); }}>
                Cancelar
              </button>
              <button
                type="button"
                style={styles.btnDanger}
                disabled={rechazoNota.trim().length < 5 || rechazoLoading}
                onClick={submitRechazo}
              >
                {rechazoLoading ? "Enviando…" : "Enviar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    gap: "var(--s3)",
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
  sectionTitle: {
    margin: "12px 0 6px 0",
    fontSize: "var(--text-md)",
    fontWeight: 700,
    color: "var(--text)",
  },
  emptyCard: {
    background: "var(--success-soft)",
    border: "1px solid rgba(13,148,136,.1)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    display: "flex",
    alignItems: "center",
    gap: "var(--s3)",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  badgeEstado: {
    background: "var(--brand-soft)",
    color: "var(--brand)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-pill)",
    textTransform: "uppercase",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  desc: {
    margin: 0,
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--text)",
    lineHeight: 1.4,
  },
  quantity: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text)",
  },
  metaCol: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "var(--surface-2)",
    padding: "10px",
    borderRadius: "var(--radius-sm)",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    fontSize: "12px",
    color: "var(--text)",
  },
  acopioBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px",
    borderRadius: "var(--radius-sm)",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    fontSize: "12px",
  },
  contactHint: {
    margin: "4px 0 0",
    fontSize: "11px",
    color: "#15803d",
    fontWeight: 600,
    fontStyle: "italic",
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
  },
  btnNav: {
    background: "var(--brand-soft)",
    color: "var(--brand)",
    border: "1px solid rgba(15,76,129,.1)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    textDecoration: "none",
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
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnSuccess: {
    background: "var(--success)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnDanger: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    border: "1px solid rgba(225,29,72,.1)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnGas: {
    background: "var(--brand-soft)",
    color: "var(--brand)",
    border: "1px solid rgba(15,76,129,.15)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnGasPending: {
    background: "var(--warning-soft)",
    color: "var(--warning)",
    border: "1px solid rgba(217,119,6,.2)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
  },
  formSection: {
    background: "var(--surface-2)",
    padding: "12px",
    borderRadius: "var(--radius-sm)",
    marginBottom: "12px",
  },
  formSectionTitle: {
    margin: "0 0 10px",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
  },
  formRow: {
    gap: "10px",
    marginBottom: "10px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "10px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  input: {
    padding: "8px 10px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "14px",
    background: "var(--surface)",
  },
  tableWrapper: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow-sm)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-muted)",
  },
  tr: {
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "10px 8px",
  },
  completedTag: {
    background: "var(--success-soft)",
    color: "var(--success)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 800,
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
    padding: "40px var(--s4)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "16px",
  },
  modal: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
    boxShadow: "var(--shadow-lg)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s2)",
  },
  modalBody: {
    padding: "var(--s1) 0",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--s2)",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  btnSecondary: {
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
  },
  fotoBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "var(--warning-soft)",
    border: "1px solid rgba(217,119,6,.25)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    fontSize: "12px",
    color: "var(--text)",
    lineHeight: 1.4,
  },
  fotoAlertOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20000,
    padding: "20px",
  },
  fotoAlertModal: {
    background: "var(--surface)",
    borderRadius: "var(--radius)",
    padding: "32px 28px",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
    border: "2px solid var(--warning)",
  },
  fotoAlertIconWrap: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    background: "var(--warning-soft)",
    color: "var(--warning)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  fotoAlertTitle: {
    margin: "0 0 12px",
    fontSize: "24px",
    fontWeight: 900,
    color: "var(--text)",
  },
  fotoAlertText: {
    margin: "0 0 12px",
    fontSize: "16px",
    lineHeight: 1.55,
    color: "var(--text)",
  },
  fotoAlertSub: {
    margin: "0 0 24px",
    fontSize: "13px",
    color: "var(--text-muted)",
    lineHeight: 1.45,
  },
  fotoAlertBtn: {
    width: "100%",
    padding: "14px 20px",
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
  },
  uploadZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    minHeight: "180px",
    border: "2px dashed var(--brand)",
    borderRadius: "var(--radius)",
    background: "var(--brand-soft)",
    cursor: "pointer",
    padding: "24px",
  },
  previewWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "center",
  },
  previewImg: {
    width: "100%",
    maxHeight: "240px",
    objectFit: "contain",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  previewChangeBtn: {
    background: "none",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    color: "var(--text)",
  },
  evidenciaLink: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--brand)",
    textDecoration: "none",
  },
};
