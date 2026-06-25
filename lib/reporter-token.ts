const TOKEN_KEY = "rescate_ve_reporter_token";

/** Lee el token del localStorage, generándolo si no existe */
export function getReporterToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}
