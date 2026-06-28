"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, ReglaClasificacion } from "@/lib/types-operations";
import { pullNecesidades } from "@/lib/adapters/ayudaEnCamino";
import { 
  Check, 
  Edit3, 
  GitBranch, 
  Trash2, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  Download,
  MapPin,
  Phone,
  Clock,
  Send,
  X
} from "lucide-react";

export default function ColaValidacionPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modales
  const [showManualForm, setShowManualForm] = useState(false);
  const [reclasificarTicket, setReclasificarTicket] = useState<Ticket | null>(null);
  const [dividirTicket, setDividirTicket] = useState<Ticket | null>(null);

  // Formulario Manual
  const [manualDesc, setManualDesc] = useState("");
  const [manualContacto, setManualContacto] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualDestRef, setManualDestRef] = useState("");
  const [manualDestLat, setManualDestLat] = useState("");
  const [manualDestLng, setManualDestLng] = useState("");
  const [manualCantidad, setManualCantidad] = useState("");
  const [manualPrioridad, setManualPrioridad] = useState("media");
  
  // Formulario Reclasificación
  const [finalCat, setFinalCat] = useState("");
  const [finalDeps, setFinalDeps] = useState<string[]>([]);
  
  // Formulario División
  const [hijosCount, setHijosCount] = useState(2);
  const [hijosDesc, setHijosDesc] = useState<string[]>(["", ""]);

  // Opciones estáticas
  const CATEGORIAS = [
    { value: "insumo_medico", label: "Insumos Médicos" },
    { value: "insumo_basico", label: "Insumos Básicos" },
    { value: "emergencia_medica", label: "Emergencia Médica (911)" },
    { value: "rescate", label: "Rescate Estructural" },
    { value: "grua", label: "Servicio de Grúa" },
    { value: "tecnico", label: "Reparación / Técnico" },
    { value: "traslado_personal", label: "Traslado Personal Médico" },
    { value: "multiple", label: "Múltiple clasificación" },
    { value: "otro", label: "Otro" }
  ];

  const DEPARTAMENTOS = [
    { clave: "acopio", nombre: "Centro de Acopio" },
    { clave: "transporte_carga", nombre: "Transporte de Carga" },
    { clave: "emergencia_medica", nombre: "Emergencia Médica (Venemergencia)" },
    { clave: "grua", nombre: "Servicio de Grúa (Tu Gruero)" },
    { clave: "tecnico", nombre: "Soporte Técnico (Tilín)" },
    { clave: "rescate_estructural", nombre: "Protección Civil / Rescate" },
    { clave: "personal_medico", nombre: "Personal Médico (SafeCare)" }
  ];

  const cargarTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("estado", "en_validacion")
        .order("requiere_revision", { ascending: false })
        .order("prioridad", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setTickets((data || []) as Ticket[]);
    } catch (err: any) {
      console.error(err);
      setError("Error al cargar la cola de validación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTickets();
    // Suscripción en tiempo real
    const ch = supabase
      .channel("cola_validacion")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        cargarTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // 1. APROBAR DIRECTAMENTE
  const handleAprobarDirecto = async (ticket: Ticket) => {
    try {
      const cat = ticket.categoria_sugerida || "otro";
      const deps = ticket.departamentos_sugeridos || ["otro"];
      
      const { error: rpcErr } = await supabase.rpc("aprobar_ticket", {
        p_id: ticket.id,
        p_categoria: cat,
        p_departamentos: deps
      });

      if (rpcErr) throw rpcErr;
      cargarTickets();
    } catch (err: any) {
      alert(`Error al aprobar ticket: ${err.message}`);
    }
  };

  // 2. RECLASIFICAR Y APROBAR
  const openReclasificar = (ticket: Ticket) => {
    setReclasificarTicket(ticket);
    setFinalCat(ticket.categoria_sugerida || "otro");
    setFinalDeps(ticket.departamentos_sugeridos || []);
  };

  const toggleDept = (deptClave: string) => {
    setFinalDeps(prev => 
      prev.includes(deptClave) 
        ? prev.filter(c => c !== deptClave) 
        : [...prev, deptClave]
    );
  };

  const handleReclasificar = async () => {
    if (!reclasificarTicket) return;
    try {
      const { error: rpcErr } = await supabase.rpc("aprobar_ticket", {
        p_id: reclasificarTicket.id,
        p_categoria: finalCat,
        p_departamentos: finalDeps
      });

      if (rpcErr) throw rpcErr;
      setReclasificarTicket(null);
      cargarTickets();
    } catch (err: any) {
      alert(`Error al reclasificar: ${err.message}`);
    }
  };

  // 3. DIVIDIR TICKET
  const openDividir = (ticket: Ticket) => {
    setDividirTicket(ticket);
    setHijosCount(2);
    setHijosDesc([`1. Insumos: `, `2. Transporte: `]);
  };

  const handleHijosCountChange = (count: number) => {
    setHijosCount(count);
    setHijosDesc(Array.from({ length: count }, (_, i) => hijosDesc[i] || `Parte ${i + 1}: `));
  };

  const handleHijoDescChange = (index: number, val: string) => {
    setHijosDesc(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleDividir = async () => {
    if (!dividirTicket) return;
    try {
      const createdIds: string[] = [];

      for (let i = 0; i < hijosCount; i++) {
        const { data: insertData, error: insErr } = await supabase
          .from("tickets")
          .insert({
            fuente: "manual",
            descripcion: hijosDesc[i],
            contacto_solicitante: dividirTicket.contacto_solicitante,
            origen_ref: dividirTicket.origen_ref,
            origen_lat: dividirTicket.origen_lat,
            origen_lng: dividirTicket.origen_lng,
            destino_ref: dividirTicket.destino_ref,
            destino_lat: dividirTicket.destino_lat,
            destino_lng: dividirTicket.destino_lng,
            cantidad: dividirTicket.cantidad,
            prioridad: dividirTicket.prioridad,
            estado: "en_validacion"
          })
          .select("id")
          .single();

        if (insErr) throw insErr;
        if (insertData) createdIds.push(insertData.id);
      }

      // Marcar el original como rechazado con una nota
      const { error: updErr } = await supabase
        .from("tickets")
        .update({
          estado: "rechazado",
          notas_admin: `Dividido en los tickets hijos: ${createdIds.join(", ")}`
        })
        .eq("id", dividirTicket.id);

      if (updErr) throw updErr;

      // Registrar historial de división
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ticket_historial").insert({
          ticket_id: dividirTicket.id,
          actor: session.user.id,
          accion: "dividido",
          a_valor: createdIds.join(", "),
          nota: "Ticket dividido por el despachador."
        });
      }

      setDividirTicket(null);
      cargarTickets();
    } catch (err: any) {
      alert(`Error al dividir ticket: ${err.message}`);
    }
  };

  // 4. RECHAZAR / DESCARTAR
  const handleRechazar = async (ticketId: string) => {
    const notas = prompt("Ingrese el motivo del descarte:");
    if (notas === null) return; // canceló

    try {
      const { error: updErr } = await supabase
        .from("tickets")
        .update({
          estado: "rechazado",
          notas_admin: notas || "Descartado sin notas adicionales."
        })
        .eq("id", ticketId);

      if (updErr) throw updErr;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("ticket_historial").insert({
          ticket_id: ticketId,
          actor: session.user.id,
          accion: "rechazado",
          nota: notas || "Descartado sin notas."
        });
      }

      cargarTickets();
    } catch (err: any) {
      alert(`Error al rechazar: ${err.message}`);
    }
  };

  // 5. CREAR TICKET MANUAL
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim()) return;

    try {
      const { error: insErr } = await supabase.from("tickets").insert({
        fuente: "manual",
        descripcion: manualDesc,
        contacto_solicitante: manualContacto || null,
        origen_ref: manualRef || null,
        origen_lat: manualLat ? parseFloat(manualLat) : null,
        origen_lng: manualLng ? parseFloat(manualLng) : null,
        destino_ref: manualDestRef || null,
        destino_lat: manualDestLat ? parseFloat(manualDestLat) : null,
        destino_lng: manualDestLng ? parseFloat(manualDestLng) : null,
        cantidad: manualCantidad || null,
        prioridad: manualPrioridad,
        estado: "en_validacion"
      });

      if (insErr) throw insErr;
      
      // Limpiar formulario
      setManualDesc("");
      setManualContacto("");
      setManualRef("");
      setManualLat("");
      setManualLng("");
      setManualDestRef("");
      setManualDestLat("");
      setManualDestLng("");
      setManualCantidad("");
      setManualPrioridad("media");
      setShowManualForm(false);
      
      cargarTickets();
    } catch (err: any) {
      alert(`Error al crear ticket: ${err.message}`);
    }
  };

  // 6. SIMULAR IMPORTACION AEC
  const handleSimularAEC = async () => {
    try {
      const res = await pullNecesidades();
      if (res.success) {
        alert(`Sincronización simulada. ${res.count} nuevos tickets agregados a la cola.`);
        cargarTickets();
      }
    } catch (err: any) {
      alert(`Error en simulación: ${err.message}`);
    }
  };

  // 7. IMPORTAR SOLICITUDES PUBLICAS
  const handleImportarPublicas = async () => {
    try {
      // 1. Obtener solicitudes_ayuda públicas
      const { data: publicas, error: pubErr } = await supabase
        .from("solicitudes_ayuda")
        .select("*");

      if (pubErr) throw pubErr;
      if (!publicas || publicas.length === 0) {
        alert("No hay solicitudes públicas creadas en la aplicación.");
        return;
      }

      // 2. Obtener solicitudes ya importadas
      const { data: importadas, error: impErr } = await supabase
        .from("tickets")
        .select("fuente_id")
        .eq("fuente", "publico");

      if (impErr) throw impErr;
      const idsImportados = new Set((importadas || []).map(i => i.fuente_id));

      // 3. Filtrar las no importadas
      const pendientes = publicas.filter(p => !idsImportados.has(p.id));

      if (pendientes.length === 0) {
        alert("Todas las solicitudes públicas ya han sido importadas.");
        return;
      }

      // 4. Insertar las nuevas en tickets
      let creadas = 0;
      for (const p of pendientes) {
        const descCompleta = `[Solicitud Pública de ${p.tipo.toUpperCase()}] ${p.descripcion || "(Sin descripción)"}`;
        const { error: insErr } = await supabase.from("tickets").insert({
          fuente: "publico",
          fuente_id: p.id,
          descripcion: descCompleta,
          contacto_solicitante: p.contacto || null,
          origen_ref: p.referencia || "Ubicación en mapa",
          origen_lat: p.latitud,
          origen_lng: p.longitud,
          prioridad: p.prioridad || "media",
          estado: "en_validacion"
        });

        if (!insErr) creadas++;
      }

      alert(`Sincronización completada. ${creadas} solicitudes públicas importadas.`);
      cargarTickets();
    } catch (err: any) {
      alert(`Error al importar: ${err.message}`);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Cola de Validación Humana</h2>
          <p style={styles.subtitle}>Valida y clasifica las solicitudes antes del despacho externo.</p>
        </div>
        <div style={styles.actions}>
          <button style={styles.btnSecondary} onClick={handleSimularAEC}>
            <RefreshCw size={16} />
            <span>Simular Ayuda en Camino</span>
          </button>
          <button style={styles.btnSecondary} onClick={handleImportarPublicas}>
            <Download size={16} />
            <span>Importar de Mapa Público</span>
          </button>
          <button style={styles.btnPrimary} onClick={() => setShowManualForm(!showManualForm)}>
            <Plus size={16} />
            <span>Nuevo Ticket Manual</span>
          </button>
        </div>
      </div>

      {/* Formulario Manual */}
      {showManualForm && (
        <form onSubmit={handleCreateManual} style={styles.manualForm}>
          <div style={styles.formGrid}>
            <div style={{ ...styles.formField, gridColumn: "span 2" }}>
              <label style={styles.label}>Descripción de la Necesidad (Requerido)</label>
              <textarea
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="Ejemplo: Necesitamos gasas médicas y solución salina para atender 3 lesionados..."
                required
                style={styles.textarea}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Contacto Solicitante</label>
              <input
                type="text"
                value={manualContacto}
                onChange={(e) => setManualContacto(e.target.value)}
                placeholder="Teléfono o Nombre"
                style={styles.input}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Prioridad Inicial</label>
              <select
                value={manualPrioridad}
                onChange={(e) => setManualPrioridad(e.target.value)}
                style={styles.select}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Referencia Origen (Dirección)</label>
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="Sector / Calle / Edificio"
                style={styles.input}
              />
            </div>

            <div style={styles.formField}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Latitud Origen</label>
                  <input
                    type="number"
                    step="any"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="10.48"
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Longitud Origen</label>
                  <input
                    type="number"
                    step="any"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="-66.86"
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Referencia Destino (Traslado)</label>
              <input
                type="text"
                value={manualDestRef}
                onChange={(e) => setManualDestRef(e.target.value)}
                placeholder="Hospital / Centro Acopio Destino"
                style={styles.input}
              />
            </div>

            <div style={styles.formField}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Latitud Destino</label>
                  <input
                    type="number"
                    step="any"
                    value={manualDestLat}
                    onChange={(e) => setManualDestLat(e.target.value)}
                    placeholder="10.49"
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Longitud Destino</label>
                  <input
                    type="number"
                    step="any"
                    value={manualDestLng}
                    onChange={(e) => setManualDestLng(e.target.value)}
                    placeholder="-66.85"
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            <div style={styles.formField}>
              <label style={styles.label}>Cantidad / Detalles Insumos</label>
              <input
                type="text"
                value={manualCantidad}
                onChange={(e) => setManualCantidad(e.target.value)}
                placeholder="5 cajas de agua, 3 kits médicos..."
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={() => setShowManualForm(false)} style={styles.btnSecondary}>Cancelar</button>
            <button type="submit" style={styles.btnPrimary}>Crear Ticket y Auto-clasificar</button>
          </div>
        </form>
      )}

      {/* Cola de tickets */}
      {loading ? (
        <div style={styles.center}>
          <div style={styles.spinner}></div>
        </div>
      ) : error ? (
        <div style={styles.errorContainer}>
          <AlertTriangle color="var(--emergency)" />
          <p>{error}</p>
        </div>
      ) : tickets.length === 0 ? (
        <div style={styles.emptyContainer}>
          <Check size={48} color="var(--success)" />
          <h3>Cola Limpia</h3>
          <p style={{ color: "var(--text-muted)" }}>No hay tickets pendientes de validación.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {tickets.map((t) => (
            <div 
              key={t.id} 
              style={{
                ...styles.card,
                borderLeft: t.requiere_revision ? "6px solid var(--emergency)" : "6px solid var(--warning)",
                boxShadow: t.requiere_revision ? "0 4px 14px rgba(225, 29, 72, 0.1)" : "var(--shadow)"
              }}
            >
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={t.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                    Prioridad {t.prioridad.toUpperCase()}
                  </span>
                  <span style={styles.badgeFuente}>
                    Fuente: {t.fuente.toUpperCase()}
                  </span>
                  {t.requiere_revision && (
                    <span style={styles.badgeRevision}>
                      ⚠️ Requiere Revisión (Clasificación Ambígua/Sin Match)
                    </span>
                  )}
                </div>
                <span style={styles.cardDate}>
                  <Clock size={12} />
                  {new Date(t.created_at).toLocaleString("es-VE")}
                </span>
              </div>

              <div style={styles.cardBody}>
                <h4 style={styles.cardDesc}>{t.descripcion}</h4>
                
                {t.cantidad && (
                  <p style={styles.metaText}><strong>Cantidad/Detalles:</strong> {t.cantidad}</p>
                )}

                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <Phone size={14} color="var(--text-muted)" />
                    <span>Contacto: {t.contacto_solicitante || "No provisto"}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <MapPin size={14} color="var(--text-muted)" />
                    <span>Origen: {t.origen_ref || "Coordenadas en mapa"}</span>
                  </div>
                </div>

                <div style={styles.sugerenciaBox}>
                  <h5 style={{ margin: "0 0 6px 0", fontSize: "12px", color: "var(--brand)" }}>
                    Sugerencias del Motor de Clasificación
                  </h5>
                  <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                    <strong>Categoría sugerida:</strong> {t.categoria_sugerida ? CATEGORIAS.find(c => c.value === t.categoria_sugerida)?.label || t.categoria_sugerida : "Ninguna (Se escaló)"}
                  </p>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    <strong>Departamentos sugeridos:</strong> {t.departamentos_sugeridos && t.departamentos_sugeridos.length > 0
                      ? t.departamentos_sugeridos.map(d => DEPARTAMENTOS.find(dp => dp.clave === d)?.nombre || d).join(", ")
                      : "Ninguno"}
                  </p>
                </div>
              </div>

              <div style={styles.cardActions}>
                <button style={styles.btnSecondary} onClick={() => handleRechazar(t.id)}>
                  <Trash2 size={14} />
                  <span>Descartar</span>
                </button>
                <button style={styles.btnSecondary} onClick={() => openDividir(t)}>
                  <GitBranch size={14} />
                  <span>Dividir</span>
                </button>
                <button style={styles.btnSecondary} onClick={() => openReclasificar(t)}>
                  <Edit3 size={14} />
                  <span>Reclasificar</span>
                </button>
                <button style={styles.btnSuccess} onClick={() => handleAprobarDirecto(t)}>
                  <Check size={14} />
                  <span>Aprobar Sugerencia</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Reclasificar */}
      {reclasificarTicket && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Reclasificar Requerimiento</h3>
              <button style={styles.closeBtn} onClick={() => setReclasificarTicket(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formField}>
                <label style={styles.label}>Categoría Final</label>
                <select 
                  value={finalCat} 
                  onChange={(e) => setFinalCat(e.target.value)}
                  style={styles.select}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>Departamentos a Activar (Ruteo)</label>
                <div style={styles.checkboxList}>
                  {DEPARTAMENTOS.map(d => (
                    <label key={d.clave} style={styles.checkboxLabel}>
                      <input 
                        type="checkbox"
                        checked={finalDeps.includes(d.clave)}
                        onChange={() => toggleDept(d.clave)}
                      />
                      <span>{d.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setReclasificarTicket(null)}>Cancelar</button>
              <button style={styles.btnPrimary} onClick={handleReclasificar}>Aprobar con Clasificación</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dividir */}
      {dividirTicket && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "550px" }}>
            <div style={styles.modalHeader}>
              <h3>Dividir Requerimiento</h3>
              <button style={styles.closeBtn} onClick={() => setDividirTicket(null)}><X size={18} /></button>
            </div>
            <div style={{ ...styles.modalBody, maxHeight: "400px", overflowY: "auto" }}>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", background: "var(--surface-2)", padding: "10px", borderRadius: "var(--radius-sm)" }}>
                <strong>Requerimiento Original:</strong> {dividirTicket.descripcion}
              </p>
              
              <div style={{ ...styles.formField, marginTop: "12px" }}>
                <label style={styles.label}>Número de Sub-Tickets a crear</label>
                <select 
                  value={hijosCount} 
                  onChange={(e) => handleHijosCountChange(parseInt(e.target.value))}
                  style={styles.select}
                >
                  <option value={2}>2 partes</option>
                  <option value={3}>3 partes</option>
                  <option value={4}>4 partes</option>
                </select>
              </div>

              {Array.from({ length: hijosCount }).map((_, i) => (
                <div key={i} style={{ ...styles.formField, marginTop: "8px" }}>
                  <label style={styles.label}>Descripción de la Parte {i + 1}</label>
                  <textarea
                    value={hijosDesc[i] || ""}
                    onChange={(e) => handleHijoDescChange(i, e.target.value)}
                    placeholder={`Escriba la necesidad específica para el ticket ${i + 1}...`}
                    style={{ ...styles.textarea, height: "64px" }}
                  />
                </div>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setDividirTicket(null)}>Cancelar</button>
              <button style={styles.btnPrimary} onClick={handleDividir}>Dividir y Re-encolar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s3)",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "var(--text-xl)",
    fontWeight: 800,
    color: "var(--brand)",
  },
  subtitle: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
  },
  actions: {
    display: "flex",
    gap: "var(--s2)",
  },
  btnPrimary: {
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    boxShadow: "var(--shadow-sm)",
  },
  btnSecondary: {
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    boxShadow: "var(--shadow-sm)",
  },
  btnSuccess: {
    background: "var(--success)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    boxShadow: "var(--shadow-sm)",
  },
  manualForm: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    boxShadow: "var(--shadow)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "var(--s4)",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s1)",
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "var(--s2) var(--s3)",
    fontSize: "var(--text-sm)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
  },
  textarea: {
    padding: "var(--s2) var(--s3)",
    fontSize: "var(--text-sm)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
    resize: "vertical",
    height: "90px",
  },
  select: {
    padding: "var(--s2) var(--s3)",
    fontSize: "var(--text-sm)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
    height: "38px",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--s3)",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid var(--border)",
    borderTop: "4px solid var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s3)",
    background: "var(--emergency-soft)",
    padding: "var(--s4)",
    borderRadius: "var(--radius)",
    color: "var(--emergency)",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "60px var(--s4)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  badgeAlta: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
  },
  badgeMedia: {
    background: "var(--warning-soft)",
    color: "var(--warning)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
  },
  badgeFuente: {
    background: "var(--surface-2)",
    color: "var(--text-muted)",
    fontSize: "11px",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
  },
  badgeRevision: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
  },
  cardDate: {
    fontSize: "12px",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardDesc: {
    margin: 0,
    fontSize: "var(--text-base)",
    color: "var(--text)",
    fontWeight: 600,
  },
  metaText: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text)",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "var(--s2)",
    marginTop: "4px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
  },
  sugerenciaBox: {
    background: "var(--brand-soft)",
    borderLeft: "4px solid var(--brand)",
    padding: "10px",
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    marginTop: "8px",
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--s2)",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
    flexWrap: "wrap",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    background: "var(--surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
    padding: "var(--s5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s2)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  checkboxList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "180px",
    overflowY: "auto",
    padding: "4px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "var(--text-sm)",
    cursor: "pointer",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--s3)",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
  }
};
