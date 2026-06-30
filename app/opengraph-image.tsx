import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Rescate VE — Movemos la ayuda donde hace falta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1E3A8A 0%, #1e40af 50%, #0F172A 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              margin: "0 0 16px 0",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Juntos por Venezuela
          </p>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 24px 0",
              letterSpacing: "-0.03em",
            }}
          >
            Rescate VE
          </h1>
          <p
            style={{
              fontSize: 34,
              fontWeight: 500,
              color: "rgba(255,255,255,0.9)",
              margin: 0,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Movemos la ayuda hasta quien aún no la ha recibido
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            {["Traslados", "Insumos", "Transportistas verificados"].map((t) => (
              <div
                key={t}
                style={{
                  padding: "12px 28px",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
