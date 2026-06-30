import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: Request) {
  try {
    const { email, password, nombre, rol, organizacion, telefono } = await req.json();

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Faltan datos requeridos (email, password, nombre, rol)." }, { status: 400 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ 
        error: "Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios administrados." 
      }, { status: 500 });
    }

    // Inicializar Supabase con Service Role Key para privilegios administrativos (creación de usuarios Auth)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`[Admin Auth Creator] Intentando registrar usuario auth para: ${email} (Rol: ${rol})`);

    // 1. Crear el usuario en la autenticación de Supabase (auth.users)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar cuenta inmediatamente
      user_metadata: {
        nombre,
        rol
      }
    });

    if (authError || !authData.user) {
      throw new Error(`Error en el admin auth de Supabase: ${authError?.message || "No se retornó el usuario creado"}`);
    }

    const userId = authData.user.id;
    console.log(`[Admin Auth Creator] Usuario creado con éxito. UUID: ${userId}`);

    // 2. Asegurarse de que el perfil en public.perfiles tenga los datos correctos
    // (Por si el trigger no se ha disparado o no tiene permisos de replicación instantánea)
    const { error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .upsert({
        id: userId,
        nombre,
        rol,
        organizacion: organizacion?.trim() || null,
        telefono: telefono?.trim() || null,
        activo: true
      });

    if (perfilError) {
      console.warn(`[Admin Auth Creator] Advertencia al sincronizar perfil en la tabla perfiles: ${perfilError.message}`);
    }

    return NextResponse.json({ success: true, userId });

  } catch (err: any) {
    console.error("[Admin Auth Creator] ERROR:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
