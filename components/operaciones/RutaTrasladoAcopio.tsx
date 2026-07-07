"use client";

import { useState } from "react";
import type { Ticket } from "@/lib/types-operations";
import type { MatchAcopioViaje } from "@/components/operaciones/ViajeTransportistaDetalle";
import { CheckCircle2, MapPin, Navigation, Package, PackageCheck, Truck } from "lucide-react";

type Coords = { lat: number; lng: number };

type MatchConRuta = MatchAcopioViaje & { id: string };

function dirUrl(origin: string | null, destination: string): string {
  const base = "https://www.google.com/maps/dir/?api=1";
  const dest = `&destination=${encodeURIComponent(destination)}`;
  const orig = origin ? `&origin=${encodeURIComponent(origin)}` : "";
  return `${base}${orig}${dest}`;
}

/** Destino textual/coordenada de la necesidad (persona que la levantó). */
function destinoNecesidad(ticket: Ticket): string | null {
  if (ticket.destino_lat != null && ticket.destino_lng != null) {
    return `${ticket.destino_lat},${ticket.destino_lng}`;
  }
  return (
    ticket.destino_ref ||
    (ticket.fuente === "ayuda_en_camino" ? ticket.ubicacion_externa : null) ||
    ticket.origen_ref ||
    null
  );
}

/** Coordenada/nombre del acopio. */
function ubicacionAcopio(match: MatchConRuta): string | null {
  if (match.tuia_centro_lat != null && match.tuia_centro_lng != null) {
    return `${match.tuia_centro_lat},${match.tuia_centro_lng}`;
  }
  return match.tuia_centro_nombre || null;
}

type Props = {
  ticket: Ticket;
  match: MatchConRuta;
  coords: Coords | null;
  onRecogido: (matchId: string) => Promise<void> | void;
  marcando?: boolean;
};

export function RutaTrasladoAcopio({ ticket, match, coords, onRecogido, marcando }: Props) {
  const recogido = !!match.insumos_recogidos_at;
  const acopio = ubicacionAcopio(match);
  const destino = destinoNecesidad(ticket);
  const [confirmando, setConfirmando] = useState(false);

  const origenTramo1 = coords ? `${coords.lat},${coords.lng}` : null;
  const urlTramo1 = acopio ? dirUrl(origenTramo1, acopio) : null;
  const urlTramo2 = destino ? dirUrl(acopio, destino) : null;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <Truck size={15} />
        <span>Ruta del traslado</span>
      </div>

      {/* Tramo 1: hasta el acopio */}
      <div style={{ ...styles.step, ...(recogido ? styles.stepDone : styles.stepActive) }}>
        <div style={styles.stepNum}>{recogido ? <CheckCircle2 size={16} /> : "1"}</div>
        <div style={styles.stepBody}>
          <p style={styles.stepTitle}>
            Recoger en el acopio
            {recogido && <span style={styles.doneTag}>Recogido</span>}
          </p>
          <p style={styles.stepSub}>
            <MapPin size={12} /> {match.tuia_centro_nombre || "Centro de acopio"}
            {" · "}
            {match.tuia_articulo}
          </p>
          {!recogido && (
            <div style={styles.actions}>
              {urlTramo1 ? (
                <a href={urlTramo1} target="_blank" rel="noopener noreferrer" style={styles.btnRuta}>
                  <Navigation size={14} /> Ruta al acopio (GPS)
                </a>
              ) : (
                <span style={styles.noRuta}>Ubicación del acopio no disponible</span>
              )}
              <button
                type="button"
                style={{ ...styles.btnRecogido, opacity: marcando || confirmando ? 0.6 : 1 }}
                disabled={marcando || confirmando}
                onClick={async () => {
                  setConfirmando(true);
                  try {
                    await onRecogido(match.id);
                  } finally {
                    setConfirmando(false);
                  }
                }}
              >
                <PackageCheck size={15} />
                {marcando ? "Guardando…" : "Ya tengo los insumos"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.connector} />

      {/* Tramo 2: hasta la necesidad */}
      <div style={{ ...styles.step, ...(recogido ? styles.stepActive : styles.stepLocked) }}>
        <div style={styles.stepNum}>2</div>
        <div style={styles.stepBody}>
          <p style={styles.stepTitle}>Entregar a quien lo necesita</p>
          <p style={styles.stepSub}>
            <MapPin size={12} /> {ticket.destino_ref || ticket.ubicacion_externa || "Ubicación de la necesidad"}
          </p>
          {recogido ? (
            urlTramo2 ? (
              <div style={styles.actions}>
                <a href={urlTramo2} target="_blank" rel="noopener noreferrer" style={styles.btnRutaEntrega}>
                  <Navigation size={14} /> Ruta a la entrega (GPS)
                </a>
              </div>
            ) : (
              <span style={styles.noRuta}>Ubicación de entrega no disponible en el ticket</span>
            )
          ) : (
            <p style={styles.lockedHint}>
              <Package size={12} /> Disponible cuando marques que ya tienes los insumos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    border: "1px solid #bfdbfe",
    background: "#f8fbff",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 800,
    color: "#1e40af",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginBottom: 4,
  },
  step: {
    display: "flex",
    gap: 10,
    padding: "10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid transparent",
  },
  stepActive: { background: "#fff", borderColor: "#bfdbfe" },
  stepDone: { background: "#f0fdf4", borderColor: "#bbf7d0" },
  stepLocked: { background: "#f8fafc", borderColor: "#e2e8f0", opacity: 0.75 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--brand)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: {
    margin: "0 0 4px",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  doneTag: {
    fontSize: 10,
    fontWeight: 800,
    color: "#16a34a",
    background: "#dcfce7",
    padding: "2px 6px",
    borderRadius: 999,
    textTransform: "uppercase",
  },
  stepSub: {
    margin: "0 0 8px",
    fontSize: 12,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 5,
    lineHeight: 1.35,
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  connector: {
    width: 2,
    height: 12,
    background: "#cbd5e1",
    marginLeft: 22,
  },
  btnRuta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    background: "#2563eb",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
  },
  btnRutaEntrega: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    background: "#16a34a",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
  },
  btnRecogido: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  noRuta: { fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" },
  lockedHint: {
    margin: 0,
    fontSize: 11,
    color: "var(--text-muted)",
    fontStyle: "italic",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
};
