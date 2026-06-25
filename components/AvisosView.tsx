"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Aviso, CATEGORIAS_AVISO } from "@/lib/types";
import AvisoCard from "./AvisoCard";
import AvisoForm from "./AvisoForm";

export default function AvisosView() {
  const [avisos,     setAvisos]     = useState<Aviso[]>([]);
  const [filtro,     setFiltro]     = useState<string>("todos");
  const [showForm,   setShowForm]   = useState(false);
  const [loading,    setLoading]    = useState(true);

  async function cargar() {
    const { data } = await supabase
      .from("avisos")
      .select("*")
      .order("verificado", { ascending: false })
      .order("created_at",  { ascending: false });
    if (data) setAvisos(data as Aviso[]);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel("avisos_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "avisos" }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtrados = filtro === "todos"
    ? avisos
    : avisos.filter((a) => a.categoria === filtro);

  if (showForm) {
    return (
      <AvisoForm
        onDone={() => { setShowForm(false); cargar(); }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="avisos-view">
      {/* Header de sección */}
      <div className="avisos-view__header">
        <div>
          <h2 className="avisos-view__title">Información comunitaria</h2>
          <p className="avisos-view__subtitle">
            Contactos, refugios, acopio, hospitales y más — en tiempo real.
          </p>
        </div>
        <button
          className="btn btn--brand avisos-view__publish-btn"
          onClick={() => setShowForm(true)}
          aria-label="Publicar un aviso nuevo"
        >
          + Publicar
        </button>
      </div>

      {/* Chips de filtro */}
      <div className="avisos-chips" role="group" aria-label="Filtrar por categoría">
        <button
          className={`aviso-chip${filtro === "todos" ? " aviso-chip--active" : ""}`}
          onClick={() => setFiltro("todos")}
          aria-pressed={filtro === "todos"}
        >
          🗂️ Todos
          {avisos.length > 0 && <span className="aviso-chip__count">{avisos.length}</span>}
        </button>
        {CATEGORIAS_AVISO.map((cat) => {
          const n = avisos.filter((a) => a.categoria === cat.value).length;
          return (
            <button
              key={cat.value}
              className={`aviso-chip${filtro === cat.value ? " aviso-chip--active" : ""}`}
              onClick={() => setFiltro(cat.value)}
              aria-pressed={filtro === cat.value}
              style={filtro === cat.value ? { "--chip-color": cat.color } as React.CSSProperties : {}}
            >
              {cat.emoji} {cat.label}
              {n > 0 && <span className="aviso-chip__count">{n}</span>}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="avisos-feed">
        {loading ? (
          <div className="avisos-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aviso-card aviso-card--skeleton">
                <div className="skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton-line skeleton-line--short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line--long" />
                </div>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty">
            <div className="empty__icon" aria-hidden="true">📭</div>
            <p className="empty__title">
              {filtro === "todos" ? "Aún no hay avisos" : `Sin avisos en "${CATEGORIAS_AVISO.find(c => c.value === filtro)?.label ?? filtro}"`}
            </p>
            <p className="empty__desc">
              {filtro === "todos"
                ? "Sé el primero en publicar información útil para la comunidad."
                : "Puedes publicar el primero con el botón \"+ Publicar\" de arriba."}
            </p>
          </div>
        ) : (
          <div className="avisos-grid">
            {filtrados.map((a) => (
              <AvisoCard key={a.id} aviso={a} onReportado={cargar} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
