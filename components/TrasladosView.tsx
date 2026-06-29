"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ratesClient } from "@/lib/rates-client";
import { Traslado, TIPOS_TRASLADO, tipoTrasladoInfo, SolicitudGasolina } from "@/lib/types";
import { getReporterToken } from "@/lib/reporter-token";
import LocationPicker from "./LocationPicker";
import { MapPin, Navigation, Truck, MessageCircle } from "lucide-react";

interface OperadorData {
  nombre: string;
  cedula: string;
  telefono: string;
  modelo: string;
  placa: string;
  unidad: string;
  puestos: string;
  ciudad: string;
  linea: string;
  estado: string;
}

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
  const [filter, setFilter] = useState<"todos" | "pendientes" | "gasolina">("pendientes");
  
  // Prompt Modal
  const [operadorModal, setOperadorModal] = useState<{id: string, nuevoEstado: string, currentOperador?: string} | null>(null);
  const [operadorData, setOperadorData] = useState<OperadorData>({ nombre: "", cedula: "", telefono: "", modelo: "", placa: "", unidad: "", puestos: "", ciudad: "", linea: "", estado: "" });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // View Operador Modal
  const [viewOperadorModal, setViewOperadorModal] = useState<{traslado: Traslado, opData: OperadorData} | null>(null);

  // Gasolina integration states
  const [gasolinaSolicitudes, setGasolinaSolicitudes] = useState<SolicitudGasolina[]>([]);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [gasolinaModal, setGasolinaModal] = useState<Traslado | null>(null);
  const [gasForm, setGasForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    placa: "",
    marca: "",
    modelo: "",
    motivo: "",
    telefono: "",
    litros: "",
    tipo_vehiculo: "carro",
    banco: "0102"
  });
  const [gasError, setGasError] = useState("");
  const [gasSuccess, setGasSuccess] = useState(false);
  const [gasLoading, setGasLoading] = useState(false);

  async function loadGasolinaData() {
    try {
      if (ratesClient) {
        const { data: ratesData } = await ratesClient
          .from("rates")
          .select("*")
          .eq("code", "USD")
          .order("rate_datetime", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ratesData) setUsdRate(ratesData.rate);
      }
      
      const { data, error } = await supabase
        .from("solicitudes_gasolina")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setGasolinaSolicitudes(data as SolicitudGasolina[]);
      }
    } catch (e) {
      console.error("Error cargando datos de gasolina:", e);
    }
  }

  function openGasolinaModal(t: Traslado) {
    let opData: any = {};
    if (t.operador) {
      try {
        const parsed = JSON.parse(t.operador);
        if (parsed && typeof parsed === 'object') opData = parsed;
      } catch (e) {}
    }
    
    const nombreCompleto = opData.nombre || "";
    const nameParts = nombreCompleto.trim().split(/\s+/);
    const parsedNombre = nameParts[0] || "";
    const parsedApellido = nameParts.slice(1).join(" ") || "";

    // Auto-detectar tipo de vehículo
    let detectedType = "carro";
    const puestos = parseInt(opData.puestos) || 0;
    const modeloUpper = (opData.modelo || "").toUpperCase();
    if (modeloUpper.includes("BUS") || modeloUpper.includes("MINIBUS") || modeloUpper.includes("ENCAVA") || puestos > 9) {
      detectedType = "autobus";
    } else if (modeloUpper.includes("MOTO") || modeloUpper.includes("MOTOCICLETA") || modeloUpper.includes("SCOOTER")) {
      detectedType = "moto";
    }

    setGasForm({
      nombre: parsedNombre,
      apellido: parsedApellido,
      cedula: opData.cedula || "",
      placa: opData.placa || "",
      marca: "",
      modelo: opData.modelo || "",
      motivo: `Combustible para traslado logístico #${t.id.slice(0, 8)}: ${t.descripcion || ""}`,
      telefono: opData.telefono || t.contacto || "",
      litros: "",
      tipo_vehiculo: detectedType,
      banco: "0102"
    });
    setGasError("");
    setGasSuccess(false);
    setGasolinaModal(t);
  }

  async function submitGasolina(e: React.FormEvent) {
    e.preventDefault();
    setGasError("");
    setGasSuccess(false);
    setGasLoading(true);

    const { nombre, apellido, cedula, placa, marca, modelo, motivo, telefono, litros, tipo_vehiculo, banco } = gasForm;

    if (!nombre || !apellido || !cedula || !placa || !marca || !modelo || !motivo || !telefono || !litros || !tipo_vehiculo || !banco) {
      setGasError("Todos los campos son obligatorios.");
      setGasLoading(false);
      return;
    }

    const litrosNum = parseFloat(litros);
    if (isNaN(litrosNum) || litrosNum <= 0) {
      setGasError("La cantidad de litros debe ser un número válido mayor a 0.");
      setGasLoading(false);
      return;
    }

    try {
      // Validar acumulados por cédula
      const { data: previous, error: errAccum } = await supabase
        .from("solicitudes_gasolina")
        .select("litros")
        .eq("cedula", cedula.trim())
        .not("estado", "eq", "rechazado");

      if (errAccum) throw errAccum;

      const accumulated = (previous || []).reduce((acc, curr) => acc + (parseFloat(curr.litros) || 0), 0);
      const limit = tipo_vehiculo === "moto" ? 40 : tipo_vehiculo === "carro" ? 60 : 120;

      let targetEstado = "pendiente";
      let exceedsLimit = false;

      if (accumulated + litrosNum > limit) {
        targetEstado = "pendiente_autorizacion";
        exceedsLimit = true;
      }

      const { error } = await supabase.from("solicitudes_gasolina").insert({
        nombre,
        apellido,
        cedula: cedula.trim(),
        placa,
        marca,
        modelo,
        motivo,
        telefono,
        litros: litrosNum,
        tipo_vehiculo,
        banco,
        traslado_id: gasolinaModal?.id,
        estado: targetEstado
      });

      if (error) throw error;

      setGasSuccess(true);
      if (exceedsLimit) {
        setGasError(`⚠️ La recarga acumulada (${accumulated + litrosNum}L) supera el límite de ${limit}L para ${tipo_vehiculo === "moto" ? "motos" : tipo_vehiculo === "carro" ? "carros" : "autobuses"}. Se registró como 'Pendiente de Autorización'.`);
      }

      setTimeout(() => {
        setGasolinaModal(null);
        setGasSuccess(false);
        setGasError("");
        loadGasolinaData();
      }, exceedsLimit ? 5000 : 1500);

    } catch (err: any) {
      setGasError(err.message || "Error al enviar la solicitud.");
    } finally {
      setGasLoading(false);
    }
  }

  async function marcarGasolinaSuministrado(id: string) {
    if (!confirm("¿Confirmas que ya se suministró la gasolina y deseas procesar el Pago Móvil en tiempo real por Muney?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/combustible/pagar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ solicitudId: id })
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(`Error al procesar el pago: ${data.error}`);
      } else {
        alert("✅ ¡Pago Móvil procesado con éxito en tiempo real por Muney!");
      }
      loadGasolinaData();
    } catch (error: any) {
      alert(`Error de red: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function autorizarGasolina(id: string) {
    if (!confirm("¿Confirmas que deseas autorizar esta recarga de combustible que supera el límite?")) return;
    try {
      await supabase
        .from("solicitudes_gasolina")
        .update({ estado: "pendiente" })
        .eq("id", id);
      loadGasolinaData();
    } catch (error) {
      console.error("Error al autorizar gasolina:", error);
    }
  }

  async function load() {
    try {
      const { data, error } = await supabase
        .from("traslados")
        .select("*")
        // Solo traslados creados desde esta página (tienen reporter_token).
        // Los espejos de Ayuda en Camino no tienen token y no deben mostrarse aquí.
        .not("reporter_token", "is", null)
        .order("created_at", { ascending: false });
      if (error) console.error("Error cargando traslados:", error);
      const publicos = (data || []).filter((t) => Boolean(t.reporter_token?.trim()));
      setTraslados(publicos as Traslado[]);
    } catch (err) {
      console.error("Excepción en load():", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadGasolinaData();
    const ch = supabase
      .channel("traslados_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "traslados" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_gasolina" }, loadGasolinaData)
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
      load();
    }
  }

  async function updateEstado(id: string, nuevoEstado: string, operadorVal?: string, currentOperador?: string) {
    if ((nuevoEstado === "asignado" || nuevoEstado === "en_camino") && operadorVal === undefined) {
      setOperadorModal({ id, nuevoEstado, currentOperador });
      if (currentOperador) {
        try {
          const parsed = JSON.parse(currentOperador);
          if (parsed && typeof parsed === 'object') {
            setOperadorData({
              nombre: parsed.nombre || "",
              cedula: parsed.cedula || "",
              telefono: parsed.telefono || "",
              modelo: parsed.modelo || "",
              placa: parsed.placa || "",
              unidad: parsed.unidad || "",
              puestos: parsed.puestos || "",
              ciudad: parsed.ciudad || "",
              linea: parsed.linea || "",
              estado: parsed.estado || ""
            });
            return;
          }
        } catch (e) {
          // fallthrough
        }
        // Legacy string
        setOperadorData({ nombre: currentOperador, cedula: "", telefono: "", modelo: "", placa: "", unidad: "", puestos: "", ciudad: "", linea: "", estado: "" });
      } else {
        setOperadorData({ nombre: "", cedula: "", telefono: "", modelo: "", placa: "", unidad: "", puestos: "", ciudad: "", linea: "", estado: "" });
      }
      return;
    }
      
    const payload: any = { estado: nuevoEstado };
    if (operadorVal !== undefined) payload.operador = operadorVal;
    
    try {
      const { error } = await supabase.from("traslados").update(payload).eq("id", id);
      if (error) throw error;
      load();
      setOperadorModal(null);
    } catch (err: any) {
      console.error("Error al actualizar estado del traslado:", err);
      alert(`Error al actualizar estado del traslado: ${err.message || err}`);
    }
  }

  async function generarDespacho(t: Traslado) {
    const i = tipoTrasladoInfo(t.tipo);
    const mapOrigen = `https://www.google.com/maps/search/?api=1&query=${t.origen_lat},${t.origen_lng}`;
    const mapDestino = `https://www.google.com/maps/search/?api=1&query=${t.destino_lat},${t.destino_lng}`;
    
    const texto = `🚨 *SOLICITUD DE TRASLADO* (${(t.prioridad || "baja").toUpperCase()})\n\n`
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
    : traslados.filter(t => t.estado === "completado" || t.estado === "solventado_externo");

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
          <div className="tabs-sub" style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)", flexWrap: "wrap" }}>
            <button className={`btn-subtab ${filter === "pendientes" ? "active" : ""}`} onClick={() => setFilter("pendientes")} style={{ flex: 1, minWidth: "100px", padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: filter === "pendientes" ? "var(--brand)" : "var(--surface)", color: filter === "pendientes" ? "#fff" : "var(--text)", fontWeight: 600 }}>Activos</button>
            <button className={`btn-subtab ${filter === "todos" ? "active" : ""}`} onClick={() => setFilter("todos")} style={{ flex: 1, minWidth: "100px", padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: filter === "todos" ? "var(--brand)" : "var(--surface)", color: filter === "todos" ? "#fff" : "var(--text)", fontWeight: 600 }}>Historial</button>
            <button className={`btn-subtab ${filter === "gasolina" ? "active" : ""}`} onClick={() => setFilter("gasolina")} style={{ flex: 1, minWidth: "100px", padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: filter === "gasolina" ? "var(--brand)" : "var(--surface)", color: filter === "gasolina" ? "#fff" : "var(--text)", fontWeight: 600 }}>⛽ Combustible</button>
          </div>

          {filter === "gasolina" ? (
            <div className="gasolina-list" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
              {loading && gasolinaSolicitudes.length === 0 ? (
                <p className="text-muted">Cargando solicitudes de combustible...</p>
              ) : gasolinaSolicitudes.length === 0 ? (
                <div className="empty" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: "40px", marginBottom: "var(--s2)" }}>⛽</div>
                  <p className="empty__title">Sin solicitudes registradas</p>
                  <p className="empty__desc">Aún no hay solicitudes de llenado de combustible.</p>
                </div>
              ) : (
                gasolinaSolicitudes.map((s) => {
                  const costoUSD = s.litros * 0.5;
                  const costoBs = usdRate ? (costoUSD * usdRate).toFixed(2) : null;

                  let badgeBg = "#FFFBEB";
                  let badgeColor = "#D97706";
                  let badgeText = "⏳ Pendiente Pago";
                  if (s.estado === "suministrado") {
                    badgeBg = "#F0FDF4";
                    badgeColor = "#16A34A";
                    badgeText = "✅ Suministrado";
                  } else if (s.estado === "pendiente_autorizacion") {
                    badgeBg = "#FEF2F2";
                    badgeColor = "#EF4444";
                    badgeText = "⚠️ Pendiente Autorización";
                  }

                  const vehiculoIcon = s.tipo_vehiculo === "moto" ? "🏍️" : s.tipo_vehiculo === "autobus" ? "🚌" : "🚗";
                  const vehiculoLabel = s.tipo_vehiculo === "moto" ? "Moto" : s.tipo_vehiculo === "autobus" ? "Autobús" : "Carro";

                  return (
                    <article className="card" key={s.id} style={{ opacity: s.estado === "suministrado" ? 0.7 : 1 }}>
                      <div className="card__top" style={{ marginBottom: "var(--s2)" }}>
                        <h3 className="card__title">
                          {vehiculoIcon} {s.marca} {s.modelo} <span style={{ color: "var(--text-muted)", fontSize: "0.85em", fontWeight: 400 }}>({s.placa}) - {vehiculoLabel}</span>
                        </h3>
                        <span className="badge" style={{ 
                          background: badgeBg, 
                          color: badgeColor,
                          border: `1px solid ${badgeColor}33`
                        }}>
                          {badgeText}
                        </span>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)", margin: "var(--s3) 0" }}>
                        <div>
                          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 2px" }}>Solicitante</p>
                          <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, margin: 0 }}>{s.nombre} {s.apellido}</p>
                          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0 }}>C.I: {s.cedula} | 📞 {s.telefono}</p>
                          {s.banco && (
                            <p style={{ fontSize: "11px", color: "var(--brand)", marginTop: "4px", fontWeight: 600 }}>
                              🏦 Banco Receptor: {s.banco}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 2px" }}>Combustible</p>
                          <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: 0 }}>{s.litros} Litros</p>
                          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
                            <strong>${costoUSD.toFixed(2)}</strong> {costoBs && <>| <strong>{costoBs} Bs</strong></>}
                          </p>
                        </div>
                      </div>

                      <div style={{ background: "var(--surface-2)", padding: "var(--s2)", borderRadius: "var(--radius-sm)", marginBottom: "var(--s3)" }}>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 4px", fontWeight: 600 }}>Motivo del Apoyo:</p>
                        <p style={{ fontSize: "var(--text-sm)", margin: 0, fontStyle: "italic" }}>"{s.motivo}"</p>
                      </div>

                      {s.payout_status && (
                        <div style={{ 
                          fontSize: "var(--text-xs)", 
                          padding: "8px", 
                          borderRadius: "var(--radius-sm)", 
                          background: s.payout_status === "exitoso" ? "#EBFDF5" : s.payout_status === "fallido" ? "#FEF2F2" : "var(--surface-2)", 
                          border: `1px solid ${s.payout_status === "exitoso" ? "#A7F3D0" : s.payout_status === "fallido" ? "#FCA5A5" : "var(--border)"}`, 
                          marginBottom: "var(--s3)",
                          color: s.payout_status === "exitoso" ? "#065F46" : s.payout_status === "fallido" ? "#991B1B" : "var(--text)"
                        }}>
                          <strong>Estado de Pago (Muney):</strong> {
                            s.payout_status === "exitoso" ? "💰 Pago Móvil transferido exitosamente en tiempo real" :
                            s.payout_status === "fallido" ? `❌ Falló: ${s.payout_error}` :
                            "⏳ Procesando..."
                          }
                        </div>
                      )}

                      {s.estado === "pendiente_autorizacion" && (
                        <button 
                          className="btn btn--primary" 
                          style={{ width: "100%", padding: "var(--s2)", minHeight: "36px", height: "36px", background: "var(--brand-dark)" }}
                          onClick={() => autorizarGasolina(s.id)}
                        >
                          ✓ Autorizar Recarga (Exceso de límite)
                        </button>
                      )}

                      {s.estado === "pendiente" && (
                        <button 
                          className="btn btn--primary" 
                          style={{ width: "100%", padding: "var(--s2)", minHeight: "36px", height: "36px" }}
                          onClick={() => marcarGasolinaSuministrado(s.id)}
                        >
                          ✓ Procesar Pago Móvil en Tiempo Real
                        </button>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          ) : (
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
                  
                  let opData: OperadorData | null = null;
                  if (t.operador) {
                    try {
                      const parsed = JSON.parse(t.operador);
                      if (parsed && typeof parsed === 'object') opData = parsed;
                    } catch (e) { }
                  }

                  return (
                    <article className="card" key={t.id} style={{ opacity: (t.estado === "completado" || t.estado === "solventado_externo") ? 0.7 : 1 }}>
                      <div className="card__top" style={{ marginBottom: "var(--s2)" }}>
                        <h3 className="card__title">
                          {i.emoji} {i.label}
                        </h3>
                        <div style={{ display: "flex", gap: "var(--s1)" }}>
                          <span className={`badge badge--${t.prioridad || "baja"}`}>{t.prioridad || "baja"}</span>
                          <span className="badge" style={{ 
                            background: t.estado === 'completado' ? '#F0FDF4' : t.estado === 'solventado_externo' ? '#F3F4F6' : t.estado === 'en_camino' ? '#EFF6FF' : t.estado === 'asignado' ? '#FFFBEB' : '#FEF2F2',
                            color: t.estado === 'completado' ? '#16A34A' : t.estado === 'solventado_externo' ? '#4B5563' : t.estado === 'en_camino' ? '#1D4ED8' : t.estado === 'asignado' ? '#B45309' : '#DC2626',
                            border: "1px solid currentColor", opacity: 0.8
                          }}>
                            {t.estado === "solventado_externo" ? "SOLVENTADO POR FUERA" : (t.estado || "solicitado").replace("_", " ").toUpperCase()}
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
                            opData ? (
                              <div 
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: "var(--s2)", marginTop: "var(--s2)", background: "var(--brand-soft)", padding: "var(--s2)", borderRadius: "var(--radius)", color: "var(--brand-dark)", cursor: "pointer", transition: "background 0.2s" }}
                                onClick={() => setViewOperadorModal({ traslado: t, opData: opData as OperadorData })}
                              >
                                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span>🚚 Operador:</span> <span>{opData.nombre || "Operador Asignado"}</span>
                                </div>
                                <button className="btn" style={{ background: "transparent", border: "none", padding: "4px", marginLeft: "auto", fontSize: "14px", color: "var(--brand)", textDecoration: "underline" }}>
                                  Ver detalles
                                </button>
                              </div>
                            ) : (
                              <div 
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: "var(--s2)", marginTop: "var(--s2)", background: "var(--brand-soft)", padding: "var(--s2)", borderRadius: "var(--radius)", color: "var(--brand-dark)", cursor: "pointer", transition: "background 0.2s" }}
                                onClick={() => {
                                  setViewOperadorModal({ traslado: t, opData: { nombre: t.operador || "", cedula: "", telefono: "", modelo: "", placa: "", unidad: "", puestos: "", ciudad: "", linea: "", estado: "" } })
                                }}
                              >
                                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span>🚚 Operador:</span> <span>{t.operador}</span>
                                </div>
                                <button className="btn" style={{ background: "transparent", border: "none", padding: "4px", marginLeft: "auto", fontSize: "14px", color: "var(--brand)", textDecoration: "underline" }}>
                                  Ver detalles
                                </button>
                              </div>
                            )
                          ) : (
                            t.estado !== "completado" && t.estado !== "solventado_externo" && (
                              <div style={{ marginTop: "var(--s2)", width: "100%" }}>
                                <button className="card__action card__action--secondary" onClick={() => {
                                  updateEstado(t.id, t.estado, undefined, "");
                                }} style={{ fontSize: "var(--text-xs)", padding: "4px 8px", width: "auto" }}>
                                  + Asignar Operador
                                </button>
                              </div>
                            )
                          )}
                        </div>
                        
                        {t.estado !== "completado" && t.estado !== "solventado_externo" && (
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

                       {t.estado !== "completado" && t.estado !== "solventado_externo" && (
                        <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s3)", paddingTop: "var(--s3)", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                          {t.estado === "solicitado" && <button className="card__action card__action--secondary" onClick={() => updateEstado(t.id, "asignado", undefined, t.operador)}>Asignar operador</button>}
                          {(t.estado === "solicitado" || t.estado === "asignado") && <button className="card__action card__action--secondary" onClick={() => updateEstado(t.id, "en_camino", undefined, t.operador)}>En camino</button>}
                          {t.estado === "en_camino" && <button className="card__action card__action--primary" onClick={() => updateEstado(t.id, "completado")}>✓ Marcar Completado</button>}
                          {t.operador && (
                            <button className="card__action card__action--secondary" onClick={() => openGasolinaModal(t)} style={{ borderColor: "var(--brand)", color: "var(--brand)" }}>
                              ⛽ Solicitar Combustible
                            </button>
                          )}
                          <button className="card__action card__action--danger" onClick={() => updateEstado(t.id, "solventado_externo")}>✖ Solventado por fuera</button>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL OPERADOR */}
      {operadorModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="modal__title" style={{ margin: 0 }}>¿Quién toma este traslado?</h3>
              <button className="modal__icon-close" onClick={() => setOperadorModal(null)}>✕</button>
            </div>
            <div className="modal__body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--s4)" }}>
                Ingresa los datos del conductor, voluntario o entidad que realizará este traslado.
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--s3)" }}>
                <div>
                  <label className="form__label">Nombre completo / Entidad</label>
                  <input type="text" className="form__input" placeholder="Ej. Yummy, Ridery, Voluntario Carlos" value={operadorData.nombre} onChange={e => setOperadorData({...operadorData, nombre: e.target.value})} autoFocus />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
                  <div>
                    <label className="form__label">Cédula</label>
                    <input type="text" className="form__input" placeholder="V-12345678" value={operadorData.cedula} onChange={e => setOperadorData({...operadorData, cedula: e.target.value})} />
                  </div>
                  <div>
                    <label className="form__label">Teléfono</label>
                    <input type="text" className="form__input" placeholder="0414-0000000" value={operadorData.telefono} onChange={e => setOperadorData({...operadorData, telefono: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
                  <div>
                    <label className="form__label">Modelo del vehículo</label>
                    <input type="text" className="form__input" placeholder="Toyota Corolla" value={operadorData.modelo} onChange={e => setOperadorData({...operadorData, modelo: e.target.value})} />
                  </div>
                  <div>
                    <label className="form__label">Placa</label>
                    <input type="text" className="form__input" placeholder="AB123CD" value={operadorData.placa} onChange={e => setOperadorData({...operadorData, placa: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
                  <div>
                    <label className="form__label">Nº de Unidad</label>
                    <input type="text" className="form__input" placeholder="001" value={operadorData.unidad} onChange={e => setOperadorData({...operadorData, unidad: e.target.value})} />
                  </div>
                  <div>
                    <label className="form__label">Puestos</label>
                    <input type="text" className="form__input" placeholder="4" value={operadorData.puestos} onChange={e => setOperadorData({...operadorData, puestos: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="form__label">Línea (si aplica)</label>
                  <input type="text" className="form__input" placeholder="Ej. Línea Los Rápidos, Yummy Rides" value={operadorData.linea} onChange={e => setOperadorData({...operadorData, linea: e.target.value})} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
                  <div>
                    <label className="form__label">Estado</label>
                    <input type="text" className="form__input" placeholder="Miranda" value={operadorData.estado} onChange={e => setOperadorData({...operadorData, estado: e.target.value})} />
                  </div>
                  <div>
                    <label className="form__label">Ciudad</label>
                    <input type="text" className="form__input" placeholder="Caracas" value={operadorData.ciudad} onChange={e => setOperadorData({...operadorData, ciudad: e.target.value})} />
                  </div>
                </div>
              </div>

            </div>
            <div className="modal__footer" style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s4)" }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setOperadorModal(null)}>Cancelar</button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => updateEstado(operadorModal.id, operadorModal.nuevoEstado, JSON.stringify(operadorData))}>
                Guardar Operador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER OPERADOR */}
      {viewOperadorModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "var(--s3)", marginBottom: "var(--s3)" }}>
              <h3 className="modal__title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>🚚 Datos del Operador</h3>
              <button className="modal__icon-close" onClick={() => setViewOperadorModal(null)}>✕</button>
            </div>
            <div className="modal__body" style={{ color: "var(--text)" }}>
              <div style={{ background: "var(--surface-hover)", padding: "var(--s4)", borderRadius: "var(--radius)", marginBottom: "var(--s4)" }}>
                <h4 style={{ margin: "0 0 var(--s2) 0", fontSize: "1.1rem", color: "var(--brand-dark)" }}>{viewOperadorModal.opData.nombre || "Operador Asignado"}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", fontSize: "var(--text-md)" }}>
                  {viewOperadorModal.opData.cedula && <div><strong>CI:</strong> {viewOperadorModal.opData.cedula}</div>}
                  {viewOperadorModal.opData.telefono && <div><strong>Teléfono:</strong> {viewOperadorModal.opData.telefono}</div>}
                  {(viewOperadorModal.opData.modelo || viewOperadorModal.opData.placa) && (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "8px", marginTop: "4px" }}>
                      <strong>Vehículo:</strong> {viewOperadorModal.opData.modelo} {viewOperadorModal.opData.placa ? `(${viewOperadorModal.opData.placa})` : ""}
                    </div>
                  )}
                  {(viewOperadorModal.opData.unidad || viewOperadorModal.opData.puestos) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                      <div><strong>Nº Unidad:</strong> {viewOperadorModal.opData.unidad || "N/A"}</div>
                      <div><strong>Puestos:</strong> {viewOperadorModal.opData.puestos || "N/A"}</div>
                    </div>
                  )}
                  {(viewOperadorModal.opData.linea || viewOperadorModal.opData.ciudad) && (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "8px", marginTop: "4px" }}>
                      {viewOperadorModal.opData.linea && <div><strong>Línea:</strong> {viewOperadorModal.opData.linea}</div>}
                      {(viewOperadorModal.opData.ciudad || viewOperadorModal.opData.estado) && <div><strong>Ubicación:</strong> {viewOperadorModal.opData.ciudad}{viewOperadorModal.opData.estado ? `, ${viewOperadorModal.opData.estado}` : ""}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal__footer" style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s2)" }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setViewOperadorModal(null)}>Cerrar</button>
              {viewOperadorModal.traslado.estado !== "completado" && viewOperadorModal.traslado.estado !== "solventado_externo" && (
                <button className="btn btn--primary" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "4px" }} onClick={() => {
                  const t = viewOperadorModal.traslado;
                  setViewOperadorModal(null);
                  updateEstado(t.id, t.estado, undefined, t.operador);
                }}>
                  ✏️ Editar Datos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERT */}
      {alertMessage && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s3)" }}>
              <h3 className="modal__title" style={{ margin: 0 }}>Aviso</h3>
              <button className="modal__icon-close" onClick={() => setAlertMessage(null)}>✕</button>
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

      {/* MODAL GASOLINA */}
      {gasolinaModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: "500px" }}>
            <div className="modal__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="modal__title" style={{ margin: 0 }}>⛽ Solicitar Combustible</h3>
              <button className="modal__icon-close" onClick={() => setGasolinaModal(null)}>✕</button>
            </div>
            <form onSubmit={submitGasolina} className="modal__body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              {gasError && (
                <div className="form__error" style={{ marginBottom: "var(--s3)" }}>
                  ⚠️ {gasError}
                </div>
              )}
              {gasSuccess && (
                <div className="form__success" style={{ marginBottom: "var(--s3)", background: "#D1FAE5", color: "#047857", padding: "var(--s2)", borderRadius: "var(--radius)" }}>
                  ✅ Solicitud enviada con éxito.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)", marginBottom: "var(--s3)" }}>
                <div>
                  <label className="form__label">Nombre</label>
                  <input type="text" className="form__input" value={gasForm.nombre} onChange={e => setGasForm({...gasForm, nombre: e.target.value})} required />
                </div>
                <div>
                  <label className="form__label">Apellido</label>
                  <input type="text" className="form__input" value={gasForm.apellido} onChange={e => setGasForm({...gasForm, apellido: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)", marginBottom: "var(--s3)" }}>
                <div>
                  <label className="form__label">Cédula</label>
                  <input type="text" className="form__input" value={gasForm.cedula} onChange={e => setGasForm({...gasForm, cedula: e.target.value})} required />
                </div>
                <div>
                  <label className="form__label">Teléfono</label>
                  <input type="text" className="form__input" value={gasForm.telefono} onChange={e => setGasForm({...gasForm, telefono: e.target.value})} required />
                </div>
              </div>

              <div style={{ background: "var(--surface-2)", padding: "var(--s3)", borderRadius: "var(--radius)", marginBottom: "var(--s3)", border: "1px solid var(--border)" }}>
                <p style={{ margin: "0 0 var(--s2)", fontWeight: 600, fontSize: "var(--text-xs)" }}>🚗 Datos del Vehículo</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--s2)" }}>
                  <div>
                    <label className="form__label" style={{ fontSize: "10px" }}>Placa</label>
                    <input type="text" className="form__input" style={{ fontSize: "var(--text-xs)", height: "32px" }} value={gasForm.placa} onChange={e => setGasForm({...gasForm, placa: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form__label" style={{ fontSize: "10px" }}>Marca</label>
                    <input type="text" className="form__input" style={{ fontSize: "var(--text-xs)", height: "32px" }} value={gasForm.marca} onChange={e => setGasForm({...gasForm, marca: e.target.value})} placeholder="Ej. Ford" required />
                  </div>
                  <div>
                    <label className="form__label" style={{ fontSize: "10px" }}>Modelo</label>
                    <input type="text" className="form__input" style={{ fontSize: "var(--text-xs)", height: "32px" }} value={gasForm.modelo} onChange={e => setGasForm({...gasForm, modelo: e.target.value})} required />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)", marginBottom: "var(--s3)" }}>
                <div>
                  <label className="form__label">Tipo de Vehículo</label>
                  <select className="form__input" style={{ height: "40px" }} value={gasForm.tipo_vehiculo} onChange={e => setGasForm({...gasForm, tipo_vehiculo: e.target.value})} required>
                    <option value="moto">🏍️ Moto (Límite 40L)</option>
                    <option value="carro">🚗 Carro (Límite 60L)</option>
                    <option value="autobus">🚌 Autobús (Límite 120L)</option>
                  </select>
                </div>
                <div>
                  <label className="form__label">Banco Pago Móvil</label>
                  <select className="form__input" style={{ height: "40px" }} value={gasForm.banco} onChange={e => setGasForm({...gasForm, banco: e.target.value})} required>
                    <option value="0102">0102 - Banco de Venezuela</option>
                    <option value="0105">0105 - Banco Mercantil</option>
                    <option value="0108">0108 - Banco Provincial (BBVA)</option>
                    <option value="0134">0134 - Banesco</option>
                    <option value="0172">0172 - Bancamiga</option>
                    <option value="0114">0114 - Bancaribe</option>
                    <option value="0115">0115 - Banco Exterior</option>
                    <option value="0151">0151 - Fondo Común</option>
                    <option value="0163">0163 - Banco del Tesoro</option>
                    <option value="0175">0175 - Banco Bicentenario</option>
                  </select>
                </div>
              </div>

              <div className="form__field" style={{ marginBottom: "var(--s3)" }}>
                <label className="form__label">Motivo</label>
                <textarea className="form__textarea" rows={2} value={gasForm.motivo} onChange={e => setGasForm({...gasForm, motivo: e.target.value})} required />
              </div>

              <div className="form__field" style={{ marginBottom: "var(--s4)" }}>
                <label className="form__label">Litros a cargar</label>
                <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
                  <input type="number" className="form__input" value={gasForm.litros} onChange={e => setGasForm({...gasForm, litros: e.target.value})} min="1" step="0.1" required />
                  <span style={{ fontWeight: 600 }}>L</span>
                </div>
                {gasForm.litros && !isNaN(parseFloat(gasForm.litros)) && (
                  <div style={{ marginTop: "var(--s2)", fontSize: "var(--text-xs)", color: "var(--text)", background: "var(--brand-soft)", padding: "var(--s2)", borderRadius: "var(--radius-sm)" }}>
                    Costo estimado: <strong>${(parseFloat(gasForm.litros) * 0.5).toFixed(2)} USD</strong> 
                    {usdRate && <> / <strong style={{ color: "var(--brand)" }}>{(parseFloat(gasForm.litros) * 0.5 * usdRate).toFixed(2)} Bs</strong></>}
                  </div>
                )}
              </div>

              <div className="modal__footer" style={{ display: "flex", gap: "var(--s2)" }}>
                <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={() => setGasolinaModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={gasLoading}>
                  {gasLoading ? "Registrando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
