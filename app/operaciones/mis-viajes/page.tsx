"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, Transporte } from "@/lib/types-operations";
import { useOperationsAuth } from "../layout";
import { 
  Truck, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle, 
  AlertTriangle,
  Play,
  RotateCcw,
  Compass
} from "lucide-react";

export default function MisViajesPage() {
  const { perfil } = useOperationsAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transporteFicha, setTransporteFicha] = useState<Transporte | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleCambiarEstado = async (ticketId: string, nuevoEstado: string) => {
    const confirmMsg = nuevoEstado === "rechazado" 
      ? "¿Está seguro de rechazar este viaje? Se devolverá a la cola del administrador."
      : `¿Cambiar el estado del viaje a ${nuevoEstado.toUpperCase()}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.rpc("actualizar_estado_ticket", {
        p_id: ticketId,
        p_estado: nuevoEstado
      });

      if (error) throw error;
      alert("Estado actualizado correctamente.");
      cargarDatos();
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
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
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Mis Viajes Asignados</h2>
          <p style={styles.subtitle}>Vehículo: <strong>{transporteFicha.nombre}</strong> | Tipo: {transporteFicha.tipo.toUpperCase()}</p>
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
            const mapUrl = t.origen_lat && t.origen_lng
              ? `https://www.google.com/maps/dir/?api=1&origin=${t.origen_lat},${t.origen_lng}&destination=${t.destino_lat || t.origen_lat},${t.destino_lng || t.origen_lng}`
              : null;

            return (
              <div key={t.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={t.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                    Prioridad {t.prioridad.toUpperCase()}
                  </span>
                  <span style={styles.badgeEstado}>{t.estado.toUpperCase()}</span>
                </div>

                <div style={styles.cardBody}>
                  <h4 style={styles.desc}>{t.descripcion}</h4>
                  {t.cantidad && <p style={styles.quantity}><strong>Carga:</strong> {t.cantidad}</p>}

                  <div style={styles.metaCol}>
                    <div style={styles.metaItem}>
                      <MapPin size={16} color="var(--brand)" />
                      <span><strong>Punto Recogida (Origen):</strong> {t.origen_ref || "Coordenadas"}</span>
                    </div>
                    {t.destino_ref && (
                      <div style={styles.metaItem}>
                        <Navigation size={16} color="var(--success)" />
                        <span><strong>Punto Entrega (Destino):</strong> {t.destino_ref}</span>
                      </div>
                    )}
                    <div style={styles.metaItem}>
                      <Phone size={16} />
                      <span><strong>Contacto:</strong> {t.contacto_solicitante || "No registrado"}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div style={styles.cardActions}>
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
                    <button style={styles.btnSuccess} onClick={() => handleCambiarEstado(t.id, "en_camino")}>
                      <Play size={16} />
                      <span>Iniciar Viaje (En camino)</span>
                    </button>
                  )}

                  {t.estado === "en_camino" && (
                    <button style={styles.btnSuccess} onClick={() => handleCambiarEstado(t.id, "completado")}>
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
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Detalle de Entrega</th>
                <th style={styles.th}>Ubicación</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {completados.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(c.updated_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <strong>{c.descripcion}</strong>
                    {c.cantidad && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Carga: {c.cantidad}</div>}
                  </td>
                  <td style={styles.td}>{c.origen_ref || "En mapa"}</td>
                  <td style={styles.td}><span style={styles.completedTag}>Entregado</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
  }
};
