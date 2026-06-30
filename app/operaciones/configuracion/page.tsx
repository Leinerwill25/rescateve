"use client";

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOperationsAuth } from "../AuthContext";
import { Transporte } from "@/lib/types-operations";
import {
  Truck,
  AlertTriangle,
  MapPin,
  Phone,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  ambulancia: "Ambulancia",
  pasajeros: "Pasajeros",
  carga: "Carga",
  grua: "Grúa",
  tecnico: "Técnico",
};

export default function ConfiguracionTransportistaPage() {
  const { perfil } = useOperationsAuth();
  const [ficha, setFicha] = useState<Transporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const cargar = useCallback(async () => {
    if (!perfil) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transportes")
        .select("*")
        .eq("perfil_id", perfil.id)
        .maybeSingle();

      if (error) throw error;
      setFicha((data as Transporte) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [perfil]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const setDisponibilidad = async (activo: boolean) => {
    if (!ficha || saving || !ficha.activo || ficha.en_standby === activo) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("actualizar_disponibilidad_transporte", {
        p_en_standby: activo,
      });
      if (error) throw error;
      setFicha({ ...ficha, en_standby: activo });
      setToast({
        ok: true,
        msg: activo
          ? "Visible en el tablero de despacho."
          : "Oculto del listado de transportistas.",
      });
    } catch (err: any) {
      setToast({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <Loader2 size={28} color="var(--brand)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!ficha) {
    return (
      <div style={styles.empty}>
        <AlertTriangle size={32} color="var(--warning)" />
        <h3 style={{ margin: "14px 0 6px" }}>Sin vehículo vinculado</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px", textAlign: "center", maxWidth: "300px" }}>
          Pida al administrador asociar su usuario en Recursos → Vehículos.
        </p>
      </div>
    );
  }

  const bloqueadoAdmin = !ficha.activo;
  const disponible = ficha.en_standby;

  return (
    <div style={styles.page} className="ops-page">
      <h1 style={styles.pageTitle}>Mi disponibilidad</h1>
      <p style={styles.pageSubtitle}>
        El despacho solo asigna traslados a transportistas marcados como disponibles.
      </p>

      {/* Vehículo */}
      <section style={styles.vehicleCard}>
        <div style={styles.vehicleAvatar}>
          <Truck size={22} color="var(--brand)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.vehicleName}>{ficha.nombre}</p>
          <p style={styles.vehicleMeta}>
            {[TIPO_LABEL[ficha.tipo] || ficha.tipo, ficha.placa, ficha.modelo].filter(Boolean).join(" · ")}
          </p>
          {(ficha.zona || ficha.contacto) && (
            <div style={styles.vehicleContact}>
              {ficha.zona && (
                <span><MapPin size={12} style={{ verticalAlign: -2 }} /> {ficha.zona}</span>
              )}
              {ficha.contacto && (
                <span><Phone size={12} style={{ verticalAlign: -2 }} /> {ficha.contacto}</span>
              )}
            </div>
          )}
        </div>
        <span
          style={{
            ...styles.liveBadge,
            background: disponible && !bloqueadoAdmin ? "var(--success-soft)" : "var(--surface-2)",
            color: disponible && !bloqueadoAdmin ? "var(--success)" : "var(--text-muted)",
          }}
        >
          {bloqueadoAdmin ? "Bloqueado" : disponible ? "Disponible" : "Pausado"}
        </span>
      </section>

      {/* Control único */}
      <section style={{ ...styles.controlCard, opacity: bloqueadoAdmin ? 0.6 : 1 }}>
        <p style={styles.controlLabel}>Estado para nuevos traslados</p>

        <div style={styles.segmented} role="group" aria-label="Disponibilidad">
          <button
            type="button"
            disabled={saving || bloqueadoAdmin}
            onClick={() => setDisponibilidad(true)}
            style={{
              ...styles.segment,
              ...(disponible ? styles.segmentOn : styles.segmentOff),
            }}
          >
            {saving && disponible ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Disponible
          </button>
          <button
            type="button"
            disabled={saving || bloqueadoAdmin}
            onClick={() => setDisponibilidad(false)}
            style={{
              ...styles.segment,
              ...(!disponible ? styles.segmentOnPaused : styles.segmentOff),
            }}
          >
            {saving && !disponible ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : null}
            Pausado
          </button>
        </div>

        <p style={styles.controlHint}>
          {disponible
            ? "Aparece en el listado del tablero de despacho."
            : "No recibirá asignaciones nuevas hasta que se reactive."}
        </p>
      </section>

      {bloqueadoAdmin && (
        <div style={styles.warnBox}>
          <AlertTriangle size={16} />
          <span>Vehículo desactivado por el administrador. Contacte a operaciones.</span>
        </div>
      )}

      <p style={styles.footnote}>
        Al aceptar un viaje se pausa automáticamente. Al marcar entregado, vuelve a disponible.
      </p>

      {toast && (
        <div style={{ ...styles.toast, background: toast.ok ? "#0D9488" : "var(--emergency)" }} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "440px",
    margin: "0 auto",
    width: "100%",
    paddingBottom: "32px",
  },
  pageTitle: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--text)",
  },
  pageSubtitle: {
    margin: "0 0 20px",
    fontSize: "13px",
    color: "var(--text-muted)",
    lineHeight: 1.45,
  },
  vehicleCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    marginBottom: "12px",
  },
  vehicleAvatar: {
    width: 44,
    height: 44,
    borderRadius: "10px",
    background: "var(--brand-soft)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  vehicleName: {
    margin: "0 0 2px",
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--text)",
  },
  vehicleMeta: {
    margin: 0,
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  vehicleContact: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginTop: "6px",
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  liveBadge: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "4px 10px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
    flexShrink: 0,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  controlCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "16px",
  },
  controlLabel: {
    margin: "0 0 12px",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text)",
  },
  segmented: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0",
    padding: "4px",
    background: "var(--surface-2)",
    borderRadius: "10px",
    border: "1px solid var(--border)",
  },
  segment: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "12px 8px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    background: "transparent",
    color: "var(--text-muted)",
  },
  segmentOn: {
    background: "var(--success)",
    color: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  },
  segmentOnPaused: {
    background: "var(--text)",
    color: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  },
  segmentOff: {
    background: "transparent",
    color: "var(--text-muted)",
  },
  controlHint: {
    margin: "12px 0 0",
    fontSize: "12px",
    color: "var(--text-muted)",
    lineHeight: 1.4,
    textAlign: "center",
  },
  warnBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
    padding: "12px 14px",
    background: "var(--emergency-soft)",
    borderRadius: "10px",
    fontSize: "12px",
    color: "var(--emergency)",
    lineHeight: 1.4,
  },
  footnote: {
    margin: "16px 0 0",
    fontSize: "12px",
    color: "var(--text-muted)",
    lineHeight: 1.45,
    textAlign: "center",
  },
  toast: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 20px",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    boxShadow: "var(--shadow-lg)",
    zIndex: 10000,
    maxWidth: "calc(100vw - 32px)",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 20px",
    textAlign: "center",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    padding: "64px",
  },
};
