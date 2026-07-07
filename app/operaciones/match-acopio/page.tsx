"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useOperationsAuth } from "../AuthContext";
import type { MatchInsumoSugerido } from "@/lib/match-acopio";
import {
  Link2,
  MapPin,
  Phone,
  Package,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Navigation,
  Mail,
  Building2,
  Hash,
  MessageCircle,
  Info,
} from "lucide-react";

type MatchItem = {
  origen: "aec" | "ash" | "traslado";
  distancia_origen_km?: number | null;
  ticket: {
    id: string;
    descripcion: string;
    estado: string;
    fuente_url: string | null;
    prioridad: string;
  };
  need: {
    articulo: string;
    cantidad: number | null;
    cantidadTexto: string | null;
    organizacion: string;
    ubicacion: string;
    contactoNombre: string | null;
    contactoTel: string | null;
    contactoEmail: string | null;
    categoria: string | null;
  };
  destino_lat: number | null;
  destino_lng: number | null;
  matches: MatchInsumoSugerido[];
  reclamo: {
    id: string;
    estado: string;
    perfil_id: string;
    tuia_centro_nombre: string;
    tuia_centro_tel: string | null;
    tuia_articulo: string;
    distancia_km: number | null;
    reclamado_at: string;
    perfil?: { nombre: string | null };
    transporte?: { nombre: string | null };
  } | null;
};

type Diagnostico = {
  aec_pendientes: number;
  ash_traslado: number;
  total_candidatos: number;
  descartados_con_transportista: number;
  descartados_sin_aec_api: number;
  con_match_automatico: number;
  sin_match_automatico: number;
  mostrados: number;
  seleccion_modo?: "cercania" | "variado" | "todos";
  con_ubicacion?: boolean;
  radio_km?: number;
  insumos_tuia: number;
  centros_tuia: number;
};

const REFRESH_MS = 60_000;

function parseUbicacion(ubicacion: string) {
  if (!ubicacion.trim()) return { ciudad: null, estado: null, direccion: null, raw: "" };
  const dirMatch = ubicacion.match(/Dir:\s*(.+)$/i);
  const sinDir = dirMatch ? ubicacion.replace(/,?\s*Dir:\s*.+$/i, "").trim() : ubicacion;
  const partes = sinDir.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    ciudad: partes[0] || null,
    estado: partes[1] || null,
    direccion: dirMatch?.[1]?.trim() || null,
    raw: ubicacion,
  };
}

function telWhatsApp(tel: string) {
  const digits = tel.replace(/\D/g, "");
  if (!digits) return null;
  const n = digits.startsWith("58") ? digits : `58${digits.replace(/^0/, "")}`;
  return `https://wa.me/${n}`;
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
}

function etiquetaCategoria(cat: string | null) {
  if (!cat) return "Sin categoría";
  const map: Record<string, string> = {
    medicinas: "Medicinas",
    medicina: "Medicina",
    alimentos: "Alimentos",
    alimento: "Alimento",
    agua: "Agua",
    higiene: "Higiene",
  };
  return map[cat.toLowerCase()] || cat;
}

function etiquetaCantidad(need: MatchItem["need"]) {
  if (need.cantidadTexto?.trim()) return need.cantidadTexto.trim();
  if (need.cantidad != null) return `${need.cantidad} uds.`;
  return "Cantidad N/D";
}

function etiquetaOrigen(origen: MatchItem["origen"]) {
  if (origen === "ash") return "Ash 🌿";
  if (origen === "traslado") return "Traslado logístico";
  return "Ayuda en Camino";
}

function PanelNecesidad({ item }: { item: MatchItem }) {
  const { need, ticket, destino_lat, destino_lng, origen } = item;
  const ub = parseUbicacion(need.ubicacion);
  const wa = need.contactoTel ? telWhatsApp(need.contactoTel) : null;
  const tieneUbicacionParseada = !!(ub.ciudad || ub.estado || ub.direccion);
  const tieneUbicacionTexto = !!need.ubicacion.trim();
  const orgEsGenerica = need.organizacion === "Organización AEC" || !need.organizacion.trim();

  return (
    <div style={needStyles.panel}>
      <div style={needStyles.panelHeader}>
        <div style={needStyles.avatar}>{iniciales(need.organizacion)}</div>
        <div style={needStyles.headerText}>
          <span style={needStyles.kicker}>Solicitante · {etiquetaOrigen(origen)}</span>
          <h4 style={needStyles.orgName}>
            {orgEsGenerica ? "Organización solicitante" : need.organizacion}
          </h4>
          {need.contactoNombre && (
            <p style={needStyles.contactName}>{need.contactoNombre}</p>
          )}
        </div>
      </div>

      <div style={needStyles.chipRow}>
        <span style={needStyles.chip}>
          <Package size={12} />
          {etiquetaCantidad(need)}
        </span>
        <span style={{ ...needStyles.chip, ...needStyles.chipCat }}>
          {etiquetaCategoria(need.categoria)}
        </span>
        <span style={needStyles.chipMuted}>
          <Hash size={11} />
          {ticket.id.slice(0, 8)}
        </span>
      </div>

      <div style={needStyles.block}>
        <div style={needStyles.blockTitle}>
          <MapPin size={13} /> Destino del traslado
        </div>
        {tieneUbicacionParseada ? (
          <div style={needStyles.locGrid}>
            {ub.ciudad && (
              <div style={needStyles.locItem}>
                <span style={needStyles.locLabel}>Ciudad</span>
                <span style={needStyles.locValue}>{ub.ciudad}</span>
              </div>
            )}
            {ub.estado && (
              <div style={needStyles.locItem}>
                <span style={needStyles.locLabel}>Estado</span>
                <span style={needStyles.locValue}>{ub.estado}</span>
              </div>
            )}
            {ub.direccion && (
              <div style={{ ...needStyles.locItem, gridColumn: "1 / -1" }}>
                <span style={needStyles.locLabel}>Dirección</span>
                <span style={needStyles.locValue}>{ub.direccion}</span>
              </div>
            )}
          </div>
        ) : tieneUbicacionTexto ? (
          <div style={needStyles.locItem}>
            <span style={needStyles.locLabel}>Ubicación</span>
            <span style={needStyles.locValue}>{need.ubicacion}</span>
          </div>
        ) : (
          <div style={needStyles.locEmpty}>
            <MapPin size={14} color="var(--text-muted)" />
            <span>Sin ubicación registrada en AEC</span>
          </div>
        )}
        {destino_lat != null && destino_lng != null ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${destino_lat}&mlon=${destino_lng}#map=14/${destino_lat}/${destino_lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={needStyles.btnMap}
          >
            <Navigation size={14} /> Abrir destino en mapa
          </a>
        ) : tieneUbicacionTexto ? (
          <p style={needStyles.locHint}>Mapa no disponible — geocodificación pendiente</p>
        ) : null}
      </div>

      {(need.contactoTel || need.contactoEmail) && (
        <div style={needStyles.block}>
          <div style={needStyles.blockTitle}>
            <Phone size={13} /> Contacto directo
          </div>
          <div style={needStyles.contactActions}>
            {need.contactoTel && (
              <>
                <a href={`tel:${need.contactoTel}`} style={needStyles.btnContact}>
                  <Phone size={14} /> Llamar
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" style={needStyles.btnWhatsApp}>
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </>
            )}
            {need.contactoEmail && (
              <a href={`mailto:${need.contactoEmail}`} style={needStyles.btnContact}>
                <Mail size={14} /> Email
              </a>
            )}
          </div>
          {need.contactoTel && (
            <p style={needStyles.telDisplay}>{need.contactoTel}</p>
          )}
          {need.contactoEmail && (
            <p style={needStyles.telDisplay}>{need.contactoEmail}</p>
          )}
        </div>
      )}

      <div style={needStyles.blockFooter}>
        <Building2 size={12} />
        <span>Artículo: <strong>{need.articulo}</strong></span>
      </div>
    </div>
  );
}

const needStyles: Record<string, React.CSSProperties> = {
  panel: {
    padding: "14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid #bfdbfe",
    background: "linear-gradient(160deg, #f8fbff 0%, #eff6ff 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minHeight: "100%",
  },
  panelHeader: { display: "flex", gap: "12px", alignItems: "flex-start" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "12px",
    background: "var(--brand)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "15px",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
  },
  headerText: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  orgName: { margin: "2px 0 0", fontSize: "15px", fontWeight: 800, color: "var(--text)", lineHeight: 1.3 },
  contactName: { margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "var(--radius-pill)",
    background: "#fff",
    border: "1px solid #dbeafe",
    color: "var(--text)",
  },
  chipCat: { background: "#fef3c7", borderColor: "#fde68a", color: "#92400e" },
  chipMuted: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "var(--radius-pill)",
    background: "rgba(255,255,255,0.6)",
    color: "var(--text-muted)",
  },
  block: {
    background: "#fff",
    borderRadius: "var(--radius-sm)",
    border: "1px solid #e0e7ff",
    padding: "10px 12px",
  },
  blockTitle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 800,
    color: "#1e40af",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginBottom: "8px",
  },
  locGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  locItem: { display: "flex", flexDirection: "column", gap: "2px" },
  locLabel: { fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" },
  locValue: { fontSize: "13px", fontWeight: 600, color: "var(--text)", lineHeight: 1.35 },
  locEmpty: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--text-muted)",
    padding: "8px",
    background: "#f9fafb",
    borderRadius: "var(--radius-sm)",
    border: "1px dashed var(--border)",
  },
  locHint: { margin: "8px 0 0", fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" },
  btnMap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "10px",
    width: "100%",
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    background: "#2563eb",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
  },
  contactActions: { display: "flex", flexWrap: "wrap", gap: "8px" },
  btnContact: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "#fff",
    color: "var(--text)",
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "none",
  },
  btnWhatsApp: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
  },
  telDisplay: { margin: "8px 0 0", fontSize: "13px", fontWeight: 600, color: "var(--text)" },
  blockFooter: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    fontSize: "11px",
    color: "var(--text-muted)",
    paddingTop: "4px",
    borderTop: "1px solid #dbeafe",
    lineHeight: 1.4,
  },
};

export default function MatchAcopioPage() {
  const { perfil } = useOperationsAuth();
  const esAdmin = perfil?.rol === "admin";
  const esTransportista = perfil?.rol === "transportista";

  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoEstado, setGeoEstado] = useState<"inicial" | "pidiendo" | "ok" | "denegado" | "no-soportado">("inicial");
  const [reclamando, setReclamando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [rechazoModal, setRechazoModal] = useState<{ matchId: string; ticketId: string } | null>(null);
  const [rechazoNota, setRechazoNota] = useState("");
  const [schemaHint, setSchemaHint] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const cargar = useCallback(async (silent = false, withGeocode = false) => {
    if (!silent) setLoading(true);
    else if (withGeocode) setEnriching(true);
    else setRefreshing(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sesión expirada");

      const qs = new URLSearchParams({ limit: "20" });
      if (withGeocode) qs.set("geocode", "true");
      if (coords) {
        qs.set("lat", String(coords.lat));
        qs.set("lng", String(coords.lng));
      }

      const res = await fetch(`/api/match-acopio?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar matches");

      setItems(json.items || []);
      setLastSync(json.fetched_at);
      setSchemaHint(json.schema_hint || null);
      setDiagnostico(json.diagnostico || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setEnriching(false);
    }
  }, [getToken, coords]);

  useEffect(() => {
    if (!esTransportista) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoEstado("no-soportado");
      return;
    }
    setGeoEstado("pidiendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoEstado("ok");
      },
      () => setGeoEstado("denegado"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }, [esTransportista]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await cargar(false, false);
      if (!cancelled) {
        cargar(true, true);
      }
    })();

    const id = setInterval(() => cargar(true, false), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [cargar]);

  const reclamar = async (ticketId: string, match: MatchInsumoSugerido) => {
    setReclamando(`${ticketId}-${match.centro_id}`);
    try {
      const token = await getToken();
      const res = await fetch("/api/match-acopio/reclamar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          tuia_centro_id: match.centro_id,
          tuia_centro_nombre: match.centro_nombre,
          tuia_centro_tel: match.centro_telefono,
          tuia_articulo: match.articulo,
          tuia_disponible: match.disponible,
          tuia_unidad: match.unidad,
          distancia_km: match.distancia_km,
          score_match: match.score,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await cargar(true);
      alert("Traslado reclamado. Contacte al acopio y al solicitante, luego confirme si hará el viaje.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al reclamar");
    } finally {
      setReclamando(null);
    }
  };

  const confirmar = async (matchId: string) => {
    setConfirmando(matchId);
    try {
      const token = await getToken();
      const res = await fetch("/api/match-acopio/confirmar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ match_id: matchId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await cargar(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al confirmar");
    } finally {
      setConfirmando(null);
    }
  };

  const responderReclamo = async (matchId: string, aceptar: boolean, nota?: string) => {
    setRespondiendo(matchId);
    try {
      const token = await getToken();
      const res = await fetch("/api/match-acopio/responder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ match_id: matchId, aceptar, nota: nota || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRechazoModal(null);
      setRechazoNota("");
      await cargar(true);
      alert(aceptar ? "Viaje confirmado. Puede iniciarlo desde Mis Viajes." : "Rechazo registrado. El administrador fue notificado.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al responder");
    } finally {
      setRespondiendo(null);
    }
  };

  const esMiReclamo = (item: MatchItem) =>
    esTransportista &&
    item.reclamo?.estado === "reclamado" &&
    item.reclamo.perfil_id === perfil?.id;

  const mapLink = (lat: number | null, lng: number | null, label: string) => {
    if (lat == null || lng == null) return null;
    return (
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.mapLink}
      >
        <Navigation size={12} /> {label}
      </a>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Link2 size={22} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Match Acopio ↔ Tuia911
          </h2>
          <p style={styles.subtitle}>
            {esTransportista
              ? "Necesidades de AEC, Ash y traslados con insumos disponibles cerca. Reclama, contacta acopio y solicitante, y confirma el viaje."
              : "Empareja necesidades (AEC, Ash, traslados) con stock Tuia911. Distancia vía OpenStreetMap (gratis)."}
          </p>
        </div>
        <button type="button" style={styles.btnRefresh} onClick={() => cargar(true)} disabled={refreshing}>
          <RefreshCw size={16} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
          Actualizar
        </button>
      </div>

      <div style={styles.infoBar}>
        <span>Match por texto + ubicación{enriching ? " · calculando distancias…" : ""}</span>
        {lastSync && <span>· Sync: {new Date(lastSync).toLocaleTimeString("es-VE")}</span>}
        <span>· Auto-refresh 60s</span>
      </div>

      {esTransportista && (
        <div style={styles.geoNote}>
          <Navigation size={14} />
          {geoEstado === "ok" && diagnostico?.seleccion_modo === "cercania" && (
            <span>
              Mostrando las necesidades <strong>más cercanas a ti</strong> (radio {diagnostico.radio_km ?? 40} km).
            </span>
          )}
          {geoEstado === "ok" && diagnostico?.seleccion_modo === "variado" && (
            <span>
              No hay necesidades dentro de {diagnostico.radio_km ?? 40} km. Mostrando una <strong>selección variada</strong>.
            </span>
          )}
          {geoEstado === "pidiendo" && <span>Solicitando tu ubicación para priorizar necesidades cercanas…</span>}
          {(geoEstado === "denegado" || geoEstado === "no-soportado") && (
            <span>
              Ubicación no disponible. Mostrando una <strong>selección variada</strong>. Activa el permiso de ubicación para ver las más cercanas.
            </span>
          )}
        </div>
      )}

      {schemaHint && (
        <div style={{ ...styles.errorBox, background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }}>
          <AlertCircle size={18} /> {schemaHint}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} /> {error}
          {error.includes("TUIA911") && (
            <span> — Verifique TUIA911_API_KEY en el servidor.</span>
          )}
        </div>
      )}

      {!loading && diagnostico && (
        <div style={styles.diagBox}>
          <div style={styles.diagHeader}>
            <Info size={16} />
            <span>Diagnóstico de la consulta</span>
          </div>
          <div style={styles.diagGrid}>
            <div style={styles.diagItem}>
              <span style={styles.diagValue}>{diagnostico.aec_pendientes}</span>
              <span style={styles.diagLabel}>AEC pendientes (estado_externo)</span>
            </div>
            <div style={styles.diagItem}>
              <span style={styles.diagValue}>{diagnostico.ash_traslado}</span>
              <span style={styles.diagLabel}>Ash + traslados en estado activo</span>
            </div>
            <div style={styles.diagItem}>
              <span style={styles.diagValue}>{diagnostico.total_candidatos}</span>
              <span style={styles.diagLabel}>Candidatos traídos</span>
            </div>
            <div style={styles.diagItem}>
              <span style={{ ...styles.diagValue, color: diagnostico.descartados_con_transportista > 0 ? "#b45309" : undefined }}>
                {diagnostico.descartados_con_transportista}
              </span>
              <span style={styles.diagLabel}>Descartados: ya tienen transportista</span>
            </div>
            <div style={styles.diagItem}>
              <span style={{ ...styles.diagValue, color: diagnostico.descartados_sin_aec_api > 0 ? "#b45309" : undefined }}>
                {diagnostico.descartados_sin_aec_api}
              </span>
              <span style={styles.diagLabel}>Descartados: sin datos en API AEC</span>
            </div>
            <div style={styles.diagItem}>
              <span style={styles.diagValue}>{diagnostico.mostrados}</span>
              <span style={styles.diagLabel}>Mostrados ({diagnostico.con_match_automatico} con match · {diagnostico.sin_match_automatico} sin match)</span>
            </div>
            <div style={styles.diagItem}>
              <span style={{ ...styles.diagValue, color: diagnostico.insumos_tuia === 0 ? "#b91c1c" : undefined }}>
                {diagnostico.insumos_tuia}
              </span>
              <span style={styles.diagLabel}>Insumos Tuia911</span>
            </div>
            <div style={styles.diagItem}>
              <span style={{ ...styles.diagValue, color: diagnostico.centros_tuia === 0 ? "#b91c1c" : undefined }}>
                {diagnostico.centros_tuia}
              </span>
              <span style={styles.diagLabel}>Centros Tuia911</span>
            </div>
          </div>
          {items.length === 0 && (
            <p style={styles.diagHint}>
              {diagnostico.total_candidatos === 0
                ? "No hay tickets en estados pendientes: AEC con estado_externo='pendiente', o Ash/traslado en 'en_validacion', 'aprobado' o 'asignado'."
                : diagnostico.descartados_con_transportista > 0
                ? "Todos los candidatos ya tienen transportista asignado sin un reclamo activo, por eso se ocultan."
                : diagnostico.descartados_sin_aec_api > 0
                ? "Los tickets AEC se descartaron porque su fuente_id no aparece en la API de Ayuda en Camino."
                : "No se pudieron construir necesidades a partir de los candidatos."}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div style={styles.center}><div style={styles.spinner} /></div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <Package size={36} color="var(--text-muted)" />
          <p>No hay necesidades pendientes con match disponible (AEC, Ash o traslados).</p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <article key={item.ticket.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <span style={{
                    ...styles.badge,
                    background: item.ticket.prioridad === "alta" ? "#fef2f2" : "#eff6ff",
                    color: item.ticket.prioridad === "alta" ? "#b91c1c" : "#2563eb",
                  }}>
                    {item.ticket.prioridad.toUpperCase()}
                  </span>
                  <span style={{ ...styles.badge, background: "#f0fdf4", color: "#15803d", marginLeft: 6 }}>
                    {etiquetaOrigen(item.origen)}
                  </span>
                  {item.reclamo && (
                    <span style={{ ...styles.badge, background: "#f0fdf4", color: "#16a34a", marginLeft: 6 }}>
                      {item.reclamo.estado === "confirmado" ? "Confirmado" : "Reclamado"}
                    </span>
                  )}
                  {item.distancia_origen_km != null && (
                    <span style={{ ...styles.badge, background: "#eef2ff", color: "#4338ca", marginLeft: 6 }}>
                      <Navigation size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />
                      a {item.distancia_origen_km} km de ti
                    </span>
                  )}
                  <h3 style={styles.needTitle}>{item.need.articulo}</h3>
                  <p style={styles.needMeta}>
                    Cantidad: {item.need.cantidadTexto || (item.need.cantidad ?? "?")} · {item.need.categoria || "sin categoría"}
                  </p>
                </div>
                {item.ticket.fuente_url && (
                  <a href={item.ticket.fuente_url} target="_blank" rel="noopener noreferrer" style={styles.extLink}>
                    <ExternalLink size={14} /> AEC
                  </a>
                )}
              </div>

              <div style={styles.twoCol}>
                <PanelNecesidad item={item} />

                {item.reclamo ? (
                  <div style={{ ...styles.partyBox, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                    <h4 style={styles.partyTitle}><Truck size={14} /> Traslado reclamado</h4>
                    <p style={styles.partyLine}><strong>{item.reclamo.transporte?.nombre || item.reclamo.perfil?.nombre}</strong></p>
                    <p style={styles.partyLine}>Acopio: {item.reclamo.tuia_centro_nombre}</p>
                    {item.reclamo.tuia_centro_tel && (
                      <p style={styles.partyLine}>
                        <Phone size={12} /> Donante/acopio:{" "}
                        <a href={`tel:${item.reclamo.tuia_centro_tel}`}>{item.reclamo.tuia_centro_tel}</a>
                      </p>
                    )}
                    <p style={styles.partyLine}>Artículo: {item.reclamo.tuia_articulo}</p>
                    {item.reclamo.distancia_km != null && (
                      <p style={styles.partyLine}>~{item.reclamo.distancia_km} km</p>
                    )}

                    {esMiReclamo(item) && (
                      <div style={{ marginTop: 12, padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#15803d" }}>
                          Contacte al acopio y al solicitante. Luego indique si hará el viaje:
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={styles.btnConfirm}
                            disabled={respondiendo === item.reclamo!.id}
                            onClick={() => responderReclamo(item.reclamo!.id, true)}
                          >
                            <CheckCircle2 size={14} />
                            {respondiendo === item.reclamo!.id ? "…" : "Sí, haré el viaje"}
                          </button>
                          <button
                            type="button"
                            style={{ ...styles.btnReclamar, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
                            disabled={respondiendo === item.reclamo!.id}
                            onClick={() => setRechazoModal({ matchId: item.reclamo!.id, ticketId: item.ticket.id })}
                          >
                            No puedo hacerlo
                          </button>
                        </div>
                      </div>
                    )}

                    {esAdmin && item.reclamo.estado === "reclamado" && !esMiReclamo(item) && (
                      <button
                        type="button"
                        style={styles.btnConfirm}
                        onClick={() => confirmar(item.reclamo!.id)}
                        disabled={confirmando === item.reclamo.id}
                      >
                        <CheckCircle2 size={14} />
                        {confirmando === item.reclamo.id ? "Confirmando…" : "Confirmar reclamo"}
                      </button>
                    )}
                    {esAdmin && (
                      <Link href="/operaciones/despacho" style={styles.linkDespacho}>Ir a despacho →</Link>
                    )}
                  </div>
                ) : (
                  <div style={styles.partyBox}>
                    <h4 style={styles.partyTitle}><Package size={14} /> Mejores insumos (Tuia911)</h4>
                    {item.matches.length === 0 ? (
                      <p style={styles.noMatch}>Sin match automático. Revise Acopio Tuia911 manualmente.</p>
                    ) : (
                      <div style={styles.matchList}>
                        {item.matches.map((m) => (
                          <div key={`${m.centro_id}-${m.articulo}`} style={styles.matchRow}>
                            <div style={styles.matchInfo}>
                              <div style={styles.matchTop}>
                                <strong>{m.articulo}</strong>
                                <span style={styles.scoreBadge}>{Math.round(m.score * 100)}% match</span>
                              </div>
                              <p style={styles.matchSub}>
                                {m.centro_nombre} · {m.disponible} {m.unidad}
                                {m.distancia_km != null && ` · ~${m.distancia_km} km`}
                                {!m.stock_suficiente && " · stock parcial"}
                              </p>
                              {m.centro_telefono && (
                                <p style={styles.matchSub}><Phone size={11} /> Acopio: {m.centro_telefono}</p>
                              )}
                              {mapLink(m.centro_lat, m.centro_lng, "Mapa acopio")}
                            </div>
                            {esTransportista && !item.reclamo && (
                              <button
                                type="button"
                                style={styles.btnReclamar}
                                disabled={reclamando === `${item.ticket.id}-${m.centro_id}`}
                                onClick={() => reclamar(item.ticket.id, m)}
                              >
                                <Truck size={14} />
                                Me ofrezco
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {rechazoModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ margin: "0 0 8px" }}>Motivo del rechazo</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
              Indique por qué no puede realizar este traslado. El administrador recibirá una notificación.
            </p>
            <textarea
              value={rechazoNota}
              onChange={(e) => setRechazoNota(e.target.value)}
              placeholder="Ej: No tengo capacidad de carga para este volumen…"
              rows={4}
              style={styles.textarea}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" style={styles.btnRefresh} onClick={() => { setRechazoModal(null); setRechazoNota(""); }}>
                Cancelar
              </button>
              <button
                type="button"
                style={{ ...styles.btnReclamar, background: "#b91c1c", color: "#fff" }}
                disabled={rechazoNota.trim().length < 5 || respondiendo === rechazoModal.matchId}
                onClick={() => responderReclamo(rechazoModal.matchId, false, rechazoNota.trim())}
              >
                Enviar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "var(--s4)" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--s3)",
  },
  title: { margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--brand)" },
  subtitle: { margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "560px" },
  btnRefresh: {
    display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px",
    borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)",
    fontSize: "13px", fontWeight: 600, cursor: "pointer",
  },
  infoBar: { fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "8px", flexWrap: "wrap" },
  geoNote: {
    display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px",
    borderRadius: "var(--radius-sm)", background: "#eef2ff", color: "#3730a3",
    fontSize: "13px", border: "1px solid #c7d2fe",
  },
  diagBox: {
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "var(--radius-sm)",
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px",
  },
  diagHeader: {
    display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
    fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em",
  },
  diagGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px",
  },
  diagItem: {
    display: "flex", flexDirection: "column", gap: "2px", padding: "8px 10px",
    background: "#fff", borderRadius: "var(--radius-sm)", border: "1px solid #eef2f7",
  },
  diagValue: { fontSize: "20px", fontWeight: 800, color: "var(--text)", lineHeight: 1.1 },
  diagLabel: { fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.3 },
  diagHint: {
    margin: 0, fontSize: "12px", color: "#92400e", background: "#fffbeb",
    border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", padding: "8px 10px",
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px",
    borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "#b91c1c", fontSize: "13px",
  },
  center: { display: "flex", justifyContent: "center", padding: "48px" },
  spinner: {
    width: "36px", height: "36px", border: "4px solid var(--border)",
    borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 1s linear infinite",
  },
  empty: {
    textAlign: "center", padding: "48px", color: "var(--text-muted)",
    background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
  },
  list: { display: "flex", flexDirection: "column", gap: "16px" },
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px", boxShadow: "var(--shadow-sm)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "12px" },
  badge: {
    fontSize: "10px", fontWeight: 800, padding: "2px 8px",
    borderRadius: "var(--radius-pill)", textTransform: "uppercase",
  },
  needTitle: { margin: "6px 0 2px", fontSize: "16px", fontWeight: 700 },
  needMeta: { margin: 0, fontSize: "12px", color: "var(--text-muted)" },
  extLink: { fontSize: "12px", color: "var(--brand)", display: "flex", alignItems: "center", gap: "4px" },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 1.2fr)",
    gap: "14px",
    alignItems: "stretch",
  },
  partyBox: {
    padding: "12px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--surface-2)",
  },
  partyTitle: {
    margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--brand)",
    display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase",
  },
  partyLine: { margin: "0 0 4px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" },
  mapLink: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--brand)", marginTop: "6px" },
  matchList: { display: "flex", flexDirection: "column", gap: "8px" },
  matchRow: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px",
    padding: "8px", background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
  },
  matchInfo: { flex: 1, minWidth: 0 },
  matchTop: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  scoreBadge: {
    fontSize: "10px", fontWeight: 700, padding: "2px 6px",
    borderRadius: "var(--radius-pill)", background: "#eff6ff", color: "#2563eb",
  },
  matchSub: { margin: "4px 0 0", fontSize: "11px", color: "var(--text-muted)" },
  btnReclamar: {
    display: "inline-flex", alignItems: "center", gap: "4px", padding: "8px 10px",
    borderRadius: "var(--radius-sm)", border: "none", background: "var(--brand)", color: "#fff",
    fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
  },
  btnConfirm: {
    display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px",
    padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "none",
    background: "#16a34a", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
  },
  linkDespacho: { display: "inline-block", marginTop: "8px", fontSize: "12px", color: "var(--brand)" },
  noMatch: { margin: 0, fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modalBox: {
    background: "var(--surface)", borderRadius: "var(--radius)", padding: 20,
    maxWidth: 420, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  },
  textarea: {
    width: "100%", padding: 10, borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", fontSize: 13, resize: "vertical", boxSizing: "border-box",
  },
};
