"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOperationsAuth } from "./layout";

export default function OperationsPage() {
  const router = useRouter();
  const { perfil, loading } = useOperationsAuth();

  useEffect(() => {
    if (loading) return;

    if (!perfil) {
      router.push("/login");
      return;
    }

    if (perfil.rol === "admin") {
      router.push("/operaciones/cola");
    } else if (perfil.rol === "transportista") {
      router.push("/operaciones/mis-viajes");
    } else if (perfil.rol === "medico") {
      router.push("/operaciones/mis-solicitudes");
    } else if (perfil.rol === "acopio") {
      router.push("/operaciones/mi-acopio");
    } else {
      router.push("/login");
    }
  }, [perfil, loading, router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "30px",
          height: "30px",
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--brand)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 12px"
        }}></div>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Redireccionando según rol...</p>
      </div>
    </div>
  );
}
