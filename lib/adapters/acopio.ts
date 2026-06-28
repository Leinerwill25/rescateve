import { supabase } from "@/lib/supabase";

/**
 * Adaptador para interactuar con APIs externas de centros de acopio.
 * Permite simular y sincronizar inventarios iniciales en los centros de acopio.
 */
export async function syncInventarioConAPI(centroId: string) {
  const mockItems = [
    { item: "Agua Mineral", cantidad: 150, unidad: "Botellas 1.5L" },
    { item: "Gasas estériles", cantidad: 80, unidad: "Paquetes" },
    { item: "Acetaminofén 500mg", cantidad: 300, unidad: "Tabletas" },
    { item: "Pañales de Bebé G", cantidad: 50, unidad: "Paquetes" },
    { item: "Fórmula infantil", cantidad: 20, unidad: "Latas" },
    { item: "Cobijas térmicas", cantidad: 35, unidad: "Unidades" },
    { item: "Alcohol antiséptico", cantidad: 45, unidad: "Frascos 500ml" },
  ];

  let sincronizados = 0;
  for (const mock of mockItems) {
    const { data: existente } = await supabase
      .from("inventario_acopio")
      .select("id, cantidad")
      .eq("centro_id", centroId)
      .eq("item", mock.item)
      .maybeSingle();

    if (!existente) {
      const { error } = await supabase.from("inventario_acopio").insert({
        centro_id: centroId,
        item: mock.item,
        cantidad: mock.cantidad,
        unidad: mock.unidad,
        actualizado_at: new Date().toISOString(),
      });
      if (!error) sincronizados++;
    } else {
      // Si ya existe, podemos actualizar la cantidad opcionalmente
      const { error } = await supabase
        .from("inventario_acopio")
        .update({
          cantidad: mock.cantidad,
          actualizado_at: new Date().toISOString(),
        })
        .eq("id", existente.id);
      if (!error) sincronizados++;
    }
  }

  return { success: true, count: sincronizados };
}
