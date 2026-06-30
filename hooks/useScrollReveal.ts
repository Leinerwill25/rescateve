"use client";

import { useEffect, useRef, useState } from "react";

function isInViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const viewH = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewH - 24 && rect.bottom > 24;
}

export function useScrollReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setVisible(true);
    };

    const check = () => {
      if (isInViewport(el)) reveal();
    };

    // Comprobar tras el layout (ref ya montado)
    const raf = requestAnimationFrame(check);
    check();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: [0, threshold, 0.15], rootMargin: "0px 0px 10% 0px" },
    );

    observer.observe(el);

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [threshold]);

  return { ref, visible };
}
