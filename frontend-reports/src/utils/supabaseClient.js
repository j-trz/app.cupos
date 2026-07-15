/**
 * supabaseClient.js — MODO LOCAL (sin internet, sin Supabase)
 *
 * Stub que mantiene la misma API que el cliente Supabase real para que
 * el resto del código no necesite cambios. Usa únicamente localStorage.
 */

function getStoredToken() {
  return localStorage.getItem('token') || null;
}

function decodePayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function buildSession(token) {
  const payload = decodePayload(token);
  if (!payload) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return null;
  return {
    access_token: token,
    refresh_token: localStorage.getItem('refresh_token') || '',
    expires_at: payload.exp || now + 28800,
    user: {
      id: payload.sub || payload.email || 'local-user',
      email: payload.email || payload.sub || ''
    }
  };
}

const auth = {
  onAuthStateChange: (_event, _callback) => {
    // En modo local no hay eventos de Supabase; retorna suscripción vacía
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  getSession: async () => {
    const token = getStoredToken();
    if (!token) return { data: { session: null }, error: null };
    const session = buildSession(token);
    return { data: { session }, error: null };
  },

  setSession: async ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem('token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    return { data: null, error: null };
  },

  refreshSession: async () => {
    // En modo local los tokens duran 8h; no hay refresh remoto
    return { data: { session: null }, error: new Error('Modo local: refresh no disponible') };
  }
};

export const supabase = { auth };

/**
 * Verifica si el token actual sigue vigente.
 * Retorna un objeto de sesión o null si no hay token / está expirado.
 */
export async function ensureSessionFresh() {
  const token = getStoredToken();
  if (!token) return null;
  return buildSession(token);
}

/**
 * En modo local el upload se hace vía /api/upload al backend; esta función
 * no aplica. Se conserva la firma para compatibilidad con imports existentes.
 */
export async function uploadToBucket() {
  throw new Error('Modo local: usa el modal de carga de archivos para subir Excel.');
}
<<<<<<< HEAD
=======

>>>>>>> main
