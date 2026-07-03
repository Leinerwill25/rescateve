import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildTicketPayloads, type AshDraft } from "@/lib/ash-flow";

function getAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
}

export async function insertAshTickets(draft: AshDraft): Promise<{ ids: string[]; count: number }> {
  const payloads = buildTicketPayloads(draft);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (serviceKey) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("tickets").insert(payloads).select("id");
    if (error) throw error;
    const ids = (data || []).map((r) => r.id as string);
    return { ids, count: ids.length };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = getAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Configuración incompleta. Añade NEXT_PUBLIC_SUPABASE_URL y la anon key en .env.local, o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc("registrar_tickets_ash", {
    p_items: payloads,
  });

  if (error) {
    if (error.code === "PGRST202" || error.message?.includes("registrar_tickets_ash")) {
      throw new Error(
        "Ejecute la migración 20260718_ash_registrar_ticket_rpc.sql en Supabase, o configure SUPABASE_SERVICE_ROLE_KEY en .env.local."
      );
    }
    throw new Error(error.message);
  }

  const result = data as { count?: number; ids?: string[] } | null;
  const ids = Array.isArray(result?.ids) ? result!.ids! : [];
  return { ids, count: result?.count ?? ids.length };
}
