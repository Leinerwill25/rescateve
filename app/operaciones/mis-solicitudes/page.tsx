"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, PersonalMedico } from "@/lib/types-operations";
import { useOperationsAuth } from "../AuthContext";
import { 
  Stethoscope, 
  MapPin, 
  Phone, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Clock,
  X
} from "lucide-react";

export default function MisSolicitudesPage() {
  const { perfil } = useOperationsAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [medicoFicha, setMedicoFicha] = useState<PersonalMedico | null>(null);
  const [loading, setLoading] = useState(true);

  // Checkbox de seguridad por ticket ID
  const [seguridadConfirmada, setSeguridadConfirmada] = useState<Record<string, boolean>>({});

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
      // 1. Obtener la ficha del médico asociado
      const { data: medData } = await supabase
        .from("personal_medico")
        .select("*")
        .eq("perfil_id", perfil.id)
        .maybeSingle();

      if (medData) {
        setMedicoFicha(medData as PersonalMedico);

        // 2. Obtener solicitudes asignadas
        // RLS garantiza que solo lea las autorizadas
        const { data: ticketsData, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("medico_id", medData.id)
          .in("estado", ["asignado", "aceptado", "en_camino", "completado"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTickets((ticketsData || []) as Ticket[]);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes médicas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const ch = supabase
      .channel("mis_solicitudes_medicas")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        cargarDatos();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [perfil]);

  const handleCambiarEstado = async (ticketId: string, nuevoEstado: string) => {
    if (nuevoEstado === "aceptado" && !seguridadConfirmada[ticketId]) {
      showCustomAlert("Debe confirmar que el punto es seguro antes de aceptar la solicitud.");
      return;
    }

    const confirmMsg = nuevoEstado === "rechazado"
      ? "¿Está seguro de rechazar esta solicitud médica? Volverá a la cola del administrador."
      : `¿Confirmar disponibilidad para este caso?`;

    if (!(await showCustomConfirm(confirmMsg))) return;

    try {
      const { error } = await supabase.rpc("actualizar_estado_ticket", {
        p_id: ticketId,
        p_estado: nuevoEstado
      });

      if (error) throw error;
      showCustomAlert("Estado actualizado correctamente.");
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al actualizar estado: ${err.message}`);
    }
  };

  const handleToggleSeguridad = (ticketId: string) => {
    setSeguridadConfirmada(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  if (loading) {
    return <div style={styles.center}><div style={styles.spinner}></div></div>;
  }

  if (!medicoFicha) {
    return (
      <div style={styles.emptyContainer}>
        <AlertTriangle size={48} color="var(--warning)" />
        <h3>Ficha Médica no encontrada</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Su usuario no está asociado a ninguna ficha en el roster de SafeCare. Solicite al administrador configurar su registro de personal médico.
        </p>
      </div>
    );
  }

  const activas = tickets.filter(t => t.estado !== "completado");
  const completadas = tickets.filter(t => t.estado === "completado");

  return (
    <div style={styles.page} className="ops-page">
      <div style={styles.header} className="ops-page-header">
        <div>
          <h2 style={styles.title} className="ops-page-title">Consola de Atención Médica</h2>
          <p style={styles.subtitle} className="ops-page-subtitle">
            Médico: <strong>{medicoFicha.nombre}</strong> | Especialidad: {medicoFicha.especialidad || "General"} | Roster: {medicoFicha.verificado ? "✅ Verificado SafeCare" : "❌ Pendiente Validación"}
          </p>
        </div>
      </div>

      {/* Solicitudes Médicas Activas */}
      <h3 style={styles.sectionTitle}>Solicitudes Activas de Emergencia</h3>
      {activas.length === 0 ? (
        <div style={styles.emptyCard}>
          <CheckCircle size={32} color="var(--success)" />
          <p style={{ margin: 0, fontWeight: 600 }}>Sin emergencias asignadas en este momento.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {activas.map(t => (
            <div key={t.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={t.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                  Prioridad {t.prioridad.toUpperCase()}
                </span>
                <span style={styles.badgeEstado}>{t.estado.toUpperCase()}</span>
              </div>

              <div style={styles.cardBody}>
                <h4 style={styles.desc}>{t.descripcion}</h4>
                {t.cantidad && <p style={styles.quantity}><strong>Insumos Clínicos requeridos:</strong> {t.cantidad}</p>}

                <div style={styles.metaCol}>
                  <div style={styles.metaItem}>
                    <MapPin size={16} color="var(--emergency)" />
                    <span><strong>Ubicación de Atención (Destino):</strong> {t.origen_ref || "En coordenadas mapa"}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <Phone size={16} />
                    <span><strong>Contacto Familiar/Solicitante:</strong> {t.contacto_solicitante || "No provisto"}</span>
                  </div>
                </div>

                {/* Compuerta de Seguridad (Solo si no ha sido aceptado aún) */}
                {t.estado === "asignado" && (
                  <div style={styles.seguridadBox}>
                    <ShieldCheck size={20} color={seguridadConfirmada[t.id] ? "var(--success)" : "var(--text-muted)"} />
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={seguridadConfirmada[t.id] || false}
                        onChange={() => handleToggleSeguridad(t.id)}
                        style={styles.checkbox}
                      />
                      <span>
                        <strong>Compuerta de Seguridad:</strong> Confirmo que el punto de encuentro es seguro para acudir / está coordinado con rescate.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div style={styles.cardActions} className="ops-card-actions">
                {t.estado === "asignado" && (
                  <>
                    <button style={styles.btnDanger} onClick={() => handleCambiarEstado(t.id, "rechazado")}>
                      <RotateCcw size={16} />
                      <span>Rechazar</span>
                    </button>
                    <button
                      disabled={!seguridadConfirmada[t.id]}
                      style={seguridadConfirmada[t.id] ? styles.btnSuccess : { ...styles.btnSuccess, ...styles.disabledBtn }}
                      onClick={() => handleCambiarEstado(t.id, "aceptado")}
                    >
                      <CheckCircle size={16} />
                      <span>Aceptar y Confirmar Disponibilidad</span>
                    </button>
                  </>
                )}

                {t.estado === "aceptado" && (
                  <button style={styles.btnSuccess} onClick={() => handleCambiarEstado(t.id, "en_camino")}>
                    <span>Marcar en Ruta al Punto</span>
                  </button>
                )}

                {t.estado === "en_camino" && (
                  <button style={styles.btnSuccess} onClick={() => handleCambiarEstado(t.id, "completado")}>
                    <CheckCircle size={16} />
                    <span>Completar Atención Médica</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial de pacientes atendidos */}
      <h3 style={{ ...styles.sectionTitle, marginTop: "var(--s4)" }}>Pacientes Atendidos</h3>
      {completadas.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>No hay registros de atenciones médicas previas.</p>
      ) : (
        <div style={styles.tableWrapper} className="ops-table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Emergencia Clínica</th>
                <th style={styles.th}>Ubicación</th>
                <th style={styles.th}>Familiar de Contacto</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {completadas.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(c.updated_at).toLocaleDateString()}</td>
                  <td style={styles.td}><strong>{c.descripcion}</strong></td>
                  <td style={styles.td}>{c.origen_ref || "Mapa"}</td>
                  <td style={styles.td}>{c.contacto_solicitante || "N/A"}</td>
                  <td style={styles.td}><span style={styles.completedTag}>Atendido</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
    background: "var(--brand-soft)",
    border: "1px solid rgba(15,76,129,.1)",
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
  seguridadBox: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    background: "var(--warning-soft)",
    border: "1px solid rgba(217,119,6,.1)",
    padding: "12px",
    borderRadius: "var(--radius-sm)",
    marginTop: "4px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "start",
    gap: "8px",
    fontSize: "12px",
    cursor: "pointer",
    lineHeight: 1.4,
  },
  checkbox: {
    marginTop: "2px",
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
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
  disabledBtn: {
    background: "var(--text-muted)",
    cursor: "not-allowed",
    opacity: 0.6,
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
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
  }
};
