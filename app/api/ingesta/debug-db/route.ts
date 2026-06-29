import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("tickets").select("id, fuente, estado, estado_externo").eq("fuente", "ayuda_en_camino").limit(500);
  
  const { count: countTotal } = await supabase.from("tickets").select("*", { count: "exact", head: true }).eq("fuente", "ayuda_en_camino");
  const { count: countVal } = await supabase.from("tickets").select("*", { count: "exact", head: true }).eq("fuente", "ayuda_en_camino").eq("estado", "en_validacion");
  
  return NextResponse.json({ 
    total: countTotal, 
    en_validacion: countVal, 
    error: error ? error.message : null,
    sample: data ? data.slice(0, 5) : []
  });
}
