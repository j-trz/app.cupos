// Cliente API para testing local con backend en localhost:3001

const API_URL = 'http://localhost:3001/api';

export async function getFields(userId) {
  const res = await fetch(`http://localhost:3001/api/fields?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Error al obtener campos');
  return await res.json();
}

export async function getEvolucionAgencias({ userId, ...filters }) {
  const res = await fetch(`${API_URL}/evolucion-agencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...filters }),
  });
  if (!res.ok) throw new Error('Error al obtener evolución agencias');
  return await res.json();
}

export async function getAgenciasData({ userId, ...filters }) {
  const res = await fetch(`${API_URL}/agencias-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...filters }),
  });
  if (!res.ok) throw new Error('Error al obtener agencias data');
  return await res.json();
}

export async function getDetalleDestinos({ userId, ...filters }) {
  const res = await fetch(`${API_URL}/detalle-destinos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...filters }),
  });
  if (!res.ok) throw new Error('Error al obtener detalle destinos');
  return await res.json();
}

export async function getEvolucionPasajeros({ userId, ...filters }) {
  const res = await fetch(`${API_URL}/evolucion-pasajeros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...filters }),
  });
  if (!res.ok) throw new Error('Error al obtener evolución pasajeros');
  return await res.json();
}

export async function getDestinosCompania({ userId, ...filters }) {
  const res = await fetch(`${API_URL}/destinos-compania`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...filters }),
  });
  if (!res.ok) throw new Error('Error al obtener datos por compañía');
  return await res.json();
}