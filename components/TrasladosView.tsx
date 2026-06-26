"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Traslado, TIPOS_TRASLADO, tipoTrasladoInfo } from "@/lib/types";
import { getReporterToken } from "@/lib/reporter-token";
import LocationPicker from "./LocationPicker";
import { MapPin, Navigation, MessageCircle, Truck } from "lucide-react";

export default function TrasladosView() {
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [tipo, setTipo] = useState("persona");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [contacto, setContacto] = useState("");
  const [prioridad, setPrioridad] = useState<"alta" | "media" | "baja">("alta");
  const [cuando, setCuando] = useState("Lo antes posible");
  
  const [origenLat, setOrigenLat] = useState<number | null>(null);
  const [origenLng, setOrigenLng] = useState<number | null>(null);
  const [origenRef, setOrigenRef] = useState("");
  
  const [destinoLat, setDestinoLat] = useState<number | null>(null);
  const [destinoLng, setDestinoLng] = useState<number | null>(null);
  const [destinoRef, setDestinoRef] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<"todos" | "pendientes">("pendientes");
  
  // Prompt Modal
  const [operadorModal, setOperadorModal] = useState<{id: string, nuevoEstado: string, currentOperador?: string} | null>(null);
  const [operadorInput, setOperadorInput] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("traslados")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTraslados(data as Traslado[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("traslados_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "traslados" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function submit() {
    setErr(null);
    if (!origenLat || !destinoLat) return setErr("Debes indicar tanto el Origen como el Destino en el mapa.");
    if (!origenRef.trim() || !destinoRef.trim()) return setErr("Escribe una referencia para el origen y el destino.");
    if (!contacto.trim()) return setErr("Agrega un número de contacto.");

    setSaving(true);
    const { error } = await supabase.from("traslados").insert({
      tipo,
      descripcion: descripcion || null,
      cantidad: cantidad || null,
      origen_ref: origenRef,
      origen_lat: origenLat,
      origen_lng: origenLng,
      destino_ref: destinoRef,
      destino_lat: destinoLat,
      destino_lng: destinoLng,
      prioridad,
      contacto,
      cuando,
      reporter_token: getReporterToken(),
    });

    setSaving(false);
    if (error) {
      setErr("Error al solicitar el traslado. Intenta de nuevo.");
    } else {
      setShowForm(false);
      // Reset form
      setDescripcion(""); setCantidad(""); setContacto(""); setOrigenRef(""); setDestinoRef("");
    }
  }

  async function updateEstado(id: string, nuevoEstado: string, operadorVal?: string, currentOperador?: string) {
    if ((nuevoEstado === "asignado" || nuevoEstado === "en_camino") && operadorVal === undefined) {
      setOperadorModal({ id, nuevoEstado, currentOperador });
      setOperadorInput(currentOperador || "");
      return;
    }
      
    const payload: any = { estado: nuevoEstado };
    if (operadorVal) payload.operador = operadorVal;
    
    await supabase.from("traslados").update(payload).eq("id", id);
    setOperadorModal(null);
  }

  async function generarDespacho(t: Traslado) {
    const i = tipoTrasladoInfo(t.tipo);
    const mapOrigen = `https://www.google.com/maps/search/?api=1&query=${t.origen_lat},${t.origen_lng}`;
    const mapDestino = `https://www.google.com/maps/search/?api=1&query=${t.destino_lat},${t.destino_lng}`;
    
    const texto = `🚨 *SOLICITUD DE TRASLADO* (${t.prioridad.toUpperCase()})\n\n`
      + `*Tipo:* ${i.emoji} ${i.label}\n`
      + `*Qué/Quién:* ${t.descripcion || "No especificado"}\n`
      + `*Cantidad:* ${t.cantidad || "N/A"}\n\n`
      + `📍 *ORIGEN:* ${t.origen_ref}\n${mapOrigen}\n\n`
      + `🏁 *DESTINO:* ${t.destino_ref}\n${mapDestino}\n\n`
      + `📞 *Contacto:* ${t.contacto}\n`
      + `🕒 *Cuándo:* ${t.cuando}\n\n`
      + `_Si puedes tomar este servicio, avisa para coordinar._`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        setAlertMessage("¡Texto de despacho copiado al portapapeles! Listo para enviar por WhatsApp.");
      } else {
        // Fallback for older browsers / http
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setAlertMessage("¡Texto de despacho copiado al portapapeles! Listo para enviar por WhatsApp.");
        } catch (err) {
          setAlertMessage("Tu dispositivo bloqueó el copiado automático. Por favor verifica tus permisos.");
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Clipboard error:", err);
      setAlertMessage("Tu dispositivo bloqueó el copiado automático. Por favor verifica tus permisos.");
    }
  }

  const filtered = filter === "pendientes" 
    ? traslados.filter(t => t.estado === "solicitado" || t.estado === "asignado" || t.estado === "en_camino")
    : traslados;

  return (
    <div className="list traslados-view">
      <div className="list__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s4)", gap: "var(--s3)", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <h2 className="list__section-title" style={{ margin: 0 }}>🚚 Traslados Logísticos</h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Registra o coordina vehículos para mover insumos y personas.</p>
        </div>
        {!showForm && (
          <button className="btn btn--primary" onClick={() => setShowForm(true)} style={{ width: "auto", padding: "0 var(--s3)", height: "36px", minHeight: "36px", whiteSpace: "nowrap" }}>
            + Solicitar un Traslado
          </button>
        )}
      </div>

      {showForm ? (
        <div className="form" style={{ marginBottom: "var(--s6)", padding: 0 }}>
          <div className="form__header" style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 className="form__title">Solicitar Traslado</h3>
            <button className="btn-close" onClick={() => setShowForm(false)} aria-label="Cerrar form">×</button>
          </div>

          <div className="form__field">
            <label className="form__label">¿Qué necesitas trasladar?</label>
            <select className="form__input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_TRASLADO.map(t => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>

          <div className="form__row">
            <div className="form__field">
              <label className="form__label">Descripción detallada</label>
              <input className="form__input" placeholder="Ej: 2 cajas de gasas / Silla de ruedas" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
            <div className="form__field">
              <label className="form__label">Cantidad / Peso</label>
              <input className="form__input" placeholder="Ej: 3 personas / 15kg" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            </div>
          </div>

          <div className="form__field" style={{ padding: "var(--s3)", background: "#EFF6FF", borderRadius: "var(--radius)", border: "1px solid #BFDBFE" }}>
            <label className="form__label" style={{ color: "#1E3A8A" }}>📍 1. PUNTO DE ORIGEN</label>
            <p className="form__hint" style={{ color: "#3B82F6" }}>¿Dónde se recoge?</p>
            <LocationPicker lat={origenLat} lng={origenLng} onChange={(lat, lng) => { setOrigenLat(lat); setOrigenLng(lng); }} />
            <input className="form__input" style={{ marginTop: "var(--s2)" }} placeholder="Referencia del origen (Ej: Hospital Pérez Carreño, puerta principal)" value={origenRef} onChange={e => setOrigenRef(e.target.value)} />
          </div>

          <div className="form__field" style={{ padding: "var(--s3)", background: "#F0FDF4", borderRadius: "var(--radius)", border: "1px solid #BBF7D0" }}>
            <label className="form__label" style={{ color: "#166534" }}>🏁 2. PUNTO DE DESTINO</label>
            <p className="form__hint" style={{ color: "#22C55E" }}>¿A dónde va?</p>
            <LocationPicker lat={destinoLat} lng={destinoLng} onChange={(lat, lng) => { setDestinoLat(lat); setDestinoLng(lng); }} />
            <input className="form__input" style={{ marginTop: "var(--s2)" }} placeholder="Referencia del destino (Ej: Centro de acopio UCV)" value={destinoRef} onChange={e => setDestinoRef(e.target.value)} />
          </div>

          <div className="form__row">
            <div className="form__field">
              <label className="form__label">Prioridad</label>
              <select className="form__input" value={prioridad} onChange={(e) => setPrioridad(e.target.value as any)}>
                <option value="alta">🔴 Alta (Urgente)</option>
                <option value="media">🟡 Media</option>
                <option value="baja">🔵 Baja</option>
              </select>
            </div>
            <div className="form__field">
              <label className="form__label">¿Cuándo?</label>
              <input className="form__input" placeholder="Ej: Lo antes posible" value={cuando} onChange={e => setCuando(e.target.value)} />
            </div>
          </div>

          <div className="form__field">
            <label className="form__label">Contacto</label>
            <input className="form__input" placeholder="Teléfono del responsable" value={contacto} onChange={e => setContacto(e.target.value)} />
          </div>

          {err && <div className="form__error">⚠️ {err}</div>}

          <button className="btn btn--submit" onClick={submit} disabled={saving}>
            {saving ? "Solicitando..." : "Publicar Solicitud de Traslado"}
          </button>
        </div>
      ) : (
        <>
          <div className="tabs-sub" style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)" }}>
            <button className={`btn-subtab ${filter === "pendientes" ? "active" : ""}`} onClick={() => setFilter("pendientes")} style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: filter === "pendientes" ? "var(--brand)" : "var(--surface)", color: filter === "pendientes" ? "#fff" : "var(--text)", fontWeight: 600 }}>Activos</button>
            <button className={`btn-subtab ${filter === "todos" ? "active" : ""}`} onClick={() => setFilter("todos")} style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: filter === "todos" ? "var(--brand)" : "var(--surface)", color: filter === "todos" ? "#fff" : "var(--text)", fontWeight: 600 }}>Historial</button>
          </div>

          <div className="traslados-list" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            {loading ? (
              <p className="text-muted">Cargando traslados...</p>
            ) : filtered.length === 0 ? (
              <div className="empty" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <Truck size={40} color="var(--border-dark)" style={{ marginBottom: "var(--s2)" }} />
                <p className="empty__title">No hay traslados {filter === "pendientes" ? "activos" : ""}</p>
                <p className="empty__desc">Puedes solicitar logística de transporte para enviar o recoger insumos, medicamentos o voluntarios.</p>
              </div>
            ) : (
              filtered.map(t => {
                const i = tipoTrasladoInfo(t.tipo);
                const rutaUrl = `https://www.google.com/maps/dir/?api=1&origin=${t.origen_lat},${t.origen_lng}&destination=${t.destino_lat},${t.destino_lng}`;
                
                return (
                  <article className="card" key={t.id} style={{ opacity: t.estado === "completado" ? 0.7 : 1 }}>
                    <div className="card__top" style={{ marginBottom: "var(--s2)" }}>
                      <h3 className="card__title">
                        {i.emoji} {i.label}
                      </h3>
                      <div style={{ display: "flex", gap: "var(--s1)" }}>
                        <span className={`badge badge--${t.prioridad}`}>{t.prioridad}</span>
                        <span className="badge" style={{ 
                          background: t.estado === 'completado' ? '#F0FDF4' : t.estado === 'en_camino' ? '#EFF6FF' : t.estado === 'asignado' ? '#FFFBEB' : '#FEF2F2',
                          color: t.estado === 'completado' ? '#16A34A' : t.estado === 'en_camino' ? '#1D4ED8' : t.estado === 'asignado' ? '#B45309' : '#DC2626',
                          border: "1px solid currentColor", opacity: 0.8
                        }}>
                          {t.estado.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <p className="card__meta" style={{ color: "var(--text)", fontWeight: 500 }}>{t.descripcion} {t.cantidad ? `(${t.cantidad})` : ""}</p>
                    
                    <div style={{ margin: "var(--s3) 0", display: "grid", gridTemplateColumns: "24px 1fr", gap: "4px", fontSize: "var(--text-sm)" }}>
                      <div style={{ color: "#3B82F6", display: "flex", justifyContent: "center" }}><MapPin size={16} /></div>
                      <div><strong style={{ color: "#1E3A8A" }}>Origen:</strong> {t.origen_ref}</div>
                      
                      <div style={{ color: "#22C55E", display: "flex", justifyContent: "center" }}><MapPin size={16} /></div>
                      <div><strong style={{ color: "#166534" }}>Destino:</strong> {t.destino_ref}</div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "var(--s2)" }}>
                      <div>
                        <p className="card__meta">📞 {t.contacto} · 🕒 {t.cuando}</p>
                        {t.operador ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginTop: "var(--s2)", background: "var(--brand-soft)", padding: "var(--s2)", borderRadius: "var(--radius)", color: "var(--brand-dark)" }}>
                            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                              <span>🚚 Operador:</span> <span>{t.operador}</span>
                            </div>
                            {t.estado !== "completado" && (
                              <button className="btn" style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer", marginLeft: "auto", fontSize: "14px" }} onClick={() => {
                                setOperadorModal({ id: t.id, nuevoEstado: t.estado, currentOperador: t.operador });
                                setOperadorInput(t.operador || "");
                              }}>
                                ✏️
                              </button>
                            )}
                          </div>
                        ) : (
                          t.estado !== "completado" && (
                            <div style={{ marginTop: "var(--s2)" }}>
                              <button className="card__action card__action--secondary" onClick={() => {
                                setOperadorModal({ id: t.id, nuevoEstado: t.estado, currentOperador: "" });
                                setOperadorInput("");
                              }} style={{ fontSize: "var(--text-xs)", padding: "4px 8px" }}>
                                + Asignar Operador
                              </button>
                            </div>
                          )
                        )}
                      </div>
                      
                      {t.estado !== "completado" && (
                        <div style={{ display: "flex", gap: "var(--s2)", width: "100%", marginTop: "var(--s2)" }}>
                          <button className="btn btn--secondary" onClick={() => generarDespacho(t)} style={{ flex: 1, padding: "var(--s2)" }} title="Armar texto WhatsApp">
                            <MessageCircle size={16} style={{ marginRight: "4px" }} /> Despachar
                          </button>
                          <a href={rutaUrl} target="_blank" rel="noreferrer" className="btn btn--primary" style={{ flex: 1, padding: "var(--s2)", textDecoration: "none", display: "flex", justifyContent: "center" }}>
                            <Navigation size={16} style={{ marginRight: "4px" }} /> Ruta
                          </a>
                        </div>
                      )}
                    </div>

                    {t.estado !== "completado" && (
                      <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s3)", paddingTop: "var(--s3)", borderTop: "1px solid var(--border)" }}>
                        {t.estado === "solicitado" && <button className="card__action card__action--secondary" onClick={() => updateEstado(t.id, "asignado", undefined, t.operador)}>Asignar operador</button>}
                        {(t.estado === "solicitado" || t.estado === "asignado") && <button className="card__action card__action--secondary" onClick={() => updateEstado(t.id, "en_camino", undefined, t.operador)}>En camino</button>}
                        {t.estado === "en_camino" && <button className="card__action card__action--primary" onClick={() => updateEstado(t.id, "completado")}>✓ Marcar Completado</button>}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {/* MODAL OPERADOR */}
      {operadorModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">¿Quién toma este traslado?</h3>
              <button className="modal__close" onClick={() => setOperadorModal(null)}>×</button>
            </div>
            <div className="modal__body">
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--s3)" }}>
                Ejemplo: Yummy, Ridery, Paramédico Andrés, Voluntario Carlos.
              </p>
              <input
                type="text"
                className="form__input"
                placeholder="Nombre o entidad"
                value={operadorInput}
                onChange={(e) => setOperadorInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal__footer" style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s4)" }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setOperadorModal(null)}>Cancelar</button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => updateEstado(operadorModal.id, operadorModal.nuevoEstado, operadorInput)}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERT */}
      {alertMessage && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Aviso</h3>
              <button className="modal__close" onClick={() => setAlertMessage(null)}>×</button>
            </div>
            <div className="modal__body">
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-md)", margin: 0 }}>
                {alertMessage}
              </p>
            </div>
            <div className="modal__footer" style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--s4)" }}>
              <button className="btn btn--primary" onClick={() => setAlertMessage(null)} style={{ padding: "0 var(--s5)" }}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
