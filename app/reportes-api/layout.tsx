import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API de reportes",
  description:
    "Acceso externo a reportes operacionales de Rescate VE con clave autorizada y registro de IPs.",
  robots: { index: false, follow: false },
};

export default function ReportesApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
