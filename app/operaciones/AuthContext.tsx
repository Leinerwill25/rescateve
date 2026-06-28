import { createContext, useContext } from "react";
import { Perfil } from "@/lib/types-operations";

export type AuthContextType = {
  session: any;
  perfil: Perfil | null;
  loading: boolean;
  actualizarPerfil: () => Promise<void>;
};

export const OperationsAuthContext = createContext<AuthContextType>({
  session: null,
  perfil: null,
  loading: true,
  actualizarPerfil: async () => {},
});

export function useOperationsAuth() {
  return useContext(OperationsAuthContext);
}
