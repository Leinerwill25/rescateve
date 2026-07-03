/** URL pública de necesidades en Ayuda en Camino. */
export const AEC_NEEDS_URL = "https://ayudaencamino.com/api/needs";

/**
 * Clave pública embebida en el bundle del sitio (header `x-site-key`).
 * Sin ella, el backend responde 401 a peticiones server-side.
 */
const DEFAULT_AEC_SITE_KEY =
  "5699fbbdf439677b8825e84d826742eb82211d5c3f4491a7";

export function getAecApiHeaders(): Record<string, string> {
  return {
    "x-site-key": process.env.AYUDA_EN_CAMINO_SITE_KEY || DEFAULT_AEC_SITE_KEY,
    Accept: "application/json",
  };
}
