import { createClient } from "@supabase/supabase-js";

const supabaseUrlRates = process.env.NEXT_PUBLIC_SUPABASE_URL_RATES || "";
const supabaseAnonKeyRates = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_RATES || "";

// Exportamos el cliente de Supabase para la base de datos externa de tasas.
// Si no están configuradas las variables, exportamos null para manejar el error de forma amigable.
export const ratesClient = (supabaseUrlRates && supabaseAnonKeyRates) 
  ? createClient(supabaseUrlRates, supabaseAnonKeyRates)
  : null;
