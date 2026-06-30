"use client";

import { useEffect, useState } from "react";
import { Globe, Menu, X, Truck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export type SiteNavTarget =
  | "inicio"
  | "como-funciona"
  | "mapa"
  | "sumarse"
  | "traslados"
  | "lista"
  | "info";

type SiteHeaderProps = {
  onNav: (target: SiteNavTarget) => void;
  activeTab?: string;
};

const MAIN_LINKS: { id: SiteNavTarget; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "mapa", label: "Mapa" },
  { id: "sumarse", label: "Sumarse" },
];

const APP_LINKS: { id: SiteNavTarget; label: string }[] = [
  { id: "traslados", label: "Traslados" },
  { id: "lista", label: "Lista de casos" },
  { id: "info", label: "Avisos" },
];

function isActive(id: SiteNavTarget, activeTab?: string) {
  if (!activeTab) return id === "inicio";
  if (id === "inicio") return activeTab === "inicio";
  if (id === "mapa") return activeTab === "mapa";
  if (id === "traslados") return activeTab === "traslados";
  if (id === "lista") return activeTab === "lista";
  if (id === "info") return activeTab === "info";
  return false;
}

export default function SiteHeader({ onNav, activeTab }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navigate = (target: SiteNavTarget) => {
    setMenuOpen(false);
    onNav(target);
  };

  return (
    <>
      <header className="site-header site-header--solid" role="banner">
        <div className="site-header__inner">
          <button
            type="button"
            className="site-header__brand"
            onClick={() => navigate("inicio")}
            aria-label="Rescate VE — Inicio"
          >
            <BrandLogo size={34} className="site-header__logo" priority />
            <span className="site-header__brand-text">
              <span className="site-header__title">Rescate VE</span>
              <span className="site-header__tagline">Juntos por Venezuela</span>
            </span>
          </button>

          <nav className="site-header__nav" aria-label="Navegación principal">
            <div className="site-header__nav-pills">
              {MAIN_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className={`site-header__link${isActive(link.id, activeTab) ? " site-header__link--active" : ""}`}
                  onClick={() => navigate(link.id)}
                  aria-current={isActive(link.id, activeTab) ? "page" : undefined}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="site-header__actions">
            <span className="site-header__lang" aria-label="Idioma: español">
              <Globe size={14} aria-hidden="true" />
              ES
            </span>

            <button
              type="button"
              className="site-header__cta"
              onClick={() => navigate("traslados")}
            >
              <Truck size={16} aria-hidden="true" />
              <span>Solicitar traslado</span>
            </button>

            <button
              type="button"
              className="site-header__menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="site-mobile-menu"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="site-header__backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div
        id="site-mobile-menu"
        className={`site-header__drawer${menuOpen ? " site-header__drawer--open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="site-header__drawer-inner">
          <p className="site-header__drawer-label">Navegación</p>
          <div className="site-header__drawer-links">
            {MAIN_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                className={`site-header__drawer-link${isActive(link.id, activeTab) ? " site-header__drawer-link--active" : ""}`}
                onClick={() => navigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </div>

          <p className="site-header__drawer-label">Plataforma</p>
          <div className="site-header__drawer-links">
            {APP_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                className={`site-header__drawer-link${isActive(link.id, activeTab) ? " site-header__drawer-link--active" : ""}`}
                onClick={() => navigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--primary btn--block site-header__drawer-cta"
            onClick={() => navigate("traslados")}
          >
            <Truck size={18} aria-hidden="true" />
            Solicitar un traslado
          </button>
        </div>
      </div>
    </>
  );
}
