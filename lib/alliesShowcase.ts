import type { LucideIcon } from "lucide-react";
import { Bus, HeartHandshake, Stethoscope, Wrench } from "lucide-react";

export type AllyShowcaseSlide = {
  id: string;
  name: string;
  kicker: string;
  title: string;
  description: string;
  /** Texto de aporte / beneficio (fase 1: En La Parada) */
  benefit?: string;
  category: "transporte" | "salud";
  featured?: boolean;
  bgImage: string;
  cardImage: string;
  imagePosition?: string;
  href?: string;
  host?: string;
  logo?: string;
  icon?: LucideIcon;
  stats?: { value: string; label: string }[];
  /** Si false, el aliado se muestra como próximo pero no es seleccionable */
  available?: boolean;
};

export const EN_LA_PARADA_URL = "https://en-la-parada-landing.lovable.app/";
export const DONA_VENEZUELA_URL = "https://donavenezuela.com";

export const ALLY_SHOWCASE_SLIDES: AllyShowcaseSlide[] = [
  {
    id: "en-la-parada",
    name: "En La Parada",
    kicker: "Aliado principal · Transporte urbano · Venezuela",
    title: "En La Parada",
    description:
      "Startup venezolana que digitaliza el pago del transporte público: pasajes por app, rutas en tiempo real y cobro sin efectivo en camioneticas y buses aliados a nivel nacional.",
    benefit:
      "Después del terremoto, miles de familias se quedaron sin hogar y necesitan moverse para reconstruir su vida. Por eso nos integramos con DonaVenezuela.com para ayudar a las personas damnificadas y refugiadas: les donamos un pasaje por nuestra app cada vez que se trasladan al trabajo o regresan a su refugio.",
    category: "transporte",
    featured: true,
    available: true,
    bgImage: "/Camionetas-transporte.jpg",
    cardImage: "/Camionetas-transporte.jpg",
    href: EN_LA_PARADA_URL,
    host: "en-la-parada.app",
    logo: "/FC-Logo-En-la-parada.png",
    icon: Bus,
    stats: [
      { value: "+30 mil", label: "usuarios" },
      { value: "+2 mil", label: "buses aliados" },
      { value: "+40 mil", label: "pasajes" },
    ],
  },
  {
    id: "nueve-once",
    name: "Nueve Once",
    kicker: "Transporte · Rutas urbanas",
    title: "Nueve Once",
    description:
      "Transporte de pasajeros y rutas urbanas integradas a la red logística de Rescate VE.",
    category: "transporte",
    available: false,
    bgImage: "/pexels-chuck-15812417.jpg",
    cardImage: "/pexels-chuck-15812417.jpg",
    logo: "/logo-nueveonce.png",
    href: "https://nueveonce.com",
    host: "nueveonce.com",
  },
  {
    id: "tu-gruero",
    name: "Tu Gruero",
    kicker: "Transporte · Carretera",
    title: "Tu Gruero",
    description:
      "Grúas y rescate vehicular en carretera para mover equipos y unidades cuando la ruta lo exige.",
    category: "transporte",
    available: false,
    bgImage: "/pexels-firman-marek_brew-2148918143-37498790.jpg",
    cardImage: "/pexels-firman-marek_brew-2148918143-37498790.jpg",
    imagePosition: "center bottom",
    logo: "/logo-tu-gruero.png",
    href: "https://tugruero.com",
    host: "tugruero.com",
  },
  {
    id: "tilin",
    name: "Tilín",
    kicker: "Transporte · Soporte en campo",
    title: "Tilín",
    description:
      "Soporte técnico y logística en campo para mantener operativa la red de traslados.",
    category: "transporte",
    available: false,
    bgImage: "/pexels-gene-samit-546626702-18772899.jpg",
    cardImage: "/pexels-gene-samit-546626702-18772899.jpg",
    icon: Wrench,
    href: "https://tilinapp.com",
    host: "tilinapp.com",
  },
  {
    id: "ayuda-en-camino",
    name: "Ayuda en Camino",
    kicker: "Salud · Coordinación humanitaria",
    title: "Ayuda en Camino",
    description:
      "Coordinación de ayuda humanitaria y necesidades por zona, conectada con la cola de validación.",
    category: "salud",
    available: false,
    bgImage: "/pexels-faruktokluoglu-16105747.jpg",
    cardImage: "/pexels-faruktokluoglu-16105747.jpg",
    icon: HeartHandshake,
    href: "https://ayudaencamino.com/necesidades?utm_source=ig&utm_medium=social&utm_content=link_in_bio",
    host: "ayudaencamino.com",
  },
  {
    id: "safecare",
    name: "SafeCare",
    kicker: "Salud · Personal verificado",
    title: "SafeCare",
    description:
      "Personal médico verificado y roster clínico para traslados y apoyo en puntos de necesidad.",
    category: "salud",
    available: false,
    bgImage: "/pexels-samimibirfotografci-319596948-15533288.jpg",
    cardImage: "/pexels-samimibirfotografci-319596948-15533288.jpg",
    icon: Stethoscope,
  },
];

export const ALLY_SHOWCASE_MS = 8000;
