import { createClient } from "@supabase/supabase-js";

export type ApiSession = {
  userId: string;
  rol: string;
  token: string;
  transporteId: string | null;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";
  return { supabaseUrl, supabaseAnonKey };
}

export async function getApiSession(req: Request): Promise<ApiSession | null> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { userId: "cron", rol: "admin", token: cronSecret, transporteId: null };
  }

  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token || (cronSecret && token === cronSecret)) return null;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const supabaseAsUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: perfil } = await supabaseAsUser
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.rol) return null;

  let transporteId: string | null = null;
  if (perfil.rol === "transportista") {
    const { data: tr } = await supabaseAsUser
      .from("transportes")
      .select("id")
      .eq("perfil_id", user.id)
      .eq("activo", true)
      .maybeSingle();
    transporteId = tr?.id ?? null;
  }

  return { userId: user.id, rol: perfil.rol, token, transporteId };
}

export async function isAdminApiRequest(req: Request): Promise<boolean> {
  const session = await getApiSession(req);
  return session?.rol === "admin";
}

export async function isMatchAcopioApiRequest(req: Request): Promise<boolean> {
  const session = await getApiSession(req);
  return session?.rol === "admin" || session?.rol === "transportista";
}
