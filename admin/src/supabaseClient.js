import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Configuración por defecto
const supabaseOptions = {
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
};

export const supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);

// Cache para evitar crear múltiples instancias para la misma url+key
const _clientCache = new Map();

const _makeStorageKey = (url, key) => {
  try {
    // clave corta y única por URL+key (no incluye todo el key por seguridad)
    const shortKey = (key && key.toString().slice(0, 8)) || "no-key";
    return `sb-client-${encodeURIComponent(url)}-${shortKey}`;
  } catch {
    return `sb-client-${Math.random().toString(36).slice(2, 9)}`;
  }
};

// Función helper para crear o reutilizar clientes con credenciales personalizadas
export const createCustomSupabaseClient = (url, key, opts = {}) => {
  const cacheKey = `${url}::${key}`;
  if (_clientCache.has(cacheKey)) return _clientCache.get(cacheKey);

  const storageKey = opts.storageKey || _makeStorageKey(url, key);

  const client = createClient(url, key, {
    ...supabaseOptions,
    auth: {
      // Para clientes temporales no queremos persistir sesiones en localStorage
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey,
    },
    global: {
      headers: {
        ...(supabaseOptions.global && supabaseOptions.global.headers),
        ...(opts.headers || {}),
      },
    },
  });

  // Guardar en cache para reuso mientras dure la sesión de la página
  _clientCache.set(cacheKey, client);
  return client;
};
