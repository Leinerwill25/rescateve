"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Shield,
  Globe,
  FileJson,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import type { ReportesApiAcceso } from "@/app/api/public/reportes/accesos/route";

const STORAGE_KEY = "rescate_reportes_api_key";

type AccesosResponse = {
  success: boolean;
  total: number;
  limit: number;
  offset: number;
  ips_unicas_en_pagina: number;
  accesos: ReportesApiAcceso[];
  error?: string;
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-VE", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default function ReportesApiPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accesos, setAccesos] = useState<ReportesApiAcceso[]>([]);
  const [total, setTotal] = useState(0);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://rescate-ve.vercel.app";

  const ipsUnicas = useMemo(() => {
    const set = new Set(accesos.map((a) => a.ip_address));
    return set.size;
  }, [accesos]);

  const cargarAccesos = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/reportes/accesos?limit=200", {
        headers: { "X-Reportes-Key": key },
      });
      const data: AccesosResponse = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo consultar los accesos.");
      setAccesos(data.accesos || []);
      setTotal(data.total || 0);
      setAutenticado(true);
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch (err: unknown) {
      setAutenticado(false);
      setAccesos([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Error al consultar accesos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setApiKey(saved);
      void cargarAccesos(saved);
    }
  }, [cargarAccesos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Ingresa la clave de API.");
      return;
    }
    void cargarAccesos(apiKey.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setAutenticado(false);
    setAccesos([]);
    setTotal(0);
    setError(null);
  };

  return (
    <div className="voluntarios-page" style={{ alignItems: "stretch", paddingBottom: 48 }}>
      <div className="voluntarios-page__card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" className="voluntarios-page__back">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al inicio
        </Link>

        <div className="voluntarios-page__header">
          <BrandLogo size={48} />
          <h1 className="voluntarios-page__title">API de reportes operacionales</h1>
          <p className="voluntarios-page__lead">
            Consulta el registro de IPs que han accedido a los datos de reportes y consume la
            información desde otras plataformas con tu clave autorizada.
          </p>
        </div>

        {!autenticado ? (
          <form className="voluntarios-page__form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="reportes-api-key">
                <KeyRound size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                Clave de API
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reportes-api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="rv_rpt_2026_..."
                  autoComplete="off"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-soft)",
                    padding: 4,
                  }}
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="voluntarios-page__error">{error}</div>}

            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Verificando…" : "Acceder al registro"}
            </button>
          </form>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 24,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface-2, #f8fafc)",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <strong>{total}</strong> accesos registrados
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface-2, #f8fafc)",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <strong>{ipsUnicas}</strong> IPs en esta página
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void cargarAccesos(apiKey)}
                  disabled={loading}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Actualizar
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            </div>

            <section style={{ marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Globe size={18} aria-hidden="true" />
                Registro de accesos por IP
              </h2>
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Fecha</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>IP</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Endpoint</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Estado</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>User-Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesos.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-soft)" }}>
                          Aún no hay accesos registrados.
                        </td>
                      </tr>
                    ) : (
                      accesos.map((row) => (
                        <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            {formatFecha(row.created_at)}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{row.ip_address}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}>
                            {row.endpoint}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {row.autorizado ? (
                              <span style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                                Autorizado
                              </span>
                            ) : (
                              <span style={{ color: "#dc2626", fontWeight: 600 }}>Rechazado</span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              maxWidth: 280,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "var(--text-soft)",
                            }}
                            title={row.user_agent || ""}
                          >
                            {row.user_agent || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileJson size={18} aria-hidden="true" />
                Consumir datos en otras plataformas
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-soft)", marginBottom: 16 }}>
                Envía la clave en el header <code>X-Reportes-Key</code> o como{" "}
                <code>Authorization: Bearer &lt;clave&gt;</code>.
              </p>

              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    background: "#0f172a",
                    color: "#e2e8f0",
                    padding: 16,
                    borderRadius: 8,
                    fontFamily: "monospace",
                    fontSize: 12,
                    overflowX: "auto",
                  }}
                >
                  <div style={{ color: "#94a3b8", marginBottom: 8 }}># Reportes completos</div>
                  {`curl -H "X-Reportes-Key: TU_CLAVE" \\\n  "${siteUrl}/api/public/reportes"`}
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    color: "#e2e8f0",
                    padding: 16,
                    borderRadius: 8,
                    fontFamily: "monospace",
                    fontSize: 12,
                    overflowX: "auto",
                  }}
                >
                  <div style={{ color: "#94a3b8", marginBottom: 8 }}># Registro de accesos (JSON)</div>
                  {`curl -H "X-Reportes-Key: TU_CLAVE" \\\n  "${siteUrl}/api/public/reportes/accesos?limit=100"`}
                </div>
              </div>

              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: "var(--text-soft)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Shield size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                La respuesta de <code>/api/public/reportes</code> incluye la misma estructura que el
                módulo interno de reportes: KPIs por fuente (AEC, Ash, traslados), inventario, logística
                y desempeño por transportista.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
