"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SolicitudGasolina } from "@/lib/types";
import { BANCOS_PAGO_MOVIL, costoEstimadoUSD, esPagoPropioConductor } from "@/lib/combustible-utils";
import type { Transporte } from "@/lib/types-operations";
import {
  Fuel,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Truck,
  Globe,
  Phone,
  CreditCard,
  User,
  Calendar,
  Banknote,
  ShieldCheck,
  ShieldAlert,
  X,
  Car,
} from "lucide-react";

type SolicitudEnriquecida = SolicitudGasolina & {
  transporte?: Transporte | null;
  ticketDesc?: string | null;
};

type ModalState = {
  type: "autorizar" | "rechazar" | "pagar" | "resultado";
  solicitud: SolicitudEnriquecida;
  mensaje?: string;
  error?: boolean;
} | null;

const ESTADO: Record<string, { text: string; bg: string; color: string; border: string }> = {
  pendiente: { text: "Pendiente revisión", bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  pendiente_autorizacion: { text: "Excede límite de litros", bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" },
  suministrado: { text: "Pagado", bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  rechazado: { text: "Rechazado", bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const TIPO_VEHICULO: Record<string, string> = {
  moto: "Moto",
  carro: "Carro",
  autobus: "Autobús",
};

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

function labelBanco(code: string | null | undefined) {
  if (!code) return null;
  return BANCOS_PAGO_MOVIL.find((b) => b.code === code)?.label || code;
}

function InfoRow({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoIcon}>{icon}</span>
      <div style={styles.infoContent}>
        <span style={styles.infoLabel}>{label}</span>
        <span style={{ ...styles.infoValue, color: warn ? "var(--emergency)" : "var(--text)" }}>{value}</span>
      </div>
    </div>
  );
}

function origenBadgeStyle(esTransportista: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "var(--radius-pill)",
    background: esTransportista ? "rgba(59,130,246,0.1)" : "rgba(107,114,128,0.1)",
    color: esTransportista ? "#2563EB" : "#6B7280",
  };
}

export default function CombustibleAdminPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEnriquecida[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendientes" | "todas">("pendientes");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: todasPend }, { data: raw, error }] = await Promise.all([
        supabase
          .from("solicitudes_gasolina")
          .select("id")
          .in("estado", ["pendiente", "pendiente_autorizacion"]),
        (() => {
          let q = supabase.from("solicitudes_gasolina").select("*").order("created_at", { ascending: false });
          if (filtro === "pendientes") q = q.in("estado", ["pendiente", "pendiente_autorizacion"]);
          return q;
        })(),
      ]);

      if (error) throw error;
      setTotalPendientes(todasPend?.length || 0);

      const rows = (raw || []) as SolicitudGasolina[];
      const transporteIds = [...new Set(rows.map((r) => r.transporte_id).filter(Boolean))] as string[];
      const ticketIds = [...new Set(rows.map((r) => r.ticket_id).filter(Boolean))] as string[];

      const [trRes, tkRes] = await Promise.all([
        transporteIds.length
          ? supabase.from("transportes").select("*").in("id", transporteIds)
          : Promise.resolve({ data: [] }),
        ticketIds.length
          ? supabase.from("tickets").select("id, descripcion").in("id", ticketIds)
          : Promise.resolve({ data: [] }),
      ]);

      const trMap = new Map((trRes.data || []).map((t) => [t.id, t as Transporte]));
      const tkMap = new Map((tkRes.data || []).map((t) => [t.id, t.descripcion]));

      setSolicitudes(
        rows.map((s) => ({
          ...s,
          transporte: s.transporte_id ? trMap.get(s.transporte_id) || null : null,
          ticketDesc: s.ticket_id ? tkMap.get(s.ticket_id) || null : null,
        }))
      );
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel("admin_combustible")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_gasolina" }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cargar]);

  const stats = useMemo(() => {
    const pend = solicitudes.filter((s) => s.estado === "pendiente" || s.estado === "pendiente_autorizacion");
    const usd = pend.reduce((acc, s) => acc + costoEstimadoUSD(Number(s.litros)), 0);
    const transportistas = pend.filter((s) => s.origen === "transportista").length;
    return { usd, transportistas, publico: pend.length - transportistas };
  }, [solicitudes]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const ejecutarAutorizar = async (id: string) => {
    setProcesando(id);
    try {
      const { error } = await supabase.from("solicitudes_gasolina").update({ estado: "pendiente" }).eq("id", id);
      if (error) throw error;
      setModal({ type: "resultado", solicitud: solicitudes.find((s) => s.id === id)!, mensaje: "Límite autorizado. Ya puede procesar el pago.", error: false });
      cargar();
    } catch (err: any) {
      setModal({ type: "resultado", solicitud: solicitudes.find((s) => s.id === id)!, mensaje: err.message, error: true });
    } finally {
      setProcesando(null);
    }
  };

  const ejecutarRechazar = async (id: string) => {
    setProcesando(id);
    try {
      const { error } = await supabase.from("solicitudes_gasolina").update({ estado: "rechazado" }).eq("id", id);
      if (error) throw error;
      setModal(null);
      cargar();
    } catch (err: any) {
      setModal({ type: "resultado", solicitud: solicitudes.find((s) => s.id === id)!, mensaje: err.message, error: true });
    } finally {
      setProcesando(null);
    }
  };

  const ejecutarPagar = async (id: string) => {
    setProcesando(id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sesión expirada. Vuelva a iniciar sesión.");

      const res = await fetch("/api/combustible/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ solicitudId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar pago.");

      setModal({ type: "resultado", solicitud: solicitudes.find((s) => s.id === id)!, mensaje: "Pago enviado a la gasolinera vía Muney.", error: false });
      cargar();
    } catch (err: any) {
      setModal({ type: "resultado", solicitud: solicitudes.find((s) => s.id === id)!, mensaje: err.message, error: true });
      cargar();
    } finally {
      setProcesando(null);
    }
  };

  const validacionConductor = (s: SolicitudEnriquecida) => {
    if (!s.transporte) return { ok: true, texto: "Solicitud pública — sin ficha de conductor" };
    const bloqueo = esPagoPropioConductor(s.telefono, s.cedula, {
      telefonoTransporte: s.transporte.contacto,
      cedulaTransporte: s.transporte.cedula,
    });
    if (bloqueo.bloqueado) return { ok: false, texto: bloqueo.motivo || "Datos coinciden con el conductor" };
    return { ok: true, texto: "Datos de gasolinera verificados — no coinciden con el conductor" };
  };

  return (
    <div style={styles.page} className="ops-page">
      {/* Header */}
      <div style={styles.header} className="ops-page-header">
        <div style={styles.headerText}>
          <div style={styles.headerTitleRow}>
            <div style={styles.headerIcon}><Fuel size={22} /></div>
            <div>
              <h2 style={styles.title}>Combustible</h2>
              <p style={styles.subtitle}>
                Apruebe solicitudes y el pago se envía al Pago Móvil de la <strong>gasolinera</strong> vía Muney.
              </p>
            </div>
          </div>
        </div>
        <button type="button" style={styles.btnRefresh} onClick={cargar} disabled={loading}>
          <RefreshCw size={15} style={loading ? { animation: "spin 1s linear infinite" } : undefined} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow} className="ops-stats-row-auto">
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pendientes</span>
          <span style={styles.statValue}>{totalPendientes}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Monto en cola</span>
          <span style={{ ...styles.statValue, color: "var(--brand)" }}>${stats.usd.toFixed(2)}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Transportistas</span>
          <span style={styles.statValue}>{stats.transportistas}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Público</span>
          <span style={styles.statValue}>{stats.publico}</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filters}>
        <button type="button" style={filtro === "pendientes" ? styles.filterActive : styles.filterBtn} onClick={() => setFiltro("pendientes")}>
          Pendientes {totalPendientes > 0 && <span style={styles.filterBadge}>{totalPendientes}</span>}
        </button>
        <button type="button" style={filtro === "todas" ? styles.filterActive : styles.filterBtn} onClick={() => setFiltro("todas")}>
          Historial completo
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={styles.center}><div style={styles.spinner} /></div>
      ) : solicitudes.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}><Fuel size={32} /></div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Sin solicitudes {filtro === "pendientes" ? "pendientes" : ""}</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>
            {filtro === "pendientes"
              ? "Cuando un transportista solicite combustible, aparecerá aquí."
              : "Aún no hay historial de solicitudes."}
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {solicitudes.map((s) => {
            const est = ESTADO[s.estado] || ESTADO.pendiente;
            const banco = labelBanco(s.banco);
            const costo = costoEstimadoUSD(Number(s.litros));
            const val = validacionConductor(s);
            const puedePagar = s.estado === "pendiente" && !!banco && val.ok;
            const tipoLabel = TIPO_VEHICULO[s.tipo_vehiculo || ""] || "Vehículo";
            const esTransportista = s.origen === "transportista";

            return (
              <article key={s.id} style={{ ...styles.card, borderLeft: `4px solid ${est.border}` }}>
                {/* Cabecera */}
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderLeft}>
                    <div style={origenBadgeStyle(esTransportista)}>
                      {esTransportista ? <Truck size={12} /> : <Globe size={12} />}
                      {esTransportista ? "Transportista" : "Público"}
                    </div>
                    <span style={styles.cardId}>#{s.id.slice(0, 8)}</span>
                    <span style={styles.cardFecha}>
                      <Calendar size={11} />
                      {fmtFecha(s.created_at)} · {fmtHora(s.created_at)}
                    </span>
                  </div>
                  <span style={{ ...styles.badge, background: est.bg, color: est.color, border: `1px solid ${est.border}` }}>
                    {est.text}
                  </span>
                </div>

                {/* Resumen principal */}
                <div style={styles.summaryRow}>
                  <div style={styles.summaryMain}>
                    <span style={styles.litrosBig}>{s.litros} L</span>
                    <span style={styles.costoBig}>${costo.toFixed(2)} USD</span>
                    <span style={styles.tipoChip}>{tipoLabel}</span>
                  </div>
                  <div style={styles.vehiculoChip}>
                    <Car size={14} />
                    <span>{s.placa}</span>
                    <span style={{ color: "var(--text-muted)" }}>· {s.marca} {s.modelo}</span>
                  </div>
                </div>

                {/* Conductor (si aplica) */}
                {esTransportista && s.transporte && (
                  <div style={styles.conductorBox}>
                    <span style={styles.sectionLabel}><Truck size={13} /> Conductor / vehículo asignado</span>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>{s.transporte.nombre}</p>
                    {s.ticketDesc && (
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                        Viaje: {s.ticketDesc.length > 80 ? `${s.ticketDesc.slice(0, 80)}…` : s.ticketDesc}
                      </p>
                    )}
                  </div>
                )}

                {/* Pago gasolinera */}
                <div style={styles.pagoBox}>
                  <span style={styles.sectionLabel}><CreditCard size={13} /> Destino del pago — Gasolinera</span>
                  <div style={styles.infoGrid}>
                    <InfoRow icon={<User size={14} />} label="Titular Pago Móvil" value={`${s.nombre} ${s.apellido}`} />
                    <InfoRow icon={<User size={14} />} label="Cédula" value={s.cedula} />
                    <InfoRow icon={<Phone size={14} />} label="Teléfono PM" value={s.telefono} />
                    <InfoRow
                      icon={<Banknote size={14} />}
                      label="Banco"
                      value={banco || "⚠ No registrado — no se puede pagar"}
                      warn={!banco}
                    />
                  </div>
                </div>

                {/* Validación + motivo */}
                <div style={styles.footerMeta}>
                  <div style={{ ...styles.validBadge, background: val.ok ? "var(--success-soft)" : "var(--emergency-soft)", color: val.ok ? "var(--success)" : "var(--emergency)" }}>
                    {val.ok ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                    <span>{val.texto}</span>
                  </div>
                  {s.motivo && (
                    <p style={styles.motivo}><strong>Motivo:</strong> {s.motivo}</p>
                  )}
                </div>

                {s.payout_status && s.payout_status !== "pendiente" && (
                  <div style={{ ...styles.payoutBanner, color: s.payout_status === "exitoso" ? "var(--success)" : "var(--emergency)" }}>
                    Muney: {s.payout_status === "exitoso" ? "Pago transferido" : "Falló"}
                    {s.payout_error && ` — ${s.payout_error}`}
                  </div>
                )}

                {/* Acciones */}
                {(s.estado === "pendiente" || s.estado === "pendiente_autorizacion") && (
                  <div style={styles.actions}>
                    {s.estado === "pendiente_autorizacion" && (
                      <button type="button" style={styles.btnWarn} disabled={procesando === s.id} onClick={() => setModal({ type: "autorizar", solicitud: s })}>
                        <AlertTriangle size={14} />
                        Autorizar exceso de litros
                      </button>
                    )}
                    <button type="button" style={styles.btnReject} disabled={procesando === s.id} onClick={() => setModal({ type: "rechazar", solicitud: s })}>
                      <XCircle size={14} />
                      Rechazar
                    </button>
                    {s.estado === "pendiente" && (
                      <button
                        type="button"
                        style={{ ...styles.btnPay, opacity: puedePagar ? 1 : 0.5, cursor: puedePagar ? "pointer" : "not-allowed" }}
                        disabled={procesando === s.id || !puedePagar}
                        title={!banco ? "Falta banco" : !val.ok ? val.texto : undefined}
                        onClick={() => puedePagar && setModal({ type: "pagar", solicitud: s })}
                      >
                        <CheckCircle size={14} />
                        {procesando === s.id ? "Procesando…" : `Pagar $${costo.toFixed(2)} vía Muney`}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal confirmación */}
      {modal && modal.type !== "resultado" && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>
                {modal.type === "pagar" && "Confirmar pago a gasolinera"}
                {modal.type === "rechazar" && "Rechazar solicitud"}
                {modal.type === "autorizar" && "Autorizar exceso de litros"}
              </h3>
              <button type="button" style={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              {modal.type === "pagar" && (
                <>
                  <p style={styles.modalText}>Se transferirá vía Muney al Pago Móvil de la gasolinera:</p>
                  <div style={styles.modalHighlight}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{modal.solicitud.nombre} {modal.solicitud.apellido}</p>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
                      {modal.solicitud.telefono} · {labelBanco(modal.solicitud.banco)}
                    </p>
                    <p style={{ margin: "8px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--success)" }}>
                      ${costoEstimadoUSD(Number(modal.solicitud.litros)).toFixed(2)} USD
                    </p>
                  </div>
                </>
              )}
              {modal.type === "rechazar" && (
                <p style={styles.modalText}>
                  ¿Rechazar la solicitud de <strong>{modal.solicitud.litros} L</strong> ({modal.solicitud.placa})?
                  El conductor no recibirá el pago.
                </p>
              )}
              {modal.type === "autorizar" && (
                <p style={styles.modalText}>
                  Esta solicitud supera el límite acumulado de litros. Al autorizar, podrá procesar el pago normalmente.
                </p>
              )}
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnModalCancel} onClick={() => setModal(null)}>Cancelar</button>
              <button
                type="button"
                style={modal.type === "rechazar" ? styles.btnReject : modal.type === "autorizar" ? styles.btnWarn : styles.btnPay}
                disabled={procesando === modal.solicitud.id}
                onClick={() => {
                  if (modal.type === "pagar") ejecutarPagar(modal.solicitud.id);
                  else if (modal.type === "rechazar") ejecutarRechazar(modal.solicitud.id);
                  else ejecutarAutorizar(modal.solicitud.id);
                }}
              >
                {modal.type === "pagar" && "Confirmar pago"}
                {modal.type === "rechazar" && "Sí, rechazar"}
                {modal.type === "autorizar" && "Autorizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal.type === "resultado" && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "16px", color: modal.error ? "var(--emergency)" : "var(--success)" }}>
                {modal.error ? "Error" : "Listo"}
              </h3>
              <button type="button" style={styles.modalClose} onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <p style={styles.modalText}>{modal.mensaje}</p>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnPay} onClick={() => setModal(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "var(--s3)" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "var(--s3)",
    flexWrap: "wrap",
  },
  headerText: { flex: 1 },
  headerTitleRow: { display: "flex", gap: "12px", alignItems: "flex-start" },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: "var(--radius)",
    background: "var(--brand-soft)",
    color: "var(--brand)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: "22px", fontWeight: 800, color: "var(--text)" },
  subtitle: { margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)", maxWidth: "520px", lineHeight: 1.5 },
  btnRefresh: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    color: "var(--text)",
  },
  statsRow: {
    gap: "10px",
  },
  statCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statLabel: { fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" },
  statValue: { fontSize: "22px", fontWeight: 800, color: "var(--text)" },
  filters: { display: "flex", gap: "8px", flexWrap: "wrap" },
  filterBtn: {
    padding: "8px 16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-pill)",
    background: "var(--surface)",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  filterActive: {
    padding: "8px 16px",
    border: "2px solid var(--brand)",
    borderRadius: "var(--radius-pill)",
    background: "var(--brand-soft)",
    color: "var(--brand)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  filterBadge: {
    background: "var(--brand)",
    color: "#fff",
    fontSize: "11px",
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: "var(--radius-pill)",
  },
  list: { display: "flex", flexDirection: "column", gap: "var(--s3)" },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "var(--shadow-sm)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  cardHeaderLeft: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  cardId: { fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", fontFamily: "monospace" },
  cardFecha: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" },
  badge: { fontSize: "11px", fontWeight: 800, padding: "4px 12px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  summaryMain: { display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" },
  litrosBig: { fontSize: "28px", fontWeight: 900, color: "var(--brand)", lineHeight: 1 },
  costoBig: { fontSize: "20px", fontWeight: 800, color: "var(--success)" },
  tipoChip: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface-2)",
    color: "var(--text-muted)",
    alignSelf: "center",
  },
  vehiculoChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text)",
    background: "var(--surface-2)",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
  },
  conductorBox: {
    background: "rgba(59,130,246,0.06)",
    border: "1px solid rgba(59,130,246,0.15)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
  },
  pagoBox: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
  },
  sectionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 800,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "10px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "8px",
  },
  infoRow: { display: "flex", gap: "10px", alignItems: "flex-start" },
  infoIcon: { color: "var(--text-muted)", marginTop: "2px", flexShrink: 0 },
  infoContent: { display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 },
  infoLabel: { fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" },
  infoValue: { fontSize: "13px", fontWeight: 600, wordBreak: "break-word" },
  footerMeta: { display: "flex", flexDirection: "column", gap: "8px" },
  validBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    alignSelf: "flex-start",
  },
  motivo: { margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 },
  payoutBanner: { fontSize: "12px", fontWeight: 600, padding: "8px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    borderTop: "1px solid var(--border)",
    paddingTop: "14px",
  },
  btnPay: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--success)",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  btnWarn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--warning-soft)",
    color: "#B45309",
    border: "1px solid #FDE68A",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  btnReject: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--surface)",
    color: "var(--emergency)",
    border: "1px solid rgba(225,29,72,.25)",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  empty: {
    textAlign: "center",
    padding: "56px 24px",
    background: "var(--surface)",
    borderRadius: "var(--radius)",
    border: "1px dashed var(--border)",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "var(--brand-soft)",
    color: "var(--brand)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  center: { display: "flex", justifyContent: "center", padding: "48px" },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid var(--border)",
    borderTop: "4px solid var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "16px",
  },
  modal: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    maxWidth: "420px",
    width: "100%",
    boxShadow: "var(--shadow-lg)",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  modalClose: { background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 },
  modalBody: { marginBottom: "16px" },
  modalText: { margin: 0, fontSize: "14px", lineHeight: 1.5, color: "var(--text)" },
  modalHighlight: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
    marginTop: "12px",
  },
  modalActions: { display: "flex", gap: "8px", justifyContent: "flex-end" },
  btnModalCancel: {
    padding: "10px 16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
  },
};
