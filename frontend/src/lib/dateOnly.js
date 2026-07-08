// Helpers para fechas "de calendario" (salida, regreso, nacimiento, etc.) que
// el backend manda como ISO ("2027-06-01" o "2027-06-01T00:00:00Z").
//
// El bug que resuelven: `new Date("2027-06-01T00:00:00Z")` representa un
// instante UTC. Si se lee con los getters LOCALES (getDate/getMonth/getFullYear)
// en un huso horario detrás de UTC (ej. Uruguay, UTC-3), ese instante cae en
// el día anterior en hora local -> la fecha se muestra un día antes de la
// cargada. Para una fecha de calendario (sin hora real) no corresponde
// convertir a huso local: hay que leer los dígitos YYYY-MM-DD tal cual vienen.

/**
 * Extrae "YYYY-MM-DD" de un valor ISO sin construir un objeto Date (evita el
 * corrimiento de huso horario). Devuelve '' si no se puede extraer.
 */
export function toDateOnlyString(value) {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match ? match[1] : '';
}

/**
 * Formatea un valor de fecha como DD/MM/YYYY, leyendo los dígitos
 * directamente (sin pasar por Date/huso horario).
 */
export function formatDateOnly(value, fallback = '—') {
  const iso = toDateOnlyString(value);
  if (!iso) return fallback;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
