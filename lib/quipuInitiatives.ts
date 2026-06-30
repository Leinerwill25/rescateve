export type QuipuLink = {
  label: string;
  url: string;
  host: string;
};

export type QuipuInitiative = {
  number: string;
  title: string;
  links: QuipuLink[];
};

export const QUIPU_INTRO =
  "Donavenezuela.com forma parte de la Red Quipu, un esfuerzo colaborativo para conectar reportes, recursos y canales de ayuda en un solo punto de respuesta.";

export const QUIPU_FEATURED = {
  title: "Red Quipu",
  badge: "Principal",
  description:
    "Plataforma para centralizar información verificada, reportes y recursos de la emergencia.",
  url: "https://www.donavenezuela.com/?lang=es",
  host: "donavenezuela.com",
};

export const QUIPU_INITIATIVES: QuipuInitiative[] = [
  {
    number: "01",
    title: "Reporte de personas desaparecidas",
    links: [
      { label: "venezuela reporta", url: "https://venezuelareporta.org", host: "venezuelareporta.org" },
      { label: "venezuela te busca", url: "https://venezuelatebusca.com", host: "venezuelatebusca.com" },
      {
        label: "desaparecidos terremoto venezuela",
        url: "https://desaparecidosterremotovenezuela.com",
        host: "desaparecidosterremotovenezuela.com",
      },
    ],
  },
  {
    number: "02",
    title: "Reporte de daños estructurales",
    links: [
      { label: "terremoto venezuela", url: "https://terremotovenezuela.com", host: "terremotovenezuela.com" },
      { label: "tilin app", url: "https://tilinapp.com", host: "tilinapp.com" },
      { label: "centinela", url: "https://app.appcentinela.com", host: "app.appcentinela.com" },
    ],
  },
  {
    number: "03",
    title: "Apoyo presencial y rescate",
    links: [
      { label: "rescate ve", url: "https://rescate-ve.vercel.app", host: "rescate-ve.vercel.app" },
    ],
  },
  {
    number: "04",
    title: "Ingenieros para inspección de habitabilidad",
    links: [
      { label: "habitable", url: "https://habitable.lovable.app", host: "habitable.lovable.app" },
      { label: "@grupoavila.ve", url: "https://instagram.com/grupoavila.ve", host: "instagram.com" },
      { label: "centinela", url: "https://app.appcentinela.com", host: "app.appcentinela.com" },
    ],
  },
  {
    number: "05",
    title: "Centros de acopio",
    links: [
      { label: "ayuda para venezuela", url: "https://ayudaparavenezuela.com", host: "ayudaparavenezuela.com" },
      { label: "veneconnect", url: "https://veneconnect.com", host: "veneconnect.com" },
      { label: "tu gruero", url: "https://tugruero.com", host: "tugruero.com" },
      { label: "zona segura", url: "https://zonasegura.up.railway.app", host: "zonasegura.up.railway.app" },
    ],
  },
  {
    number: "06",
    title: "Insumos requeridos por zona",
    links: [
      { label: "ayuda para venezuela", url: "https://ayudaparavenezuela.com", host: "ayudaparavenezuela.com" },
    ],
  },
  {
    number: "08",
    title: "Donaciones y redes de pago",
    links: [
      { label: "dona venezuela", url: "https://donavenezuela.com", host: "donavenezuela.com" },
    ],
  },
  {
    number: "09",
    title: "Centros de alimentación",
    links: [
      { label: "refugios venezuela", url: "https://refugiosvenezuela.com", host: "refugiosvenezuela.com" },
    ],
  },
  {
    number: "10",
    title: "Refugios y alojamiento",
    links: [
      { label: "refugios venezuela", url: "https://refugiosvenezuela.com", host: "refugiosvenezuela.com" },
      { label: "zona segura", url: "https://zonasegura.up.railway.app", host: "zonasegura.up.railway.app" },
    ],
  },
  {
    number: "11",
    title: "Pacientes en hospitales",
    links: [
      {
        label: "pacientes terremoto vzla",
        url: "https://pacientesterremotovzla.lovable.app",
        host: "pacientesterremotovzla.lovable.app",
      },
    ],
  },
  {
    number: "12",
    title: "Información de mascotas",
    links: [
      { label: "huellascan", url: "https://huellascan.com", host: "huellascan.com" },
    ],
  },
  {
    number: "13",
    title: "Logística y transporte",
    links: [
      { label: "rescate ve", url: "https://rescate-ve.vercel.app", host: "rescate-ve.vercel.app" },
    ],
  },
  {
    number: "14",
    title: "Apoyo médico y psicológico",
    links: [
      { label: "nueveonce", url: "https://nueveonce.com", host: "nueveonce.com" },
      { label: "venemergencia", url: "https://venemergencia.com", host: "venemergencia.com" },
    ],
  },
];
