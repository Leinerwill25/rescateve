"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ReglaClasificacion } from "@/lib/types-operations";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export default function ReglasClasificacionPage() {
  const [reglas, setReglas] = useState<ReglaClasificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRegla, setEditingRegla] = useState<ReglaClasificacion | null>(null);

  // Formulario local
  const [palabrasClaveStr, setPalabrasClaveStr] = useState("");
  const [categoria, setCategoria] = useState("insumo_basico");
  const [finalDeps, setFinalDeps] = useState<string[]>([]);
  const [prioridad, setPrioridad] = useState<"alta" | "media" | "baja">("media");
  const [esEmergencia, setEsEmergencia] = useState(false);
  const [activa, setActiva] = useState(true);
  const [notas, setNotas] = useState("");

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

  const CATEGORIAS = [
    { value: "insumo_medico", label: "Insumos Médicos" },
    { value: "insumo_basico", label: "Insumos Básicos" },
    { value: "emergencia_medica", label: "Emergencia Médica" },
    { value: "rescate", label: "Rescate Estructural" },
    { value: "grua", label: "Servicio de Grúa" },
    { value: "tecnico", label: "Reparación / Técnico" },
    { value: "traslado_personal", label: "Traslado Personal Médico" }
  ];

  const DEPARTAMENTOS = [
    { clave: "acopio", nombre: "Centro de Acopio" },
    { clave: "transporte_carga", nombre: "Transporte de Carga" },
    { clave: "emergencia_medica", nombre: "Emergencia Médica (911)" },
    { clave: "grua", nombre: "Servicio de Grúa" },
    { clave: "tecnico", nombre: "Soporte Técnico" },
    { clave: "rescate_estructural", nombre: "Protección Civil" },
    { clave: "personal_medico", nombre: "Personal Médico" }
  ];

  const cargarReglas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reglas_clasificacion")
        .select("*")
        .order("categoria", { ascending: true });

      if (error) throw error;
      setReglas((data || []) as ReglaClasificacion[]);
    } catch (err) {
      console.error("Error al cargar reglas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReglas();
  }, []);

  const openCrear = () => {
    setEditingRegla({
      id: "nueva",
      palabras_clave: [],
      categoria: "insumo_basico",
      departamentos: ["acopio"],
      prioridad: "media",
      es_emergencia: false,
      activa: true,
      notas: ""
    });
    setPalabrasClaveStr("");
    setCategoria("insumo_basico");
    setFinalDeps(["acopio"]);
    setPrioridad("media");
    setEsEmergencia(false);
    setActiva(true);
    setNotas("");
  };

  const openEditar = (r: ReglaClasificacion) => {
    setEditingRegla(r);
    setPalabrasClaveStr(r.palabras_clave.join(", "));
    setCategoria(r.categoria);
    setFinalDeps(r.departamentos);
    setPrioridad(r.prioridad);
    setEsEmergencia(r.es_emergencia);
    setActiva(r.activa);
    setNotas(r.notas || "");
  };

  const handleToggleDept = (clave: string) => {
    setFinalDeps(prev => 
      prev.includes(clave) 
        ? prev.filter(d => d !== clave) 
        : [...prev, clave]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegla) return;

    const keywords = palabrasClaveStr
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      showCustomAlert("Por favor ingrese al menos una palabra clave.");
      return;
    }

    if (finalDeps.length === 0) {
      showCustomAlert("Por favor seleccione al menos un departamento a activar.");
      return;
    }

    const payload = {
      palabras_clave: keywords,
      categoria,
      departamentos: finalDeps,
      prioridad,
      es_emergencia: esEmergencia,
      activa,
      notas: notas || null
    };

    try {
      if (editingRegla.id === "nueva") {
        const { error } = await supabase
          .from("reglas_clasificacion")
          .insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reglas_clasificacion")
          .update(payload)
          .eq("id", editingRegla.id);
        if (error) throw error;
      }

      setEditingRegla(null);
      cargarReglas();
    } catch (err: any) {
      showCustomAlert(`Error al guardar regla: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await showCustomConfirm("¿Está seguro de eliminar esta regla de clasificación?"))) return;

    try {
      const { error } = await supabase
        .from("reglas_clasificacion")
        .delete()
        .eq("id", id);
      if (error) throw error;
      cargarReglas();
    } catch (err: any) {
      showCustomAlert(`Error al eliminar regla: ${err.message}`);
    }
  };

  const handleToggleActiva = async (r: ReglaClasificacion) => {
    try {
      const { error } = await supabase
        .from("reglas_clasificacion")
        .update({ activa: !r.activa })
        .eq("id", r.id);
      if (error) throw error;
      cargarReglas();
    } catch (err: any) {
      showCustomAlert(`Error al cambiar estado: ${err.message}`);
    }
  };

  return (
    <div style={styles.page} className="ops-page">
      <div style={styles.header} className="ops-page-header">
        <div>
          <h2 style={styles.title} className="ops-page-title">Reglas de Clasificación Automática</h2>
          <p style={styles.subtitle} className="ops-page-subtitle">Configure palabras clave para entrenar el ruteo sugerido de necesidades.</p>
        </div>
        <button style={styles.btnPrimary} onClick={openCrear}>
          <Plus size={16} />
          <span>Crear Nueva Regla</span>
        </button>
      </div>

      {loading ? (
        <div style={styles.center}>
          <div style={styles.spinner}></div>
        </div>
      ) : reglas.length === 0 ? (
        <div style={styles.emptyContainer}>
          <AlertCircle size={48} color="var(--text-muted)" />
          <h3>Sin Reglas</h3>
          <p style={{ color: "var(--text-muted)" }}>Haga clic en crear para agregar la primera regla.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper} className="ops-table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Palabras Clave</th>
                <th style={styles.th}>Categoría Sugerida</th>
                <th style={styles.th}>Departamentos Activados</th>
                <th style={styles.th}>Prioridad</th>
                <th style={styles.th}>Emergencia</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reglas.map((r) => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>
                    <button 
                      style={styles.toggleBtn} 
                      onClick={() => handleToggleActiva(r)}
                      title={r.activa ? "Desactivar" : "Activar"}
                    >
                      {r.activa 
                        ? <ToggleRight size={28} color="var(--success)" /> 
                        : <ToggleLeft size={28} color="var(--text-muted)" />
                      }
                    </button>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.keywordTags}>
                      {r.palabras_clave.map((tag, idx) => (
                        <span key={idx} style={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>
                    {CATEGORIAS.find(c => c.value === r.categoria)?.label || r.categoria}
                  </td>
                  <td style={styles.td}>
                    {r.departamentos.map(d => DEPARTAMENTOS.find(dp => dp.clave === d)?.nombre || d).join(", ")}
                  </td>
                  <td style={styles.td}>
                    <span style={r.prioridad === "alta" ? styles.badgeAlta : styles.badgeMedia}>
                      {r.prioridad.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {r.es_emergencia ? "🔴 Sí" : "⚪ No"}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={styles.actionBtn} onClick={() => openEditar(r)} title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button style={{ ...styles.actionBtn, color: "var(--emergency)" }} onClick={() => handleDelete(r.id)} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {editingRegla && (
        <div style={styles.modalOverlay} className="ops-modal-overlay">
          <form onSubmit={handleSave} style={styles.modal} className="ops-modal">
            <div style={styles.modalHeader}>
              <h3>{editingRegla.id === "nueva" ? "Crear Regla de Clasificación" : "Editar Regla de Clasificación"}</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditingRegla(null)}><X size={18} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formField}>
                <label style={styles.label}>Palabras Clave (Separadas por comas)</label>
                <textarea
                  value={palabrasClaveStr}
                  onChange={(e) => setPalabrasClaveStr(e.target.value)}
                  placeholder="ejemplo: paracetamol, acetaminofen, ibuprofeno"
                  required
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>Categoría Sugerida</label>
                <select 
                  value={categoria} 
                  onChange={(e) => setCategoria(e.target.value)}
                  style={styles.select}
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>Departamentos a Activar</label>
                <div style={styles.checkboxList}>
                  {DEPARTAMENTOS.map(d => (
                    <label key={d.clave} style={styles.checkboxLabel}>
                      <input 
                        type="checkbox"
                        checked={finalDeps.includes(d.clave)}
                        onChange={() => handleToggleDept(d.clave)}
                      />
                      <span>{d.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...styles.formField, flex: 1 }}>
                  <label style={styles.label}>Prioridad Sugerida</label>
                  <select 
                    value={prioridad} 
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    style={styles.select}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                
                <div style={{ ...styles.formField, flex: 1, justifyContent: "center" }}>
                  <label style={styles.checkboxLabel}>
                    <input 
                      type="checkbox"
                      checked={esEmergencia}
                      onChange={(e) => setEsEmergencia(e.target.checked)}
                    />
                    <strong>¿Es Emergencia (911)?</strong>
                  </label>
                </div>
              </div>

              <div style={styles.formField}>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox"
                    checked={activa}
                    onChange={(e) => setActiva(e.target.checked)}
                  />
                  <span>Regla Activa</span>
                </label>
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>Notas / Contexto</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales..."
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.modalActions} className="ops-modal-actions">
              <button type="button" style={styles.btnSecondary} onClick={() => setEditingRegla(null)}>Cancelar</button>
              <button type="submit" style={styles.btnPrimary}>
                <Save size={16} />
                <span>Guardar Regla</span>
              </button>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  center: {
    display: "flex",
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
  tableWrapper: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "12px var(--s4)",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-muted)",
    fontWeight: 700,
  },
  tr: {
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "12px var(--s4)",
    verticalAlign: "middle",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  keywordTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    maxWidth: "300px",
  },
  tag: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "2px 6px",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text)",
  },
  badgeAlta: {
    background: "var(--emergency-soft)",
    color: "var(--emergency)",
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
  },
  badgeMedia: {
    background: "var(--warning-soft)",
    color: "var(--warning)",
    fontSize: "10px",
    fontWeight: 800,
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
    gap: "var(--s3)",
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
  textarea: {
    padding: "8px 12px",
    fontSize: "13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
    resize: "vertical",
    height: "70px",
  },
  select: {
    padding: "6px 12px",
    fontSize: "13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
    height: "38px",
  },
  input: {
    padding: "8px 12px",
    fontSize: "13px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface-2)",
  },
  checkboxList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "150px",
    overflowY: "auto",
    padding: "4px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
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
