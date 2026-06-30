"use client";

import { ArrowUpRight, Globe, AtSign } from "lucide-react";
import Kicker from "./Kicker";
import Reveal from "./Reveal";
import {
  QUIPU_FEATURED,
  QUIPU_INITIATIVES,
  QUIPU_INTRO,
  type QuipuLink,
} from "@/lib/quipuInitiatives";

function LinkIcon({ link }: { link: QuipuLink }) {
  if (link.host.includes("instagram")) {
    return <AtSign size={15} strokeWidth={2} aria-hidden="true" />;
  }
  return <Globe size={15} strokeWidth={2} aria-hidden="true" />;
}

export default function QuipuSection() {
  return (
    <section className="landing-section landing-section--alt quipu-section" aria-labelledby="quipu-title">
      <div className="landing-section__inner quipu-section__inner">
        <Reveal>
          <header className="landing-section__header quipu-section__header">
            <Kicker>Iniciativas</Kicker>
            <h2 id="quipu-title" className="landing-section__title">
              Red Quipu
            </h2>
            <p className="landing-section__lead quipu-section__lead">{QUIPU_INTRO}</p>
          </header>
        </Reveal>

        <Reveal delay={60}>
          <article className="quipu-featured">
            <div className="quipu-featured__mark" aria-hidden="true">
              RQ
            </div>
            <div className="quipu-featured__body">
              <div className="quipu-featured__head">
                <span className="quipu-featured__badge">{QUIPU_FEATURED.badge}</span>
                <h3 className="quipu-featured__title">{QUIPU_FEATURED.title}</h3>
              </div>
              <p className="quipu-featured__desc">{QUIPU_FEATURED.description}</p>
              <a
                href={QUIPU_FEATURED.url}
                target="_blank"
                rel="noopener noreferrer"
                className="quipu-featured__cta"
              >
                <span className="quipu-featured__cta-text">
                  <span className="quipu-featured__cta-label">Visitar plataforma</span>
                  <span className="quipu-featured__cta-host">{QUIPU_FEATURED.host}</span>
                </span>
                <span className="quipu-featured__cta-icon" aria-hidden="true">
                  <ArrowUpRight size={16} strokeWidth={2} />
                </span>
              </a>
            </div>
          </article>
        </Reveal>

        <ul className="quipu-grid">
          {QUIPU_INITIATIVES.map((item, index) => (
            <li key={item.number} className="quipu-grid__item">
              <Reveal delay={index * 35} className="quipu-grid__cell">
                <article className="quipu-card">
                  <header className="quipu-card__head">
                    <span className="quipu-card__num">{item.number}</span>
                    <h3 className="quipu-card__title">{item.title}</h3>
                  </header>
                  <div className="quipu-card__body">
                    <ul className="quipu-card__links">
                      {item.links.map((link) => (
                        <li key={`${item.number}-${link.url}`} className="quipu-card__link-item">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="quipu-link"
                          >
                            <span className="quipu-link__icon">
                              <LinkIcon link={link} />
                            </span>
                            <span className="quipu-link__text">
                              <span className="quipu-link__label">{link.label}</span>
                              <span className="quipu-link__host">{link.host}</span>
                            </span>
                            <span className="quipu-link__action" aria-hidden="true">
                              <ArrowUpRight size={15} strokeWidth={2} />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
