import { supabase } from "@/lib/supabase";

/**
 * Adaptador para interactuar con la API de SafeCare.
 * Simula la sincronización y validación del personal médico
 * en el roster logístico local con el estado verificado.
 */
export async function syncMedicosSafeCare() {
  const mockMedicos = [
    { nombre: "Dra. Elena Silva", especialidad: "Pediatría", zona: "Chacao", contacto: "0414-1112233" },
    { nombre: "Dr. Marcos Rangel", especialidad: "Traumatología / Emergenciólogo", zona: "Baruta", contacto: "0412-2223344" },
    { nombre: "Dra. Claudia Pérez", especialidad: "Medicina General", zona: "Sucre", contacto: "0416-3334455" },
    { nombre: "Dr. Roberto Méndez", especialidad: "Cardiología", zona: "Libertador", contacto: "0424-4445566" },
  ];

  let sincronizados = 0;
  for (const medico of mockMedicos) {
    const { data: existente } = await supabase
      .from("personal_medico")
      .select("id")
      .eq("nombre", medico.nombre)
      .maybeSingle();

    if (!existente) {
      const { error } = await supabase.from("personal_medico").insert({
        nombre: medico.nombre,
        especialidad: medico.especialidad,
        zona: medico.zona,
        contacto: medico.contacto,
        verificado: true,
        disponible: true,
        activo: true,
      });
      if (!error) sincronizados++;
    } else {
      // Si existe, garantizamos que quede marcado como verificado por SafeCare
      const { error } = await supabase
        .from("personal_medico")
        .update({
          verificado: true,
          especialidad: medico.especialidad,
          zona: medico.zona,
          contacto: medico.contacto,
        })
        .eq("id", existente.id);
      if (!error) sincronizados++;
    }
  }

  return { success: true, count: sincronizados };
}
