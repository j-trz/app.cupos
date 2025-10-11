import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Configuración específica para evitar errores 406
export const supabaseWithHeaders = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
  },
  db: {
    schema: "public",
  },
});

// Función helper para crear clientes con credenciales personalizadas
export const createCustomSupabaseClient = (url, key) => {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });
};
