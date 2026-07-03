/** Headers para la API pública de Ayuda en Camino (requiere API key desde jul 2026). */
export function headersAyudaEnCamino(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "RescateVE-Ingestion-Bot/1.0 (+https://rescate-ve.vercel.app; contacto@rescateve.org)",
    Accept: "application/json",
  };
  const apiKey = process.env.AYUDA_EN_CAMINO_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export const AYUDA_EN_CAMINO_NEEDS_URL = "https://ayudaencamino.com/api/needs";
