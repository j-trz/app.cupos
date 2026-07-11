import { useEffect, useState } from 'react';

// Cuenta regresiva de un bloqueo temporal — cálculo puro, sin estado. Dado un
// valor de fecha (ISO string / Date), devuelve la etiqueta + color a
// mostrar, o null si no hay fecha. Compartido entre Requests.jsx,
// GestionReservas.jsx y el widget de bloqueos de Availability.jsx para que
// haya un solo cálculo, no copias divergiendo con el tiempo.
export function formatExpiry(value) {
  if (!value) return null;
  const date = new Date(value);
  const now = new Date();
  const diffMs = date - now;
  if (diffMs <= 0) return { label: 'Expirado', color: 'text-red-600' };
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH < 1) return { label: `${diffM}m restantes`, color: 'text-orange-500' };
  if (diffH < 24) return { label: `${diffH}h ${diffM}m restantes`, color: 'text-yellow-600' };
  return { label: `${Math.floor(diffH / 24)}d restantes`, color: 'text-green-600' };
}

// Fuerza un re-render periódico (cada 30s por defecto) para que las cuentas
// regresivas de la pantalla avancen solas en vez de quedar congeladas hasta
// el próximo re-render por otro motivo. Llamar UNA sola vez a nivel de
// componente (nunca dentro de un .map()) — todos los formatExpiry(...) que
// se calculen en ese render quedan al día solos, sin necesidad de un hook
// por fila.
export function useCountdownTick(intervalMs = 30000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
