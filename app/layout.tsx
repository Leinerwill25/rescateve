import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rescate VE — Mapa de emergencia",
  manifest: "/manifest.json",
  description:
    "Mapa colaborativo para reportar lugares que necesitan rescate y personas desaparecidas tras el terremoto en Venezuela.",
  openGraph: {
    title: "Rescate VE — Mapa de emergencia",
    description: "Mapa colaborativo para reportar emergencias, refugios, centros de acopio y buscar personas desaparecidas en Venezuela.",
    siteName: "Rescate VE",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rescate VE — Mapa de emergencia",
    description: "Mapa colaborativo para reportar emergencias y buscar personas desaparecidas en Venezuela.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
