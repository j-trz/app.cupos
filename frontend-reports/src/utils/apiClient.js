import { ensureSessionFresh } from './supabaseClient.js';

// En producción preferir VITE_API_URL (configurable en Vercel). Fallback al dominio conocido.
const API_URL = import.meta.env.VITE_API_URL || 'https://dashboard-cupos.onrender.com/api';

/**
 * Ejecuta fetch y si recibe 401 intenta un refresh silencioso y reintenta 1 vez.
 * Nunca muestra modal ni usa window.detectTokenExpired.
 */
async function fetchWithAutoRefresh(url, options = {}) {
  let res = await fetch(url, options);
  if (res.status === 401) {
    // Intentar refresh silencioso
    try {
      const refreshed = await ensureSessionFresh();
      if (refreshed?.access_token) {
        // Reintentar con mismos options
        res = await fetch(url, options);
      }
    } catch {
      // Silencioso
    }
  }
  return res;
}

function buildPostOptions(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  };
}

function ensureOk(res, context) {
  if (!res.ok) {
    throw new Error(`Error ${context} (status ${res.status})`);
  }
}

export async function getDashboardData({ userId, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/dashboard-data`,
    buildPostOptions({ userId, filters })
  );
  ensureOk(res, 'al obtener datos del dashboard');
  return await res.json();
}

export async function getAdditionalChartData({ userId, filters = {}, granularidadAgencias = 'mes' }) {
  try {
    const [agencias, evolucionAgencias, destinosCompania] = await Promise.all([
      getAgenciasData({ userId, filters }).catch(e => ({ __error: e })),
      getEvolucionAgencias({ userId, filters, granularidad: granularidadAgencias }).catch(e => ({ __error: e })),
      getDestinosCompania({ userId, filters }).catch(e => ({ __error: e }))
    ]);

    const errors = [];
    if (agencias?.__error) errors.push(agencias.__error.message);
    if (evolucionAgencias?.__error) errors.push(evolucionAgencias.__error.message);
    if (destinosCompania?.__error) errors.push(destinosCompania.__error.message);

    return {
      agencias: agencias?.__error ? null : agencias,
      evolucionAgencias: evolucionAgencias?.__error ? null : evolucionAgencias,
      destinosCompania: destinosCompania?.__error ? null : destinosCompania,
      errors
    };
  } catch (e) {
    throw new Error(`Fallo obtener datos adicionales: ${e.message}`);
  }
}

export async function getFields(userId) {
  const url = `${API_URL}/fields?userId=${encodeURIComponent(userId || '')}`;
  const res = await fetchWithAutoRefresh(url);
  ensureOk(res, 'al obtener campos');
  return await res.json();
}

export async function getEvolucionAgencias({ userId, filters = {}, granularidad = 'mes' }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/evolucion-agencias`,
    buildPostOptions({ userId, filters, granularidad })
  );
  ensureOk(res, 'al obtener evolución agencias');
  return await res.json();
}

export async function getAgenciasData({ userId, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/agencias-data`,
    buildPostOptions({ userId, filters })
  );
  ensureOk(res, 'al obtener agencias data');
  return await res.json();
}

export async function getDetalleDestinos({ userId, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/detalle-destinos`,
    buildPostOptions({ userId, filters })
  );
  ensureOk(res, 'al obtener detalle destinos');
  return await res.json();
}

export async function getEvolucionPasajeros({ userId, filters = {}, granularidad = 'mes' }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/evolucion-pasajeros`,
    buildPostOptions({ userId, filters, granularidad })
  );
  ensureOk(res, 'al obtener evolución pasajeros');
  return await res.json();
}

export async function getEvolucionPorCupo({ userId, codigoCupo, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/evolucion-por-cupo`,
    buildPostOptions({ userId, codigoCupo, filters })
  );
  ensureOk(res, 'al obtener evolución por cupo');
  return await res.json();
}

/**
 * Obtener share (Jetmar vs Tienda) para un Código de Cupo específico.
 * Body: { userId, codigoCupo, filters }
 * Responde igual que /api/agencias-data: { labels: ['Jetmar','Tienda Viajes'], values: [n1,n2], share: [p1,p2] }
 */
export async function getSharePorCupo({ userId, codigoCupo, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/share-por-cupo`,
    buildPostOptions({ userId, codigoCupo, filters })
  );
  ensureOk(res, 'al obtener share por cupo');
  return await res.json();
}

export async function getDestinosCompania({ userId, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/destinos-compania`,
    buildPostOptions({ userId, filters })
  );
  ensureOk(res, 'al obtener datos por compañía');
  return await res.json();
}

export async function getPorSalida({ userId, filters = {} }) {
  const res = await fetchWithAutoRefresh(
    `${API_URL}/por-salida`,
    buildPostOptions({ userId, filters })
  );
  ensureOk(res, 'al obtener datos por salida');
  return await res.json();
}