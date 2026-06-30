"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Departamento, 
  Transporte, 
  PersonalMedico, 
  CentroAcopioOperativo, 
  InventarioAcopio, 
  Perfil,
  RolUsuario
} from "@/lib/types-operations";
import { syncInventarioConAPI } from "@/lib/adapters/acopio";
import { syncMedicosSafeCare } from "@/lib/adapters/safecare";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Briefcase, 
  Truck, 
  Stethoscope, 
  Package, 
  Users, 
  RefreshCw,
  AlertCircle,
  Check,
  Lock,
  MapPin,
  User,
  Phone
} from "lucide-react";

type ActiveTab = "perfiles" | "departamentos" | "transportes" | "medicos" | "acopios";

export default function RecursosPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("perfiles");
  const [loading, setLoading] = useState(true);

  // Datos
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [medicos, setMedicos] = useState<PersonalMedico[]>([]);
  const [acopios, setAcopios] = useState<CentroAcopioOperativo[]>([]);
  const [inventarios, setInventarios] = useState<InventarioAcopio[]>([]);

  // Formularios Modales / Edición
  const [editPerfil, setEditPerfil] = useState<Perfil | null>(null);
  const [editDept, setEditDept] = useState<Departamento | null>(null);
  const [editTrans, setEditTrans] = useState<Transporte | null>(null);
  const [editMedico, setEditMedico] = useState<PersonalMedico | null>(null);
  const [editAcopio, setEditAcopio] = useState<(CentroAcopioOperativo & { crear_usuario?: boolean; email?: string; password?: string; }) | null>(null);

  // Manejo de Inventario (sub-nivel)
  const [selectedAcopioInv, setSelectedAcopioInv] = useState<CentroAcopioOperativo | null>(null);
  const [editInv, setEditInv] = useState<InventarioAcopio | null>(null);

  // Formulario Perfil Nuevo (creación automática Auth + perfil)
  const [newPerfilEmail, setNewPerfilEmail] = useState("");
  const [newPerfilPassword, setNewPerfilPassword] = useState("");
  const [newPerfilNombre, setNewPerfilNombre] = useState("");
  const [newPerfilRol, setNewPerfilRol] = useState<RolUsuario>("transportista");
  const [newPerfilOrg, setNewPerfilOrg] = useState("");
  const [newPerfilTel, setNewPerfilTel] = useState("");
  const [creandoPerfil, setCreandoPerfil] = useState(false);

  // Modal de Alerta / Confirmación personalizado
  const [customModal, setCustomModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm: () => void;
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

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [pRes, dRes, tRes, mRes, aRes, iRes] = await Promise.all([
        supabase.from("perfiles").select("*").order("created_at", { ascending: false }),
        supabase.from("departamentos").select("*").order("nombre", { ascending: true }),
        supabase.from("transportes").select("*").order("nombre", { ascending: true }),
        supabase.from("personal_medico").select("*").order("nombre", { ascending: true }),
        supabase.from("centros_acopio").select("*").order("nombre", { ascending: true }),
        supabase.from("inventario_acopio").select("*"),
      ]);

      if (pRes.data) setPerfiles(pRes.data as Perfil[]);
      if (dRes.data) setDepartamentos(dRes.data as Departamento[]);
      if (tRes.data) setTransportes(tRes.data as Transporte[]);
      if (mRes.data) setMedicos(mRes.data as PersonalMedico[]);
      if (aRes.data) setAcopios(aRes.data as CentroAcopioOperativo[]);
      if (iRes.data) setInventarios(iRes.data as InventarioAcopio[]);
    } catch (err) {
      console.error("Error al cargar recursos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // -------------------------------------------------------------
  // CRUD PERFILES (MANUAL CON UUID)
  // -------------------------------------------------------------
  const handleCrearPerfilManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerfilEmail.trim() || !newPerfilPassword || !newPerfilNombre.trim()) {
      showCustomAlert("Correo, contraseña y nombre son obligatorios.");
      return;
    }
    if (newPerfilPassword.length < 6) {
      showCustomAlert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCreandoPerfil(true);
    try {
      const res = await fetch("/api/usuarios/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newPerfilEmail.trim(),
          password: newPerfilPassword,
          nombre: newPerfilNombre.trim(),
          rol: newPerfilRol,
          organizacion: newPerfilOrg.trim() || null,
          telefono: newPerfilTel.trim() || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "No se pudo crear el usuario");
      }

      const emailCreado = newPerfilEmail.trim();

      setNewPerfilEmail("");
      setNewPerfilPassword("");
      setNewPerfilNombre("");
      setNewPerfilRol("transportista");
      setNewPerfilOrg("");
      setNewPerfilTel("");
      showCustomAlert(`Operador creado con éxito. Ya puede iniciar sesión con ${emailCreado}.`);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al crear operador: ${err.message}`);
    } finally {
      setCreandoPerfil(false);
    }
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerfil) return;

    try {
      const { error } = await supabase
        .from("perfiles")
        .update({
          nombre: editPerfil.nombre,
          rol: editPerfil.rol,
          organizacion: editPerfil.organizacion,
          telefono: editPerfil.telefono,
          activo: editPerfil.activo
        })
        .eq("id", editPerfil.id);

      if (error) throw error;
      setEditPerfil(null);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al actualizar perfil: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // CRUD DEPARTAMENTOS
  // -------------------------------------------------------------
  const openCrearDept = () => {
    setEditDept({ id: "nuevo", clave: "", nombre: "", canal_intake: "in_app", contacto: "", iniciativa: "", activo: true });
  };

  const handleGuardarDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;

    const payload = {
      clave: editDept.clave,
      nombre: editDept.nombre,
      canal_intake: editDept.canal_intake,
      contacto: editDept.contacto || null,
      iniciativa: editDept.iniciativa || null,
      activo: editDept.activo
    };

    try {
      if (editDept.id === "nuevo") {
        const { error } = await supabase.from("departamentos").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departamentos").update(payload).eq("id", editDept.id);
        if (error) throw error;
      }
      setEditDept(null);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al guardar departamento: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // CRUD TRANSPORTES
  // -------------------------------------------------------------
  const openCrearTrans = () => {
    setEditTrans({ id: "nuevo", perfil_id: "", nombre: "", tipo: "carga", zona: "", contacto: "", cedula: "", en_standby: true, activo: true, modelo: "", placa: "" });
  };

  const handleGuardarTrans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTrans) return;

    const payload = {
      perfil_id: editTrans.perfil_id || null,
      nombre: editTrans.nombre,
      tipo: editTrans.tipo,
      zona: editTrans.zona || null,
      contacto: editTrans.contacto || null,
      cedula: editTrans.cedula || null,
      en_standby: editTrans.en_standby,
      activo: editTrans.activo,
      modelo: editTrans.modelo || null,
      placa: editTrans.placa || null
    };

    try {
      if (editTrans.id === "nuevo") {
        const { error } = await supabase.from("transportes").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transportes").update(payload).eq("id", editTrans.id);
        if (error) throw error;
      }
      setEditTrans(null);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al guardar transporte: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // CRUD PERSONAL MEDICO
  // -------------------------------------------------------------
  const openCrearMedico = () => {
    setEditMedico({ id: "nuevo", perfil_id: "", nombre: "", especialidad: "", zona: "", contacto: "", verificado: false, disponible: true, activo: true });
  };

  const handleGuardarMedico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMedico) return;

    const payload = {
      perfil_id: editMedico.perfil_id || null,
      nombre: editMedico.nombre,
      especialidad: editMedico.especialidad || null,
      zona: editMedico.zona || null,
      contacto: editMedico.contacto || null,
      verificado: editMedico.verificado,
      disponible: editMedico.disponible,
      activo: editMedico.activo
    };

    try {
      if (editMedico.id === "nuevo") {
        const { error } = await supabase.from("personal_medico").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("personal_medico").update(payload).eq("id", editMedico.id);
        if (error) throw error;
      }
      setEditMedico(null);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al guardar médico: ${err.message}`);
    }
  };

  const handleSincronizarSafeCare = async () => {
    try {
      const res = await syncMedicosSafeCare();
      if (res.success) {
        showCustomAlert(`Sincronización SafeCare completada. ${res.count} médicos cargados o actualizados.`);
        cargarDatos();
      }
    } catch (err: any) {
      showCustomAlert(`Error de sincronización SafeCare: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // CRUD CENTROS DE ACOPIO
  // -------------------------------------------------------------
  const openCrearAcopio = () => {
    setEditAcopio({ 
      id: "nuevo", 
      perfil_id: "", 
      nombre: "", 
      direccion: "", 
      latitud: null, 
      longitud: null, 
      contacto: "", 
      fuente: "manual", 
      activo: true,
      crear_usuario: false,
      email: "",
      password: ""
    });
  };

  const handleGuardarAcopio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAcopio) return;

    let targetPerfilId = editAcopio.perfil_id || null;

    try {
      if (editAcopio.id === "nuevo" && editAcopio.crear_usuario) {
        if (!editAcopio.email || !editAcopio.password) {
          showCustomAlert("Por favor ingrese correo y contraseña para el nuevo usuario.");
          return;
        }
        if (editAcopio.password.length < 6) {
          showCustomAlert("La contraseña debe tener al menos 6 caracteres.");
          return;
        }

        const res = await fetch("/api/usuarios/crear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: editAcopio.email.trim(),
            password: editAcopio.password,
            nombre: editAcopio.nombre.trim(),
            rol: "acopio"
          })
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Fallo al crear usuario en Supabase");
        }
        targetPerfilId = resData.userId;
      }

      const payload = {
        perfil_id: targetPerfilId,
        nombre: editAcopio.nombre,
        direccion: editAcopio.direccion || null,
        latitud: editAcopio.latitud,
        longitud: editAcopio.longitud,
        contacto: editAcopio.contacto || null,
        fuente: editAcopio.fuente || "manual",
        activo: editAcopio.activo
      };

      if (editAcopio.id === "nuevo") {
        const { error } = await supabase.from("centros_acopio").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("centros_acopio").update(payload).eq("id", editAcopio.id);
        if (error) throw error;
      }
      setEditAcopio(null);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al guardar centro de acopio: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // CRUD INVENTARIO ACOPIO (Sub-tabla)
  // -------------------------------------------------------------
  const handleSincronizarInventario = async (centroId: string) => {
    try {
      const res = await syncInventarioConAPI(centroId);
      if (res.success) {
        showCustomAlert(`Inventario inicial sincronizado. ${res.count} items de insumos agregados/actualizados.`);
        cargarDatos();
      }
    } catch (err: any) {
      showCustomAlert(`Error de sincronización de inventario: ${err.message}`);
    }
  };

  const openCrearInv = (centroId: string) => {
    setEditInv({ id: "nuevo", centro_id: centroId, item: "", cantidad: 10, unidad: "Unidades", actualizado_at: new Date().toISOString() });
  };

  const handleGuardarInv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInv) return;

    const payload = {
      centro_id: editInv.centro_id,
      item: editInv.item,
      cantidad: editInv.cantidad,
      unidad: editInv.unidad || "Unidades",
      actualizado_at: new Date().toISOString()
    };

    try {
      if (editInv.id === "nuevo") {
        const { error } = await supabase.from("inventario_acopio").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventario_acopio").update(payload).eq("id", editInv.id);
        if (error) throw error;
      }
      setEditInv(null);
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al guardar item de inventario: ${err.message}`);
    }
  };

  const handleDeleteInv = async (id: string) => {
    if (!(await showCustomConfirm("¿Seguro de eliminar este insumo del inventario?"))) return;
    try {
      const { error } = await supabase.from("inventario_acopio").delete().eq("id", id);
      if (error) throw error;
      cargarDatos();
    } catch (err: any) {
      showCustomAlert(`Error al eliminar insumo: ${err.message}`);
    }
  };

  return (
    <div style={styles.page} className="ops-page">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestor de Recursos Logísticos</h2>
          <p style={styles.subtitle}>Administre personal, vehículos, departamentos y almacenes de insumos.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabGroup} className="ops-tabs">
        <button 
          style={activeTab === "perfiles" ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab("perfiles"); setSelectedAcopioInv(null); }}
        >
          <Users size={16} />
          <span>Perfiles Logín ({perfiles.length})</span>
        </button>
        <button 
          style={activeTab === "departamentos" ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab("departamentos"); setSelectedAcopioInv(null); }}
        >
          <Briefcase size={16} />
          <span>Departamentos ({departamentos.length})</span>
        </button>
        <button 
          style={activeTab === "transportes" ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab("transportes"); setSelectedAcopioInv(null); }}
        >
          <Truck size={16} />
          <span>Vehículos / Transporte ({transportes.length})</span>
        </button>
        <button 
          style={activeTab === "medicos" ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab("medicos"); setSelectedAcopioInv(null); }}
        >
          <Stethoscope size={16} />
          <span>Médicos ({medicos.length})</span>
        </button>
        <button 
          style={activeTab === "acopios" ? styles.tabActive : styles.tab}
          onClick={() => { setActiveTab("acopios"); setSelectedAcopioInv(null); }}
        >
          <Package size={16} />
          <span>Acopios & Inventario ({acopios.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={styles.center}><div style={styles.spinner}></div></div>
      ) : (
        <div style={styles.tabContent}>
          
          {/* TAB: PERFILES (MANUAL LINKING) */}
          {activeTab === "perfiles" && (
            <div style={styles.tabPanel}>
              <div className="ops-panel-grid">
                {/* Formulario vinculación */}
                <form onSubmit={handleCrearPerfilManual} style={styles.sideForm}>
                  <h4 style={{ margin: "0 0 12px 0", color: "var(--brand)" }}>Registrar Operador</h4>
                  
                  <div style={styles.infoBox}>
                    <AlertCircle size={16} />
                    <span style={{ fontSize: "11px", lineHeight: 1.4 }}>
                      El correo solo identifica la cuenta de acceso (puede ser ficticio, ej. conductor01@rescate.local).
                      La cuenta queda confirmada al instante; no se envía correo de verificación.
                    </span>
                  </div>

                  <div style={{ ...styles.formField, marginTop: "12px" }}>
                    <label style={styles.label}>Correo de acceso (Requerido)</label>
                    <input
                      type="email"
                      value={newPerfilEmail}
                      onChange={(e) => setNewPerfilEmail(e.target.value)}
                      placeholder="conductor01@rescate.local"
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Contraseña inicial (Requerido)</label>
                    <input
                      type="password"
                      value={newPerfilPassword}
                      onChange={(e) => setNewPerfilPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Nombre Completo (Requerido)</label>
                    <input
                      type="text"
                      value={newPerfilNombre}
                      onChange={(e) => setNewPerfilNombre(e.target.value)}
                      placeholder="Dra. Elena Silva / Conductor Tilín 4"
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Rol Operativo</label>
                    <select
                      value={newPerfilRol}
                      onChange={(e) => setNewPerfilRol(e.target.value as RolUsuario)}
                      style={styles.select}
                    >
                      <option value="transportista">Transportista (Conductor)</option>
                      <option value="medico">Médico (SafeCare)</option>
                      <option value="acopio">Operador de Acopio</option>
                      <option value="admin">Administrador (Despachador)</option>
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Organización</label>
                    <input
                      type="text"
                      value={newPerfilOrg}
                      onChange={(e) => setNewPerfilOrg(e.target.value)}
                      placeholder="SafeCare, Tu Gruero, Nueve Once..."
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Teléfono Contacto</label>
                    <input
                      type="text"
                      value={newPerfilTel}
                      onChange={(e) => setNewPerfilTel(e.target.value)}
                      placeholder="0414-XXXXXXX"
                      style={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creandoPerfil}
                    style={{
                      ...styles.btnPrimary,
                      marginTop: "12px",
                      width: "100%",
                      opacity: creandoPerfil ? 0.7 : 1,
                      cursor: creandoPerfil ? "not-allowed" : "pointer",
                    }}
                  >
                    <Plus size={16} />
                    <span>{creandoPerfil ? "Creando..." : "Crear Operador"}</span>
                  </button>
                </form>

                {/* Lista perfiles */}
                <div style={styles.listContainer} className="ops-table-wrap">
                  <h4 style={{ margin: "0 0 12px 0" }}>Perfiles Vinculados</h4>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Nombre</th>
                        <th style={styles.th}>Rol</th>
                        <th style={styles.th}>Organización</th>
                        <th style={styles.th}>Teléfono</th>
                        <th style={styles.th}>Estado</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfiles.map(p => (
                        <tr key={p.id} style={styles.tr}>
                          <td style={styles.td}><strong>{p.nombre || "Sin Nombre"}</strong></td>
                          <td style={styles.td}><span style={styles.roleTag}>{p.rol.toUpperCase()}</span></td>
                          <td style={styles.td}>{p.organizacion || "Independiente"}</td>
                          <td style={styles.td}>{p.telefono || "No registrado"}</td>
                          <td style={styles.td}>{p.activo ? "🟢 Activo" : "🔴 Inactivo"}</td>
                          <td style={styles.td}>
                            <button style={styles.actionBtn} onClick={() => setEditPerfil(p)}>
                              <Edit2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEPARTAMENTOS */}
          {activeTab === "departamentos" && (
            <div style={styles.tabPanel}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                <button style={styles.btnPrimary} onClick={openCrearDept}>
                  <Plus size={16} />
                  <span>Crear Departamento</span>
                </button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Clave</th>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Canal Intake</th>
                    <th style={styles.th}>Contacto</th>
                    <th style={styles.th}>Iniciativa</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.map(d => (
                    <tr key={d.id} style={styles.tr}>
                      <td style={styles.td}><code>{d.clave}</code></td>
                      <td style={styles.td}><strong>{d.nombre}</strong></td>
                      <td style={styles.td}>{d.canal_intake.toUpperCase()}</td>
                      <td style={styles.td}>{d.contacto || "N/A"}</td>
                      <td style={styles.td}>{d.iniciativa || "Red General"}</td>
                      <td style={styles.td}>{d.activo ? "🟢 Activo" : "🔴 Inactivo"}</td>
                      <td style={styles.td}>
                        <button style={styles.actionBtn} onClick={() => setEditDept(d)}>
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: TRANSPORTES */}
          {activeTab === "transportes" && (
            <div style={styles.tabPanel}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                <button style={styles.btnPrimary} onClick={openCrearTrans}>
                  <Plus size={16} />
                  <span>Crear Vehículo</span>
                </button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre Vehículo</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Modelo</th>
                    <th style={styles.th}>Placa</th>
                    <th style={styles.th}>Zona Ruteo</th>
                    <th style={styles.th}>Teléfono</th>
                    <th style={styles.th}>Standby</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Perfil Asoc.</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {transportes.map(t => (
                    <tr key={t.id} style={styles.tr}>
                      <td style={styles.td}><strong>{t.nombre}</strong></td>
                      <td style={styles.td}><span style={styles.typeTag}>{t.tipo.toUpperCase()}</span></td>
                      <td style={styles.td}>{t.modelo || "N/A"}</td>
                      <td style={styles.td}>{t.placa || "N/A"}</td>
                      <td style={styles.td}>{t.zona || "Todas"}</td>
                      <td style={styles.td}>{t.contacto || "N/A"}</td>
                      <td style={styles.td}>{t.en_standby ? "⚡ Esperando (Standby)" : "🚚 Ocupado/En viaje"}</td>
                      <td style={styles.td}>{t.activo ? "🟢 Activo" : "🔴 Inactivo"}</td>
                      <td style={styles.td}>
                        {t.perfil_id ? perfiles.find(p => p.id === t.perfil_id)?.nombre || "UUID mapped" : "⚠️ Sin usuario asignado"}
                      </td>
                      <td style={styles.td}>
                        <button style={styles.actionBtn} onClick={() => setEditTrans(t)}>
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: MEDICOS */}
          {activeTab === "medicos" && (
            <div style={styles.tabPanel}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <button style={styles.btnSecondary} onClick={handleSincronizarSafeCare}>
                  <RefreshCw size={16} />
                  <span>Sincronizar Roster SafeCare</span>
                </button>
                <button style={styles.btnPrimary} onClick={openCrearMedico}>
                  <Plus size={16} />
                  <span>Crear Médico Manual</span>
                </button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre Médico</th>
                    <th style={styles.th}>Especialidad</th>
                    <th style={styles.th}>Zona</th>
                    <th style={styles.th}>Contacto</th>
                    <th style={styles.th}>Verificado SafeCare</th>
                    <th style={styles.th}>Disponibilidad</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Perfil Asoc.</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {medicos.map(m => (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}><strong>{m.nombre}</strong></td>
                      <td style={styles.td}>{m.especialidad || "Médico General"}</td>
                      <td style={styles.td}>{m.zona || "Todas"}</td>
                      <td style={styles.td}>{m.contacto || "N/A"}</td>
                      <td style={styles.td}>{m.verificado ? "✅ Verificado" : "❌ No verificado"}</td>
                      <td style={styles.td}>{m.disponible ? "🟢 Disponible" : "🔴 No disponible"}</td>
                      <td style={styles.td}>{m.activo ? "🟢 Activo" : "🔴 Inactivo"}</td>
                      <td style={styles.td}>
                        {m.perfil_id ? perfiles.find(p => p.id === m.perfil_id)?.nombre || "UUID mapped" : "⚠️ Sin usuario asignado"}
                      </td>
                      <td style={styles.td}>
                        <button style={styles.actionBtn} onClick={() => setEditMedico(m)}>
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: ACOPIOS */}
          {activeTab === "acopios" && (
            <div style={styles.tabPanel}>
              {selectedAcopioInv ? (
                // Vista detalle del inventario de un acopio
                <div style={styles.inventorySubPanel}>
                  <div style={styles.inventorySubHeader}>
                    <button style={styles.btnSecondary} onClick={() => setSelectedAcopioInv(null)}>
                      &larr; Volver a Centros de Acopio
                    </button>
                    <div>
                      <h4 style={{ margin: 0 }}>Gestión de Inventario: {selectedAcopioInv.nombre}</h4>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{selectedAcopioInv.direccion}</p>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={styles.btnSecondary} onClick={() => handleSincronizarInventario(selectedAcopioInv.id)}>
                        <RefreshCw size={14} />
                        <span>Sincronizar Stock Mock API</span>
                      </button>
                      <button style={styles.btnPrimary} onClick={() => openCrearInv(selectedAcopioInv.id)}>
                        <Plus size={14} />
                        <span>Agregar Insumo</span>
                      </button>
                    </div>
                  </div>

                  <table style={{ ...styles.table, marginTop: "12px" }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Insumo / Item</th>
                        <th style={styles.th}>Cantidad disponible</th>
                        <th style={styles.th}>Unidad</th>
                        <th style={styles.th}>Última actualización</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventarios.filter(i => i.centro_id === selectedAcopioInv.id).map(i => (
                        <tr key={i.id} style={styles.tr}>
                          <td style={styles.td}><strong>{i.item}</strong></td>
                          <td style={styles.td}>{i.cantidad}</td>
                          <td style={styles.td}>{i.unidad || "Unidades"}</td>
                          <td style={styles.td}>{new Date(i.actualizado_at).toLocaleString("es-VE")}</td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button style={styles.actionBtn} onClick={() => setEditInv(i)}>
                                <Edit2 size={12} />
                              </button>
                              <button style={{ ...styles.actionBtn, color: "var(--emergency)" }} onClick={() => handleDeleteInv(i.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Lista de acopios
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                    <button style={styles.btnPrimary} onClick={openCrearAcopio}>
                      <Plus size={16} />
                      <span>Crear Centro de Acopio</span>
                    </button>
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Nombre Acopio</th>
                        <th style={styles.th}>Dirección</th>
                        <th style={styles.th}>Contacto</th>
                        <th style={styles.th}>Coordenadas</th>
                        <th style={styles.th}>Usuario Encargado</th>
                        <th style={styles.th}>Fuente</th>
                        <th style={styles.th}>Estado</th>
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acopios.map(a => (
                        <tr key={a.id} style={styles.tr}>
                          <td style={styles.td}>
                            <button style={styles.linkBtn} onClick={() => setSelectedAcopioInv(a)}>
                              <strong>{a.nombre}</strong> (Ver Inventario)
                            </button>
                          </td>
                          <td style={styles.td}>{a.direccion || "No registrada"}</td>
                          <td style={styles.td}>{a.contacto || "N/A"}</td>
                          <td style={styles.td}>
                            {a.latitud && a.longitud ? `${a.latitud.toFixed(4)}, ${a.longitud.toFixed(4)}` : "No geolocalizado"}
                          </td>
                          <td style={styles.td}>
                            {a.perfil_id ? perfiles.find(p => p.id === a.perfil_id)?.nombre || "Asociado" : "⚠️ Sin usuario"}
                          </td>
                          <td style={styles.td}>{a.fuente || "manual"}</td>
                          <td style={styles.td}>{a.activo ? "🟢 Activo" : "🔴 Inactivo"}</td>
                          <td style={styles.td}>
                            <button style={styles.actionBtn} onClick={() => setEditAcopio(a)}>
                              <Edit2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODAL PERFIL EDIT */}
      {editPerfil && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleGuardarPerfil} style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3>Editar Perfil Operador</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditPerfil(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formField}>
                <label style={styles.label}>UUID (Solo lectura)</label>
                <input type="text" value={editPerfil.id} readOnly style={{ ...styles.input, opacity: 0.7 }} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Nombre Completo</label>
                <input type="text" value={editPerfil.nombre || ""} onChange={(e) => setEditPerfil({ ...editPerfil, nombre: e.target.value })} required style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Rol Operativo</label>
                <select value={editPerfil.rol} onChange={(e) => setEditPerfil({ ...editPerfil, rol: e.target.value as any })} style={styles.select}>
                  <option value="transportista">Transportista</option>
                  <option value="medico">Médico (SafeCare)</option>
                  <option value="acopio">Encargado de Acopio</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Organización</label>
                <input type="text" value={editPerfil.organizacion || ""} onChange={(e) => setEditPerfil({ ...editPerfil, organizacion: e.target.value })} style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Teléfono</label>
                <input type="text" value={editPerfil.telefono || ""} onChange={(e) => setEditPerfil({ ...editPerfil, telefono: e.target.value })} style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={editPerfil.activo} onChange={(e) => setEditPerfil({ ...editPerfil, activo: e.target.checked })} />
                  <span>Perfil Activo</span>
                </label>
              </div>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditPerfil(null)}>Cancelar</button>
              <button type="submit" style={styles.btnPrimary}>Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DEPARTAMENTO */}
      {editDept && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleGuardarDept} style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3>{editDept.id === "nuevo" ? "Crear Departamento" : "Editar Departamento"}</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditDept(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formField}>
                <label style={styles.label}>Clave Identificadora (Única)</label>
                <input 
                  type="text" 
                  value={editDept.clave} 
                  onChange={(e) => setEditDept({ ...editDept, clave: e.target.value })} 
                  placeholder="ej. transporte_carga"
                  required 
                  disabled={editDept.id !== "nuevo"}
                  style={styles.input} 
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Nombre Mostrar</label>
                <input type="text" value={editDept.nombre} onChange={(e) => setEditDept({ ...editDept, nombre: e.target.value })} placeholder="ej. Transporte de Carga Pesada" required style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Canal Intake (Recepción)</label>
                <select value={editDept.canal_intake} onChange={(e) => setEditDept({ ...editDept, canal_intake: e.target.value as any })} style={styles.select}>
                  <option value="in_app">Interno en la App</option>
                  <option value="whatsapp">WhatsApp Handoff</option>
                  <option value="llamada">Llamada de Emergencia</option>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Contacto (WhatsApp o Teléfono)</label>
                <input type="text" value={editDept.contacto || ""} onChange={(e) => setEditDept({ ...editDept, contacto: e.target.value })} placeholder="+58XXXXXXXXX" style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Iniciativa</label>
                <input type="text" value={editDept.iniciativa || ""} onChange={(e) => setEditDept({ ...editDept, iniciativa: e.target.value })} placeholder="Red Juntos por Venezuela..." style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={editDept.activo} onChange={(e) => setEditDept({ ...editDept, activo: e.target.checked })} />
                  <span>Activo</span>
                </label>
              </div>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditDept(null)}>Cancelar</button>
              <button type="submit" style={styles.btnPrimary}>Guardar Departamento</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL TRANSPORTE */}
      {editTrans && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleGuardarTrans} style={styles.modalAcopio} className="ops-modal ops-modal-wide">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "17px" }}>
                {editTrans.id === "nuevo" ? "Crear Transporte" : "Editar Transporte"}
              </h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditTrans(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBodyAcopio}>
              <section style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>
                  <Truck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  Conductor y tipo de unidad
                </h4>
                <div style={styles.modalSectionContent}>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Nombre del proveedor / conductor</label>
                    <input
                      type="text"
                      value={editTrans.nombre}
                      onChange={(e) => setEditTrans({ ...editTrans, nombre: e.target.value })}
                      placeholder="Tu Gruero / Voluntario Juan"
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Tipo de transporte</label>
                    <select
                      value={editTrans.tipo}
                      onChange={(e) => setEditTrans({ ...editTrans, tipo: e.target.value as Transporte["tipo"] })}
                      style={styles.select}
                    >
                      <option value="ambulancia">Ambulancia (médico)</option>
                      <option value="pasajeros">Transporte de pasajeros</option>
                      <option value="carga">Vehículo de carga / insumos</option>
                      <option value="grua">Grúa pesada</option>
                      <option value="tecnico">Soporte técnico</option>
                    </select>
                  </div>
                </div>
              </section>

              <section style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>Datos del vehículo</h4>
                <div style={styles.modalSectionContent}>
                  <div style={styles.fieldRow} className="ops-form-row">
                    <div style={{ ...styles.formField, minWidth: 0 }}>
                      <label style={styles.labelNormal}>Modelo</label>
                      <input
                        type="text"
                        value={editTrans.modelo || ""}
                        onChange={(e) => setEditTrans({ ...editTrans, modelo: e.target.value })}
                        placeholder="Toyota Hilux / Encava"
                        style={styles.input}
                      />
                    </div>
                    <div style={{ ...styles.formField, minWidth: 0 }}>
                      <label style={styles.labelNormal}>Placa</label>
                      <input
                        type="text"
                        value={editTrans.placa || ""}
                        onChange={(e) => setEditTrans({ ...editTrans, placa: e.target.value })}
                        placeholder="AB123CD"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>
                  <Phone size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  Zona y contacto
                </h4>
                <div style={styles.modalSectionContent}>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Zona principal de operación</label>
                    <input
                      type="text"
                      value={editTrans.zona || ""}
                      onChange={(e) => setEditTrans({ ...editTrans, zona: e.target.value })}
                      placeholder="Chacao, Baruta, Caracas..."
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Teléfono de contacto</label>
                    <input
                      type="tel"
                      value={editTrans.contacto || ""}
                      onChange={(e) => setEditTrans({ ...editTrans, contacto: e.target.value })}
                      placeholder="0414-0000000"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Cédula del conductor (validación combustible)</label>
                    <input
                      type="text"
                      value={editTrans.cedula || ""}
                      onChange={(e) => setEditTrans({ ...editTrans, cedula: e.target.value })}
                      placeholder="V-12345678"
                      style={styles.input}
                    />
                  </div>
                </div>
              </section>

              <section style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>
                  <User size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  Usuario vinculado
                </h4>
                <div style={styles.formField}>
                  <label style={styles.labelNormal}>Cuenta de acceso (opcional)</label>
                  <select
                    value={editTrans.perfil_id || ""}
                    onChange={(e) => setEditTrans({ ...editTrans, perfil_id: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">— Sin usuario (operador externo) —</option>
                    {perfiles.filter((p) => p.rol === "transportista").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.organizacion ? `· ${p.organizacion}` : ""}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 4 }}>
                    Vincula un transportista registrado en Perfiles para que vea sus asignaciones en la app.
                  </span>
                </div>
              </section>

              <div style={styles.statusGroup}>
                <label style={styles.statusRow}>
                  <input
                    type="checkbox"
                    checked={editTrans.en_standby}
                    onChange={(e) => setEditTrans({ ...editTrans, en_standby: e.target.checked })}
                  />
                  <span>En standby (disponible para asignación)</span>
                </label>
                <label style={styles.statusRow}>
                  <input
                    type="checkbox"
                    checked={editTrans.activo}
                    onChange={(e) => setEditTrans({ ...editTrans, activo: e.target.checked })}
                  />
                  <span>Activo en el sistema</span>
                </label>
              </div>
            </div>

            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditTrans(null)}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnPrimary}>
                Guardar vehículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL MEDICO */}
      {editMedico && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleGuardarMedico} style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3>{editMedico.id === "nuevo" ? "Crear Médico" : "Editar Ficha Médica"}</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditMedico(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formField}>
                <label style={styles.label}>Nombre Médico</label>
                <input type="text" value={editMedico.nombre} onChange={(e) => setEditMedico({ ...editMedico, nombre: e.target.value })} placeholder="Dr. Juan López" required style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Especialidad</label>
                <input type="text" value={editMedico.especialidad || ""} onChange={(e) => setEditMedico({ ...editMedico, especialidad: e.target.value })} placeholder="Emergenciología, Pediatría..." style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Usuario Asociado (Login)</label>
                <select 
                  value={editMedico.perfil_id || ""} 
                  onChange={(e) => setEditMedico({ ...editMedico, perfil_id: e.target.value })}
                  style={styles.select}
                >
                  <option value="">-- Sin usuario (Externo) --</option>
                  {perfiles.filter(p => p.rol === "medico").map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.organizacion || "SafeCare"})</option>
                  ))}
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Zona de Guardia</label>
                <input type="text" value={editMedico.zona || ""} onChange={(e) => setEditMedico({ ...editMedico, zona: e.target.value })} placeholder="Chacao, Baruta, Sucre..." style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Teléfono Contacto</label>
                <input type="text" value={editMedico.contacto || ""} onChange={(e) => setEditMedico({ ...editMedico, contacto: e.target.value })} style={styles.input} />
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={editMedico.verificado} onChange={(e) => setEditMedico({ ...editMedico, verificado: e.target.checked })} />
                  <span>Verificado SafeCare</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={editMedico.disponible} onChange={(e) => setEditMedico({ ...editMedico, disponible: e.target.checked })} />
                  <strong>Disponible Guardia</strong>
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={editMedico.activo} onChange={(e) => setEditMedico({ ...editMedico, activo: e.target.checked })} />
                  <span>Activo</span>
                </label>
              </div>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditMedico(null)}>Cancelar</button>
              <button type="submit" style={styles.btnPrimary}>Guardar Ficha</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ACOPIO */}
      {editAcopio && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleGuardarAcopio} style={styles.modalAcopio} className="ops-modal ops-modal-wide">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "17px" }}>
                {editAcopio.id === "nuevo" ? "Crear Centro de Acopio" : "Editar Centro de Acopio"}
              </h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditAcopio(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBodyAcopio}>
              <section style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>Información del almacén</h4>
                <div style={styles.modalSectionContent}>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Nombre del almacén</label>
                    <input
                      type="text"
                      value={editAcopio.nombre}
                      onChange={(e) => setEditAcopio({ ...editAcopio, nombre: e.target.value })}
                      placeholder="Acopio Colegio Francia"
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Dirección</label>
                    <input
                      type="text"
                      value={editAcopio.direccion || ""}
                      onChange={(e) => setEditAcopio({ ...editAcopio, direccion: e.target.value })}
                      placeholder="Av. Principal, Altamira"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Contacto del encargado</label>
                    <input
                      type="text"
                      value={editAcopio.contacto || ""}
                      onChange={(e) => setEditAcopio({ ...editAcopio, contacto: e.target.value })}
                      placeholder="Nombre y teléfono"
                      style={styles.input}
                    />
                  </div>
                </div>
              </section>

              <section style={styles.modalSection}>
                <h4 style={styles.modalSectionTitle}>
                  <MapPin size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  Ubicación en mapa
                </h4>
                <div style={styles.modalSectionContent}>
                  <div style={styles.fieldRow} className="ops-form-row">
                    <div style={{ ...styles.formField, minWidth: 0 }}>
                      <label style={styles.labelNormal}>Latitud</label>
                      <input
                        type="number"
                        step="any"
                        value={editAcopio.latitud ?? ""}
                        onChange={(e) =>
                          setEditAcopio({
                            ...editAcopio,
                            latitud: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="10.48"
                        style={styles.input}
                      />
                    </div>
                    <div style={{ ...styles.formField, minWidth: 0 }}>
                      <label style={styles.labelNormal}>Longitud</label>
                      <input
                        type="number"
                        step="any"
                        value={editAcopio.longitud ?? ""}
                        onChange={(e) =>
                          setEditAcopio({
                            ...editAcopio,
                            longitud: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="-66.86"
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={styles.mapPickerWrap}>
                    <LocationPicker
                      lat={editAcopio.latitud}
                      lng={editAcopio.longitud}
                      onChange={(lat, lng) => setEditAcopio({ ...editAcopio, latitud: lat, longitud: lng })}
                    />
                  </div>
                </div>
              </section>

              {editAcopio.id === "nuevo" ? (
                <section
                  style={{
                    ...styles.modalSection,
                    borderColor: editAcopio.crear_usuario ? "rgba(59,130,246,0.35)" : undefined,
                    background: editAcopio.crear_usuario ? "rgba(59,130,246,0.04)" : undefined,
                  }}
                >
                  <label style={styles.accessToggle}>
                    <input
                      type="checkbox"
                      checked={editAcopio.crear_usuario || false}
                      onChange={(e) => setEditAcopio({ ...editAcopio, crear_usuario: e.target.checked })}
                      style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={styles.accessToggleTitle}>
                        <Lock size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                        Crear usuario de acceso
                      </span>
                      <span style={styles.accessToggleHint}>
                        El operador podrá ingresar y gestionar el inventario de este acopio.
                      </span>
                    </div>
                  </label>

                  {editAcopio.crear_usuario && (
                    <div style={styles.accessFields}>
                      <p style={styles.accessHint}>
                        El correo solo sirve para iniciar sesión (puede ser ficticio). La cuenta queda activa al instante.
                      </p>
                      <div style={styles.formField}>
                        <label style={styles.labelNormal}>Correo de acceso</label>
                        <input
                          type="email"
                          value={editAcopio.email || ""}
                          onChange={(e) => setEditAcopio({ ...editAcopio, email: e.target.value })}
                          placeholder="acopio01@rescate.local"
                          required={editAcopio.crear_usuario}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formField}>
                        <label style={styles.labelNormal}>Contraseña inicial</label>
                        <input
                          type="password"
                          value={editAcopio.password || ""}
                          onChange={(e) => setEditAcopio({ ...editAcopio, password: e.target.value })}
                          placeholder="Mínimo 6 caracteres"
                          required={editAcopio.crear_usuario}
                          minLength={6}
                          style={styles.input}
                        />
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <section style={styles.modalSection}>
                  <h4 style={styles.modalSectionTitle}>Usuario vinculado</h4>
                  <div style={styles.formField}>
                    <label style={styles.labelNormal}>Cuenta de acceso (login)</label>
                    <select
                      value={editAcopio.perfil_id || ""}
                      onChange={(e) => setEditAcopio({ ...editAcopio, perfil_id: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">— Sin vincular —</option>
                      {perfiles.filter((p) => p.rol === "acopio").map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.rol})
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              )}

              <label style={styles.statusRow}>
                <input
                  type="checkbox"
                  checked={editAcopio.activo}
                  onChange={(e) => setEditAcopio({ ...editAcopio, activo: e.target.checked })}
                />
                <span>Centro activo y visible en operaciones</span>
              </label>
            </div>

            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditAcopio(null)}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnPrimary}>
                Guardar acopio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL INVENTARIO ITEM */}
      {editInv && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleGuardarInv} style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3>{editInv.id === "nuevo" ? "Agregar Insumo" : "Editar Cantidad Insumo"}</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditInv(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formField}>
                <label style={styles.label}>Nombre Item / Medicamento</label>
                <input 
                  type="text" 
                  value={editInv.item} 
                  onChange={(e) => setEditInv({ ...editInv, item: e.target.value })} 
                  placeholder="ej. Solución Salina 0.9%, Agua embotellada"
                  required 
                  disabled={editInv.id !== "nuevo"}
                  style={styles.input} 
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Cantidad Disponible</label>
                <input type="number" step="any" value={editInv.cantidad} onChange={(e) => setEditInv({ ...editInv, cantidad: parseFloat(e.target.value) })} required style={styles.input} />
              </div>
              <div style={styles.formField}>
                <label style={styles.label}>Unidad de medida</label>
                <input type="text" value={editInv.unidad || ""} onChange={(e) => setEditInv({ ...editInv, unidad: e.target.value })} placeholder="cajas, botellas, sobres, tabletas..." style={styles.input} />
              </div>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditInv(null)}>Cancelar</button>
              <button type="submit" style={styles.btnPrimary}>Guardar Insumo</button>
            </div>
          </form>
        </div>
      )}
      {/* Modal de Alerta / Confirmación Personalizado */}
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
                  else customModal.onConfirm();
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text)" }}>{customModal.message}</p>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              {customModal.type === "confirm" && (
                <button 
                  type="button" 
                  style={styles.btnSecondary} 
                  onClick={() => {
                    if (customModal.onCancel) customModal.onCancel();
                    else customModal.onConfirm();
                  }}
                >
                  Cancelar
                </button>
              )}
              <button 
                type="button" 
                style={styles.btnPrimary} 
                onClick={customModal.onConfirm}
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
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s3)",
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
  tabGroup: {
    display: "flex",
    borderBottom: "2px solid var(--border)",
    gap: "4px",
    overflowX: "auto",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    whiteSpace: "nowrap",
  },
  tabActive: {
    background: "none",
    border: "none",
    borderBottom: "2px solid var(--brand)",
    padding: "10px 16px",
    cursor: "default",
    fontSize: "var(--text-sm)",
    fontWeight: 800,
    color: "var(--brand)",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    whiteSpace: "nowrap",
  },
  tabContent: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    boxShadow: "var(--shadow)",
  },
  tabPanel: {
    display: "flex",
    flexDirection: "column",
  },
  sideForm: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--s4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
    alignSelf: "start",
    width: "100%",
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    overflowX: "auto",
  },
  infoBox: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    background: "var(--brand-soft)",
    borderLeft: "4px solid var(--brand)",
    padding: "8px 12px",
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    color: "var(--brand)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-muted)",
    fontWeight: 700,
  },
  tr: {
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "10px 8px",
    verticalAlign: "middle",
  },
  roleTag: {
    background: "var(--brand-soft)",
    color: "var(--brand)",
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
  },
  typeTag: {
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
  },
  actionBtn: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    width: "28px",
    height: "28px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "var(--brand)",
    textDecoration: "underline",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
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
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--s2)",
  },
  btnSecondary: {
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--s2)",
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
  inventorySubPanel: {
    background: "var(--surface-2)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "var(--s4)",
  },
  inventorySubHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    paddingBottom: "var(--s3)",
    flexWrap: "wrap",
    gap: "10px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "8px 12px",
    fontSize: "13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface)",
  },
  select: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface)",
    height: "38px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    cursor: "pointer",
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
    maxWidth: "450px",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
    padding: "var(--s5)",
  },
  modalAcopio: {
    background: "var(--surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "min(92vh, 720px)",
    display: "flex",
    flexDirection: "column",
    margin: "16px",
    overflow: "hidden",
  },
  modalBodyAcopio: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "0 20px",
    overflowY: "auto",
    overflowX: "hidden",
    flex: 1,
  },
  modalSection: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px 16px",
  },
  modalSectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text)",
  },
  modalSectionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  fieldRow: {
    gap: "10px",
  },
  mapPickerWrap: {
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    border: "1px solid var(--border)",
    maxWidth: "100%",
  },
  labelNormal: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  accessToggle: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    cursor: "pointer",
    margin: 0,
  },
  accessToggleTitle: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: "4px",
  },
  accessToggleHint: {
    display: "block",
    fontSize: "12px",
    color: "var(--text-muted)",
    lineHeight: 1.45,
  },
  accessFields: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: "1px solid var(--border)",
  },
  accessHint: {
    margin: 0,
    fontSize: "11px",
    lineHeight: 1.45,
    color: "var(--text-muted)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 10px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    margin: 0,
  },
  statusGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "4px",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    padding: "16px 20px",
    flexShrink: 0,
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
    gap: "var(--s3)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--s3)",
    borderTop: "1px solid var(--border)",
    padding: "14px 20px",
    flexShrink: 0,
    background: "var(--surface)",
  }
};
