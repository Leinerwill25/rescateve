export type HeroSlide = {
  id: string;
  image: string;
  alt: string;
  kicker: string;
  title: string;
  subtitle: string;
  /** Ajuste fino de encuadre cuando cover recorta el sujeto principal */
  imagePosition?: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "traslados",
    image: "/pexels-chuck-15812417.jpg",
    alt: "Equipo de rescate coordinando operaciones en terreno",
    kicker: "Logística de emergencia · Venezuela",
    title: "Movemos la ayuda hasta quien aún no la ha recibido",
    subtitle:
      "La red Juntos por Venezuela coordina el último tramo: del acopio a la comunidad que espera.",
  },
  {
    id: "transporte",
    image: "/pexels-doruk-aksel-anil-477355556-15861615.jpg",
    alt: "Vehículo de carga en ruta hacia zona afectada",
    kicker: "Transporte verificado",
    title: "Cada kilómetro cuenta cuando la ayuda no puede esperar",
    subtitle:
      "Transportistas aliados conectan acopios, hospitales y comunidades aisladas con rutas trazadas en tiempo real.",
  },
  {
    id: "acopio",
    image: "/pexels-firman-marek_brew-2148918143-37498790.jpg",
    alt: "Insumos humanitarios organizados en centro de acopio",
    kicker: "Del almacén al destino",
    title: "Los insumos existen; falta quien los lleve",
    subtitle:
      "Medicamentos, alimentos y equipos médicos salen del acopio con trazabilidad y confirmación de entrega.",
    imagePosition: "center bottom",
  },
  {
    id: "comunidad",
    image: "/pexels-juan-sandoval-pacheco-123879743-10625333.jpg",
    alt: "Voluntarios apoyando a familias en comunidad",
    kicker: "Último tramo humano",
    title: "La ayuda llega cuando alguien cierra el circuito",
    subtitle:
      "Coordinamos el eslabón final entre quien dona, quien transporta y quien recibe en el punto de necesidad.",
  },
  {
    id: "red",
    image: "/pexels-faruktokluoglu-16105747.jpg",
    alt: "Red de voluntarios trabajando en conjunto",
    kicker: "Red coordinada",
    title: "Operaciones, médicos y transportistas en una sola plataforma",
    subtitle:
      "Despacho centralizado, validación de casos y seguimiento en vivo para que nada se pierda en el camino.",
  },
  {
    id: "salud",
    image: "/pexels-gene-samit-546626702-18772899.jpg",
    alt: "Personal de salud y suministros médicos en operación",
    kicker: "Apoyo médico y humanitario",
    title: "Personal, medicamentos y equipos donde se necesitan",
    subtitle:
      "Traslados prioritarios para equipos de salud y insumos críticos hacia zonas de mayor demanda.",
  },
  {
    id: "venezuela",
    image: "/pexels-samimibirfotografci-319596948-15533288.jpg",
    alt: "Operación logística de ayuda humanitaria",
    kicker: "Juntos por Venezuela",
    title: "Una red nacional para responder cuando más importa",
    subtitle:
      "Rescate VE es la capa logística de la solidaridad: visible, verificable y abierta a quien quiera sumarse.",
  },
];

export const HERO_CAROUSEL_MS = 6500;
