"use client";

import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import RouteThread from "./RouteThread";
import type { SiteNavTarget } from "./SiteHeader";

type SiteFooterProps = {
  onNav: (target: SiteNavTarget) => void;
};

export default function SiteFooter({ onNav }: SiteFooterProps) {
  return (
    <footer className="site-footer" role="contentinfo">
      <RouteThread variant="footer" className="site-footer__route" />
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <BrandLogo size={44} />
          <div>
            <p className="site-footer__name">Rescate VE</p>
            <p className="site-footer__tagline">
              Nodo logístico de la red Juntos por Venezuela. Movemos insumos, personal y apoyo hasta quien lo necesita.
            </p>
          </div>
        </div>

        <div className="site-footer__groups">
          <div className="site-footer__group">
            <h3 className="site-footer__heading">Plataforma</h3>
            <button type="button" className="site-footer__link" onClick={() => onNav("inicio")}>Inicio</button>
            <button type="button" className="site-footer__link" onClick={() => onNav("como-funciona")}>Cómo funciona</button>
            <button type="button" className="site-footer__link" onClick={() => onNav("mapa")}>Mapa en vivo</button>
            <button type="button" className="site-footer__link" onClick={() => onNav("sumarse")}>Sumarse</button>
            <button type="button" className="site-footer__link" onClick={() => onNav("traslados")}>Solicitar traslado</button>
          </div>
          <div className="site-footer__group">
            <h3 className="site-footer__heading">Información</h3>
            <button type="button" className="site-footer__link" onClick={() => onNav("como-funciona")}>Cómo funciona el flujo</button>
            <button type="button" className="site-footer__link" onClick={() => onNav("info")}>Avisos y transparencia</button>
            <button type="button" className="site-footer__link" onClick={() => onNav("lista")}>Lista de casos</button>
            <Link href="/login" className="site-footer__link">Consola de operaciones</Link>
          </div>
          <div className="site-footer__group">
            <h3 className="site-footer__heading">Red y aliados</h3>
            <p className="site-footer__text">Juntos por Venezuela</p>
            <p className="site-footer__text">Nueve Once · Tu Gruero · Tilín · SafeCare</p>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <p>© {new Date().getFullYear()} Rescate VE — La ayuda existe; nosotros la movemos.</p>
      </div>
    </footer>
  );
}
