import { supabase } from "@/lib/supabase";

/**
 * Adaptador para tirar requerimientos desde Ayuda en Camino.
 * En la versión actual simula los datos externos e inserta
 * los tickets sin duplicarlos en la base de datos local.
 */
export async function pullNecesidades() {
  const simulationData = [
    {
      fuente_id: "aec_001",
      descripcion: "Urgente: Paciente diabético necesita insulina en el sector. Presenta mareos y debilidad.",
      origen_ref: "Urbanización Las Mercedes, Calle Monterrey, Edif Lara, Apto 3B",
      origen_lat: 10.4812,
      origen_lng: -66.8601,
      contacto_solicitante: "0414-9998877",
      cantidad: "3 viales de insulina",
      prioridad: "media",
    },
    {
      fuente_id: "aec_002",
      descripcion: "Se requiere agua mineral, alimentos no perecederos y pañales para 5 bebés en el refugio temporal de Chacao.",
      origen_ref: "Polideportivo Chacao, Av. Principal",
      origen_lat: 10.4901,
      origen_lng: -66.8521,
      contacto_solicitante: "0412-5554433",
      cantidad: "10 botellones de agua, 4 paquetes de pañales G",
      prioridad: "media",
    },
    {
      fuente_id: "aec_003",
      descripcion: "Derrumbe parcial de muro. Hay escombros obstruyendo la vía. Se requiere grúa o maquinaria pesada para despejar el paso.",
      origen_ref: "Carretera Petare-Santa Lucía, Km 4",
      origen_lat: 10.4751,
      origen_lng: -66.7912,
      contacto_solicitante: "0416-2223344",
      cantidad: "1 grúa pesada",
      prioridad: "media",
    },
    {
      fuente_id: "aec_004",
      descripcion: "Emergencia: Persona de la tercera edad con dolor fuerte en el pecho e historial de hipertensión. Requiere traslado o paramédico.",
      origen_ref: "Av. Francisco de Miranda, Edificio Centro, Apto 4A",
      origen_lat: 10.4922,
      origen_lng: -66.8378,
      contacto_solicitante: "0414-3332211",
      cantidad: "Atención médica urgente",
      prioridad: "alta",
    },
  ];

  let creados = 0;
  for (const item of simulationData) {
    const { data: existente } = await supabase
      .from("tickets")
      .select("id")
      .eq("fuente", "ayuda_en_camino")
      .eq("fuente_id", item.fuente_id)
      .maybeSingle();

    if (!existente) {
      const { error } = await supabase.from("tickets").insert({
        fuente: "ayuda_en_camino",
        fuente_id: item.fuente_id,
        descripcion: item.descripcion,
        origen_ref: item.origen_ref,
        origen_lat: item.origen_lat,
        origen_lng: item.origen_lng,
        contacto_solicitante: item.contacto_solicitante,
        cantidad: item.cantidad,
        prioridad: item.prioridad,
        estado: "en_validacion",
      });
      if (!error) {
        creados++;
      } else {
        console.error("Error al importar ticket AEC:", error.message, error.details, error.hint, error.code);
        throw new Error(`Error de Supabase: ${error.message} (${error.code}). Detalles: ${error.details || 'Ninguno'}`);
      }
    }
  }

  return { success: true, count: creados };
}
