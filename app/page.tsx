"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { Solicitud, Desaparecido, Actualizacion, RescatadoPublico, tipoInfo, CentroAcopio, PuntoAyuda } from "@/lib/types";
import ReportForm from "@/components/ReportForm";
import MissingForm from "@/components/MissingForm";
import AtenderModal from "@/components/AtenderModal";
import NovedadModal from "@/components/NovedadModal";
import EncontradoModal from "@/components/EncontradoModal";
import AvisosView from "@/components/AvisosView";
import TrasladosView from "@/components/TrasladosView";
import HospitalesView from "@/components/HospitalesView";
import { Map, ClipboardList, Megaphone, Truck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SiteHeader, { type SiteNavTarget } from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import LandingHero from "@/components/landing/LandingHero";
import HowItWorks from "@/components/landing/HowItWorks";
import ProblemSection from "@/components/landing/ProblemSection";
import ProfileCtas from "@/components/landing/ProfileCtas";
import AlliesSection from "@/components/landing/AlliesSection";
import ImpactSection from "@/components/landing/ImpactSection";
import ShareSection from "@/components/landing/ShareSection";
import QuipuSection from "@/components/landing/QuipuSection";
import { useLiveStats } from "@/hooks/useLiveStats";

// Leaflet solo en cliente
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Tab = "inicio" | "mapa" | "ayuda" | "desaparecidos" | "lista" | "info" | "traslados";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function Home() {
  const [tab,           setTab]           = useState<Tab>("inicio");
  const [solicitudes,   setSolicitudes]   = useState<Solicitud[]>([]);
  const [desaparecidos, setDesaparecidos] = useState<Desaparecido[]>([]);
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [rescatados,    setRescatados]    = useState<RescatadoPublico[]>([]);
  const [centrosAcopio, setCentrosAcopio] = useState<CentroAcopio[]>([]);
  const [puntosAyuda,   setPuntosAyuda]   = useState<PuntoAyuda[]>([]);
  const [buscarTab,     setBuscarTab]     = useState<"hospitales" | "reportar">("hospitales");

  // Modales de acción
  const [atenderModal, setAtenderModal] = useState<{
    id: string;
    estado: "pendiente" | "en_camino";
  } | null>(null);
  const [novedadModal,   setNovedadModal]   = useState<{ id: string; nombre: string } | null>(null);
  const [encontradoModal, setEncontradoModal] = useState<{ id: string; nombre: string } | null>(null);
  const [jumpTo, setJumpTo] = useState<{ lat: number; lng: number } | null>(null);
  const liveStats = useLiveStats();

  const handleSiteNav = (target: SiteNavTarget) => {
    if (target === "mapa" || target === "traslados" || target === "lista" || target === "info") {
      setTab(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target === "sumarse" || target === "como-funciona") {
      setTab("inicio");
      requestAnimationFrame(() => {
        document.getElementById(target === "como-funciona" ? "como-funciona" : "sumarse")?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }
    setTab("inicio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Carga inicial y realtime ──
  async function cargar() {
    const [s, d, a, r, ext] = await Promise.all([
      supabase.from("solicitudes_ayuda").select("*").order("created_at", { ascending: false }),
      supabase.from("personas_desaparecidas").select("*").order("created_at", { ascending: false }),
      supabase.from("desaparecidos_actualizaciones").select("*").order("created_at", { ascending: true }),
      supabase.from("rescatados_publicos").select("*").order("created_at", { ascending: true }),
      fetch("/api/external-points").then(res => res.ok ? res.json() : null).catch(() => null),
    ]);
    if (s.data) setSolicitudes(s.data as Solicitud[]);
    if (d.data) setDesaparecidos(d.data as Desaparecido[]);
    if (a.data) setActualizaciones(a.data as Actualizacion[]);
    if (r.data) setRescatados(r.data as RescatadoPublico[]);
    
    if (ext) {
      setCentrosAcopio(ext.centros || []);
      setPuntosAyuda(ext.puntos || []);
    }
  }

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel("rescate")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes_ayuda" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "personas_desaparecidas" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "desaparecidos_actualizaciones" }, cargar)
      .on("postgres_changes", { event: "*", schema: "public", table: "rescatados" }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Acciones legacy (usadas en la lista) ──
  async function marcarAtendidoLegacy(id: string) {
    await supabase.from("solicitudes_ayuda").update({ estado: "atendido", atendido_at: new Date().toISOString() }).eq("id", id);
    cargar();
  }

  const activas   = solicitudes.filter((s) => s.estado !== "atendido");
  const atendidas = solicitudes.filter((s) => s.estado === "atendido");
  const buscando  = desaparecidos.filter((d) => d.estado !== "encontrado");

  const NAV_ITEMS: { id: Tab; icon: React.ReactNode; label: string; count?: number; emergency?: boolean }[] = [
    { id: "traslados",     icon: <Truck size={18} strokeWidth={2.25} />, label: "Traslados" },
    { id: "mapa",          icon: <Map size={18} strokeWidth={2.25} />, label: "Mapa" },
    { id: "lista",         icon: <ClipboardList size={18} strokeWidth={2.25} />, label: "Lista", count: activas.length + buscando.length },
    { id: "info",          icon: <Megaphone size={18} strokeWidth={2.25} />, label: "Avisos" },
  ];

  return (
    <div className={`app${tab === "inicio" ? " app--landing" : ""}`}>
      <SiteHeader onNav={handleSiteNav} activeTab={tab} />

      {/* Bottom nav — oculta en landing para no duplicar navegación */}
      {tab !== "inicio" && (
      <nav className="bottom-nav" aria-label="Navegación rápida">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav__btn${tab === item.id ? (item.emergency ? " active active--emergency" : " active") : ""}${item.emergency ? " bottom-nav__btn--emergency" : ""}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            aria-label={item.label}
          >
            <span className="bottom-nav__icon-wrap">
              <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
            </span>
            <span className="bottom-nav__label">{item.label}</span>
            {item.count != null && item.count > 0 && (
              <span className="bottom-nav__badge" aria-label={`${item.count} reportes activos`}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
      )}

      {/* ── Contenido principal ── */}
      <main className={`main-content${tab === "inicio" ? " main-content--landing" : ""}`} id="main-content">

        {tab === "inicio" && (
          <div className="landing-page">
            <LandingHero
              stats={liveStats}
              onSolicitarTraslado={() => setTab("traslados")}
              onVerMapa={() => setTab("mapa")}
            />
            <HowItWorks />
            <ProblemSection />
            <ProfileCtas
              onSolicitarTraslado={() => setTab("traslados")}
              onVerMapa={() => setTab("mapa")}
              onEmergencia={() => setTab("ayuda")}
            />
            <ImpactSection stats={liveStats} />
            <AlliesSection />
            <ShareSection />
            <QuipuSection />
            <SiteFooter onNav={handleSiteNav} />
          </div>
        )}

        {tab === "mapa" && (
          <MapView
            solicitudes={solicitudes}
            desaparecidos={desaparecidos}
            centrosAcopio={centrosAcopio}
            puntosAyuda={puntosAyuda}
            onMarcarAtendido={marcarAtendidoLegacy}
            onAbrirAtender={(id, estado) => setAtenderModal({ id, estado })}
            jumpTo={jumpTo}
            onJumpUsed={() => setJumpTo(null)}
          />
        )}

        {tab === "ayuda" && <ReportForm onDone={() => setTab("mapa")} />}

        {tab === "desaparecidos" && (
          <div className="list buscar-wrapper">
            <div className="tabs-sub" style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)" }}>
              <button 
                className={`btn-subtab ${buscarTab === "hospitales" ? "active" : ""}`}
                onClick={() => setBuscarTab("hospitales")}
                style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: buscarTab === "hospitales" ? "var(--brand)" : "var(--surface)", color: buscarTab === "hospitales" ? "#fff" : "var(--text)", fontWeight: 600 }}
              >
                🏥 Pacientes (Hospital)
              </button>
              <button 
                className={`btn-subtab ${buscarTab === "reportar" ? "active" : ""}`}
                onClick={() => setBuscarTab("reportar")}
                style={{ flex: 1, padding: "var(--s2)", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: buscarTab === "reportar" ? "var(--brand)" : "var(--surface)", color: buscarTab === "reportar" ? "#fff" : "var(--text)", fontWeight: 600 }}
              >
                🔎 Reportar Desaparición
              </button>
            </div>
            {buscarTab === "hospitales" ? <HospitalesView /> : <MissingForm onDone={() => setTab("mapa")} />}
          </div>
        )}

        {tab === "info" && <AvisosView />}

        {tab === "traslados" && <TrasladosView />}

        {tab === "lista" && (
          <div className="list">

            {/* ── Solicitudes activas ── */}
            <h2 className="list__section-title">
              🆘 Solicitudes activas
              {activas.length > 0 && <span className="badge badge--alta">{activas.length}</span>}
            </h2>

            {activas.length === 0 ? (
              <div className="empty">
                <div className="empty__icon" aria-hidden="true">✅</div>
                <p className="empty__title">Sin solicitudes activas</p>
                <p className="empty__desc">
                  No hay lugares reportando necesidad de ayuda en este momento.
                  Si necesitas reportar, usa la pestaña "Pedir ayuda".
                </p>
              </div>
            ) : (
              activas.map((s) => {
                const t   = tipoInfo(s.tipo);
                const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.latitud},${s.longitud}`;
                const rescatadosDeSolicitud = rescatados.filter((r) => r.solicitud_id === s.id);
                return (
                  <article className="card" key={s.id}>
                    <div className="card__top">
                      <h3 className="card__title">
                        <span aria-hidden="true">{t.emoji}</span> {t.label}
                      </h3>
                      <span className={`badge badge--${s.prioridad}`} aria-label={`Prioridad ${s.prioridad}`}>
                        {s.prioridad === "alta" ? "🔴" : s.prioridad === "media" ? "🟡" : "🔵"} {s.prioridad}
                      </span>
                    </div>

                    {/* Badge de estado en_camino */}
                    {s.estado === "en_camino" && (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--s1)",
                        background: "#ECFDF5",
                        border: "1px solid rgba(16,185,129,.2)",
                        borderRadius: "var(--radius-pill)",
                        padding: "3px 10px",
                        fontSize: "var(--text-xs)",
                        fontWeight: 700,
                        color: "#065F46",
                        marginBottom: "var(--s2)",
                      }}>
                        🚑 Ayuda en camino{s.respondido_por ? ` · ${s.respondido_por}` : ""}
                      </div>
                    )}

                    {s.descripcion && <p className="card__meta">{s.descripcion}</p>}
                    {s.referencia  && <p className="card__meta"><span aria-hidden="true">📍</span> {s.referencia}</p>}
                    {s.personas_afectadas != null && (
                      <p className="card__meta"><span aria-hidden="true">👥</span> {s.personas_afectadas} personas aprox.</p>
                    )}
                    {s.contacto && <p className="card__meta"><span aria-hidden="true">📞</span> {s.contacto}</p>}
                    <p className="card__time" aria-label={`Publicado ${timeAgo(s.created_at)}`}>
                      🕐 {timeAgo(s.created_at)}
                    </p>

                    <div className="card__actions">
                      <button
                        className="card__action card__action--primary"
                        onClick={() => { setJumpTo({ lat: s.latitud, lng: s.longitud }); setTab("mapa"); }}
                        aria-label="Ver en el mapa"
                      >
                        📍 Ver en mapa
                      </button>
                      <a href={dir} target="_blank" rel="noreferrer" className="card__action card__action--primary" aria-label={`Cómo llegar a ${t.label}`}>
                        🧭 Cómo llegar
                      </a>
                      {s.estado === "pendiente" && (
                        <button
                          className="card__action card__action--secondary"
                          onClick={() => setAtenderModal({ id: s.id, estado: "pendiente" })}
                          aria-label="Marcar ayuda en camino"
                        >
                          🚑 En camino
                        </button>
                      )}
                      {s.estado === "en_camino" && (
                        <button
                          className="card__action card__action--secondary"
                          onClick={() => setAtenderModal({ id: s.id, estado: "en_camino" })}
                          aria-label="Marcar emergencia atendida"
                        >
                          ✓ Atendida
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}

            {/* ── Solicitudes atendidas (historial) ── */}
            {atendidas.length > 0 && (
              <>
                <h2 className="list__section-title" style={{ marginTop: "var(--s6)", color: "var(--text-muted)" }}>
                  ✅ Atendidas ({atendidas.length})
                </h2>
                {atendidas.map((s) => {
                  const t = tipoInfo(s.tipo);
                  const rescatadosDeSolicitud = rescatados.filter((r) => r.solicitud_id === s.id);
                  return (
                    <article className="card" key={s.id} style={{ opacity: 0.7 }}>
                      <div className="card__top">
                        <h3 className="card__title" style={{ color: "var(--text-muted)" }}>
                          <span aria-hidden="true">{t.emoji}</span> {t.label}
                        </h3>
                        <span className="badge" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid rgba(22,163,74,.2)" }}>
                          ✅ Atendida
                        </span>
                      </div>
                      {s.referencia && <p className="card__meta">📍 {s.referencia}</p>}
                      {s.personas_rescatadas != null && s.personas_rescatadas > 0 && (
                        <p className="card__meta">👥 {s.personas_rescatadas} persona(s) rescatada(s)</p>
                      )}
                      {rescatadosDeSolicitud.length > 0 && (
                        <div style={{ marginTop: "var(--s2)" }}>
                          {rescatadosDeSolicitud.map((r) => (
                            <div key={r.id} style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--s2)",
                              fontSize: "var(--text-sm)",
                              padding: "var(--s1) 0",
                              borderBottom: "1px solid var(--border)",
                            }}>
                              <span style={{ fontWeight: 600 }}>{r.nombre}{r.apellido ? ` ${r.apellido}` : ""}</span>
                              {r.condicion && (
                                <span className="badge" style={{
                                  background: r.condicion === "ileso" ? "#F0FDF4" : r.condicion === "herido" ? "#FFFBEB" : "#EFF4FF",
                                  color: r.condicion === "ileso" ? "#16A34A" : r.condicion === "herido" ? "#D97706" : "#1E3A8A",
                                  border: "1px solid currentColor",
                                  opacity: 0.9,
                                }}>
                                  {r.condicion}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="card__time">🕐 {timeAgo(s.created_at)}</p>
                    </article>
                  );
                })}
              </>
            )}

            {/* ── Personas desaparecidas ── */}
            <h2 className="list__section-title" style={{ marginTop: "var(--s6)" }}>
              🔎 Personas desaparecidas
              {buscando.length > 0 && <span className="badge badge--media">{buscando.length}</span>}
            </h2>

            {buscando.length === 0 ? (
              <div className="empty">
                <div className="empty__icon" aria-hidden="true">🙏</div>
                <p className="empty__title">Sin reportes activos</p>
                <p className="empty__desc">
                  No hay personas desaparecidas reportadas. Si buscas a alguien,
                  usa la pestaña "Desaparecidos".
                </p>
              </div>
            ) : (
              buscando.map((d) => {
                const novedadesDeD = actualizaciones.filter((a) => a.desaparecido_id === d.id);
                return (
                  <article className="card" key={d.id}>
                    {d.foto_url && (
                      <div style={{ width: "100%", height: "220px", overflow: "hidden", borderRadius: "var(--radius-sm)", marginBottom: "var(--s3)", background: "var(--surface-2)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.foto_url} alt={`Foto de ${d.nombre}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div className="card__top">
                      <h3 className="card__title">
                        🔎 {d.nombre}{d.edad ? `, ${d.edad} años` : ""}
                      </h3>
                    </div>
                    {d.descripcion       && <p className="card__meta">{d.descripcion}</p>}
                    {d.ultima_ubicacion  && <p className="card__meta"><span aria-hidden="true">📍</span> Visto en: {d.ultima_ubicacion}</p>}
                    <p className="card__meta"><span aria-hidden="true">📞</span> {d.contacto}</p>
                    <p className="card__time">🕐 {timeAgo(d.created_at)}</p>

                    {/* Línea de tiempo de novedades */}
                    {novedadesDeD.length > 0 && (
                      <div style={{
                        marginTop: "var(--s3)",
                        borderLeft: "2px solid var(--border)",
                        paddingLeft: "var(--s3)",
                      }}>
                        <p style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", marginBottom: "var(--s2)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                          Novedades
                        </p>
                        {novedadesDeD.map((a) => (
                          <div key={a.id} style={{ marginBottom: "var(--s2)" }}>
                            <p style={{ fontSize: "var(--text-sm)", color: "var(--text)", margin: "0 0 2px" }}>{a.texto}</p>
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0 }}>
                              {a.autor_nombre ? `${a.autor_nombre} · ` : ""}{timeAgo(a.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="card__actions" style={{ flexWrap: "wrap" }}>
                      <button
                        className="card__action card__action--primary"
                        onClick={() => { if (d.latitud && d.longitud) { setJumpTo({ lat: d.latitud, lng: d.longitud }); setTab("mapa"); } }}
                        aria-label="Ver en el mapa"
                        style={{ flex: "1 1 auto" }}
                      >
                        📍 Ver en mapa
                      </button>
                      <button
                        className="card__action card__action--primary"
                        onClick={() => setEncontradoModal({ id: d.id, nombre: d.nombre })}
                        aria-label={`Marcar a ${d.nombre} como encontrado/a`}
                        style={{ flex: "1 1 auto" }}
                      >
                        ✓ Encontrado/a
                      </button>
                      <button
                        className="card__action card__action--secondary"
                        onClick={() => setNovedadModal({ id: d.id, nombre: d.nombre })}
                        aria-label={`Agregar novedad sobre ${d.nombre}`}
                        style={{ flex: "1 1 auto" }}
                      >
                        📣 Hay novedades
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* ── Modal Atender emergencia ── */}
      {atenderModal && (
        <AtenderModal
          solicitudId={atenderModal.id}
          estadoActual={atenderModal.estado}
          onClose={() => setAtenderModal(null)}
          onDone={() => { setAtenderModal(null); cargar(); }}
        />
      )}

      {/* ── Modal Novedad desaparecido ── */}
      {novedadModal && (
        <NovedadModal
          desaparecidoId={novedadModal.id}
          nombre={novedadModal.nombre}
          onClose={() => setNovedadModal(null)}
          onDone={() => { setNovedadModal(null); cargar(); }}
        />
      )}

      {/* ── Modal Encontrado ── */}
      {encontradoModal && (
        <EncontradoModal
          desaparecidoId={encontradoModal.id}
          nombre={encontradoModal.nombre}
          onClose={() => setEncontradoModal(null)}
          onDone={() => { setEncontradoModal(null); cargar(); }}
        />
      )}
    </div>
  );
}
