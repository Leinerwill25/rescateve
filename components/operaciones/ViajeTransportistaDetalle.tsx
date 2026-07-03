"use client";

import type { Ticket } from "@/lib/types-operations";
import { AecCoberturaPanel } from "@/components/operaciones/AecCoberturaPanel";
import { formatFechaTicket, etiquetaFuenteFecha } from "@/lib/ticket-filters";
import { parseAecDescripcion } from "@/lib/match-acopio";
import { calcAecFaltan } from "@/lib/aec-cobertura";
import { Clock, ExternalLink, MapPin, Navigation, Package, Phone } from "lucide-react";

export type MatchAcopioViaje = {
  tuia_centro_nombre: string | null;
  tuia_centro_tel: string | null;
  tuia_articulo: string;
};

function esTicketAEC(t: Ticket): boolean {
  return t.fuente === "ayuda_en_camino";
}

export function buildViajeMapUrl(t: Ticket): string | null {
  if (t.origen_lat != null && t.origen_lng != null) {
    const destLat = t.destino_lat ?? t.origen_lat;
    const destLng = t.destino_lng ?? t.origen_lng;
    return `https://www.google.com/maps/dir/?api=1&origin=${t.origen_lat},${t.origen_lng}&destination=${destLat},${destLng}`;
  }
  const destinoTexto = t.destino_ref || (esTicketAEC(t) ? t.ubicacion_externa : null);
  if (destinoTexto) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinoTexto)}`;
  }
  if (t.origen_ref) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.origen_ref)}`;
  }
  return null;
}

type Props = {
  ticket: Ticket;
  match?: MatchAcopioViaje | null;
  showContactHint?: boolean;
};

export function ViajeTransportistaDetalle({ ticket, match, showContactHint }: Props) {
  const aec = esTicketAEC(ticket);
  const parsed = aec ? parseAecDescripcion(ticket.descripcion) : null;
  const titulo =
    aec && parsed?.articulo && parsed.articulo !== ticket.descripcion
      ? parsed.articulo
      : ticket.descripcion;
  const destinoEntrega = ticket.destino_ref || (aec ? ticket.ubicacion_externa : null);
  const origenRecogida = ticket.origen_ref || match?.tuia_centro_nombre || null;
  const muestraContactoGenerico = !aec || ticket.aec_meta == null;

  return (
    <>
      {aec && (
        <div style={styles.aecBar}>
          <span style={styles.badgeAec}>Ayuda en Camino</span>
          {ticket.estado_externo && (
            <span
              style={
                ticket.estado_externo === "cubierta" ? styles.badgeCubierta : styles.badgePendiente
              }
            >
              {ticket.estado_externo === "cubierta" ? "Cubierta en origen" : "Pendiente en origen"}
            </span>
          )}
          {ticket.fuente_url && (
            <a
              href={ticket.fuente_url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.linkAec}
            >
              <ExternalLink size={13} />
              Ver necesidad en AEC
            </a>
          )}
        </div>
      )}

      <h4 style={styles.desc}>{titulo}</h4>

      {aec && parsed?.organizacion && parsed.organizacion !== "Organización AEC" && (
        <p style={styles.orgLine}>
          <strong>Organización solicitante:</strong> {parsed.organizacion}
        </p>
      )}

      {!aec && ticket.cantidad && (
        <p style={styles.quantity}>
          <strong>Carga:</strong> {ticket.cantidad}
        </p>
      )}

      {aec && ticket.aec_meta != null && <AecCoberturaPanel ticket={ticket} />}

      {aec && ticket.categoria_externa && (
        <p style={styles.infoLine}>
          <strong>Categoría:</strong> {ticket.categoria_externa}
        </p>
      )}

      <div style={styles.metaCol}>
        {origenRecogida && (
          <div style={styles.metaItem}>
            <MapPin size={16} color="var(--brand)" />
            <span>
              <strong>Punto recogida (origen):</strong> {origenRecogida}
            </span>
          </div>
        )}
        {destinoEntrega && (
          <div style={styles.metaItem}>
            <Navigation size={16} color="var(--success)" />
            <span>
              <strong>Punto entrega (destino):</strong> {destinoEntrega}
            </span>
          </div>
        )}
        {!origenRecogida && !destinoEntrega && (
          <div style={styles.metaItem}>
            <MapPin size={16} color="var(--text-muted)" />
            <span>Ubicación no especificada en el ticket</span>
          </div>
        )}

        {muestraContactoGenerico && (
          <div style={styles.metaItem}>
            <Phone size={16} />
            <span>
              <strong>Solicitante:</strong> {ticket.contacto_solicitante || "No registrado"}
            </span>
          </div>
        )}

        <div style={styles.metaItem}>
          <Clock size={16} color="var(--text-muted)" />
          <span>
            <strong>{etiquetaFuenteFecha(ticket)}:</strong> {formatFechaTicket(ticket)}
          </span>
        </div>

        {match && (
          <div style={styles.acopioBanner}>
            <Package size={16} color="#15803d" />
            <div>
              <strong>Acopio / donante:</strong> {match.tuia_centro_nombre}
              {match.tuia_centro_tel && (
                <span>
                  {" "}
                  ·{" "}
                  <a href={`tel:${match.tuia_centro_tel.replace(/\s/g, "")}`}>{match.tuia_centro_tel}</a>
                </span>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Artículo en acopio: {match.tuia_articulo}
              </div>
            </div>
          </div>
        )}

        {showContactHint && (
          <p style={styles.contactHint}>
            Contacte al acopio y al solicitante antes de confirmar el viaje.
          </p>
        )}
      </div>
    </>
  );
}

/** Resumen compacto para historial de entregas. */
export function ViajeTransportistaResumen({ ticket }: { ticket: Ticket }) {
  const aec = esTicketAEC(ticket);
  const parsed = aec ? parseAecDescripcion(ticket.descripcion) : null;
  const titulo = aec && parsed?.articulo ? parsed.articulo : ticket.descripcion;
  const faltan =
    aec && ticket.aec_meta != null
      ? calcAecFaltan(ticket.aec_meta, ticket.aec_recibidos)
      : null;

  return (
    <>
      <strong>{titulo}</strong>
      {aec && (
        <div style={{ fontSize: 11, color: "#0ea5e9", marginTop: 2 }}>Ayuda en Camino</div>
      )}
      {faltan != null && ticket.aec_meta != null && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          Entrega orientativa: faltan {faltan} de {ticket.aec_meta} uds. en AEC
        </div>
      )}
      {!aec && ticket.cantidad && (
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Carga: {ticket.cantidad}</div>
      )}
      {ticket.contacto_solicitante && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          Contacto: {ticket.contacto_solicitante}
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  aecBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  badgeAec: {
    background: "rgba(14,165,233,0.12)",
    color: "#0ea5e9",
    border: "1px solid rgba(14,165,233,0.3)",
    fontSize: 10,
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  badgePendiente: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(245,158,11,0.12)",
    color: "#d97706",
    border: "1px solid rgba(245,158,11,0.25)",
  },
  badgeCubierta: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.12)",
    color: "var(--success)",
    border: "1px solid rgba(34,197,94,0.25)",
  },
  linkAec: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: "#0ea5e9",
    textDecoration: "none",
  },
  desc: {
    margin: "0 0 8px 0",
    fontSize: "var(--text-md)",
    fontWeight: 700,
    color: "var(--text)",
    lineHeight: 1.35,
  },
  orgLine: {
    margin: "0 0 8px 0",
    fontSize: 13,
    color: "var(--text-muted)",
  },
  quantity: {
    margin: "0 0 8px 0",
    fontSize: 13,
    color: "var(--text)",
  },
  infoLine: {
    margin: "0 0 8px 0",
    fontSize: 12,
    color: "var(--text-muted)",
    background: "var(--surface-2)",
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
  },
  metaCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 13,
    color: "var(--text)",
    lineHeight: 1.4,
  },
  acopioBanner: {
    display: "flex",
    gap: 10,
    padding: "10px 12px",
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
  },
  contactHint: {
    margin: 0,
    fontSize: 12,
    color: "var(--warning)",
    fontWeight: 600,
    fontStyle: "italic",
  },
};
