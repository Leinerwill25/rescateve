import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireTransportista } from "@/lib/api-auth";
import {
  esPagoPropioConductor,
  limiteLitros,
  tipoVehiculoDesdeTransporte,
} from "@/lib/combustible-utils";
import type { Transporte } from "@/lib/types-operations";

export async function POST(req: Request) {
  try {
    const auth = await requireTransportista(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      ticketId,
      nombre,
      apellido,
      cedula,
      telefono,
      banco,
      litros,
      marca,
    } = body;

    if (!ticketId || !nombre || !apellido || !cedula || !telefono || !banco || !litros) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const litrosNum = parseFloat(String(litros));
    if (isNaN(litrosNum) || litrosNum <= 0) {
      return NextResponse.json({ error: "Litros inválidos." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: transporte, error: errTr } = await admin
      .from("transportes")
      .select("*")
      .eq("perfil_id", auth.user.id)
      .maybeSingle();

    if (errTr || !transporte) {
      return NextResponse.json({ error: "No tiene ficha de transporte vinculada." }, { status: 403 });
    }

    const tr = transporte as Transporte & { cedula?: string | null };

    const { data: ticket, error: errTk } = await admin
      .from("tickets")
      .select("id, estado, transporte_id, descripcion")
      .eq("id", ticketId)
      .maybeSingle();

    if (errTk || !ticket) {
      return NextResponse.json({ error: "Viaje no encontrado." }, { status: 404 });
    }

    if (ticket.transporte_id !== tr.id) {
      return NextResponse.json({ error: "Este viaje no está asignado a su vehículo." }, { status: 403 });
    }

    if (!["aceptado", "en_camino"].includes(ticket.estado)) {
      return NextResponse.json({
        error: "Solo puede solicitar combustible después de aceptar el viaje.",
      }, { status: 400 });
    }

    const bloqueo = esPagoPropioConductor(telefono, cedula, {
      telefonoPerfil: auth.perfil.telefono,
      telefonoTransporte: tr.contacto,
      cedulaTransporte: tr.cedula,
    });

    if (bloqueo.bloqueado) {
      return NextResponse.json({ error: bloqueo.motivo }, { status: 400 });
    }

    const { data: pendienteExistente } = await admin
      .from("solicitudes_gasolina")
      .select("id")
      .eq("ticket_id", ticketId)
      .in("estado", ["pendiente", "pendiente_autorizacion"])
      .maybeSingle();

    if (pendienteExistente) {
      return NextResponse.json({
        error: "Ya existe una solicitud de combustible pendiente para este viaje.",
      }, { status: 400 });
    }

    const tipoVehiculo = tipoVehiculoDesdeTransporte(tr);
    const limit = limiteLitros(tipoVehiculo);

    const { data: previas } = await admin
      .from("solicitudes_gasolina")
      .select("litros")
      .eq("cedula", String(cedula).trim())
      .neq("estado", "rechazado");

    const acumulado = (previas || []).reduce((acc, r) => acc + (parseFloat(String(r.litros)) || 0), 0);
    const targetEstado = acumulado + litrosNum > limit ? "pendiente_autorizacion" : "pendiente";

    const placa = tr.placa || "S/D";
    const modelo = tr.modelo || tr.nombre;
    const motivo = `Combustible viaje operativo #${ticketId.slice(0, 8)}: ${ticket.descripcion || ""}`;

    const { data: inserted, error: errIns } = await admin
      .from("solicitudes_gasolina")
      .insert({
        nombre: String(nombre).trim(),
        apellido: String(apellido).trim(),
        cedula: String(cedula).trim(),
        telefono: String(telefono).trim(),
        banco: String(banco).trim(),
        placa,
        marca: marca?.trim() || tr.nombre,
        modelo,
        motivo,
        litros: litrosNum,
        tipo_vehiculo: tipoVehiculo,
        ticket_id: ticketId,
        transporte_id: tr.id,
        solicitante_perfil_id: auth.user.id,
        origen: "transportista",
        estado: targetEstado,
      })
      .select("id, estado")
      .single();

    if (errIns) throw errIns;

    return NextResponse.json({
      success: true,
      id: inserted.id,
      estado: inserted.estado,
      requiereAutorizacion: targetEstado === "pendiente_autorizacion",
    });
  } catch (err: any) {
    console.error("[Combustible Solicitar]", err.message);
    return NextResponse.json({ error: err.message || "Error interno." }, { status: 500 });
  }
}
