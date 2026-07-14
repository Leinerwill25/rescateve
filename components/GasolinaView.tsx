import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ratesClient } from "@/lib/rates-client";
import { SolicitudGasolina, Rate } from "@/lib/types";

export default function GasolinaView() {
  const [tab, setTab] = useState<"solicitar" | "lista">("solicitar");
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState<SolicitudGasolina[]>([]);
  const [usdRate, setUsdRate] = useState<number | null>(null);

  // Form State
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cedula, setCedula] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [monto, setMonto] = useState("");
  
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    loadData();
    // Suscribirse a cambios en la base de datos para gasolina
    const ch = supabase
      .channel("gasolina")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_gasolina" }, loadData)
      .subscribe();
      
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Cargar tasa de cambio (USD)
      if (ratesClient) {
        const { data: ratesData, error: ratesError } = await ratesClient
          .from("rates")
          .select("*")
          .eq("code", "USD")
          .order("rate_datetime", { ascending: false })
          .limit(1)
          .single();
          
        if (!ratesError && ratesData) {
          setUsdRate(ratesData.rate);
        } else {
          console.error("Error cargando tasa de cambio:", ratesError?.message);
        }
      }

      // Cargar solicitudes de gasolina
      const { data, error } = await supabase
        .from("solicitudes_gasolina")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error: any) {
      console.error("Error cargando datos de gasolina:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);
    setLoading(true);

    if (!nombre || !apellido || !cedula || !placa || !marca || !modelo || !motivo || !telefono || !monto) {
      setSubmitError("Todos los campos son obligatorios.");
      setLoading(false);
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setSubmitError("El monto debe ser un número válido mayor a 0.");
      setLoading(false);
      return;
    }
    // Precio fijo: $0.50 USD por litro
    const litrosNum = montoNum / 0.5;

    try {
      const { error } = await supabase.from("solicitudes_gasolina").insert({
        nombre,
        apellido,
        cedula,
        placa,
        marca,
        modelo,
        motivo,
        telefono,
        litros: litrosNum,
        estado: "pendiente"
      });

      if (error) throw error;

      setSubmitSuccess(true);
      // Limpiar formulario
      setNombre("");
      setApellido("");
      setCedula("");
      setPlaca("");
      setMarca("");
      setModelo("");
      setMotivo("");
      setTelefono("");
      setMonto("");
      
      // Cambiar a la vista de lista después de un segundo
      setTimeout(() => {
        setSubmitSuccess(false);
        setTab("lista");
      }, 1500);

    } catch (err: any) {
      setSubmitError(err.message || "Error al enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  async function marcarSuministrado(id: string) {
    if (!confirm("¿Confirmas que ya se suministró la gasolina a este vehículo?")) return;
    
    try {
      await supabase
        .from("solicitudes_gasolina")
        .update({ estado: "suministrado" })
        .eq("id", id);
      
      loadData();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  }

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="form">
        <div className="form__header">
          <h2 className="form__title">⛽ Solicitar Llenado de Combustible</h2>
          <p className="form__subtitle">
            Esta sección está destinada a personas que han puesto su vehículo a disposición para apoyar en emergencias, traslados o rescates.
          </p>
        </div>

        {submitError && (
          <div className="form__error" role="alert" style={{ marginBottom: "var(--s4)" }}>
            <span aria-hidden="true">❌</span><span>{submitError}</span>
          </div>
        )}
        
        {submitSuccess && (
          <div className="form__success" role="status" aria-live="polite" style={{ marginBottom: "var(--s4)", background: "#D1FAE5", color: "#047857", borderColor: "#047857" }}>
            <span aria-hidden="true">✅</span>
            <div><strong>Solicitud enviada exitosamente.</strong></div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
          <div className="form__field">
            <label className="form__label form__label--required" htmlFor="nombre">Nombre</label>
            <input id="nombre" className="form__input" type="text" value={nombre} onChange={e => setNombre(e.target.value)} disabled={loading} required />
          </div>
          <div className="form__field">
            <label className="form__label form__label--required" htmlFor="apellido">Apellido</label>
            <input id="apellido" className="form__input" type="text" value={apellido} onChange={e => setApellido(e.target.value)} disabled={loading} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
          <div className="form__field">
            <label className="form__label form__label--required" htmlFor="cedula">Cédula de Identidad</label>
            <input id="cedula" className="form__input" type="text" value={cedula} onChange={e => setCedula(e.target.value)} disabled={loading} required />
          </div>
          <div className="form__field">
            <label className="form__label form__label--required" htmlFor="telefono">Número de Teléfono</label>
            <input id="telefono" className="form__input" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} disabled={loading} required />
          </div>
        </div>

        <div style={{ 
          background: "var(--surface-2)", 
          padding: "var(--s4)", 
          borderRadius: "var(--radius)", 
          marginBottom: "var(--s4)",
          border: "1px solid var(--border)"
        }}>
          <p style={{ margin: "0 0 var(--s3)", fontWeight: 600, fontSize: "var(--text-sm)" }}>
            🚗 Datos del Vehículo
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--s3)" }}>
            <div className="form__field" style={{ marginBottom: 0 }}>
              <label className="form__label form__label--required" htmlFor="placa">Placa</label>
              <input id="placa" className="form__input" type="text" value={placa} onChange={e => setPlaca(e.target.value)} disabled={loading} required />
            </div>
            <div className="form__field" style={{ marginBottom: 0 }}>
              <label className="form__label form__label--required" htmlFor="marca">Marca</label>
              <input id="marca" className="form__input" type="text" value={marca} onChange={e => setMarca(e.target.value)} disabled={loading} required />
            </div>
            <div className="form__field" style={{ marginBottom: 0 }}>
              <label className="form__label form__label--required" htmlFor="modelo">Modelo</label>
              <input id="modelo" className="form__input" type="text" value={modelo} onChange={e => setModelo(e.target.value)} disabled={loading} required />
            </div>
          </div>
        </div>

        <div className="form__field">
          <label className="form__label form__label--required" htmlFor="motivo">Motivo por el cual necesita gasolina</label>
          <textarea 
            id="motivo"
            className="form__textarea"
            rows={2} 
            value={motivo} 
            onChange={e => setMotivo(e.target.value)} 
            placeholder="Ejemplo: Voy a traer rescatistas de La Guaira"
            disabled={loading} 
            required 
          />
        </div>

        <div className="form__field" style={{ marginBottom: "var(--s6)" }}>
          <label className="form__label form__label--required" htmlFor="monto">Monto en $</label>
          <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
            <input 
              id="monto"
              className="form__input"
              type="number" 
              value={monto} 
              onChange={e => setMonto(e.target.value)} 
              min="0.5"
              step="0.5"
              style={{ flex: 1 }}
              disabled={loading} 
              required 
            />
            <span style={{ fontWeight: 600, padding: "0 var(--s2)" }}>$</span>
          </div>
          {monto && !isNaN(parseFloat(monto)) && parseFloat(monto) > 0 && (
            <div style={{ marginTop: "var(--s2)", fontSize: "var(--text-sm)", color: "var(--text)", background: "var(--brand-soft)", padding: "var(--s3)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(30,58,138,.15)" }}>
              Equivale a: <strong>{(parseFloat(monto) / 0.5).toFixed(1)} L</strong>
              {usdRate && (
                <> / <strong style={{ color: "var(--brand)" }}>{(parseFloat(monto) * usdRate).toFixed(2)} Bs</strong> <small style={{ color: "var(--text-muted)" }}>(Tasa: {usdRate} Bs)</small></>
              )}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn--submit" disabled={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Registrando...</> : "Registrar Solicitud"}
        </button>
      </form>
    );
  }

  function renderList() {
    if (loading && solicitudes.length === 0) {
      return <div style={{ textAlign: "center", padding: "var(--s6)" }}>Cargando solicitudes...</div>;
    }

    if (solicitudes.length === 0) {
      return (
        <div className="empty">
          <div className="empty__icon" aria-hidden="true">⛽</div>
          <p className="empty__title">Sin solicitudes registradas</p>
          <p className="empty__desc">Aún no hay solicitudes de llenado de combustible.</p>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
        {!ratesClient && (
          <div style={{ background: "#FEF3C7", color: "#92400E", padding: "var(--s2) var(--s3)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-sm)" }}>
            ⚠️ Base de datos de tasas externa no configurada. Los precios en Bolívares no se mostrarán.
          </div>
        )}
        {solicitudes.map((s) => {
          const costoUSD = s.litros * 0.5;
          const costoBs = usdRate ? (costoUSD * usdRate).toFixed(2) : null;

          return (
            <article className="card" key={s.id} style={{ opacity: s.estado === "suministrado" ? 0.7 : 1 }}>
              <div className="card__top">
                <h3 className="card__title">
                  🚗 {s.marca} {s.modelo} <span style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>({s.placa})</span>
                </h3>
                <span className="badge" style={{ 
                  background: s.estado === "suministrado" ? "#F0FDF4" : "#FFFBEB", 
                  color: s.estado === "suministrado" ? "#16A34A" : "#D97706",
                  border: `1px solid ${s.estado === "suministrado" ? 'rgba(22,163,74,.2)' : 'rgba(217,119,6,.2)'}`
                }}>
                  {s.estado === "suministrado" ? "✅ Suministrado" : "⏳ Pendiente"}
                </span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)", margin: "var(--s3) 0" }}>
                <div>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 2px" }}>Solicitante</p>
                  <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, margin: 0 }}>{s.nombre} {s.apellido}</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0 }}>C.I: {s.cedula} | 📞 {s.telefono}</p>
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

              {s.estado === "pendiente" && (
                <button 
                  className="btn btn--primary" 
                  style={{ width: "100%", padding: "var(--s2)" }}
                  onClick={() => marcarSuministrado(s.id)}
                >
                  ✓ Marcar como Suministrado
                </button>
              )}
            </article>
          )
        })}
      </div>
    );
  }

  return (
    <div className="list gasolina-view">
      <div className="tabs-sub" style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)" }}>
        <button 
          className={`btn-subtab ${tab === "solicitar" ? "active" : ""}`}
          onClick={() => setTab("solicitar")}
          style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: tab === "solicitar" ? "var(--brand)" : "var(--surface)", color: tab === "solicitar" ? "#fff" : "var(--text)", fontWeight: 600 }}
        >
          ✍️ Solicitar
        </button>
        <button 
          className={`btn-subtab ${tab === "lista" ? "active" : ""}`}
          onClick={() => setTab("lista")}
          style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: tab === "lista" ? "var(--brand)" : "var(--surface)", color: tab === "lista" ? "#fff" : "var(--text)", fontWeight: 600 }}
        >
          📋 Lista de Solicitudes
        </button>
      </div>
      
      {tab === "solicitar" ? renderForm() : renderList()}
    </div>
  );
}
