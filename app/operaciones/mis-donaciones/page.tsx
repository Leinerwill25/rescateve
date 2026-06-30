"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOperationsAuth } from "../AuthContext";
import {
  AlertTriangle,
  Gift,
  Heart,
  ListChecks,
  Package,
  PlusCircle,
  Users,
  X,
} from "lucide-react";
import {
  DonacionComunidad,
  DonacionInsumo,
  Donante,
  NecesidadComunidad,
} from "@/lib/types-operations";

type Tab = "mis" | "comunidad" | "necesidades";

const CATEGORIAS = [
  "Colchones",
  "Colchonetas",
  "Productos de Higiene",
  "Ropa",
  "Alimentos",
  "Medicamentos",
  "Otros",
];

export default function MisDonacionesPage() {
  const { session, perfil } = useOperationsAuth();
  const [donante, setDonante] = useState<Donante | null>(null);
  const [misDonaciones, setMisDonaciones] = useState<DonacionInsumo[]>([]);
  const [comunidad, setComunidad] = useState<DonacionComunidad[]>([]);
  const [necesidades, setNecesidades] = useState<NecesidadComunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("mis");
  const [showModal, setShowModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("unidades");
  const [notas, setNotas] = useState("");
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: donData, error: donErr } = await supabase
        .from("donantes")
        .select("*")
        .eq("perfil_id", session.user.id)
        .maybeSingle();

      if (donErr) throw donErr;
      setDonante(donData as Donante | null);

      if (donData) {
        const { data: misData } = await supabase
          .from("donaciones_insumos")
          .select("*")
          .eq("perfil_id", session.user.id)
          .order("created_at", { ascending: false });
        setMisDonaciones((misData as DonacionInsumo[]) || []);
      }

      const { data: comData } = await supabase.rpc("list_donaciones_comunidad");
      setComunidad((comData as DonacionComunidad[]) || []);

      const { data: necData } = await supabase.rpc("list_necesidades_comunidad");
      setNecesidades((necData as NecesidadComunidad[]) || []);
    } catch (err) {
      console.error("Error cargando donaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [session?.user?.id]);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setErrorModal("Describe el insumo que quieres donar.");
      return;
    }

    setGuardando(true);
    setErrorModal(null);

    try {
      const { error } = await supabase.from("donaciones_insumos").insert({
        descripcion: descripcion.trim(),
        categoria,
        cantidad: cantidad.trim() || null,
        unidad: unidad.trim() || "unidades",
        notas: notas.trim() || null,
      });

      if (error) throw error;

      setShowModal(false);
      setDescripcion("");
      setCantidad("");
      setNotas("");
      await cargarDatos();
    } catch (err: unknown) {
      setErrorModal(err instanceof Error ? err.message : "No se pudo guardar la donación.");
    } finally {
      setGuardando(false);
    }
  };

  const cancelarDonacion = async (id: string) => {
    if (!confirm("¿Retirar este insumo de la plataforma?")) return;
    await supabase
      .from("donaciones_insumos")
      .update({ estado: "cancelado" })
      .eq("id", id)
      .eq("perfil_id", session?.user?.id);
    await cargarDatos();
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 14 }}>Cargando tu consola…</p>
      </div>
    );
  }

  if (!donante) {
    return (
      <div style={styles.noFicha}>
        <AlertTriangle size={48} color="var(--warning)" />
        <h2>Ficha de donante no encontrada</h2>
        <p>Tu cuenta no está vinculada como donante. Regístrate en /donantes o contacta a operaciones.</p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="ops-page">
      <div style={styles.aviso} role="note">
        <Heart size={20} color="var(--brand)" />
        <p>
          <strong>Compromiso de la red:</strong> todo lo que registres aquí queda reservado para Rescate VE.
          No lo publiques ni lo entregues por fuera: nosotros encontramos a quien lo necesita de verdad y
          nos hacemos cargo del traslado o envío. Mantén el insumo disponible hasta que operaciones te contacte.
        </p>
      </div>

      <div style={styles.headerCard} className="ops-page-header">
        <div style={styles.headerInfo}>
          <div style={styles.iconWrap}>
            <Gift size={28} color="var(--brand)" />
          </div>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>
              Hola, {donante.nombre}
            </h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
              Consola de donaciones · persona natural
            </p>
          </div>
        </div>
        <button type="button" style={styles.btnAction} onClick={() => setShowModal(true)}>
          <PlusCircle size={18} />
          Ofrecer insumo
        </button>
      </div>

      <div style={styles.tabBar} className="ops-tabs">
        {([
          { id: "mis" as const, label: "Mis donaciones", icon: Package },
          { id: "comunidad" as const, label: "Otros donantes", icon: Users },
          { id: "necesidades" as const, label: "Hace falta hoy", icon: ListChecks },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === id ? "2px solid var(--brand)" : "2px solid transparent",
              color: activeTab === id ? "var(--brand)" : "var(--text-muted)",
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "mis" && (
        <div style={styles.panel}>
          {misDonaciones.filter((d) => d.estado !== "cancelado").length === 0 ? (
            <p style={styles.empty}>Aún no has registrado insumos. Usa «Ofrecer insumo» para empezar.</p>
          ) : (
            <div style={styles.grid}>
              {misDonaciones
                .filter((d) => d.estado !== "cancelado")
                .map((d) => (
                  <article key={d.id} style={styles.card}>
                    <div style={styles.cardHead}>
                      <strong>{d.descripcion}</strong>
                      <span style={styles.badge}>{d.estado}</span>
                    </div>
                    {d.categoria && <p style={styles.meta}>Categoría: {d.categoria}</p>}
                    {d.cantidad && (
                      <p style={styles.meta}>
                        Cantidad: {d.cantidad} {d.unidad}
                      </p>
                    )}
                    {d.estado === "disponible" && (
                      <button type="button" style={styles.btnGhost} onClick={() => cancelarDonacion(d.id)}>
                        Retirar de la plataforma
                      </button>
                    )}
                  </article>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "comunidad" && (
        <div style={styles.panel}>
          <p style={styles.sectionLead}>
            Insumos que otras personas han puesto a disposición de la red (sin datos personales).
          </p>
          {comunidad.length === 0 ? (
            <p style={styles.empty}>Aún no hay donaciones de la comunidad visibles.</p>
          ) : (
            <div style={styles.grid}>
              {comunidad.map((d) => (
                <article key={d.id} style={styles.card}>
                  <p style={styles.anon}>Anónimo</p>
                  <strong>{d.descripcion}</strong>
                  {d.categoria && <p style={styles.meta}>{d.categoria}</p>}
                  {d.cantidad && (
                    <p style={styles.meta}>
                      {d.cantidad} {d.unidad}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "necesidades" && (
        <div style={styles.panel}>
          <p style={styles.sectionLead}>
            Estas son algunas de las necesidades urgentes que la red está cubriendo ahora mismo.
          </p>
          <div style={styles.grid}>
            {necesidades.map((n) => (
              <article key={n.id} style={styles.needCard}>
                <span style={styles.needPriority}>{n.prioridad}</span>
                <h3 style={{ margin: "8px 0 4px", fontSize: 17 }}>{n.nombre}</h3>
                {n.descripcion && <p style={styles.meta}>{n.descripcion}</p>}
              </article>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHead}>
              <h3 style={{ margin: 0 }}>Ofrecer insumo</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setShowModal(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAgregar} style={styles.form}>
              {errorModal && <p style={styles.error}>{errorModal}</p>}
              <label style={styles.label}>
                ¿Qué tienes disponible?
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. 2 colchones individuales en buen estado"
                  required
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Categoría
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={styles.input}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div style={styles.row}>
                <label style={{ ...styles.label, flex: 1 }}>
                  Cantidad
                  <input
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej. 2"
                    style={styles.input}
                  />
                </label>
                <label style={{ ...styles.label, flex: 1 }}>
                  Unidad
                  <input
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    placeholder="unidades"
                    style={styles.input}
                  />
                </label>
              </div>
              <label style={styles.label}>
                Notas (opcional)
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Estado, talla, fecha de vencimiento…"
                  rows={3}
                  style={{ ...styles.input, height: "auto", resize: "vertical" }}
                />
              </label>
              <button type="submit" style={styles.btnAction} disabled={guardando}>
                {guardando ? "Guardando…" : "Publicar en la red"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column", gap: "var(--s4)" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh" },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid var(--border)",
    borderTop: "3px solid var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  noFicha: {
    textAlign: "center",
    padding: "var(--s8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--s3)",
    color: "var(--text-muted)",
  },
  aviso: {
    display: "flex",
    gap: "var(--s3)",
    padding: "var(--s4)",
    background: "rgba(37, 99, 235, 0.06)",
    border: "1px solid rgba(37, 99, 235, 0.15)",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.55,
    color: "var(--text)",
  },
  headerCard: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--s4)",
    padding: "var(--s5)",
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: 12,
  },
  headerInfo: { display: "flex", alignItems: "center", gap: "var(--s4)" },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    background: "rgba(37, 99, 235, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
  tabBar: { display: "flex", gap: 4, borderBottom: "1px solid var(--border)", flexWrap: "wrap" },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "12px 16px",
    background: "none",
    border: "none",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  panel: { padding: "var(--s2) 0" },
  sectionLead: { color: "var(--text-muted)", fontSize: 14, marginBottom: "var(--s4)" },
  empty: { color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: "var(--s8)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--s4)" },
  card: {
    padding: "var(--s4)",
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  badge: {
    fontSize: 11,
    textTransform: "uppercase",
    background: "var(--surface-2)",
    padding: "2px 8px",
    borderRadius: 20,
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  meta: { margin: 0, fontSize: 13, color: "var(--text-muted)" },
  anon: { margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" },
  btnGhost: {
    marginTop: 8,
    alignSelf: "flex-start",
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  needCard: {
    padding: "var(--s4)",
    background: "#fff",
    border: "1px solid var(--border)",
    borderLeft: "4px solid var(--brand)",
    borderRadius: 12,
  },
  needPriority: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--brand)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflow: "auto",
    padding: "var(--s5)",
  },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s4)" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" },
  form: { display: "flex", flexDirection: "column", gap: "var(--s3)" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 },
  input: {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 400,
  },
  row: { display: "flex", gap: "var(--s3)" },
  error: {
    margin: 0,
    padding: "var(--s3)",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 8,
    fontSize: 13,
  },
};
