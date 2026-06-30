"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Gift, LogIn } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function DonantesPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cedulaRegistrada, setCedulaRegistrada] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/donantes/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, telefono, cedula, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo completar el registro.");

      setCedulaRegistrada(data.cedula || cedula.trim());
      setOk(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrar. Intenta de nuevo.");
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
          <h1 className="voluntarios-page__title">Donar desde tu hogar</h1>
          <p className="voluntarios-page__lead">
            Regístrate para ofrecer insumos que tengas disponibles. Nosotros coordinamos el traslado
            hacia quien lo necesite de verdad.
          </p>
        </div>

        {ok ? (
          <div className="voluntarios-page__success" role="status">
            <CheckCircle size={28} aria-hidden="true" />
            <p>
              <strong>¡Cuenta creada!</strong> Para ingresar usa tu <strong>cédula</strong> (
              {cedulaRegistrada}) y la contraseña que elegiste.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => router.push("/login")}
            >
              <LogIn size={18} aria-hidden="true" />
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form className="voluntarios-page__form" onSubmit={handleSubmit}>
            {error && (
              <p className="voluntarios-page__error" role="alert">
                {error}
              </p>
            )}

            <div className="form-field">
              <label htmlFor="don-nombre">Nombre</label>
              <input
                id="don-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Dereck"
                required
                minLength={2}
                autoComplete="given-name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="don-apellido">Apellido</label>
              <input
                id="don-apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej. Ruiz"
                required
                minLength={2}
                autoComplete="family-name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="don-cedula">Cédula de identidad</label>
              <input
                id="don-cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="V-12345678"
                required
                minLength={6}
              />
              <span className="form-field__hint">La usarás para iniciar sesión en la consola.</span>
            </div>

            <div className="form-field">
              <label htmlFor="don-telefono">Teléfono</label>
              <input
                id="don-telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="0414-0000000"
                required
                minLength={7}
                autoComplete="tel"
              />
            </div>

            <div className="form-field">
              <label htmlFor="don-password">Contraseña</label>
              <div className="password-field">
                <input
                  id="don-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              <Gift size={18} aria-hidden="true" />
              {loading ? "Creando cuenta…" : "Registrarme como donante"}
            </button>

            <p className="voluntarios-page__login-hint">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login">Inicia sesión con tu cédula</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
