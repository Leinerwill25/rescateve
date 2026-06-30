import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rescate-ve.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rescate VE — Movemos la ayuda donde hace falta",
    template: "%s · Rescate VE",
  },
  manifest: "/manifest.json",
  description:
    "Plataforma logística de la red Juntos por Venezuela. Coordinamos traslados de insumos, personal médico y apoyo con transportistas verificados tras el terremoto.",
  keywords: ["Venezuela", "terremoto", "logística", "traslados", "ayuda humanitaria", "transporte", "rescate"],
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Rescate VE — Movemos la ayuda donde hace falta",
    description:
      "Coordinamos traslados de insumos y apoyo logístico con transportistas verificados. Parte de la red Juntos por Venezuela.",
    siteName: "Rescate VE",
    locale: "es_VE",
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Rescate VE — Movemos la ayuda donde hace falta",
    description:
      "Traslados de insumos y apoyo logístico con aliados verificados. La ayuda existe; nosotros la movemos.",
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
    <html lang="es" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
