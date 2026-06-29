import { supabase } from "@/lib/supabase";

export type NecesidadExterna = {
  fuente_id: string;
  descripcion: string;
  categoria_externa?: string | null;
  ubicacion_externa?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  contacto?: string | null;       // dato sensible, uso interno
  estado_externo: "pendiente" | "cubierta";
  fuente_url: string;
};

/**
 * ObtenerNecesidades conecta con el backend de Ayuda en Camino
 * y normaliza el payload al formato estándar NecesidadExterna.
 */
export async function obtenerNecesidades(): Promise<NecesidadExterna[]> {
  const url = "https://ayudaencamino.com/api/needs";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RescateVE-Ingestion-Bot/1.0 (+https://rescate-ve.vercel.app; contacto@rescateve.org)"
      }
    });

    if (!res.ok) {
      throw new Error(`Error HTTP al consultar Ayuda en Camino: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("La respuesta de la API no es un arreglo de necesidades válido.");
    }

    return data.map((item: any) => {
      const orgName = item.organizacion?.nombre || "Organización Desconocida";
      const orgState = item.organizacion?.estado || "";
      const orgCity = item.organizacion?.ciudad || "";
      const orgAddress = item.organizacion?.direccion || "";
      const itemDesc = item.descripcion || "";

      // Generar descripción rica detallando el insumo solicitado y el centro
      const descripcionRica = `[Artículo: ${item.nombreArticulo}] Cantidad: ${item.cantidadNecesaria}. ${itemDesc ? `Detalle: ${itemDesc}. ` : ""}Organización: ${orgName}`;

      // Normalizar la ubicación externa
      const ubicacion = `${orgCity ? `${orgCity}, ` : ""}${orgState ? `${orgState}. ` : ""}${orgAddress ? `Dir: ${orgAddress}` : ""}`;

      // Extraer contacto telefónico o correo
      const contacto = item.organizacion?.contactoTelefono || item.organizacion?.contactoEmail || null;

      // Evaluar si la necesidad ya fue satisfecha en el origen
      const estadoExterno: "pendiente" | "cubierta" = 
        (item.status === "cumplida" || item.cantidadCumplida >= item.cantidadNecesaria) 
          ? "cubierta" 
          : "pendiente";

      return {
        fuente_id: item.id.toString(),
        descripcion: descripcionRica,
        categoria_externa: item.categoria || null,
        ubicacion_externa: ubicacion || null,
        latitud: null, 
        longitud: null,
        contacto: contacto,
        estado_externo: estadoExterno,
        fuente_url: `https://ayudaencamino.com/necesidades/${item.id}`
      };
    });
  } catch (err: any) {
    console.error("Error al obtener necesidades de Ayuda en Camino:", err.message);
    throw err;
  }
}

/**
 * runIngestaAyudaEnCamino ejecuta un ciclo completo de ingesta.
 * Importa nuevos registros como tickets de validación y actualiza
 * el estado externo de los tickets ya capturados.
 */
export async function runIngestaAyudaEnCamino() {
  let nuevos = 0;
  let actualizados = 0;
  let cubiertos = 0;

  try {
    const necesidades = await obtenerNecesidades();

    for (const nec of necesidades) {
      // Consultar si el ticket de esta fuente ya existe localmente
      const { data: ticket, error: fetchErr } = await supabase
        .from("tickets")
        .select("id, estado, estado_externo, transporte_id, medico_id, centro_acopio_id")
        .eq("fuente", "ayuda_en_camino")
        .eq("fuente_id", nec.fuente_id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (!ticket) {
        // A. TICKET NUEVO -> Insertar en tickets para Cola de Validación
        const { error: insErr } = await supabase.from("tickets").insert({
          fuente: "ayuda_en_camino",
          fuente_id: nec.fuente_id,
          descripcion: nec.descripcion,
          contacto_solicitante: nec.contacto,
          categoria_externa: nec.categoria_externa,
          ubicacion_externa: nec.ubicacion_externa,
          estado_externo: nec.estado_externo,
          fuente_url: nec.fuente_url,
          capturado_at: new Date().toISOString(),
          estado: "en_validacion",
          requiere_revision: true
        });

        if (!insErr) {
          nuevos++;
        } else {
          console.error(`Error al registrar nueva necesidad ${nec.fuente_id}:`, insErr.message);
        }
      } else {
        // B. TICKET EXISTENTE -> Sincronizar estado externo y cancelar si no está atendido
        let nuevoEstadoInterno = ticket.estado;
        let notaCierre = "";

        if (nec.estado_externo === "cubierta" && ticket.estado_externo !== "cubierta") {
          cubiertos++;
          
          // Cerrar automáticamente si no está en proceso de despacho activo (sin chofer/médico asignado)
          const estaAtendido = ticket.transporte_id || ticket.medico_id || ticket.centro_acopio_id;
          if (ticket.estado !== "completado" && !estaAtendido) {
            nuevoEstadoInterno = "completado";
            notaCierre = "Cerrado automáticamente: La necesidad fue marcada como cubierta en Ayuda en Camino.";
          }
        }

        const updatePayload: any = {
          estado_externo: nec.estado_externo,
          updated_at: new Date().toISOString()
        };

        if (nuevoEstadoInterno !== ticket.estado) {
          updatePayload.estado = nuevoEstadoInterno;
          if (notaCierre) {
            updatePayload.notas_admin = notaCierre;
          }
        }

        const { error: updErr } = await supabase
          .from("tickets")
          .update(updatePayload)
          .eq("id", ticket.id);

        if (!updErr) {
          actualizados++;
        } else {
          console.error(`Error al actualizar necesidad existente ${nec.fuente_id}:`, updErr.message);
        }
      }
    }

    // Registrar log de corrida exitosa
    await supabase.from("ingesta_log").insert({
      fuente: "ayuda_en_camino",
      nuevos,
      actualizados,
      cubiertos,
      corrida_at: new Date().toISOString()
    });

    return { success: true, nuevos, actualizados, cubiertos };

  } catch (err: any) {
    console.error("Fallo durante la ingesta automática:", err.message);
    
    // Registrar log de corrida fallida
    await supabase.from("ingesta_log").insert({
      fuente: "ayuda_en_camino",
      error: err.message,
      corrida_at: new Date().toISOString()
    });

    throw err;
  }
}

/**
 * pullNecesidades es el adaptador simulado/manual que ejecuta la ingesta
 * desde la vista de administración en tiempo real.
 */
export async function pullNecesidades() {
  try {
    const res = await runIngestaAyudaEnCamino();
    return { success: true, count: res.nuevos };
  } catch (err: any) {
    throw err;
  }
}
