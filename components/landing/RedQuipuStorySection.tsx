"use client";

import { ArrowUpRight, Landmark } from "lucide-react";
import Reveal from "./Reveal";
import { RED_QUIPU_STORY } from "@/lib/quipuInitiatives";

function QuipuStringGraphic() {
  return (
    <svg
      className="red-quipu-story__graphic"
      viewBox="0 0 320 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 28 C 60 12, 120 40, 160 24 S 260 12, 312 28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="56" cy="20" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="112" cy="34" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="160" cy="24" r="4.5" fill="currentColor" />
      <circle cx="160" cy="24" r="10" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      <circle cx="208" cy="30" r="3" fill="currentColor" opacity="0.45" />
      <circle cx="264" cy="18" r="3" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export default function RedQuipuStorySection() {
  return (
    <section
      className="landing-section red-quipu-story"
      aria-labelledby="red-quipu-story-title"
    >
      <div className="landing-section__inner landing-section__inner--narrow red-quipu-story__inner">
        <Reveal>
          <header className="red-quipu-story__header">
            <h2 id="red-quipu-story-title" className="red-quipu-story__title">
              {RED_QUIPU_STORY.title}
            </h2>
            <QuipuStringGraphic />
          </header>
        </Reveal>

        <Reveal delay={50}>
          <div className="red-quipu-story__body">
            {RED_QUIPU_STORY.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="red-quipu-story__paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="red-quipu-story__footer">
            <a
              href={RED_QUIPU_STORY.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="red-quipu-story__cta"
            >
              <span className="red-quipu-story__cta-icon" aria-hidden="true">
                <Landmark size={18} strokeWidth={1.75} />
              </span>
              <span className="red-quipu-story__cta-label">{RED_QUIPU_STORY.cta.label}</span>
              <span className="red-quipu-story__cta-arrow" aria-hidden="true">
                <ArrowUpRight size={16} strokeWidth={2} />
              </span>
            </a>
            <p className="red-quipu-story__tagline">{RED_QUIPU_STORY.tagline}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
