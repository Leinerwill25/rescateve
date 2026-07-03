"use client";

import type { Ticket } from "@/lib/types-operations";
import { calcAecFaltan } from "@/lib/aec-cobertura";
import { Mail, Phone, User } from "lucide-react";

type Props = {
  ticket: Pick<
    Ticket,
    | "aec_meta"
    | "aec_recibidos"
    | "aec_en_camino"
    | "aec_contacto_nombre"
    | "contacto_solicitante"
    | "cantidad"
  >;
};

export function AecCoberturaPanel({ ticket }: Props) {
  const meta = ticket.aec_meta;
  if (meta == null) return null;

  const recibidos = ticket.aec_recibidos ?? 0;
  const enCamino = ticket.aec_en_camino ?? 0;
  const faltan = calcAecFaltan(meta, recibidos) ?? 0;
  const pct = meta > 0 ? Math.min(100, Math.round((recibidos / meta) * 100)) : 0;

  const contacto = ticket.contacto_solicitante || "";
  const telMatch = contacto.match(/(?:\+?58\s?)?0?4\d{2}[\s-]?\d{3}[\s-]?\d{4}|\+?\d[\d\s-]{8,}/);
  const emailMatch = contacto.match(/[\w.+-]+@[\w.-]+\.\w+/);

  return (
    <div style={styles.wrap}>
      <div style={styles.titleRow}>
        <span style={styles.title}>Cobertura en Ayuda en Camino</span>
        <span style={faltan === 0 ? styles.badgeOk : styles.badgePend}>
          {faltan === 0 ? "Meta cubierta" : `Faltan ${faltan} uds.`}
        </span>
      </div>

      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${pct}%`,
            background:
              pct >= 100
                ? "var(--success)"
                : "linear-gradient(90deg, #0ea5e9, #06b6d4)",
          }}
        />
      </div>

      <div style={styles.grid}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Meta</span>
          <strong style={styles.statValue}>{meta}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Recibidos</span>
          <strong style={{ ...styles.statValue, color: "var(--success)" }}>{recibidos}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>En camino</span>
          <strong style={{ ...styles.statValue, color: "#f59e0b" }}>{enCamino}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Faltan</span>
          <strong style={{ ...styles.statValue, color: faltan > 0 ? "var(--emergency)" : "var(--success)" }}>
            {faltan}
          </strong>
        </div>
      </div>

      {(ticket.aec_contacto_nombre || contacto) && (
        <div style={styles.contactBlock}>
          {ticket.aec_contacto_nombre && (
            <div style={styles.contactRow}>
              <User size={13} />
              <span>{ticket.aec_contacto_nombre}</span>
            </div>
          )}
          {telMatch && (
            <div style={styles.contactRow}>
              <Phone size={13} />
              <a href={`tel:${telMatch[0].replace(/\s/g, "")}`} style={styles.contactLink}>
                {telMatch[0].trim()}
              </a>
            </div>
          )}
          {emailMatch && (
            <div style={styles.contactRow}>
              <Mail size={13} />
              <a href={`mailto:${emailMatch[0]}`} style={styles.contactLink}>
                {emailMatch[0]}
              </a>
            </div>
          )}
          {!telMatch && !emailMatch && contacto && !ticket.aec_contacto_nombre && (
            <div style={styles.contactRow}>
              <Phone size={13} />
              <span>{contacto}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    margin: "10px 0 8px",
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    background: "linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(6,182,212,0.04) 100%)",
    border: "1px solid rgba(14,165,233,0.2)",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0ea5e9",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  badgePend: {
    fontSize: 11,
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(225,29,72,0.1)",
    color: "var(--emergency)",
    border: "1px solid rgba(225,29,72,0.25)",
  },
  badgeOk: {
    fontSize: 11,
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.12)",
    color: "var(--success)",
    border: "1px solid rgba(34,197,94,0.25)",
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    background: "var(--surface-2)",
    overflow: "hidden",
    marginBottom: 10,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.3s ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  statValue: {
    fontSize: 16,
    fontWeight: 800,
    color: "var(--text)",
  },
  contactBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid rgba(14,165,233,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  contactRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--text)",
  },
  contactLink: {
    color: "#0ea5e9",
    textDecoration: "none",
    fontWeight: 600,
  },
};
