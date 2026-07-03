import { isAdminApiRequest as isAdminFromAuth } from "@/lib/auth-api";

export async function isAdminApiRequest(req: Request): Promise<boolean> {
  return isAdminFromAuth(req);
}