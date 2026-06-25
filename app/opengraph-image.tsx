import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Rescate VE - Mapa colaborativo de emergencia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(to bottom right, #f8fafc, #e2e8f0)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative background circle */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0) 70%)",
          }}
        />

        {/* Content Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            justifyContent: "center",
            background: "white",
            padding: "60px 80px",
            borderRadius: "40px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            position: "relative",
          }}
        >
          {/* Logo / Title Area */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "30px" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                background: "#ef4444", // emergency red
                borderRadius: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)",
              }}
            >
              <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                <path d="M20 10v4a8 8 0 0 1-16 0v-4" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: "72px",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.03em",
              }}
            >
              Rescate VE
            </h1>
          </div>

          <p
            style={{
              fontSize: "36px",
              fontWeight: 500,
              color: "#475569",
              margin: "0 0 40px 0",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            Mapa colaborativo de emergencia, búsqueda de personas y centros de acopio en Venezuela.
          </p>

          {/* Features pills */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { text: "🚨 Pedir Ayuda", bg: "#fef2f2", color: "#dc2626" },
              { text: "🔎 Buscar Personas", bg: "#eff6ff", color: "#2563eb" },
              { text: "📢 Avisos Comunitarios", bg: "#f0fdf4", color: "#16a34a" },
            ].map((pill, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  padding: "16px 32px",
                  borderRadius: "100px",
                  background: pill.bg,
                  color: pill.color,
                  fontSize: "28px",
                  fontWeight: 600,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                }}
              >
                {pill.text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: "28px",
            fontWeight: 600,
            color: "#64748b",
            letterSpacing: "0.05em",
          }}
        >
          rescate-ve.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
