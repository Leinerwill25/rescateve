"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Solicitud, Desaparecido, tipoInfo, TIPOS, CentroAcopio, PuntoAyuda } from "@/lib/types";

type Props = {
  solicitudes: Solicitud[];
  desaparecidos: Desaparecido[];
  centrosAcopio?: CentroAcopio[];
  puntosAyuda?: PuntoAyuda[];
  onMarcarAtendido: (id: string) => void;
  onAbrirAtender: (id: string, estado: "pendiente" | "en_camino") => void;
  jumpTo?: { lat: number; lng: number } | null;
  onJumpUsed?: () => void;
};

const DEFAULT: [number, number] = [10.4806, -66.9036]; // Caracas

const TIPO_COLORS: Record<string, string> = {
  rescate:          "#DC2626",
  paramedico:       "#EA580C",
  ambulancia:       "#DB2777",
  proteccion_civil: "#2563EB",
  bomberos:         "#B91C1C",
  agua:             "#0891B2",
  alimentos:        "#16A34A",
  refugio:          "#7C3AED",
  otro:             "#64748B",
};

export default function MapView({
  solicitudes,
  desaparecidos,
  centrosAcopio = [],
  puntosAyuda = [],
  onAbrirAtender,
  jumpTo,
  onJumpUsed,
}: Props) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const map     = useRef<any>(null);
  const layer   = useRef<any>(null);
  const L       = useRef<any>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");

  const activas   = solicitudes.filter((s) => s.estado !== "atendido");
  const atendidas = solicitudes.filter((s) => s.estado === "atendido");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = (await import("leaflet")).default;
      L.current = mod;
      if (cancelled || !mapRef.current || map.current) return;
      map.current = mod.map(mapRef.current).setView(DEFAULT, 10);
      mod
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        })
        .addTo(map.current);
      layer.current = mod.layerGroup().addTo(map.current);
      draw();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudes, desaparecidos, centrosAcopio, puntosAyuda]);

  // Volar a un punto especifico cuando se hace clic desde la lista
  useEffect(() => {
    if (jumpTo && map.current) {
      map.current.flyTo([jumpTo.lat, jumpTo.lng], 15, { duration: 1.2 });
      onJumpUsed?.();
    }
  }, [jumpTo, onJumpUsed]);

  /** Pin normal */
  function pin(color: string, emoji: string) {
    return L.current.divIcon({
      className: "",
      html: `<div style="position:relative;transform:translate(-50%,-100%)">
        <div style="
          width:32px;height:32px;
          border-radius:50% 50% 50% 0;
          background:${color};
          transform:rotate(-45deg);
          box-shadow:0 2px 6px rgba(0,0,0,.28);
          display:flex;align-items:center;justify-content:center;
          border:2px solid rgba(255,255,255,.6)
        ">
          <span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span>
        </div>
      </div>`,
      iconSize: [0, 0],
    });
  }

  /** Pin con halo pulsante para en_camino — diferencia visual clara */
  function pinEnCamino(color: string, emoji: string) {
    return L.current.divIcon({
      className: "",
      html: `<div style="position:relative;transform:translate(-50%,-100%)">
        <div style="
          position:absolute;top:-8px;left:-8px;
          width:48px;height:48px;
          border-radius:50%;
          background:${color};
          opacity:0.22;
          animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite;
        "></div>
        <div style="
          width:32px;height:32px;
          border-radius:50% 50% 50% 0;
          background:${color};
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
          border:3px solid #fff
        ">
          <span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span>
        </div>
      </div>`,
      iconSize: [0, 0],
    });
  }

  function draw() {
    if (!L.current || !layer.current) return;
    layer.current.clearLayers();
    const all: [number, number][] = [];

    solicitudes
      .filter((s) => s.estado !== "atendido")
      .forEach((s) => {
        const t   = tipoInfo(s.tipo);
        const col = TIPO_COLORS[s.tipo] ?? "#64748B";
        const isEnCamino = s.estado === "en_camino";
        const m   = L.current
          .marker(
            [s.latitud, s.longitud],
            { icon: isEnCamino ? pinEnCamino(col, t.emoji) : pin(col, t.emoji) }
          )
          .addTo(layer.current);

        const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.latitud},${s.longitud}`;
        const badgeStyle =
          s.prioridad === "alta"  ? "color:#991B1B;background:#FEF2F2;border:1px solid rgba(220,38,38,.2)" :
          s.prioridad === "media" ? "color:#92400E;background:#FFFBEB;border:1px solid rgba(217,119,6,.2)" :
                                    "color:#1E3A8A;background:#EFF4FF;border:1px solid rgba(30,58,138,.2)";
        const prioEmoji = s.prioridad === "alta" ? "🔴" : s.prioridad === "media" ? "🟡" : "🔵";

        const estadoBadge = isEnCamino
          ? `<span class="badge" style="color:#065F46;background:#ECFDF5;border:1px solid rgba(16,185,129,.2)">🚑 Ayuda en camino${s.respondido_por ? " · " + esc(s.respondido_por) : ""}</span>`
          : "";

        const botonAccion = isEnCamino
          ? `<a href="#" data-atender="${s.id}" data-estado="en_camino" class="popup-action popup-action--primary">✓ Marcar atendida</a>`
          : `<a href="#" data-atender="${s.id}" data-estado="pendiente" class="popup-action popup-action--primary">🚑 Voy en camino</a>`;

        m.bindPopup(`
          <div class="popup-inner">
            <p class="popup-title">${t.emoji} ${esc(t.label)}</p>
            ${s.descripcion ? `<p class="popup-desc">${esc(s.descripcion)}</p>` : ""}
            ${s.referencia  ? `<p class="popup-ref">📍 ${esc(s.referencia)}</p>` : ""}
            <div class="popup-badges">
              <span class="badge" style="${badgeStyle}">${prioEmoji} ${s.prioridad}</span>
              ${s.personas_afectadas ? `<span class="badge" style="color:#0F172A;background:#F1F5F9;border:1px solid #E2E8F0">👥 ${s.personas_afectadas}</span>` : ""}
              ${estadoBadge}
            </div>
            ${s.contacto ? `<p class="popup-contact">📞 ${esc(s.contacto)}</p>` : ""}
            <div class="popup-actions">
              ${botonAccion}
              <a href="${dir}" target="_blank" rel="noreferrer" class="popup-action popup-action--secondary">🧭 Llegar</a>
            </div>
          </div>
        `, { maxWidth: 290 });
        all.push([s.latitud, s.longitud]);
      });

    desaparecidos
      .filter((d) => d.estado !== "encontrado" && d.latitud != null && d.longitud != null)
      .forEach((d) => {
        const m = L.current
          .marker([d.latitud!, d.longitud!], { icon: pin("#7C3AED", "🔎") })
          .addTo(layer.current);
        m.bindPopup(`
          <div class="popup-inner">
            <p class="popup-title">🔎 ${esc(d.nombre)}${d.edad ? `, ${d.edad} años` : ""}</p>
            ${d.descripcion      ? `<p class="popup-desc">${esc(d.descripcion)}</p>` : ""}
            ${d.ultima_ubicacion ? `<p class="popup-ref">📍 Visto en: ${esc(d.ultima_ubicacion)}</p>` : ""}
            <p class="popup-contact">📞 ${esc(d.contacto)}</p>
          </div>
        `, { maxWidth: 260 });
        all.push([d.latitud!, d.longitud!]);
      });

    centrosAcopio.forEach((c) => {
      const m = L.current
        .marker([c.latitude, c.longitude], { icon: pin("#10B981", "📦") })
        .addTo(layer.current);
      
      const dir = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;
      m.bindPopup(`
        <div class="popup-inner">
          <p class="popup-title">📦 ${esc(c.name)}</p>
          <p class="popup-ref">📍 ${esc(c.address)}</p>
          ${c.supply_types?.length ? `<p class="popup-desc"><strong>Reciben:</strong> ${esc(c.supply_types.join(", "))}</p>` : ""}
          <div class="popup-actions">
            <a href="${dir}" target="_blank" rel="noreferrer" class="popup-action popup-action--secondary">🧭 Cómo llegar</a>
          </div>
        </div>
      `, { maxWidth: 260 });
      all.push([c.latitude, c.longitude]);
    });

    puntosAyuda.forEach((p) => {
      const m = L.current
        .marker([p.latitude, p.longitude], { icon: pin("#EF4444", "🆘") })
        .addTo(layer.current);
      
      const dir = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
      m.bindPopup(`
        <div class="popup-inner">
          <p class="popup-title">🆘 ${esc(p.name)}</p>
          ${p.status ? `<span class="badge badge--alta">${p.status === "urgent" ? "Urgente" : p.status}</span>` : ""}
          <p class="popup-ref">📍 ${esc(p.address)}</p>
          ${p.needs?.length ? `<p class="popup-desc"><strong>Necesitan:</strong> ${esc(p.needs.join(", "))}</p>` : ""}
          <div class="popup-actions">
            <a href="${dir}" target="_blank" rel="noreferrer" class="popup-action popup-action--secondary">🧭 Cómo llegar</a>
          </div>
        </div>
      `, { maxWidth: 260 });
      all.push([p.latitude, p.longitude]);
    });

    if (all.length) {
      // No hacemos fitBounds para mantener el zoom 9 fijo
    }
  }

  // Delegar clicks de popups: "Voy en camino" / "Marcar atendida"
  useEffect(() => {
    function handler(e: any) {
      const solicitudId = e.target?.getAttribute?.("data-atender");
      const estado      = e.target?.getAttribute?.("data-estado");
      if (solicitudId && (estado === "pendiente" || estado === "en_camino")) {
        e.preventDefault();
        map.current?.closePopup();
        onAbrirAtender(solicitudId, estado as "pendiente" | "en_camino");
      }
    }
    const el = mapRef.current;
    el?.addEventListener("click", handler);
    return () => el?.removeEventListener("click", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function centerOnUser() {
    if (!navigator.geolocation || !map.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { map.current.setView([pos.coords.latitude, pos.coords.longitude], 15); },
      () => {}
    );
  }

  function flyToItem(lat: number, lng: number) {
    if (!map.current) return;
    map.current.flyTo([lat, lng], 15, { duration: 1.2 });
    setListOpen(false);
  }

  return (
    <div className="map-wrapper">
      {/* CSS para la animación del halo — inyectado inline para no requerir build extra */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        .map-points-list {
          position: absolute; top: 0; right: 0; bottom: 0; width: 320px;
          background: #fff; z-index: 1000; display: flex; flex-direction: column;
          box-shadow: -4px 0 24px rgba(0,0,0,.15); border-radius: 12px 0 0 12px;
          overflow: hidden; animation: slideIn .25s ease-out;
        }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .map-points-list__header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;
        }
        .map-points-list__header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0F172A; }
        .map-points-list__close {
          background: #F1F5F9; border: none; width: 32px; height: 32px; border-radius: 8px;
          font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #64748B;
        }
        .map-points-list__close:hover { background: #E2E8F0; }
        .map-points-list__body { flex: 1; overflow-y: auto; padding: 8px 0; }
        .map-points-list__section {
          padding: 12px 16px 4px; margin: 0; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .5px; color: #94A3B8;
        }
        .map-points-list__item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 10px 16px; border: none; background: none; cursor: pointer;
          text-align: left; font-family: inherit; transition: background .1s;
        }
        .map-points-list__item:hover { background: #F8FAFC; }
        .map-points-list__dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .map-points-list__label {
          font-size: 13px; font-weight: 600; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
        }
        .map-points-list__ref {
          font-size: 12px; color: #94A3B8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
        }
        .map-points-list__empty {
          padding: 32px 16px; text-align: center; color: #94A3B8; font-size: 13px;
        }
        .map-points-list__search { padding: 8px 16px; flex-shrink: 0; }
        .map-points-list__search-input {
          width: 100%; padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px;
          font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box;
          background: #F8FAFC; transition: border-color .15s;
        }
        .map-points-list__search-input:focus { border-color: #3B82F6; background: #fff; }
        @media (max-width: 640px) {
          .map-points-list { width: 85%; border-radius: 12px 0 0 12px; }
        }
      `}</style>

      <div ref={mapRef} className="main-map" role="application" aria-label="Mapa de emergencias" />

      {/* Controles flotantes */}
      <div className="map-controls">
        <button className="map-fab" onClick={() => setListOpen((v) => !v)} aria-label="Abrir lista de puntos">
          📋 Lista
        </button>
        <button className="map-fab" onClick={centerOnUser} aria-label="Centrar mapa en mi ubicación">
          📍 Mi ubicación
        </button>
      </div>

      {/* Contador en vivo */}
      <div className="map-counter" aria-live="polite" aria-atomic="true">
        <span className="map-counter__dot" aria-hidden="true" />
        {activas.length} activos · {atendidas.length} atendidos
      </div>

      {/* Leyenda colapsable */}
      <div className="map-legend">
        <button
          className="map-legend__toggle"
          onClick={() => setLegendOpen((v) => !v)}
          aria-expanded={legendOpen}
          aria-controls="map-legend-body"
        >
          <span>Leyenda</span>
          <span aria-hidden="true">{legendOpen ? "▲" : "▼"}</span>
        </button>
        {legendOpen && (
          <div className="map-legend__body" id="map-legend-body">
            {TIPOS.map((t) => (
              <div className="map-legend__item" key={t.value}>
                <span className="map-legend__dot" style={{ background: TIPO_COLORS[t.value] ?? "#64748B" }} aria-hidden="true" />
                <span>{t.emoji} {t.label}</span>
              </div>
            ))}
            <div className="map-legend__item">
              <span className="map-legend__dot" style={{ background: "#7C3AED" }} aria-hidden="true" />
              <span>🔎 Desaparecido/a</span>
            </div>
            <div className="map-legend__item" style={{ marginTop: "var(--s1)", borderTop: "1px solid var(--border)", paddingTop: "var(--s1)" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
                Pin con halo pulsante = ayuda ya en camino
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lista flotante de puntos en el mapa */}
      {listOpen && (
        <div className="map-points-list" role="dialog" aria-label="Lista de puntos en el mapa">
          <div className="map-points-list__header">
            <h3>Puntos en el mapa</h3>
            <button className="map-points-list__close" onClick={() => { setListOpen(false); setListSearch(""); }} aria-label="Cerrar lista">✕</button>
          </div>
          <div className="map-points-list__search">
            <input
              className="map-points-list__search-input"
              type="text"
              placeholder="Buscar punto..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="map-points-list__body">

            {/* ── Solicitudes activas ── */}
            {(() => {
              const items = listSearch
                ? activas.filter((s) => {
                    const t = tipoInfo(s.tipo);
                    const q = listSearch.toLowerCase();
                    return t.label.toLowerCase().includes(q) || (s.referencia || "").toLowerCase().includes(q) || (s.descripcion || "").toLowerCase().includes(q);
                  })
                : activas;
              if (items.length === 0) return null;
              return (
                <>
                  <p className="map-points-list__section">🆘 Solicitudes activas ({items.length})</p>
                  {items.map((s) => {
                    const t = tipoInfo(s.tipo);
                    return (
                      <button key={s.id} className="map-points-list__item" onClick={() => flyToItem(s.latitud, s.longitud)}>
                        <span className="map-points-list__dot" style={{ background: TIPO_COLORS[s.tipo] ?? "#64748B" }} />
                        <span className="map-points-list__label">{t.emoji} {t.label}</span>
                        {s.referencia && <span className="map-points-list__ref">{esc(s.referencia)}</span>}
                      </button>
                    );
                  })}
                </>
              );
            })()}

            {/* ── Desaparecidos ── */}
            {(() => {
              const conUbicacion = desaparecidos.filter((d) => d.estado !== "encontrado" && d.latitud != null && d.longitud != null);
              const items = listSearch
                ? conUbicacion.filter((d) => {
                    const q = listSearch.toLowerCase();
                    return d.nombre.toLowerCase().includes(q) || (d.ultima_ubicacion || "").toLowerCase().includes(q) || (d.descripcion || "").toLowerCase().includes(q);
                  })
                : conUbicacion;
              if (items.length === 0) return null;
              return (
                <>
                  <p className="map-points-list__section">🔎 Desaparecidos ({items.length})</p>
                  {items.map((d) => (
                    <button key={d.id} className="map-points-list__item" onClick={() => flyToItem(d.latitud!, d.longitud!)}>
                      <span className="map-points-list__dot" style={{ background: "#7C3AED" }} />
                      <span className="map-points-list__label">🔎 {d.nombre}{d.edad ? `, ${d.edad}` : ""}</span>
                      {d.ultima_ubicacion && <span className="map-points-list__ref">{esc(d.ultima_ubicacion)}</span>}
                    </button>
                  ))}
                </>
              );
            })()}

            {/* ── Centros de acopio ── */}
            {(() => {
              const items = listSearch
                ? centrosAcopio.filter((c) => {
                    const q = listSearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || (c.address || "").toLowerCase().includes(q);
                  })
                : centrosAcopio;
              if (items.length === 0) return null;
              return (
                <>
                  <p className="map-points-list__section">📦 Centros de acopio ({items.length})</p>
                  {items.map((c, i) => (
                    <button key={i} className="map-points-list__item" onClick={() => flyToItem(c.latitude, c.longitude)}>
                      <span className="map-points-list__dot" style={{ background: "#10B981" }} />
                      <span className="map-points-list__label">📦 {c.name}</span>
                      {c.address && <span className="map-points-list__ref">{esc(c.address)}</span>}
                    </button>
                  ))}
                </>
              );
            })()}

            {/* ── Puntos de ayuda ── */}
            {(() => {
              const items = listSearch
                ? puntosAyuda.filter((p) => {
                    const q = listSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || (p.address || "").toLowerCase().includes(q);
                  })
                : puntosAyuda;
              if (items.length === 0) return null;
              return (
                <>
                  <p className="map-points-list__section">🆘 Puntos de ayuda ({items.length})</p>
                  {items.map((p, i) => (
                    <button key={i} className="map-points-list__item" onClick={() => flyToItem(p.latitude, p.longitude)}>
                      <span className="map-points-list__dot" style={{ background: "#EF4444" }} />
                      <span className="map-points-list__label">🆘 {p.name}</span>
                      {p.address && <span className="map-points-list__ref">{esc(p.address)}</span>}
                    </button>
                  ))}
                </>
              );
            })()}

            {activas.length === 0 && desaparecidos.filter(d => d.estado !== "encontrado" && d.latitud).length === 0 && centrosAcopio.length === 0 && puntosAyuda.length === 0 && (
              <p className="map-points-list__empty">No hay puntos marcados en el mapa</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function esc(s: string) {
  return s.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" } as any)[c]
  );
}
