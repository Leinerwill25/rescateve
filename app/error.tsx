"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Errores de carga de chunk suelen ocurrir tras un nuevo deploy con HTML/JS
    // cacheado. Forzar una recarga limpia una sola vez suele resolverlo.
    const msg = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
    const esChunkError =
      msg.includes("chunkloaderror") ||
      msg.includes("loading chunk") ||
      msg.includes("failed to fetch dynamically imported module") ||
      msg.includes("importing a module script failed");

    if (esChunkError && typeof window !== "undefined") {
      const yaRecargado = sessionStorage.getItem("rv_chunk_reload");
      if (!yaRecargado) {
        sessionStorage.setItem("rv_chunk_reload", "1");
        window.location.reload();
        return;
      }
    }

    console.error("[AppError]", error);
  }, [error]);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Algo salió mal</h1>
        <p style={styles.text}>
          Ocurrió un error al cargar esta sección. Puede deberse a una actualización reciente
          de la aplicación o a una conexión inestable.
        </p>
        <div style={styles.actions}>
          <button type="button" style={styles.btnPrimary} onClick={() => reset()}>
            Reintentar
          </button>
          <button
            type="button"
            style={styles.btnSecondary}
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("rv_chunk_reload");
                window.location.reload();
              }
            }}
          >
            Recargar página
          </button>
        </div>
        <p style={styles.hint}>
          Si el problema persiste, cierra completamente el navegador o borra los datos del sitio
          e ingresa de nuevo.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "#f8fafc",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    maxWidth: 420,
    width: "100%",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 28,
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
  },
  title: { margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#0f172a" },
  text: { margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.5 },
  actions: { display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: {
    padding: "10px 18px",
    background: "#0f4c81",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "10px 18px",
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  hint: { margin: "18px 0 0", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 },
};
