"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TIPO_VEHICULO_LABEL } from "@/lib/kpis-logistica";
import BrandLogo from "@/components/BrandLogo";

const TIPOS = ["pasajeros", "carga", "ambulancia", "grua", "tecnico"] as const;

export default function VoluntariosPage() {
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("carga");
  const [contacto, setContacto] = useState("");
  const [mostrarPublico, setMostrarPublico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("registrar_voluntario_publico", {
        p_nombre: nombre.trim(),
        p_ciudad: ciudad.trim(),
        p_tipo: tipo,
        p_contacto: contacto.trim(),
        p_mostrar_publico: mostrarPublico,
      });
      if (rpcError) throw rpcError;
      setOk(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo enviar el registro. Intenta de nuevo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voluntarios-page">
      <div className="voluntarios-page__card">
        <Link href="/" className="voluntarios-page__back">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al inicio
        </Link>

        <div className="voluntarios-page__header">
          <BrandLogo size={48} />
          <h1 className="voluntarios-page__title">Súmate como transportista</h1>
          <p className="voluntarios-page__lead">
            Registra tu vehículo para que operaciones pueda contactarte. No necesitas cuenta todavía.
          </p>
        </div>

        {ok ? (
          <div className="voluntarios-page__success" role="status">
            <CheckCircle size={28} aria-hidden="true" />
            <p>
              <strong>¡Gracias por sumarte!</strong> Tu registro está pendiente de revisión.
              Te contactaremos por teléfono cuando estés activo en la red.
            </p>
            <Link href="/" className="btn btn--primary">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <form className="voluntarios-page__form" onSubmit={handleSubmit}>
            {error && (
              <p className="voluntarios-page__error" role="alert">
                {error}
              </p>
            )}

            <div className="form-field">
              <label htmlFor="vol-nombre">Tu nombre</label>
              <input
                id="vol-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. María"
                required
                minLength={2}
                autoComplete="name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="vol-ciudad">Ciudad o zona</label>
              <input
                id="vol-ciudad"
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej. Valencia, Carabobo"
                required
                minLength={2}
              />
            </div>

            <div className="form-field">
              <label htmlFor="vol-tipo">Tipo de vehículo</label>
              <select
                id="vol-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_VEHICULO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="vol-contacto">Teléfono de contacto</label>
              <input
                id="vol-contacto"
                type="tel"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="0414-0000000"
                required
                minLength={7}
                autoComplete="tel"
              />
              <span className="form-field__hint">
                Solo lo usa el equipo de operaciones. No se publica en la web.
              </span>
            </div>

            <label className="voluntarios-page__consent">
              <input
                type="checkbox"
                checked={mostrarPublico}
                onChange={(e) => setMostrarPublico(e.target.checked)}
              />
              <span>
                Acepto aparecer en la lista pública de voluntarios (solo mi nombre de pila, tipo de vehículo y ciudad).
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              <Truck size={18} aria-hidden="true" />
              {loading ? "Enviando…" : "Enviar registro"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
