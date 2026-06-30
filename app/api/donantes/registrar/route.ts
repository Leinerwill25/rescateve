import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generarEmailColaborador, normalizarCedula } from "@/lib/donante-email";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: Request) {
  try {
    const { nombre, apellido, telefono, cedula, password } = await req.json();

    const vNombre = String(nombre || "").trim();
    const vApellido = String(apellido || "").trim();
    const vTelefono = String(telefono || "").trim();
    const vCedula = normalizarCedula(String(cedula || ""));
    const vPassword = String(password || "");

    if (vNombre.length < 2 || vApellido.length < 2) {
      return NextResponse.json({ error: "Indica nombre y apellido válidos." }, { status: 400 });
    }
    if (vCedula.length < 6) {
      return NextResponse.json({ error: "Indica una cédula de identidad válida." }, { status: 400 });
    }
    if (vTelefono.length < 7) {
      return NextResponse.json({ error: "Indica un teléfono de contacto válido." }, { status: 400 });
    }
    if (vPassword.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Configuración del servidor incompleta." }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: cedulaExistente } = await supabaseAdmin
      .from("donantes")
      .select("id")
      .eq("cedula", vCedula)
      .maybeSingle();

    if (cedulaExistente) {
      return NextResponse.json({ error: "Esta cédula ya está registrada. Inicia sesión con tu cédula y contraseña." }, { status: 409 });
    }

    let emailLogin = generarEmailColaborador(vNombre, vApellido);
    const nombreCompleto = `${vNombre} ${vApellido}`;

    const crearUsuario = async (email: string) =>
      supabaseAdmin.auth.admin.createUser({
        email,
        password: vPassword,
        email_confirm: true,
        user_metadata: { nombre: nombreCompleto, rol: "donante" },
      });

    let { data: authData, error: authError } = await crearUsuario(emailLogin);

    if (authError?.message?.toLowerCase().includes("already") || authError?.message?.toLowerCase().includes("registered")) {
      emailLogin = generarEmailColaborador(vNombre, vApellido, vCedula);
      ({ data: authData, error: authError } = await crearUsuario(emailLogin));
    }

    if (authError || !authData?.user) {
      throw new Error(authError?.message || "No se pudo crear la cuenta.");
    }

    const userId = authData.user.id;

    if (!authData.user.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
    }

    const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert({
      id: userId,
      nombre: nombreCompleto,
      rol: "donante",
      telefono: vTelefono,
      activo: true,
    });

    if (perfilError) {
      throw new Error(`Cuenta creada pero falló el perfil: ${perfilError.message}`);
    }

    const { error: donanteError } = await supabaseAdmin.from("donantes").insert({
      perfil_id: userId,
      nombre: vNombre,
      apellido: vApellido,
      cedula: vCedula,
      telefono: vTelefono,
      email_login: emailLogin,
      activo: true,
    });

    if (donanteError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(donanteError.message || "No se pudo registrar la ficha de donante.");
    }

    return NextResponse.json({
      success: true,
      cedula: vCedula,
      emailLogin,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al registrar donante.";
    console.error("[Donantes Registrar]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
