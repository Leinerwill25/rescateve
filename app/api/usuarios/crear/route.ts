import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: Request) {
  try {
    const { email, password, nombre, rol, organizacion, telefono } = await req.json();

    const emailNorm = String(email || "").trim().toLowerCase();

    if (!emailNorm || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Faltan datos requeridos (email, password, nombre, rol)." }, { status: 400 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({
        error: "Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios administrados.",
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`[Admin Auth Creator] Registrando usuario: ${emailNorm} (Rol: ${rol})`);

    // Admin API + email_confirm: cuenta activa de inmediato, sin correo de verificación.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol },
    });

    if (authError || !authData.user) {
      throw new Error(`Error en el admin auth de Supabase: ${authError?.message || "No se retornó el usuario creado"}`);
    }

    const userId = authData.user.id;

    if (!authData.user.email_confirmed_at) {
      const { error: confirmErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmErr) {
        throw new Error(`Usuario creado pero no se pudo confirmar el correo: ${confirmErr.message}`);
      }
    }

    const { error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .upsert({
        id: userId,
        nombre,
        rol,
        organizacion: organizacion?.trim() || null,
        telefono: telefono?.trim() || null,
        activo: true,
      });

    if (perfilError) {
      console.warn(`[Admin Auth Creator] Advertencia al sincronizar perfil: ${perfilError.message}`);
    }

    return NextResponse.json({ success: true, userId, email: emailNorm });

  } catch (err: any) {
    console.error("[Admin Auth Creator] ERROR:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
