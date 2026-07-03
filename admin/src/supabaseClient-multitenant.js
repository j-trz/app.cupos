import { createClient } from "@supabase/supabase-js";

// 🔐 BACKEND PRINCIPAL - Para Edge Functions, autenticación y seguridad
const backendUrl =
  import.meta.env.VITE_BACKEND_SUPABASE_URL ||
  "https://ernkkvbbwbzwbobymuxf.supabase.co";
const backendKey = import.meta.env.VITE_BACKEND_SUPABASE_PUBLISHABLE_KEY;

// 📊 BASE DE DATOS DEL USUARIO - Para datos dinámicos (configurable por usuario)
const userDbUrl = import.meta.env.VITE_SUPABASE_URL;
const userDbKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Cliente para el backend principal (Edge Functions, auth, seguridad)
export const supabaseBackend = createClient(backendUrl, backendKey);

// Cliente para la base de datos del usuario (datos)
export const supabaseUserDB = createClient(userDbUrl, userDbKey);

// Cliente principal (mantener compatibilidad con código existente)
// Por defecto usa el backend para autenticación
export const supabase = supabaseBackend;

/**
 * Crear cliente dinámico para cualquier base de datos Supabase
 * @param {string} url - URL del proyecto Supabase
 * @param {string} anonKey - Clave anónima del proyecto
 * @returns {Object} Cliente Supabase configurado
 */
export function createDynamicSupabaseClient(url, anonKey) {
  return createClient(url, anonKey);
}

/**
 * Configuración actual de la aplicación
 */
export const supabaseConfig = {
  backend: {
    url: backendUrl,
    hasKey: !!backendKey,
    description: "Backend principal con Edge Functions",
  },
  userDB: {
    url: userDbUrl,
    hasKey: !!userDbKey,
    description: "Base de datos del usuario",
  },
};

// Log de configuración para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log("🔧 Supabase Multi-Tenant Configuration:", {
    backend: `${backendUrl} (${backendKey ? "configured" : "missing key"})`,
    userDB: `${userDbUrl} (${userDbKey ? "configured" : "missing key"})`,
  });
}
