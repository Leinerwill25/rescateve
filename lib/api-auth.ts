import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: perfil } = await getSupabaseAdmin()
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, perfil, token };
}

export async function requireAdmin(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth?.perfil || auth.perfil.rol !== "admin") return null;
  return auth;
}

export async function requireTransportista(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth?.perfil || auth.perfil.rol !== "transportista") return null;
  return auth;
}
