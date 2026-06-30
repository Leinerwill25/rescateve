"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogIn, ShieldAlert, CheckCircle, Eye, EyeOff } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Si ya tiene sesión activa, mandar a /operaciones
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/operaciones");
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let loginEmail = email.trim();

      if (!loginEmail.includes("@")) {
        const { data: emailResuelto, error: cedulaErr } = await supabase.rpc(
          "obtener_email_donante_por_cedula",
          { p_cedula: loginEmail }
        );
        if (cedulaErr || !emailResuelto) {
          setError("No encontramos una cuenta con esa cédula. Verifica el número o regístrate en Donar desde casa.");
          setLoading(false);
          return;
        }
        loginEmail = emailResuelto;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message === "Invalid login credentials" 
          ? "Credenciales incorrectas. Verifique su correo y contraseña."
          : signInError.message
        );
        setLoading(false);
        return;
      }

      if (data.session) {
        setSuccess(true);
        // Esperar breve animación e ir a operaciones
        setTimeout(() => {
          router.push("/operaciones");
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <BrandLogo size={56} priority />
          </div>
          <h1 style={styles.title}>Rescate VE</h1>
          <p style={styles.subtitle}>Consola logística · Red Juntos por Venezuela</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={20} color="var(--emergency)" />
            <span style={styles.alertText}>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <CheckCircle size={20} color="var(--success)" />
            <span style={styles.alertText}>Sesión iniciada. Redireccionando...</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Correo o cédula</label>
            <input
              id="email"
              type="text"
              placeholder="ejemplo@organizacion.org o V-12345678"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || success}
              style={styles.input}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Contraseña</label>
            <div style={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || success}
                style={{ ...styles.input, paddingRight: 44 }}
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading || success}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={loading || success ? { ...styles.submitBtn, ...styles.disabledBtn } : styles.submitBtn}
          >
            <LogIn size={18} />
            <span>{loading ? "Verificando..." : "Ingresar"}</span>
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Operadores de la red: usa tu correo institucional. Donantes: inicia con tu cédula y contraseña.
          </p>
          <a href="/donantes" style={styles.backLink}>Registrarme como donante</a>
          <a href="/" style={styles.backLink}>Volver al mapa público</a>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1E3A8A 0%, #1E293B 100%)",
    padding: "var(--s4)",
    fontFamily: "var(--font)",
  },
  card: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(16px)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg), 0 20px 25px -5px rgba(0, 0, 0, 0.2)",
    padding: "var(--s6)",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--s1)",
  },
  logo: {
    background: "transparent",
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "var(--s2)",
  },
  title: {
    margin: 0,
    fontSize: "var(--text-xl)",
    fontWeight: 800,
    color: "var(--brand)",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s4)",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--s1)",
  },
  label: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "var(--s3)",
    fontSize: "var(--text-base)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    outline: "none",
    background: "var(--surface)",
    color: "var(--text)",
    transition: "border-color var(--transition)",
    height: "44px",
    width: "100%",
  },
  passwordWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    padding: 4,
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--s2)",
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-base)",
    fontWeight: 600,
    cursor: "pointer",
    padding: "var(--s3)",
    transition: "background var(--transition)",
    height: "46px",
    boxShadow: "var(--shadow-sm)",
    marginTop: "var(--s1)",
  },
  disabledBtn: {
    background: "var(--text-muted)",
    cursor: "not-allowed",
  },
  errorAlert: {
    background: "var(--emergency-soft)",
    borderLeft: "4px solid var(--emergency)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--s3)",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
  },
  successAlert: {
    background: "var(--success-soft)",
    borderLeft: "4px solid var(--success)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--s3)",
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
  },
  alertText: {
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    color: "var(--text)",
  },
  footer: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "var(--s3)",
    marginTop: "var(--s2)",
    borderTop: "1px solid var(--border)",
    paddingTop: "var(--s3)",
  },
  footerText: {
    margin: 0,
    fontSize: "11px",
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  backLink: {
    fontSize: "var(--text-sm)",
    color: "var(--brand)",
    textDecoration: "none",
    fontWeight: 600,
  },
};
