"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, ReglaClasificacion } from "@/lib/types-operations";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
  const [manualEsTraslado, setManualEsTraslado] = useState(false);
  const [manualTipoTraslado, setManualTipoTraslado] = useState("insumos");
  const [manualCuando, setManualCuando] = useState("Lo antes posible");
  
  // Filtro de origen
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "traslados" | "ayuda_en_camino">("todos");
  // Formulario Reclasificación
  const [finalCat, setFinalCat] = useState("");
  const [finalDeps, setFinalDeps] = useState<string[]>([]);
  
  // Formulario División
  const [hijosCount, setHijosCount] = useState(2);
  const [hijosDesc, setHijosDesc] = useState<string[]>(["", ""]);

  // Modal de Alerta / Confirmación / Prompt personalizado
  const [customModal, setCustomModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm" | "prompt";
    defaultValue?: string;
    onConfirm: (val?: string | null) => void;
    onCancel?: () => void;
  } | null>(null);

  const showCustomAlert = (message: string, title: string = "Notificación") => {
    return new Promise<void>((resolve) => {
      setCustomModal({
        show: true,
        title,
        message,
        type: "alert",
        onConfirm: () => {
          setCustomModal(null);
          resolve();
        }
      });
    });
  };

  const showCustomConfirm = (message: string, title: string = "Confirmación") => {
    return new Promise<boolean>((resolve) => {
      setCustomModal({
        show: true,
        title,
        message,
        type: "confirm",
        onConfirm: () => {
          setCustomModal(null);
          resolve(true);
        },
        onCancel: () => {
          setCustomModal(null);
          resolve(false);
        }
      });
    });
  };

  const showCustomPrompt = (message: string, defaultValue: string = "", title: string = "Entrada de datos") => {
    return new Promise<string | null>((resolve) => {
      setCustomModal({
        show: true,
        title,
        message,
        type: "prompt",
        defaultValue,
        onConfirm: (val) => {
          setCustomModal(null);
          resolve(val);
        },
        onCancel: () => {
          setCustomModal(null);
          resolve(null);
        }
      });
    });
  };

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

  // Ingesta Ayuda en Camino
  const [filtroExterno, setFiltroExterno] = useState<"todos" | "pendiente" | "cubierta">("pendiente");
  const [ultimoLog, setUltimoLog] = useState<any>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncResult, setSyncResult] = useState<{ nuevos: number; actualizados: number } | null>(null);

  const getMinutosTranscurridos = () => {
    if (!ultimoLog || !ultimoLog.corrida_at) return null;
    const diffMs = Date.now() - new Date(ultimoLog.corrida_at).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return diffMins;
  };

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

      // Cargar último log de ingesta
      const { data: logData } = await supabase
        .from("ingesta_log")
        .select("corrida_at")
        .eq("fuente", "ayuda_en_camino")
        .order("corrida_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (logData) {
        setUltimoLog(logData);
      }
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
      await showCustomAlert("¡Ticket aprobado con éxito! Te redirigiremos al tablero de despacho para asignar al operador.");
      router.push(`/operaciones/despacho?focus=${ticket.id}`);
    } catch (err: any) {
      showCustomAlert(`Error al aprobar ticket: ${err.message}`);
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
      const approvedId = reclasificarTicket.id;
      setReclasificarTicket(null);
      await showCustomAlert("¡Ticket reclasificado y aprobado con éxito! Te redirigiremos al tablero de despacho para asignar al operador.");
      router.push(`/operaciones/despacho?focus=${approvedId}`);
    } catch (err: any) {
      showCustomAlert(`Error al reclasificar: ${err.message}`);
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
      showCustomAlert(`Error al dividir ticket: ${err.message}`);
    }
  };

  // 4. RECHAZAR / DESCARTAR
  const handleRechazar = async (ticketId: string) => {
    const notas = await showCustomPrompt("Ingrese el motivo del descarte:", "", "Descartar Ticket");
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
      let cat = null;
      let deps = null;
      if (manualEsTraslado) {
        cat = manualTipoTraslado === "insumos" ? "insumo_basico" : "traslado_personal";
        deps = manualTipoTraslado === "insumos" ? ["acopio", "transporte_carga"] : ["personal_medico"];
      }

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
        cuando: manualEsTraslado ? manualCuando : null,
        categoria_sugerida: cat,
        categoria_final: cat,
        departamentos_sugeridos: deps,
        departamentos_final: deps,
        requiere_revision: !manualEsTraslado,
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
      setManualEsTraslado(false);
      setManualCuando("Lo antes posible");
      setShowManualForm(false);
      
      cargarTickets();
    } catch (err: any) {
      showCustomAlert(`Error al crear ticket: ${err.message}`);
    }
  };

  // 6. SINCRONIZAR CON AYUDA EN CAMINO (real)
  const handleSincronizarAEC = async () => {
    if (sincronizando) return;
    setSincronizando(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/ingesta/ayuda-en-camino", { method: "GET" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Error HTTP ${res.status}`);
      }
      setSyncResult({ nuevos: json.nuevos ?? 0, actualizados: json.actualizados ?? 0 });
      cargarTickets();
    } catch (err: any) {
      showCustomAlert(`Error al sincronizar con Ayuda en Camino: ${err.message}`);
    } finally {
      setSincronizando(false);
    }
  };

  // 7. IMPORTAR SOLICITUDES PUBLICAS Y TRASLADOS PENDIENTES
  const handleImportarPublicas = async () => {
    try {
      let creadas = 0;

      // 1. Obtener solicitudes_ayuda públicas (Emergencias del mapa)
      const { data: publicas, error: pubErr } = await supabase
        .from("solicitudes_ayuda")
        .select("*");
      if (pubErr) throw pubErr;

      // 2. Obtener traslados públicos activos ('solicitado')
      const { data: traslados, error: trasErr } = await supabase
        .from("traslados")
        .select("*")
        .eq("estado", "solicitado");
      if (trasErr) throw trasErr;

      // 3. Obtener tickets ya importados en la tabla central
      const { data: importadas, error: impErr } = await supabase
        .from("tickets")
        .select("fuente, fuente_id");
      if (impErr) throw impErr;

      const idsImportadosPublico = new Set(
        (importadas || []).filter(i => i.fuente === "publico").map(i => i.fuente_id)
      );
      const idsImportadosTraslado = new Set(
        (importadas || []).filter(i => i.fuente === "traslado").map(i => i.fuente_id)
      );

      // 4. Filtrar pendientes de solicitudes_ayuda
      const pubPendientes = (publicas || []).filter(p => !idsImportadosPublico.has(p.id));

      // 5. Filtrar pendientes de traslados
      const trasPendientes = (traslados || []).filter(t => !idsImportadosTraslado.has(t.id));

      if (pubPendientes.length === 0 && trasPendientes.length === 0) {
        showCustomAlert("Todas las solicitudes públicas y traslados activos ya han sido importados.");
        return;
      }

      // 6. Insertar solicitudes de ayuda públicas
      for (const p of pubPendientes) {
        const descCompleta = `[Solicitud Pública: ${p.tipo.toUpperCase()}] ${p.descripcion || "(Sin descripción)"}`;
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

      // 7. Insertar traslados logísticos pendientes
      for (const t of trasPendientes) {
        const catSugerida = (t.tipo === "insumos") ? "insumo_basico" : (t.tipo === "personal_medico") ? "traslado_personal" : "otro";
        const depsSugeridos = (t.tipo === "insumos") ? ["acopio", "transporte_carga"] : (t.tipo === "personal_medico") ? ["personal_medico"] : ["otro"];
        const descCompleta = `[Traslado Público: ${t.tipo === 'insumos' ? 'Insumos' : t.tipo === 'personal_medico' ? 'Personal Médico' : 'Otro'}] ${t.descripcion || "(Sin descripción)"}`;

        const { error: insErr } = await supabase.from("tickets").insert({
          fuente: "traslado",
          fuente_id: t.id,
          descripcion: descCompleta,
          categoria_sugerida: catSugerida,
          departamentos_sugeridos: depsSugeridos,
          contacto_solicitante: t.contacto || null,
          origen_ref: t.origen_ref || "Ubicación en mapa",
          origen_lat: t.origen_lat,
          origen_lng: t.origen_lng,
          destino_ref: t.destino_ref,
          destino_lat: t.destino_lat,
          destino_lng: t.destino_lng,
          prioridad: t.prioridad || "media",
          estado: "en_validacion",
          requiere_revision: true
        });

        if (!insErr) creadas++;
      }

      showCustomAlert(`Sincronización completada. Se importaron ${creadas} solicitudes públicas y traslados.`);
      cargarTickets();
    } catch (err: any) {
      showCustomAlert(`Error al importar: ${err.message}`);
    }
  };

  const ticketsFiltrados = tickets.filter(t => {
    // 1. Filtrar por origen/tipo
    if (filtroOrigen === "traslados") {
      const isTras = t.fuente === "traslado" || 
        ["insumo_basico", "insumo_medico", "traslado_personal"].includes(t.categoria_final || "") ||
        ["insumo_basico", "insumo_medico", "traslado_personal"].includes(t.categoria_sugerida || "") ||
        (t.departamentos_final && (t.departamentos_final.includes("transporte_carga") || t.departamentos_final.includes("personal_medico"))) ||
        (t.departamentos_sugeridos && (t.departamentos_sugeridos.includes("transporte_carga") || t.departamentos_sugeridos.includes("personal_medico")));
      if (!isTras) return false;
    } else if (filtroOrigen === "ayuda_en_camino") {
      if (t.fuente !== "ayuda_en_camino") return false;
    }

    // 2. Filtrar por estado externo
    if (filtroExterno === "todos") return true;
    const estExt = t.estado_externo || "pendiente";
    return estExt === filtroExterno;
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Cola de Validación Humana</h2>
          <p style={styles.subtitle}>Valida y clasifica las solicitudes antes del despacho externo.</p>
        </div>
        <div style={styles.actions}>
          {/* Botón de sincronización con Ayuda en Camino */}
          <button
            id="btn-sincronizar-aec"
            style={{
              ...styles.btnSecondary,
              background: sincronizando
                ? "rgba(14,165,233,0.08)"
                : "linear-gradient(135deg,rgba(14,165,233,0.12) 0%,rgba(6,182,212,0.12) 100%)",
              border: "1px solid rgba(14,165,233,0.35)",
              color: "#0ea5e9",
              fontWeight: 700,
              gap: 8,
              opacity: sincronizando ? 0.7 : 1,
              cursor: sincronizando ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={handleSincronizarAEC}
            disabled={sincronizando}
            title="Consulta ahora mismo la API de Ayuda en Camino y agrega tickets nuevos a la cola"
          >
            <RefreshCw
              size={16}
              style={{
                animation: sincronizando ? "spin 0.8s linear infinite" : "none",
                flexShrink: 0,
              }}
            />
            <span>
              {sincronizando
                ? "Sincronizando..."
                : syncResult !== null
                ? `✓ ${syncResult.nuevos} nuevos · ${syncResult.actualizados} actualizados`
                : "Sincronizar con Ayuda en Camino"}
            </span>
            {/* Indicador de última corrida */}
            {ultimoLog && !sincronizando && syncResult === null && (
              <span style={{
                fontSize: 10,
                opacity: 0.6,
                fontWeight: 400,
                marginLeft: 4,
              }}>
                ({getMinutosTranscurridos()} min)
              </span>
            )}
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

            <div style={{ ...styles.formField, gridColumn: "span 2", display: "flex", alignItems: "center", gap: "8px", margin: "10px 0" }}>
              <input
                type="checkbox"
                id="manualEsTraslado"
                checked={manualEsTraslado}
                onChange={(e) => setManualEsTraslado(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="manualEsTraslado" style={{ ...styles.label, margin: 0, fontWeight: 700, cursor: "pointer" }}>
                🚚 ¿Es una solicitud de Traslado Logístico?
              </label>
            </div>

            {manualEsTraslado && (
              <>
                <div style={styles.formField}>
                  <label style={styles.label}>¿Qué necesitas trasladar?</label>
                  <select
                    value={manualTipoTraslado}
                    onChange={(e) => setManualTipoTraslado(e.target.value)}
                    style={styles.select}
                  >
                    <option value="insumos">📦 Insumos / Carga</option>
                    <option value="personal_medico">🩺 Personal Médico</option>
                  </select>
                </div>

                <div style={styles.formField}>
                  <label style={styles.label}>¿Cuándo se requiere?</label>
                  <input
                    type="text"
                    value={manualCuando}
                    onChange={(e) => setManualCuando(e.target.value)}
                    placeholder="Ej. Lo antes posible / Mañana a las 8am"
                    style={styles.input}
                  />
                </div>
              </>
            )}

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

            <div style={styles.formField}>
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

            <div style={styles.formField}>
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

      {/* Barra de Filtros Ingesta e Indicador de Sincronización */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        <div style={{ ...styles.filterBar, marginBottom: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Filtrar por Origen / Tipo</span>
            <div style={styles.filterGroup}>
              <button 
                type="button"
                style={filtroOrigen === "todos" ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFiltroOrigen("todos")}
              >
                Todos los Tickets ({tickets.length})
              </button>
              <button 
                type="button"
                style={filtroOrigen === "traslados" ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFiltroOrigen("traslados")}
              >
                Solo Traslados Logísticos ({
                  tickets.filter(t => 
                    t.fuente === "traslado" || 
                    ["insumo_basico", "insumo_medico", "traslado_personal"].includes(t.categoria_final || "") ||
                    ["insumo_basico", "insumo_medico", "traslado_personal"].includes(t.categoria_sugerida || "") ||
                    (t.departamentos_final && (t.departamentos_final.includes("transporte_carga") || t.departamentos_final.includes("personal_medico"))) ||
                    (t.departamentos_sugeridos && (t.departamentos_sugeridos.includes("transporte_carga") || t.departamentos_sugeridos.includes("personal_medico")))
                  ).length
                })
              </button>
              <button 
                type="button"
                style={filtroOrigen === "ayuda_en_camino" ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFiltroOrigen("ayuda_en_camino")}
              >
                Solo Ayuda en Camino ({tickets.filter(t => t.fuente === "ayuda_en_camino").length})
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...styles.filterBar, marginBottom: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Filtrar por Estado en la Fuente</span>
            <div style={styles.filterGroup}>
              <button 
                type="button"
                style={filtroExterno === "todos" ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFiltroExterno("todos")}
              >
                Todas ({tickets.length})
              </button>
              <button 
                type="button"
                style={filtroExterno === "pendiente" ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFiltroExterno("pendiente")}
              >
                Pendientes ({tickets.filter(t => (t.estado_externo || "pendiente") === "pendiente").length})
              </button>
              <button 
                type="button"
                style={filtroExterno === "cubierta" ? styles.filterBtnActive : styles.filterBtn}
                onClick={() => setFiltroExterno("cubierta")}
              >
                Cubiertas ({tickets.filter(t => t.estado_externo === "cubierta").length})
              </button>
            </div>
          </div>
          
          {ultimoLog && (
            <div style={styles.syncIndicator}>
              <Clock size={14} />
              <span>
                Sincronizado {getMinutosTranscurridos() === 0 ? "hace menos de 1 min" : getMinutosTranscurridos() !== null ? `hace ${getMinutosTranscurridos()} min` : "recientemente"}
              </span>
            </div>
          )}
        </div>
      </div>

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
      ) : ticketsFiltrados.length === 0 ? (
        <div style={styles.emptyContainer}>
          <Check size={48} color="var(--success)" />
          <h3>Cola Vacía</h3>
          <p style={{ color: "var(--text-muted)" }}>No hay tickets que coincidan con el filtro seleccionado.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {ticketsFiltrados.map((t) => (
            <div 
              key={t.id} 
              style={{
                ...styles.card,
                borderLeft: t.requiere_revision ? "6px solid var(--emergency)" : "6px solid var(--warning)",
                boxShadow: t.requiere_revision ? "0 4px 14px rgba(225, 29, 72, 0.1)" : "var(--shadow)"
              }}
            >
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={t.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                    Prioridad {t.prioridad.toUpperCase()}
                  </span>
                  
                  {t.fuente === "ayuda_en_camino" ? (
                    <>
                      <span style={styles.badgeAEC}>Ayuda en Camino</span>
                      <span style={t.estado_externo === "cubierta" ? styles.badgeCubierta : styles.badgePendiente}>
                        Origen: {t.estado_externo === "cubierta" ? "Cubierta" : "Pendiente"}
                      </span>
                      {t.fuente_url && (
                        <a 
                          href={t.fuente_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={styles.verOrigenLink}
                        >
                          Ver en origen ↗
                        </a>
                      )}
                    </>
                  ) : t.fuente === "traslado" ? (
                    <span style={styles.badgeAEC}>Traslado Público</span>
                  ) : (
                    <span style={styles.badgeFuente}>
                      Fuente: {t.fuente.toUpperCase()}
                    </span>
                  )}

                  {t.requiere_revision && (
                    <span style={styles.badgeRevision}>
                      ⚠️ Requiere Revisión
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
                
                {t.ubicacion_externa && (
                  <p style={styles.externaInfo}>
                    <strong>📍 Ubicación de origen (Externo):</strong> {t.ubicacion_externa}
                  </p>
                )}

                {t.categoria_externa && (
                  <p style={styles.externaInfo}>
                    <strong>🏷️ Categoría de origen (Externo):</strong> {t.categoria_externa}
                  </p>
                )}
                
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
      {/* Modal de Alerta / Confirmación / Prompt Personalizado */}
      {customModal && customModal.show && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "420px", width: "95%" }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>{customModal.title}</h3>
              <button 
                type="button" 
                style={styles.closeBtn} 
                onClick={() => {
                  if (customModal.onCancel) customModal.onCancel();
                  else customModal.onConfirm(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text)" }}>{customModal.message}</p>
              {customModal.type === "prompt" && (
                <input 
                  type="text" 
                  id="customModalInput"
                  defaultValue={customModal.defaultValue}
                  style={{ ...styles.input, marginTop: "12px" }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = document.getElementById("customModalInput") as HTMLInputElement;
                      customModal.onConfirm(input?.value);
                    }
                  }}
                />
              )}
            </div>
            <div style={styles.modalActions}>
              {(customModal.type === "confirm" || customModal.type === "prompt") && (
                <button 
                  type="button" 
                  style={styles.btnSecondary} 
                  onClick={() => {
                    if (customModal.onCancel) customModal.onCancel();
                    else customModal.onConfirm(null);
                  }}
                >
                  Cancelar
                </button>
              )}
              <button 
                type="button" 
                style={styles.btnPrimary} 
                onClick={() => {
                  if (customModal.type === "prompt") {
                    const input = document.getElementById("customModalInput") as HTMLInputElement;
                    customModal.onConfirm(input?.value);
                  } else {
                    customModal.onConfirm(null);
                  }
                }}
              >
                Aceptar
              </button>
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
    width: "100%",
    boxSizing: "border-box" as const,
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
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    padding: "var(--s2) var(--s3)",
    fontSize: "var(--text-sm)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
    height: "38px",
    width: "100%",
    boxSizing: "border-box" as const,
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
  },
  filterBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "12px 16px",
    marginBottom: "20px",
    flexWrap: "wrap" as any,
    gap: "12px",
  },
  filterGroup: {
    display: "flex",
    gap: "8px",
  },
  filterBtn: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  filterBtnActive: {
    background: "var(--brand)",
    border: "1px solid var(--brand)",
    color: "white",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  syncIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  badgeAEC: {
    background: "rgba(59, 130, 246, 0.1)",
    color: "#2563eb",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
  },
  badgePendiente: {
    background: "rgba(245, 158, 11, 0.1)",
    color: "#d97706",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
  },
  badgeCubierta: {
    background: "rgba(16, 185, 129, 0.1)",
    color: "#059669",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
  },
  verOrigenLink: {
    fontSize: "11px",
    color: "var(--brand)",
    fontWeight: 700,
    textDecoration: "none",
    marginLeft: "4px",
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
  },
  externaInfo: {
    margin: "4px 0 0 0",
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    background: "var(--surface-1)",
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
    borderLeft: "3px solid var(--border)",
  }
};
