"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
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
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  FiltroOrigen,
  FiltroExterno,
  FiltroOrden,
  esTicketTraslado,
  esTicketAEC,
  esTicketAsh,
  esTicketCritico,
  esTicketImportante,
  filtrarTickets,
  contarPorOrigen,
  contarPorEstadoExterno,
  paginar,
  buildTrasladoCtx,
  PAGE_SIZE_COLA,
  TrasladoFilterContext,
} from "@/lib/ticket-filters";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

const TIPOS_TRASLADO_MANUAL = [
  { value: "insumos", label: "Insumos / Carga", emoji: "📦", cat: "insumo_basico", deps: ["acopio", "transporte_carga"] },
  { value: "personal_medico", label: "Personal Médico", emoji: "🩺", cat: "traslado_personal", deps: ["personal_medico"] },
] as const;

function clasificarTiposTraslado(tipos: string[]) {
  const known = tipos.filter((t) => TIPOS_TRASLADO_MANUAL.some((o) => o.value === t));
  if (known.length === 0) return { cat: "otro" as const, deps: ["otro"], label: "Otro" };

  const deps = Array.from(new Set(known.flatMap((t) => TIPOS_TRASLADO_MANUAL.find((o) => o.value === t)!.deps)));
  const label = known.map((t) => TIPOS_TRASLADO_MANUAL.find((o) => o.value === t)!.label).join(" + ");
  const cat = known.length > 1
    ? "multiple" as const
    : TIPOS_TRASLADO_MANUAL.find((o) => o.value === known[0])!.cat;

  return { cat, deps, label };
}

function parseTiposTraslado(tipo: string) {
  return tipo.split(",").map((s) => s.trim()).filter(Boolean);
}

function formatCuandoTraslado(cuando: string, horaSalida: string) {
  const base = cuando.trim() || "Lo antes posible";
  const hora = horaSalida.trim();
  return hora ? `${base} · Salida: ${hora}` : base;
}

function buildTicketDesdeTraslado(t: Record<string, unknown>) {
  const tipos = parseTiposTraslado(String(t.tipo ?? ""));
  const { cat, deps, label } = clasificarTiposTraslado(tipos.length ? tipos : [String(t.tipo ?? "otro")]);
  const trasladoId = t.id as string;
  return {
    id: trasladoId,
    fuente: "traslado" as const,
    fuente_id: trasladoId,
    descripcion: `[Traslado: ${label}] ${(t.descripcion as string) || "(Sin descripción)"}`,
    categoria_sugerida: cat,
    categoria_final: cat,
    departamentos_sugeridos: deps,
    departamentos_final: deps,
    contacto_solicitante: (t.contacto as string) || null,
    origen_ref: (t.origen_ref as string) || "Ubicación no especificada",
    origen_lat: (t.origen_lat as number) ?? null,
    origen_lng: (t.origen_lng as number) ?? null,
    destino_ref: (t.destino_ref as string) || null,
    destino_lat: (t.destino_lat as number) ?? null,
    destino_lng: (t.destino_lng as number) ?? null,
    cantidad: (t.cantidad as string) || null,
    cuando: (t.cuando as string) || null,
    prioridad: (t.prioridad as string) || "media",
    estado: "en_validacion" as const,
    requiere_revision: true,
  };
}

async function importarTrasladosPendientes(): Promise<number> {
  const { data: traslados, error: trasErr } = await supabase
    .from("traslados")
    .select("*")
    .eq("estado", "solicitado");
  if (trasErr) throw trasErr;

  const { data: importadas, error: impErr } = await supabase
    .from("tickets")
    .select("fuente_id")
    .eq("fuente", "traslado");
  if (impErr) throw impErr;

  const idsImportados = new Set(
    (importadas || []).map((i) => i.fuente_id).filter(Boolean)
  );
  const pendientes = (traslados || []).filter((t) => !idsImportados.has(t.id));

  let creadas = 0;
  for (const t of pendientes) {
    const { error } = await supabase
      .from("tickets")
      .upsert(buildTicketDesdeTraslado(t), { onConflict: "id" });
    if (error) {
      console.error("Error importando traslado", t.id, error);
    } else {
      creadas++;
    }
  }
  return creadas;
}

function buildTicketManualPayload(input: {
  descripcion: string;
  contacto: string;
  origenRef: string;
  origenLat: number | null;
  origenLng: number | null;
  destinoRef: string;
  destinoLat: number | null;
  destinoLng: number | null;
  cantidad: string;
  prioridad: string;
  esTraslado: boolean;
  tiposTraslado: string[];
  cuando: string;
  horaSalida: string;
}) {
  let cat: string | null = null;
  let deps: string[] | null = null;
  if (input.esTraslado) {
    const clasif = clasificarTiposTraslado(input.tiposTraslado);
    cat = clasif.cat;
    deps = clasif.deps;
  }

  return {
    fuente: "manual" as const,
    descripcion: input.descripcion.trim(),
    contacto_solicitante: input.contacto.trim() || null,
    origen_ref: input.origenRef.trim() || null,
    origen_lat: input.origenLat,
    origen_lng: input.origenLng,
    destino_ref: input.esTraslado ? (input.destinoRef.trim() || null) : null,
    destino_lat: input.esTraslado ? input.destinoLat : null,
    destino_lng: input.esTraslado ? input.destinoLng : null,
    cantidad: input.esTraslado ? (input.cantidad.trim() || null) : null,
    prioridad: input.prioridad,
    cuando: input.esTraslado ? formatCuandoTraslado(input.cuando, input.horaSalida) : null,
    categoria_sugerida: cat,
    categoria_final: cat,
    departamentos_sugeridos: deps,
    departamentos_final: deps,
    requiere_revision: !input.esTraslado,
    estado: "en_validacion" as const,
  };
}

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
  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);
  const [manualDestRef, setManualDestRef] = useState("");
  const [manualDestLat, setManualDestLat] = useState<number | null>(null);
  const [manualDestLng, setManualDestLng] = useState<number | null>(null);
  const [manualCantidad, setManualCantidad] = useState("");
  const [manualPrioridad, setManualPrioridad] = useState("media");
  const [manualEsTraslado, setManualEsTraslado] = useState(false);
  const [manualTiposTraslado, setManualTiposTraslado] = useState<string[]>([]);
  const [manualCuando, setManualCuando] = useState("Lo antes posible");
  const [manualHoraSalida, setManualHoraSalida] = useState("");
  
  // Filtro de origen
  const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>("traslados");
  const [filtroOrden, setFiltroOrden] = useState<FiltroOrden>("recientes");
  const [paginaActual, setPaginaActual] = useState(1);
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
  const [filtroExterno, setFiltroExterno] = useState<FiltroExterno>("pendiente");
  const [ultimoLog, setUltimoLog] = useState<any>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncResult, setSyncResult] = useState<{ nuevos: number; actualizados: number } | null>(null);
  const [trasladoCtx, setTrasladoCtx] = useState<TrasladoFilterContext>(buildTrasladoCtx([]));
  const cargandoRef = useRef(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMinutosTranscurridos = () => {
    if (!ultimoLog || !ultimoLog.corrida_at) return null;
    const diffMs = Date.now() - new Date(ultimoLog.corrida_at).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return diffMins;
  };

  const cargarTickets = useCallback(async (opts?: { importTraslados?: boolean }) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setLoading(true);
    setError(null);
    try {
      if (opts?.importTraslados !== false) {
        await importarTrasladosPendientes();
      }

      const { data, error: fetchErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("estado", "en_validacion")
        .order("requiere_revision", { ascending: false })
        .order("prioridad", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000);

      if (fetchErr) throw fetchErr;
      setTickets((data || []) as Ticket[]);

      const { data: trasladosPub } = await supabase
        .from("traslados")
        .select("id")
        .not("reporter_token", "is", null);
      setTrasladoCtx(buildTrasladoCtx((trasladosPub || []).map((r) => r.id)));

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
      cargandoRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroOrigen, filtroExterno, filtroOrden]);

  useEffect(() => {
    if (filtroOrigen === "traslados" && filtroExterno !== "todos") {
      setFiltroExterno("todos");
    }
  }, [filtroOrigen, filtroExterno]);

  useEffect(() => {
    cargarTickets({ importTraslados: true });
    const ch = supabase
      .channel("cola_validacion")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = setTimeout(() => {
          cargarTickets({ importTraslados: false });
        }, 600);
      })
      .subscribe();
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      supabase.removeChannel(ch);
    };
  }, [cargarTickets]);

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

  const toggleTipoTraslado = (tipo: string) => {
    setManualTiposTraslado((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
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

      const { error: histErr } = await supabase.rpc("registrar_historial_ticket_admin", {
        p_ticket_id: dividirTicket.id,
        p_accion: "dividido",
        p_nota: "Ticket dividido por el despachador.",
        p_de_valor: null,
        p_a_valor: createdIds.join(", "),
      });
      if (histErr) throw histErr;

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
      const { error: rpcErr } = await supabase.rpc("rechazar_ticket_admin", {
        p_id: ticketId,
        p_nota: notas || "Descartado sin notas adicionales.",
      });
      if (rpcErr) throw rpcErr;

      cargarTickets();
    } catch (err: any) {
      alert(`Error al rechazar: ${err.message}`);
    }
  };

  // 5. CREAR TICKET MANUAL
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim()) return;
    if (manualEsTraslado && manualTiposTraslado.length === 0) {
      showCustomAlert("Marca al menos un tipo de traslado: insumos y/o personal médico.");
      return;
    }
    if (manualEsTraslado && (manualLat == null || manualLng == null || manualDestLat == null || manualDestLng == null)) {
      showCustomAlert("Marca el origen y el destino en los mapas para el traslado logístico.");
      return;
    }

    try {
      const payload = buildTicketManualPayload({
        descripcion: manualDesc,
        contacto: manualContacto,
        origenRef: manualRef,
        origenLat: manualLat,
        origenLng: manualLng,
        destinoRef: manualDestRef,
        destinoLat: manualDestLat,
        destinoLng: manualDestLng,
        cantidad: manualCantidad,
        prioridad: manualPrioridad,
        esTraslado: manualEsTraslado,
        tiposTraslado: manualTiposTraslado,
        cuando: manualCuando,
        horaSalida: manualHoraSalida,
      });

      const { data: created, error: insErr } = await supabase
        .from("tickets")
        .insert(payload)
        .select("id")
        .single();

      if (insErr) throw insErr;
      
      // Limpiar formulario
      setManualDesc("");
      setManualContacto("");
      setManualRef("");
      setManualLat(null);
      setManualLng(null);
      setManualDestRef("");
      setManualDestLat(null);
      setManualDestLng(null);
      setManualCantidad("");
      setManualPrioridad("media");
      setManualEsTraslado(false);
      setManualTiposTraslado([]);
      setManualCuando("Lo antes posible");
      setManualHoraSalida("");
      setShowManualForm(false);

      await showCustomAlert(
        manualEsTraslado
          ? `Traslado registrado en la cola (ticket ${created?.id?.slice(0, 8) ?? ""}…). Visible para todo el equipo admin.`
          : `Ticket creado en la cola (id ${created?.id?.slice(0, 8) ?? ""}…).`,
        "Ticket guardado"
      );
      
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Debes iniciar sesión para sincronizar.");
      }

      const res = await fetch("/api/ingesta/ayuda-en-camino", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
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
        const { error: insErr } = await supabase
          .from("tickets")
          .upsert(buildTicketDesdeTraslado(t), { onConflict: "id" });
        if (!insErr) creadas++;
      }

      showCustomAlert(`Sincronización completada. Se importaron ${creadas} solicitudes públicas y traslados.`);
      cargarTickets();
    } catch (err: any) {
      showCustomAlert(`Error al importar: ${err.message}`);
    }
  };

  const conteos = contarPorOrigen(tickets, trasladoCtx);
  const conteosExterno = contarPorEstadoExterno(tickets, filtroOrigen);
  const ticketsFiltrados = filtrarTickets(tickets, filtroOrigen, filtroExterno, filtroOrden, trasladoCtx);
  const paginacion = paginar(ticketsFiltrados, paginaActual, PAGE_SIZE_COLA);
  const ticketsPagina = paginacion.items;
  const conteoCriticos = tickets.filter(
    (t) =>
      (filtroOrigen === "todos" || (filtroOrigen === "traslados" && esTicketTraslado(t, trasladoCtx)) || (filtroOrigen === "ayuda_en_camino" && esTicketAEC(t))) &&
      esTicketCritico(t)
  ).length;
  const conteoImportantes = tickets.filter(
    (t) =>
      (filtroOrigen === "todos" || (filtroOrigen === "traslados" && esTicketTraslado(t, trasladoCtx)) || (filtroOrigen === "ayuda_en_camino" && esTicketAEC(t))) &&
      esTicketImportante(t)
  ).length;

  return (
    <div style={styles.page} className="ops-page">
      <div style={styles.header} className="ops-page-header">
        <div>
          <h2 style={styles.title} className="ops-page-title">Cola de Validación Humana</h2>
          <p style={styles.subtitle} className="ops-page-subtitle">Valida y clasifica las solicitudes antes del despacho externo.</p>
        </div>
        <div style={styles.actions} className="ops-action-bar">
          {/* Botón de sincronización con Ayuda en Camino */}
          <button
            id="btn-sincronizar-aec"
            className="ops-action-btn"
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
                : (
                  <span className="ops-btn-text">
                    <span className="ops-btn-text__full">Sincronizar con Ayuda en Camino</span>
                    <span className="ops-btn-text__short">Sincronizar AEC</span>
                  </span>
                )}
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

          <button type="button" className="ops-action-btn" style={styles.btnSecondary} onClick={handleImportarPublicas}>
            <Download size={16} />
            <span className="ops-btn-text">
              <span className="ops-btn-text__full">Importar de Mapa Público</span>
              <span className="ops-btn-text__short">Importar mapa</span>
            </span>
          </button>
          <button type="button" className="ops-action-btn ops-action-btn--primary" style={styles.btnPrimary} onClick={() => setShowManualForm(!showManualForm)}>
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
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                    Opcional: puedes marcar una o ambas opciones.
                  </p>
                  <div style={styles.checkboxList}>
                    {TIPOS_TRASLADO_MANUAL.map((opt) => (
                      <label key={opt.value} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={manualTiposTraslado.includes(opt.value)}
                          onChange={() => toggleTipoTraslado(opt.value)}
                        />
                        <span>{opt.emoji} {opt.label}</span>
                      </label>
                    ))}
                  </div>
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

                <div style={styles.formField}>
                  <label style={styles.label}>Hora de salida</label>
                  <input
                    type="time"
                    value={manualHoraSalida}
                    onChange={(e) => setManualHoraSalida(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </>
            )}

            <div style={{ ...styles.formField, ...styles.locationSection, gridColumn: "1 / -1" }}>
              <label style={{ ...styles.label, color: "#1E3A8A" }}>📍 Punto de origen</label>
              <p style={styles.locationHint}>Busca la dirección en el mapa o arrastra el pin. Las coordenadas se guardan automáticamente.</p>
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="Referencia del origen (Ej: Hospital Pérez Carreño, puerta principal)"
                style={styles.input}
              />
              <div style={styles.mapPickerWrap}>
                <LocationPicker
                  lat={manualLat}
                  lng={manualLng}
                  onChange={(lat, lng) => {
                    setManualLat(lat);
                    setManualLng(lng);
                  }}
                />
              </div>
            </div>

            {manualEsTraslado && (
              <div style={{ ...styles.formField, ...styles.locationSectionDest, gridColumn: "1 / -1" }}>
                <label style={{ ...styles.label, color: "#166534" }}>🏁 Punto de destino</label>
                <p style={styles.locationHint}>Indica dónde debe llegar la carga o el personal.</p>
                <input
                  type="text"
                  value={manualDestRef}
                  onChange={(e) => setManualDestRef(e.target.value)}
                  placeholder="Referencia del destino (Ej: Centro de acopio UCV)"
                  style={styles.input}
                />
                <div style={styles.mapPickerWrap}>
                  <LocationPicker
                    lat={manualDestLat}
                    lng={manualDestLng}
                    onChange={(lat, lng) => {
                      setManualDestLat(lat);
                      setManualDestLng(lng);
                    }}
                  />
                </div>
              </div>
            )}

            {manualEsTraslado && (
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
            )}
          </div>

          <div style={styles.formActions} className="ops-form-actions">
            <button type="button" onClick={() => setShowManualForm(false)} style={styles.btnSecondary}>Cancelar</button>
            <button type="submit" style={styles.btnPrimary}>Crear Ticket y Auto-clasificar</button>
          </div>
        </form>
      )}

      {/* Barra de Filtros Ingesta e Indicador de Sincronización */}
      <div className="ops-filter-stack">
        <div className="ops-filter-bar">
          <span className="ops-filter-label">Filtrar por Origen / Tipo</span>
            <div className="ops-filter-group">
              <button 
                type="button"
                className={`ops-filter-btn${filtroOrigen === "todos" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrigen("todos")}
              >
                Todos los Tickets ({conteos.total})
              </button>
              <button 
                type="button"
                className={`ops-filter-btn${filtroOrigen === "traslados" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrigen("traslados")}
              >
                Solo Traslados Logísticos ({conteos.traslados})
              </button>
              <button 
                type="button"
                className={`ops-filter-btn${filtroOrigen === "ayuda_en_camino" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrigen("ayuda_en_camino")}
              >
                Solo Ayuda en Camino ({conteos.aec})
              </button>
              <button 
                type="button"
                className={`ops-filter-btn${filtroOrigen === "ash" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrigen("ash")}
              >
                Solo Ash 🌿 ({conteos.ash})
              </button>
            </div>
        </div>

        {(filtroOrigen === "ayuda_en_camino" || filtroOrigen === "todos") && (
        <div className="ops-filter-bar">
          <span className="ops-filter-label">Filtrar por Estado en la Fuente (Ayuda en Camino)</span>
            <div className="ops-filter-group">
              <button 
                type="button"
                className={`ops-filter-btn${filtroExterno === "todos" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroExterno("todos")}
              >
                Todas ({conteosExterno.todos})
              </button>
              <button 
                type="button"
                className={`ops-filter-btn${filtroExterno === "pendiente" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroExterno("pendiente")}
              >
                Pendientes ({conteosExterno.pendiente})
              </button>
              <button 
                type="button"
                className={`ops-filter-btn${filtroExterno === "cubierta" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroExterno("cubierta")}
              >
                Cubiertas ({conteosExterno.cubierta})
              </button>
            </div>
          
          {ultimoLog && (
            <div style={styles.syncIndicator} className="ops-filter-sync">
              <Clock size={14} />
              <span>
                Sincronizado {getMinutosTranscurridos() === 0 ? "hace menos de 1 min" : getMinutosTranscurridos() !== null ? `hace ${getMinutosTranscurridos()} min` : "recientemente"}
              </span>
            </div>
          )}
        </div>
        )}

        <div className="ops-filter-bar">
          <span className="ops-filter-label">Ordenar / Prioridad</span>
            <div className="ops-filter-group">
              <button
                type="button"
                className={`ops-filter-btn${filtroOrden === "recientes" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrden("recientes")}
              >
                Más recientes
              </button>
              <button
                type="button"
                className={`ops-filter-btn${filtroOrden === "importantes" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrden("importantes")}
              >
                Más importantes ({conteoImportantes})
              </button>
              <button
                type="button"
                className={`ops-filter-btn${filtroOrden === "criticos" ? " ops-filter-btn--active" : ""}`}
                onClick={() => setFiltroOrden("criticos")}
              >
                Críticos +24h ({conteoCriticos})
              </button>
            </div>
          <div className="ops-filter-meta">
            {paginacion.total === 0
              ? "0 tickets"
              : `Mostrando ${paginacion.inicio}–${paginacion.fin} de ${paginacion.total}`}
          </div>
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
        <>
        <div style={styles.list}>
          {ticketsPagina.map((t) => (
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
                  
                  {esTicketCritico(t) && (
                    <span style={styles.badgeCritico}>Crítico +24h</span>
                  )}
                  
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
                  ) : esTicketAsh(t) ? (
                    <span style={styles.badgeAsh}>Ash 🌿</span>
                  ) : t.fuente === "traslado" ? (
                    <span style={styles.badgeAEC}>Traslado Público</span>
                  ) : t.fuente === "manual" && t.cuando ? (
                    <span style={styles.badgeAEC}>Traslado Admin</span>
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
                <h4 style={styles.cardDesc} className="ops-card-desc">{t.descripcion}</h4>
                
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
                    <span>Origen: {t.origen_ref || t.destino_ref || t.ubicacion_externa || "Coordenadas en mapa"}</span>
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

              <div style={styles.cardActions} className="ops-card-actions">
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

        {paginacion.totalPaginas > 1 && (
          <div style={styles.paginationBar}>
            <button
              type="button"
              style={styles.paginationBtn}
              disabled={paginacion.pagina <= 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span style={styles.paginationInfo}>
              Página {paginacion.pagina} de {paginacion.totalPaginas}
            </span>
            <button
              type="button"
              style={styles.paginationBtn}
              disabled={paginacion.pagina >= paginacion.totalPaginas}
              onClick={() => setPaginaActual((p) => Math.min(paginacion.totalPaginas, p + 1))}
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        </>
      )}

      {/* Modal Reclasificar */}
      {reclasificarTicket && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={styles.modal} className="ops-modal">
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
            <div style={styles.modalActions} className="ops-modal-actions">
              <button style={styles.btnSecondary} onClick={() => setReclasificarTicket(null)}>Cancelar</button>
              <button style={styles.btnPrimary} onClick={handleReclasificar}>Aprobar con Clasificación</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dividir */}
      {dividirTicket && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "550px" }} className="ops-modal ops-modal-wide">
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
            <div style={styles.modalActions} className="ops-modal-actions">
              <button style={styles.btnSecondary} onClick={() => setDividirTicket(null)}>Cancelar</button>
              <button style={styles.btnPrimary} onClick={handleDividir}>Dividir y Re-encolar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Alerta / Confirmación / Prompt Personalizado */}
      {customModal && customModal.show && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <div style={{ ...styles.modal, maxWidth: "420px", width: "95%" }} className="ops-modal">
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
            <div style={styles.modalActions} className="ops-modal-actions">
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
  locationSection: {
    padding: "14px",
    background: "#EFF6FF",
    borderRadius: "var(--radius-sm)",
    border: "1px solid #BFDBFE",
    gap: "10px",
  },
  locationSectionDest: {
    padding: "14px",
    background: "#F0FDF4",
    borderRadius: "var(--radius-sm)",
    border: "1px solid #BBF7D0",
    gap: "10px",
  },
  locationHint: {
    margin: 0,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  mapPickerWrap: {
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    border: "1px solid var(--border)",
    background: "var(--surface)",
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
  badgeAsh: {
    background: "rgba(22, 163, 74, 0.12)",
    color: "#15803d",
    border: "1px solid rgba(22, 163, 74, 0.25)",
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
  badgeCritico: {
    background: "rgba(225, 29, 72, 0.12)",
    color: "var(--emergency)",
    border: "1px solid rgba(225, 29, 72, 0.25)",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
  },
  paginationBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "20px",
    padding: "12px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  paginationBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  paginationInfo: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text-muted)",
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
