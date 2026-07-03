import type { Ticket } from "@/lib/types-operations";

const TZ_VE = "America/Caracas";

function esTicketAEC(t: Ticket): boolean {
  return t.fuente === "ayuda_en_camino";
}

/** Fecha de creación de referencia: en AEC usa createdAt del origen. */
export function getTicketFechaCreacion(t: Ticket): Date {
  const raw = esTicketAEC(t)
    ? t.aec_created_at || t.capturado_at || t.created_at
    : t.created_at;
  return new Date(raw);
}

export type FiltroFecha = {
  dia: string;
  hora: string;
};

export const FILTRO_FECHA_VACIO: FiltroFecha = { dia: "", hora: "" };

function fechaEnCaracas(iso: string | Date): { dia: string; hora: number } {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const dia = d.toLocaleDateString("en-CA", { timeZone: TZ_VE });
  const hora = Number(
    d.toLocaleString("en-US", { timeZone: TZ_VE, hour: "numeric", hour12: false })
  );
  return { dia, hora };
}

export function ticketCoincideFiltroFecha(t: Ticket, filtro: FiltroFecha): boolean {
  if (!filtro.dia && !filtro.hora) return true;
  const { dia, hora } = fechaEnCaracas(getTicketFechaCreacion(t));
  if (filtro.dia && dia !== filtro.dia) return false;
  if (filtro.hora !== "" && hora !== Number(filtro.hora)) return false;
  return true;
}

/** Formato similar a Ayuda en Camino: "3 jul 2026, 11:19 a. m." */
export function formatFechaTicket(t: Ticket): string {
  return getTicketFechaCreacion(t).toLocaleString("es-VE", {
    timeZone: TZ_VE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function etiquetaFuenteFecha(t: Ticket): string {
  return esTicketAEC(t) && t.aec_created_at ? "Creado en AEC" : "Creado";
}

/** Opciones de hora 0–23 para el filtro. */
export function opcionesHoraFiltro(): { value: string; label: string }[] {
  return Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: `${String(h).padStart(2, "0")}:00`,
  }));
}
