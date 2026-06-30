import type { Transporte } from "@/lib/types-operations";

export const BANCOS_PAGO_MOVIL = [
  { code: "0102", label: "0102 - Banco de Venezuela" },
  { code: "0105", label: "0105 - Banco Mercantil" },
  { code: "0108", label: "0108 - Banco Provincial (BBVA)" },
  { code: "0134", label: "0134 - Banesco" },
  { code: "0172", label: "0172 - Bancamiga" },
  { code: "0114", label: "0114 - Bancaribe" },
  { code: "0115", label: "0115 - Banco Exterior" },
  { code: "0151", label: "0151 - Fondo Común" },
  { code: "0163", label: "0163 - Banco del Tesoro" },
  { code: "0175", label: "0175 - Banco Bicentenario" },
] as const;

/** Normaliza teléfono venezolano a solo dígitos (sin prefijo 58). */
export function normalizarTelefono(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("58") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

/** Normaliza cédula/RIF a solo dígitos. */
export function normalizarCedula(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function telefonosCoinciden(a: string, b: string): boolean {
  const na = normalizarTelefono(a);
  const nb = normalizarTelefono(b);
  if (!na || !nb || na.length < 10) return false;
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

export function cedulasCoinciden(a: string, b: string): boolean {
  const na = normalizarCedula(a);
  const nb = normalizarCedula(b);
  if (!na || !nb || na.length < 6) return false;
  return na === nb;
}

export type DatosConductor = {
  telefonoPerfil?: string | null;
  telefonoTransporte?: string | null;
  cedulaTransporte?: string | null;
};

/** Rechaza si el Pago Móvil de la gasolinera coincide con datos del conductor. */
export function esPagoPropioConductor(
  telefonoGasolinera: string,
  cedulaGasolinera: string,
  conductor: DatosConductor
): { bloqueado: boolean; motivo?: string } {
  const telConductor = conductor.telefonoTransporte || conductor.telefonoPerfil;
  if (telConductor && telefonosCoinciden(telefonoGasolinera, telConductor)) {
    return {
      bloqueado: true,
      motivo:
        "El teléfono ingresado coincide con el del transportista. Debe usar el Pago Móvil de la gasolinera, no el suyo.",
    };
  }

  if (conductor.cedulaTransporte && cedulasCoinciden(cedulaGasolinera, conductor.cedulaTransporte)) {
    return {
      bloqueado: true,
      motivo:
        "La cédula ingresada coincide con la del transportista. Debe usar los datos de la gasolinera.",
    };
  }

  return { bloqueado: false };
}

export function tipoVehiculoDesdeTransporte(t: Transporte): "moto" | "carro" | "autobus" {
  const m = (t.modelo || "").toUpperCase();
  if (m.includes("MOTO") || m.includes("SCOOTER")) return "moto";
  if (m.includes("BUS") || m.includes("MINIBUS") || m.includes("ENCAVA")) return "autobus";
  if (t.tipo === "pasajeros") return "autobus";
  return "carro";
}

export function limiteLitros(tipo: "moto" | "carro" | "autobus"): number {
  if (tipo === "moto") return 40;
  if (tipo === "autobus") return 120;
  return 60;
}

export function costoEstimadoUSD(litros: number): number {
  return litros * 0.5;
}
