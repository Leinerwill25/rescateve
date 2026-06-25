"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PacientePublico } from "@/lib/types";
import { Search, ShieldAlert, Phone } from "lucide-react";

export default function HospitalesView() {
  const [mode, setMode] = useState<"nombre" | "cedula">("nombre");
  
  const [queryNombre, setQueryNombre] = useState("");
  const [queryCedula, setQueryCedula] = useState("");
  
  const [resultsNombre, setResultsNombre] = useState<PacientePublico[]>([]);
  const [resultCedula, setResultCedula] = useState<{ nombre: string; hospital: string; edad: number; estado: string } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function searchByNombre() {
    if (!queryNombre.trim() || queryNombre.length < 3) {
      setErr("Ingresa al menos 3 letras para buscar por nombre.");
      return;
    }
    setErr(null);
    setLoading(true);
    setSearched(true);
    
    // Búsqueda simple (ilike) o texto completo, usando ilike para mayor flexibilidad
    const { data, error } = await supabase
      .from("pacientes_publico")
      .select("*")
      .ilike("nombre", `%${queryNombre}%`)
      .limit(50);
      
    setLoading(false);
    if (error) {
      setErr("Error al consultar la base de datos.");
    } else {
      setResultsNombre(data as PacientePublico[]);
    }
  }

  async function verifyByCedula() {
    if (!queryCedula.trim()) {
      setErr("Ingresa una cédula válida.");
      return;
    }
    setErr(null);
    setLoading(true);
    setSearched(true);
    setResultCedula(null);
    
    const { data, error } = await supabase.rpc("verificar_paciente_cedula", {
      p_cedula: queryCedula
    });
    
    setLoading(false);
    if (error) {
      setErr("Error al verificar la cédula.");
    } else if (data && data.length > 0) {
      setResultCedula(data[0]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, isCedula: boolean) {
    if (e.key === "Enter") {
      isCedula ? verifyByCedula() : searchByNombre();
    }
  }

  function resetSearch() {
    setSearched(false);
    setResultsNombre([]);
    setResultCedula(null);
    setErr(null);
  }

  return (
    <div className="hospitales-view">
      <div className="privacy-notice" style={{
        background: "#EFF6FF",
        border: "1px solid #BFDBFE",
        borderRadius: "var(--radius)",
        padding: "var(--s3)",
        marginBottom: "var(--s4)",
        fontSize: "var(--text-sm)",
        color: "#1E3A8A",
        display: "flex",
        gap: "var(--s2)"
      }}>
        <ShieldAlert size={20} className="shrink-0" style={{ marginTop: "2px" }} />
        <div>
          <strong>Privacidad de Datos:</strong> Mostramos solo nombre y hospital para ayudar a reunir familias. No publicamos cédulas, teléfonos, direcciones ni información médica de los pacientes.
        </div>
      </div>

      <div className="tabs-sub" style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)" }}>
        <button 
          className={`btn-subtab ${mode === "nombre" ? "active" : ""}`}
          onClick={() => { setMode("nombre"); resetSearch(); }}
          style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: mode === "nombre" ? "var(--brand-soft)" : "var(--surface)", color: mode === "nombre" ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}
        >
          Búsqueda General
        </button>
        <button 
          className={`btn-subtab ${mode === "cedula" ? "active" : ""}`}
          onClick={() => { setMode("cedula"); resetSearch(); }}
          style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: mode === "cedula" ? "var(--brand-soft)" : "var(--surface)", color: mode === "cedula" ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}
        >
          Verificación Exacta
        </button>
      </div>

      {mode === "nombre" ? (
        <div className="form__field">
          <label className="form__label">Buscar por nombre o apellido</label>
          <div style={{ display: "flex", gap: "var(--s2)" }}>
            <input
              type="text"
              className="form__input"
              placeholder="Ej: Pérez o María"
              value={queryNombre}
              onChange={(e) => setQueryNombre(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, false)}
              style={{ flex: 1 }}
            />
            <button className="btn btn--primary" onClick={searchByNombre} disabled={loading} style={{ width: "auto", padding: "0 var(--s4)" }}>
              <Search size={20} />
            </button>
          </div>
          <p className="form__hint">Busca coincidencias aproximadas en las listas de hospitales.</p>
        </div>
      ) : (
        <div className="form__field">
          <label className="form__label">Verificar ingreso por Cédula</label>
          <div style={{ display: "flex", gap: "var(--s2)" }}>
            <input
              type="text"
              className="form__input"
              placeholder="Ej: 12345678"
              value={queryCedula}
              onChange={(e) => setQueryCedula(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, true)}
              style={{ flex: 1 }}
            />
            <button className="btn btn--primary" onClick={verifyByCedula} disabled={loading} style={{ width: "auto", padding: "0 var(--s4)" }}>
              <Search size={20} />
            </button>
          </div>
          <p className="form__hint">Devuelve resultados solo si la cédula coincide exactamente. No mostramos listas de cédulas.</p>
        </div>
      )}

      {err && <div className="form__error">⚠️ {err}</div>}

      {loading && <div style={{ textAlign: "center", padding: "var(--s4)", color: "var(--text-muted)" }}>Consultando base de datos...</div>}

      {searched && !loading && (
        <div className="hospitales-results" style={{ marginTop: "var(--s4)" }}>
          {mode === "nombre" && (
            <>
              {resultsNombre.length === 0 ? (
                <div className="empty" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <p className="empty__title">Sin resultados</p>
                  <p className="empty__desc">No encontramos coincidencias para "{queryNombre}". Eso no significa que la persona no esté ingresada; contacta directamente a los hospitales o a la Cruz Roja.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--s2)" }}>
                    Se encontraron {resultsNombre.length} posible(s) coincidencia(s).
                  </p>
                  {resultsNombre.map(p => (
                    <PacienteCard key={p.id} p={p} />
                  ))}
                </div>
              )}
            </>
          )}

          {mode === "cedula" && (
            <>
              {!resultCedula ? (
                <div className="empty" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <p className="empty__title">No hay coincidencia</p>
                  <p className="empty__desc">No encontramos a esa persona en las listas cargadas mediante esa cédula. Eso no significa que no esté ingresada; contacta directamente al hospital o a la línea de Cruz Roja.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: 600, marginBottom: "var(--s2)" }}>
                    ✅ Coincidencia exacta encontrada
                  </p>
                  <PacienteCard p={{ ...resultCedula, id: 'cedula-result' } as any} />
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: "var(--s6)", padding: "var(--s3)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            <p style={{ margin: "0 0 var(--s2)" }}><strong>Fuente de datos:</strong> Listas consolidadas oficiales de la red hospitalaria (reciente actualización).</p>
            <p style={{ margin: 0 }}>Si encuentras un error o necesitas retirar un registro por privacidad, contacta al centro coordinador.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PacienteCard({ p }: { p: any }) {
  return (
    <article className="card" style={{ marginBottom: 0 }}>
      <div className="card__top">
        <h3 className="card__title">
          🏥 {p.nombre} {p.edad ? `(${p.edad} años)` : ""}
        </h3>
        <span className="badge" style={{ 
          background: p.estado === "ingresado" ? "#FEF2F2" : "#F0FDF4", 
          color: p.estado === "ingresado" ? "#DC2626" : "#16A34A",
          border: `1px solid ${p.estado === "ingresado" ? "#FECACA" : "#BBF7D0"}`
        }}>
          {p.estado === "ingresado" ? "🔴 Ingresado" : p.estado === "dado_de_alta" ? "✅ Alta médica" : "🔵 Trasladado"}
        </span>
      </div>
      
      <p className="card__meta" style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--text)", margin: "var(--s2) 0" }}>
        Ingresado/a en: <strong>{p.hospital}</strong>
      </p>
      
      <div style={{ 
        marginTop: "var(--s3)", 
        paddingTop: "var(--s3)", 
        borderTop: "1px solid var(--border)",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)"
      }}>
        <p style={{ margin: "0 0 var(--s2)" }}>
          Para confirmar el estado actual y obtener más información, debes contactar directamente a este centro de salud o llamar a la:
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", color: "#DC2626", fontWeight: 600 }}>
          <Phone size={16} /> Línea de Reconexión Cruz Roja: 0422 799 4880
        </div>
      </div>
    </article>
  );
}
