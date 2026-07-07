"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
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
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}
        >
          <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            No se pudo cargar la aplicación
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("rv_chunk_reload");
                window.location.reload();
              } else {
                reset();
              }
            }}
            style={{
              padding: "10px 18px",
              background: "#0f4c81",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Recargar página
          </button>
        </div>
      </body>
    </html>
  );
}
