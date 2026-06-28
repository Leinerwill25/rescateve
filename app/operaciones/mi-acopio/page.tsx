"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useOperationsAuth } from "../AuthContext";
import { 
  Package, 
  History, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  MapPin, 
  Phone,
  AlertTriangle,
  X,
  Plus
} from "lucide-react";
import { CentroAcopioOperativo, InventarioAcopio, InventarioMovimiento } from "@/lib/types-operations";

type Tab = "stock" | "movimientos";

export default function MiAcopioPage() {
  const { session, perfil } = useOperationsAuth();
  
  const [acopio, setAcopio] = useState<CentroAcopioOperativo | null>(null);
  const [inventario, setInventario] = useState<InventarioAcopio[]>([]);
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("stock");
  
  // Modal registro de movimiento
  const [showMovModal, setShowMovModal] = useState(false);
  const [tipoMov, setTipoMov] = useState<"entrada" | "salida">("entrada");
  const [item, setItem] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("Unidades");
  const [destNombre, setDestNombre] = useState("");
  const [destApellido, setDestApellido] = useState("");
  const [destinoRef, setDestinoRef] = useState("");
  const [retiradoPor, setRetiradoPor] = useState("");
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      cargarDatosAcopio();
    }
  }, [session]);

  const cargarDatosAcopio = async () => {
    setLoading(true);
    try {
      // 1. Obtener la ficha del acopio vinculada a este usuario
      const { data: acopioData, error: acopioErr } = await supabase
        .from("centros_acopio")
        .select("*")
        .eq("perfil_id", session.user.id)
        .maybeSingle();

      if (acopioErr) throw acopioErr;

      if (acopioData) {
        setAcopio(acopioData);

        // 2. Cargar inventario del centro
        const { data: invData } = await supabase
          .from("inventario_acopio")
          .select("*")
          .eq("centro_id", acopioData.id)
          .order("item", { ascending: true });

        setInventario(invData || []);

        // 3. Cargar movimientos de inventario
        const { data: movData } = await supabase
          .from("inventario_movimientos")
          .select("*")
          .eq("centro_id", acopioData.id)
          .order("created_at", { ascending: false });

        setMovimientos(movData || []);
      }
    } catch (err: any) {
      console.error("Error al cargar datos del acopio:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acopio) return;
    if (!item.trim() || !cantidad || parseFloat(cantidad) <= 0) {
      setErrorModal("Por favor ingrese un artículo y una cantidad válida mayor a 0.");
      return;
    }

    setGuardando(true);
    setErrorModal(null);

    const qtyNum = parseFloat(cantidad);

    try {
      const { error } = await supabase
        .from("inventario_movimientos")
        .insert({
          centro_id: acopio.id,
          item: item.trim(),
          cantidad: qtyNum,
          tipo_movimiento: tipoMov,
          destinatario_nombre: tipoMov === "salida" ? destNombre.trim() || null : null,
          destinatario_apellido: tipoMov === "salida" ? destApellido.trim() || null : null,
          destino_ref: tipoMov === "salida" ? destinoRef.trim() || null : null,
          retirado_por: tipoMov === "salida" ? retiradoPor.trim() || null : null,
          creado_por: session.user.id
        });

      if (error) throw error;

      // Cerrar modal y limpiar
      setShowMovModal(false);
      setItem("");
      setCantidad("");
      setUnidad("Unidades");
      setDestNombre("");
      setDestApellido("");
      setDestinoRef("");
      setRetiradoPor("");
      
      // Recargar datos
      await cargarDatosAcopio();
    } catch (err: any) {
      console.error(err);
      setErrorModal(err.message || "Error al guardar el movimiento. Verifique el stock disponible.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "12px", color: "var(--text-muted)", fontSize: "14px" }}>Cargando datos de tu almacén...</p>
      </div>
    );
  }

  if (!acopio) {
    return (
      <div style={styles.noFichaContainer}>
        <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: "var(--s4)" }} />
        <h2 style={{ margin: "0 0 12px 0", color: "var(--text)" }}>Ficha de Almacén No Encontrada</h2>
        <p style={{ margin: "0 0 20px 0", color: "var(--text-muted)", fontSize: "var(--text-sm)", maxWidth: "500px", lineHeight: 1.5 }}>
          Tu usuario de operador de acopio no está vinculado a ningún centro de acopio activo. Solicita a un administrador asociar tu perfil a un almacén en la pestaña de **Recursos**.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER DE ALMACÉN */}
      <div style={styles.headerCard}>
        <div style={styles.headerInfo}>
          <div style={styles.iconWrapper}>
            <Package size={32} color="var(--brand)" />
          </div>
          <div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", color: "var(--text)" }}>{acopio.nombre}</h2>
            <div style={styles.metaRow}>
              {acopio.direccion && (
                <span style={styles.metaItem}>
                  <MapPin size={14} /> {acopio.direccion}
                </span>
              )}
              {acopio.contacto && (
                <span style={styles.metaItem}>
                  <Phone size={14} /> Contacto: {acopio.contacto}
                </span>
              )}
            </div>
          </div>
        </div>

        <button onClick={() => setShowMovModal(true)} style={styles.btnAction}>
          <PlusCircle size={18} />
          Registrar Entrada / Salida
        </button>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div style={styles.tabBar}>
        <button 
          onClick={() => setActiveTab("stock")} 
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === "stock" ? "2px solid var(--brand)" : "2px solid transparent",
            color: activeTab === "stock" ? "var(--brand)" : "var(--text-muted)",
            fontWeight: activeTab === "stock" ? 700 : 500
          }}
        >
          <Package size={16} />
          Stock e Inventario
        </button>
        <button 
          onClick={() => setActiveTab("movimientos")} 
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === "movimientos" ? "2px solid var(--brand)" : "2px solid transparent",
            color: activeTab === "movimientos" ? "var(--brand)" : "var(--text-muted)",
            fontWeight: activeTab === "movimientos" ? 700 : 500
          }}
        >
          <History size={16} />
          Historial de Movimientos
        </button>
      </div>

      {/* CONTENIDO DE TAB: STOCK */}
      {activeTab === "stock" && (
        <div style={styles.card}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--text)" }}>Insumos en Existencia</h3>
          
          {inventario.length === 0 ? (
            <div style={styles.emptyState}>
              <Package size={36} color="var(--text-muted)" style={{ marginBottom: "8px" }} />
              <p style={{ margin: 0, color: "var(--text-muted)" }}>Este almacén no tiene ningún insumo registrado.</p>
              <button onClick={() => setShowMovModal(true)} style={{ ...styles.btnAction, marginTop: "12px", background: "none", color: "var(--brand)", border: "1px solid var(--brand)" }}>
                <Plus size={16} /> Agregar Primer Insumo
              </button>
            </div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre del Artículo</th>
                    <th style={styles.th}>Cantidad Disponible</th>
                    <th style={styles.th}>Unidad</th>
                    <th style={styles.th}>Última Actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((item) => (
                    <tr key={item.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{item.item}</td>
                      <td style={{ ...styles.td, color: item.cantidad <= 10 ? "var(--emergency)" : "var(--text)", fontWeight: 700 }}>
                        {item.cantidad}
                      </td>
                      <td style={styles.td}>{item.unidad || "Unidades"}</td>
                      <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                        {new Date(item.actualizado_at).toLocaleDateString()} a las {new Date(item.actualizado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE TAB: HISTORIAL */}
      {activeTab === "movimientos" && (
        <div style={styles.card}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--text)" }}>Bitácora de Movimientos (Entradas / Salidas)</h3>

          {movimientos.length === 0 ? (
            <div style={styles.emptyState}>
              <History size={36} color="var(--text-muted)" style={{ marginBottom: "8px" }} />
              <p style={{ margin: 0, color: "var(--text-muted)" }}>No se han registrado movimientos de inventario todavía.</p>
            </div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha / Hora</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Artículo</th>
                    <th style={styles.th}>Cantidad</th>
                    <th style={styles.th}>Destinatario</th>
                    <th style={styles.th}>Destino</th>
                    <th style={styles.th}>Retirado Por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => {
                    const esSalida = mov.tipo_movimiento === "salida";
                    return (
                      <tr key={mov.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                          {new Date(mov.created_at).toLocaleDateString()} {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: esSalida ? "var(--emergency-soft)" : "var(--brand-soft)",
                            color: esSalida ? "var(--emergency)" : "var(--brand)"
                          }}>
                            {esSalida ? <ArrowUpRight size={12} style={{ marginRight: "3px" }} /> : <ArrowDownLeft size={12} style={{ marginRight: "3px" }} />}
                            {esSalida ? "Salida" : "Entrada"}
                          </span>
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{mov.item}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: esSalida ? "var(--emergency)" : "var(--brand)" }}>
                          {esSalida ? "-" : "+"}{mov.cantidad}
                        </td>
                        <td style={styles.td}>
                          {mov.destinatario_nombre || mov.destinatario_apellido ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <User size={12} color="var(--text-muted)" />
                              {`${mov.destinatario_nombre || ""} ${mov.destinatario_apellido || ""}`.trim()}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {mov.destino_ref ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={12} color="var(--text-muted)" />
                              {mov.destino_ref}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {mov.retirado_por ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Package size={12} color="var(--text-muted)" />
                              {mov.retirado_por}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL REGISTRAR MOVIMIENTO */}
      {showMovModal && (
        <div style={styles.modalOverlay}>
          <form onSubmit={handleRegistrarMovimiento} style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>Registrar Movimiento de Inventario</h3>
              <button type="button" onClick={() => setShowMovModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            
            {errorModal && (
              <div style={styles.errorBanner}>
                <AlertTriangle size={16} />
                <span>{errorModal}</span>
              </div>
            )}

            <div style={styles.modalBody}>
              {/* Tipo Movimiento */}
              <div style={styles.formField}>
                <label style={styles.label}>Tipo de Operación</label>
                <div style={styles.radioGroup}>
                  <label style={{
                    ...styles.radioLabel,
                    borderColor: tipoMov === "entrada" ? "var(--brand)" : "var(--border)",
                    backgroundColor: tipoMov === "entrada" ? "var(--brand-soft)" : "transparent"
                  }}>
                    <input 
                      type="radio" 
                      name="tipoMov" 
                      checked={tipoMov === "entrada"} 
                      onChange={() => setTipoMov("entrada")} 
                      style={{ marginRight: "6px" }}
                    />
                    📥 Entrada (Donación / Abastecimiento)
                  </label>
                  <label style={{
                    ...styles.radioLabel,
                    borderColor: tipoMov === "salida" ? "var(--emergency)" : "var(--border)",
                    backgroundColor: tipoMov === "salida" ? "var(--emergency-soft)" : "transparent"
                  }}>
                    <input 
                      type="radio" 
                      name="tipoMov" 
                      checked={tipoMov === "salida"} 
                      onChange={() => setTipoMov("salida")} 
                      style={{ marginRight: "6px" }}
                    />
                    📤 Salida (Retiro / Despacho)
                  </label>
                </div>
              </div>

              {/* Artículo e info */}
              <div style={styles.formField}>
                <label style={styles.label}>Nombre del Artículo</label>
                <input 
                  type="text" 
                  value={item} 
                  onChange={(e) => setItem(e.target.value)} 
                  placeholder="Ej: Agua Mineral, Gasas Estériles, Acetaminofén"
                  required 
                  style={styles.input} 
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.formField, flex: 1 }}>
                  <label style={styles.label}>Cantidad</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={cantidad} 
                    onChange={(e) => setCantidad(e.target.value)} 
                    placeholder="100" 
                    required 
                    style={styles.input} 
                  />
                </div>
                <div style={{ ...styles.formField, flex: 1 }}>
                  <label style={styles.label}>Unidad de Medida</label>
                  <input 
                    type="text" 
                    value={unidad} 
                    onChange={(e) => setUnidad(e.target.value)} 
                    placeholder="Ej: Litros, Tabletas, Cajas" 
                    required 
                    style={styles.input} 
                  />
                </div>
              </div>

              {/* CAMPOS ADICIONALES PARA SALIDAS */}
              {tipoMov === "salida" && (
                <div style={styles.additionalFields}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--emergency)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>Detalles del Despacho (Salida)</h4>
                  
                  <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ ...styles.formField, flex: 1 }}>
                      <label style={styles.label}>Nombre Destinatario</label>
                      <input 
                        type="text" 
                        value={destNombre} 
                        onChange={(e) => setDestNombre(e.target.value)} 
                        placeholder="Ej: María" 
                        style={styles.input} 
                      />
                    </div>
                    <div style={{ ...styles.formField, flex: 1 }}>
                      <label style={styles.label}>Apellido Destinatario</label>
                      <input 
                        type="text" 
                        value={destApellido} 
                        onChange={(e) => setDestApellido(e.target.value)} 
                        placeholder="Ej: Delgado" 
                        style={styles.input} 
                      />
                    </div>
                  </div>

                  <div style={{ ...styles.formField, marginBottom: "12px" }}>
                    <label style={styles.label}>A Dónde se Llevó (Destino)</label>
                    <input 
                      type="text" 
                      value={destinoRef} 
                      onChange={(e) => setDestinoRef(e.target.value)} 
                      placeholder="Ej: Refugio Temporal Chacao, Hospital Pérez Carreño" 
                      style={styles.input} 
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Quién Retiró (Transportista / Aliado)</label>
                    <input 
                      type="text" 
                      value={retiradoPor} 
                      onChange={(e) => setRetiradoPor(e.target.value)} 
                      placeholder="Ej: Transportista Pedro (Camión 2)" 
                      style={styles.input} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setShowMovModal(false)} style={styles.btnSecondary}>Cancelar</button>
              <button type="submit" disabled={guardando} style={{
                ...styles.btnPrimary,
                backgroundColor: tipoMov === "salida" ? "var(--emergency)" : "var(--brand)"
              }}>
                {guardando ? "Registrando..." : "Confirmar Movimiento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)"
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid var(--border)",
    borderTop: "4px solid var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  noFichaContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px var(--s4)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    textAlign: "center",
    boxShadow: "var(--shadow-sm)"
  },
  headerCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--s4)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "var(--s3)",
    boxShadow: "var(--shadow-sm)"
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s3)"
  },
  iconWrapper: {
    width: "56px",
    height: "56px",
    borderRadius: "var(--radius)",
    background: "var(--brand-soft)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  metaRow: {
    display: "flex",
    gap: "var(--s3)",
    flexWrap: "wrap",
    color: "var(--text-muted)",
    fontSize: "var(--text-xs)"
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  btnAction: {
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--s2)",
    transition: "opacity var(--transition)"
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid var(--border)",
    gap: "var(--s4)"
  },
  tabButton: {
    background: "none",
    border: "none",
    padding: "12px 6px",
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
    transition: "all var(--transition)"
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--s4)",
    boxShadow: "var(--shadow-sm)"
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  tableResponsive: {
    width: "100%",
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  th: {
    borderBottom: "2px solid var(--border)",
    padding: "12px var(--s3)",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)"
  },
  tr: {
    borderBottom: "1px solid var(--border)",
    transition: "background var(--transition)"
  },
  td: {
    padding: "14px var(--s3)",
    fontSize: "var(--text-sm)",
    color: "var(--text)"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-xs)",
    fontWeight: 700
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
    zIndex: 1500,
    padding: "var(--s4)"
  },
  modal: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    width: "100%",
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh"
  },
  modalHeader: {
    padding: "var(--s4)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)"
  },
  errorBanner: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    padding: "10px var(--s4)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)"
  },
  modalBody: {
    padding: "var(--s4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
    overflowY: "auto"
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  label: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    letterSpacing: "0.5px"
  },
  input: {
    padding: "10px 12px",
    fontSize: "13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface)",
    color: "var(--text)"
  },
  radioGroup: {
    display: "flex",
    gap: "12px",
    marginTop: "4px"
  },
  radioLabel: {
    flex: 1,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all var(--transition)"
  },
  additionalFields: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--s3)",
    marginTop: "8px"
  },
  modalActions: {
    padding: "var(--s4)",
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px"
  },
  btnSecondary: {
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer"
  },
  btnPrimary: {
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    cursor: "pointer"
  }
};
