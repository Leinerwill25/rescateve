import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/api-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const muneyToken = process.env.MUNEY_API_TOKEN || "";

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "No autorizado. Solo administradores pueden procesar pagos." }, { status: 401 });
  }

  // Inicializar supabase client localmente para esta petición
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Cuerpo de petición inválido." }, { status: 400 });
  }

  const { solicitudId } = body;
  if (!solicitudId) {
    return NextResponse.json({ error: "Falta el ID de la solicitud." }, { status: 400 });
  }

  try {
    // 1. Obtener los detalles de la solicitud de gasolina
    const { data: sol, error: errFetch } = await supabase
      .from("solicitudes_gasolina")
      .select("*")
      .eq("id", solicitudId)
      .single();

    if (errFetch || !sol) {
      return NextResponse.json({ error: "Solicitud no encontrada en base de datos." }, { status: 404 });
    }

    if (sol.estado === "suministrado" || sol.payout_status === "exitoso") {
      return NextResponse.json({ error: "Esta solicitud ya ha sido liquidada exitosamente." }, { status: 400 });
    }

    const amountUSD = parseFloat(sol.litros) * 0.5;
    if (isNaN(amountUSD) || amountUSD <= 0) {
      return NextResponse.json({ error: "La cantidad de litros no genera un monto válido." }, { status: 400 });
    }

    console.log(`[Muney API Payout] Iniciando proceso de Pago Móvil para ${sol.litros} litros ($${amountUSD} USD)`);

    // PASO 1: Cotización (Quote)
    const quoteRes = await fetch("https://devapi.muney.cc/orders/quote/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${muneyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currency: "USD",
        country: "VE",
        amount: amountUSD
      })
    });

    if (!quoteRes.ok) {
      const errorText = await quoteRes.text();
      throw new Error(`Fallo en cotización: ${errorText || quoteRes.statusText}`);
    }

    const quoteData = await quoteRes.json();
    const quoteId = quoteData.id;
    console.log("[Muney API Payout] Cotización obtenida:", quoteId);

    // PASO 2: Crear Orden
    const cleanPhone = sol.telefono ? sol.telefono.replace(/[^0-9]/g, "") : "";
    // Muney requiere el número sin el prefijo internacional (sólo código de país en parámetro separado)
    const phoneFormatted = cleanPhone.startsWith("58") 
      ? cleanPhone.slice(2) 
      : cleanPhone.startsWith("0") 
        ? cleanPhone.slice(1) 
        : cleanPhone;

    const orderRes = await fetch("https://devapi.muney.cc/orders/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${muneyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        country_code: "+58",
        mobile: phoneFormatted,
        quote: quoteId
      })
    });

    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      throw new Error(`Fallo al crear orden: ${errorText || orderRes.statusText}`);
    }

    const orderData = await orderRes.json();
    const orderId = orderData.id;
    console.log("[Muney API Payout] Orden creada:", orderId);

    // PASO 3: Confirmar Orden
    const confirmRes = await fetch("https://devapi.muney.cc/orders/confirm/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${muneyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ordersIds: [orderId]
      })
    });

    if (!confirmRes.ok && confirmRes.status !== 204) {
      const errorText = await confirmRes.text();
      throw new Error(`Fallo al confirmar orden: ${errorText || confirmRes.statusText}`);
    }
    console.log("[Muney API Payout] Orden confirmada");

    // PASO 4: Enviar datos de Pago Móvil para Liquidación (Payout)
    const phonePagoMovil = cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}`;
    const cleanCedula = sol.cedula ? sol.cedula.replace(/[^0-9]/g, "") : "";

    const payoutRes = await fetch(`https://devapi.muney.cc/orders/v2/transactions/quote/mobile/info/${quoteId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${muneyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        beneficiaryName: `${sol.nombre} ${sol.apellido}`.trim(),
        idNumberDestino: `V${cleanCedula}`,
        phoneDestino: phonePagoMovil,
        BankAccount: sol.banco || "0102",
        moneda_pago: "USDT",
        currencyType: "VES"
      })
    });

    if (!payoutRes.ok) {
      const errorText = await payoutRes.text();
      throw new Error(`Fallo en transferencia de Pago Móvil: ${errorText || payoutRes.statusText}`);
    }

    const payoutData = await payoutRes.json();
    console.log("[Muney API Payout] Payout liquidado con éxito:", payoutData);

    // Actualizar registro en base de datos como exitoso
    const { error: errUpdate } = await supabase
      .from("solicitudes_gasolina")
      .update({
        estado: "suministrado",
        payout_status: "exitoso",
        order_id: orderId,
        quote_id: quoteId,
        payout_error: null
      })
      .eq("id", solicitudId);

    if (errUpdate) {
      console.error("[Muney API Payout] Error al actualizar registro en base de datos:", errUpdate.message);
    }

    return NextResponse.json({ success: true, payoutData });

  } catch (err: any) {
    console.error("[Muney API Payout] ERROR:", err.message);

    // Registrar fallo en base de datos
    await supabase
      .from("solicitudes_gasolina")
      .update({
        payout_status: "fallido",
        payout_error: err.message
      })
      .eq("id", solicitudId);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
