/** Normaliza texto para correo ficticio @colaborador.com */
export function normalizarParaEmail(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function generarEmailColaborador(nombre: string, apellido: string, cedula?: string): string {
  const base = normalizarParaEmail(nombre) + normalizarParaEmail(apellido);
  const sufijo = cedula ? normalizarParaEmail(cedula).slice(-4) : "";
  const local = (base || "colaborador") + (sufijo && base.length < 4 ? sufijo : "");
  return `${local}@colaborador.com`;
}

export function normalizarCedula(cedula: string): string {
  return cedula.trim().toUpperCase().replace(/[\s-]/g, "");
}
