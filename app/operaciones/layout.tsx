"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Perfil, Notificacion } from "@/lib/types-operations";
import { 
  User, 
  LogOut, 
  Bell, 
  ShieldAlert, 
  ClipboardCheck, 
  Truck, 
  Stethoscope, 
  Sliders, 
  Briefcase, 
  History, 
  Menu,
  X, 
  AlertCircle,
  Package
} from "lucide-react";

interface AuthContextType {
  session: any;
  perfil: Perfil | null;
  loading: boolean;
  actualizarPerfil: () => Promise<void>;
}

const OperationsAuthContext = createContext<AuthContextType>({
  session: null,
  perfil: null,
  loading: true,
  actualizarPerfil: async () => {},
});

export function useOperationsAuth() {
  return useContext(OperationsAuthContext);
}

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Notificaciones
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const cargarPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPerfil(data as Perfil);
      } else {
        // No hay perfil creado
        console.warn("No se encontró perfil para este usuario.");
        setPerfil(null);
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
      setPerfil(null);
    }
  };

  const inicializarAuth = async () => {
    setLoading(true);
    try {
      const { data: { session: curSession } } = await supabase.auth.getSession();
      if (!curSession) {
        router.push("/login");
        return;
      }
      setSession(curSession);
      await cargarPerfil(curSession.user.id);
    } catch (err) {
      console.error("Error en inicialización de sesión:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    inicializarAuth();

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setPerfil(null);
        router.push("/login");
      } else if (newSession) {
        setSession(newSession);
        await cargarPerfil(newSession.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Cargar notificaciones e iniciar realtime
  useEffect(() => {
    if (!perfil) return;

    const cargarNotificaciones = async () => {
      const query = supabase
        .from("notificaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      // Si no es admin, filtrar por su ID
      if (perfil.rol !== "admin") {
        query.eq("destinatario_id", perfil.id);
      }

      const { data } = await query;
      if (data) setNotificaciones(data as Notificacion[]);
    };

    cargarNotificaciones();

    // Suscripción Realtime a notificaciones
    const filter = perfil.rol === "admin" 
      ? "public:notificaciones"
      : `public:notificaciones?destinatario_id=eq.${perfil.id}`;

    const ch = supabase
      .channel("notif_canal")
      .on(
        "postgres_changes", 
        { event: "INSERT", schema: "public", table: "notificaciones" }, 
        (payload) => {
          const newNotif = payload.new as Notificacion;
          // Validar destinatario si no es admin
          if (perfil.rol === "admin" || newNotif.destinatario_id === perfil.id) {
            setNotificaciones(prev => [newNotif, ...prev.slice(0, 9)]);
            // Alertar con un sonido o notificación nativa del navegador opcional
            if (Notification.permission === "granted") {
              new Notification("Nueva asignación logística", {
                body: newNotif.mensaje || "Tienes una nueva solicitud logística asignada.",
              });
            }
          }
        }
      )
      .subscribe();

    // Solicitar permiso de notificación
    if (typeof window !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(ch);
    };
  }, [perfil]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const marcarLeidas = async () => {
    if (notificaciones.length === 0) return;
    const ids = notificaciones.map(n => n.id);
    await supabase
      .from("notificaciones")
      .update({ estado: "leida" })
      .in("id", ids);
    setNotificaciones(prev => prev.map(n => ({ ...n, estado: "leida" })));
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Cargando entorno logístico...</p>
      </div>
    );
  }

  if (!session || !perfil) {
    return (
      <div style={styles.loadingScreen}>
        <ShieldAlert size={48} color="var(--emergency)" />
        <h2 style={{ marginTop: "16px", color: "var(--text)" }}>Acceso Denegado</h2>
        <p style={{ color: "var(--text-muted)" }}>No tiene sesión activa o perfil configurado.</p>
        <button onClick={handleLogout} style={styles.btnReingresar}>
          Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  // Generar items de menú según rol
  const getNavItems = () => {
    if (perfil.rol === "admin") {
      return [
        { label: "Cola de Validación", href: "/operaciones/cola", icon: <ClipboardCheck size={18} /> },
        { label: "Tablero Despacho", href: "/operaciones/despacho", icon: <Truck size={18} /> },
        { label: "Reglas Ruteo", href: "/operaciones/reglas", icon: <Sliders size={18} /> },
        { label: "Recursos y Fichas", href: "/operaciones/recursos", icon: <Briefcase size={18} /> },
        { label: "Historial Auditoría", href: "/operaciones/auditoria", icon: <History size={18} /> },
      ];
    } else if (perfil.rol === "transportista") {
      return [
        { label: "Mis Viajes", href: "/operaciones/mis-viajes", icon: <Truck size={18} /> },
      ];
    } else if (perfil.rol === "medico") {
      return [
        { label: "Mis Solicitudes", href: "/operaciones/mis-solicitudes", icon: <Stethoscope size={18} /> },
      ];
    } else if (perfil.rol === "acopio") {
      return [
        { label: "Mi Almacén e Inventario", href: "/operaciones/mi-acopio", icon: <Package size={18} /> },
      ];
    }
    return [];
  };

  const navItems = getNavItems();
  const unreadCount = notificaciones.filter(n => n.estado === "pendiente").length;

  return (
    <OperationsAuthContext.Provider value={{ session, perfil, loading, actualizarPerfil: () => cargarPerfil(session.user.id) }}>
      <div className="ops-wrapper">
        {/* Banner admin */}
        {perfil.rol === "admin" && (
          <div style={styles.adminBanner}>
            <AlertCircle size={16} />
            <span>Ningún ticket notifica hacia afuera hasta que lo apruebes en la cola.</span>
          </div>
        )}

        <header style={styles.header}>
          <div style={styles.headerBrand}>
            <button className="ops-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={styles.logo}>🛡️</div>
            <div>
              <h1 style={styles.headerTitle}>Rescate VE</h1>
              <p style={styles.headerRole}>
                {perfil.rol === "admin" ? "Consola Operaciones (Admin)" : `Consola ${perfil.rol}`}
              </p>
            </div>
          </div>

          <div style={styles.headerActions}>
            {/* Campana de Notificaciones */}
            <div style={{ position: "relative" }}>
              <button 
                style={styles.actionBtn} 
                onClick={() => {
                  setShowNotifPanel(!showNotifPanel);
                  if (!showNotifPanel) marcarLeidas();
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
              </button>

              {showNotifPanel && (
                <div style={styles.notifDropdown}>
                  <div style={styles.notifHeader}>
                    <span>Notificaciones Recientes</span>
                    <button style={styles.closeNotifBtn} onClick={() => setShowNotifPanel(false)}><X size={14} /></button>
                  </div>
                  <div style={styles.notifList}>
                    {notificaciones.length === 0 ? (
                      <p style={styles.emptyNotif}>Sin notificaciones</p>
                    ) : (
                      notificaciones.map((n) => (
                        <div key={n.id} style={{
                          ...styles.notifItem,
                          backgroundColor: n.estado === "pendiente" ? "var(--brand-soft)" : "transparent"
                        }}>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>Nueva asignación</p>
                          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                            Revisa tu consola de trabajo para aceptar el ticket.
                          </p>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                            {new Date(n.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.profileBadge}>
              <User size={16} />
              <span style={styles.profileName}>{perfil.nombre || session.user.email}</span>
            </div>

            <button onClick={handleLogout} style={styles.logoutBtn} title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="ops-container">
          {/* Sidebar */}
          <aside className={`ops-sidebar ${menuOpen ? "open" : ""}`}>
            <nav style={styles.nav}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      ...styles.navLink,
                      backgroundColor: isActive ? "var(--brand-soft)" : "transparent",
                      color: isActive ? "var(--brand)" : "var(--text)",
                      fontWeight: isActive ? 700 : 500
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="ops-main">
            {children}
          </main>
        </div>
      </div>
    </OperationsAuthContext.Provider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "var(--bg)",
    fontFamily: "var(--font)",
  },
  adminBanner: {
    background: "var(--warning)",
    color: "#fff",
    padding: "6px var(--s4)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--s2)",
    zIndex: 1100,
  },
  header: {
    height: "var(--header-h)",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    padding: "0 var(--s4)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    justifyContent: "space-between",
  },
  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s2)",
  },
  menuToggle: {
    display: "none", // Se puede habilitar en mobile
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text)",
  },
  logo: {
    fontSize: "24px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "var(--text-md)",
    fontWeight: 800,
    color: "var(--brand)",
    lineHeight: 1.1,
  },
  headerRole: {
    margin: 0,
    fontSize: "11px",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s3)",
  },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    padding: "var(--s1)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "36px",
    height: "36px",
  },
  badge: {
    position: "absolute",
    top: "2px",
    right: "2px",
    background: "var(--emergency)",
    color: "#fff",
    fontSize: "9px",
    fontWeight: 800,
    borderRadius: "50%",
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDropdown: {
    position: "absolute",
    top: "44px",
    right: 0,
    width: "280px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    boxShadow: "var(--shadow-lg)",
    zIndex: 1050,
  },
  notifHeader: {
    padding: "var(--s2) var(--s3)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: 600,
    fontSize: "var(--text-xs)",
  },
  closeNotifBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  notifList: {
    maxHeight: "300px",
    overflowY: "auto",
  },
  notifItem: {
    padding: "var(--s2) var(--s3)",
    borderBottom: "1px solid var(--border)",
  },
  emptyNotif: {
    margin: 0,
    padding: "var(--s4)",
    textAlign: "center",
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  },
  profileBadge: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s1)",
    background: "var(--surface-2)",
    padding: "6px var(--s3)",
    borderRadius: "var(--radius-pill)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text)",
  },
  profileName: {
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--emergency)",
    padding: "var(--s1)",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
  },
  container: {
    display: "flex",
    flex: 1,
    height: "calc(100vh - var(--header-h))",
    overflow: "hidden",
  },
  sidebar: {
    width: "240px",
    background: "var(--surface)",
    borderRight: "1px solid var(--border)",
    padding: "var(--s3) 0",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    // En pantallas grandes se mantiene estático, se maneja responsive por layout
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "0 var(--s2)",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "var(--s3)",
    padding: "var(--s3) var(--s4)",
    borderRadius: "var(--radius-sm)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    transition: "all var(--transition)",
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "var(--s4)",
    position: "relative",
  },
  loadingScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--bg)",
    fontFamily: "var(--font)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid var(--border)",
    borderTop: "4px solid var(--brand)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "var(--s4)",
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    fontWeight: 600,
  },
  btnReingresar: {
    marginTop: "20px",
    padding: "10px 20px",
    background: "var(--brand)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
  }
};
