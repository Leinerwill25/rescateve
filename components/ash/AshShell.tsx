"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AshChat from "./AshChat";
import AshAvatar from "./AshAvatar";

const HIDDEN_PREFIXES = ["/operaciones", "/login"];

export default function AshShell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    const t1 = setTimeout(() => setShowHint(true), 4000);
    const t2 = setTimeout(() => setShowHint(false), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [hidden]);

  if (hidden) return null;

  return (
    <>
      {!open && (
        <div className="ash-fab-wrap">
          {showHint && !minimized && (
            <div className="ash-fab-hint" role="status">
              ¿Necesitas ayuda?
            </div>
          )}
          <button
            type="button"
            className="ash-fab"
            onClick={() => { setOpen(true); setMinimized(false); setShowHint(false); }}
            aria-label="Abrir chat con Ash para pedir ayuda"
          >
            <AshAvatar size={60} />
          </button>
        </div>
      )}

      <AshChat
        open={open}
        onClose={() => setOpen(false)}
        onMinimize={() => { setOpen(false); setMinimized(true); }}
      />
    </>
  );
}
