// Esquema único para la plantilla de carga masiva y su validación — ambos
// (GestionProductos.jsx al generar la plantilla, ProductBulkUpload.jsx al
// validar lo subido) usan esta misma lista para no desincronizarse. Las
// claves son exactamente los nombres `snake_case` que espera el backend
// (json tags de models.Product).

export const PRODUCT_IMPORT_COLUMNS = [
  { key: 'codigo_cupo', type: 'text', required: false, hint: 'Se autogenera si se deja vacío' },
  { key: 'agencia', type: 'text', required: true, hint: 'Código de agencia dueña, ej: AG001' },
  { key: 'destino', type: 'text', required: true },
  { key: 'compania', type: 'text', required: true },
  { key: 'disponibilidad', type: 'number', required: true, min: 0 },
  { key: 'cupo', type: 'number', required: false, min: 0 },
  { key: 'fecha_salida', type: 'date', required: false, hint: 'YYYY-MM-DD' },
  { key: 'fecha_regreso', type: 'date', required: false, hint: 'YYYY-MM-DD' },
  { key: 'precio', type: 'number', required: false, min: 0 },
  { key: 'neto_1', type: 'number', required: false, min: 0 },
  { key: 'op', type: 'number', required: false, min: 0 },
  { key: 'ruta', type: 'text', required: false },
  { key: 'pnr', type: 'text', required: false },
  { key: 'ficha', type: 'text', required: false },
  { key: 'temporada', type: 'text', required: false },
  { key: 'tipo_producto', type: 'text', required: false, hint: 'Aereo, Hotel o Crucero' },
  { key: 'servicio', type: 'text', required: false },
  { key: 'notas_externas', type: 'text', required: false, hint: 'Visibles para todas las agencias' },
  { key: 'notas_internas', type: 'text', required: false, hint: 'Solo visibles para el admin' },
  { key: 'bloqueo_temporal_minutos', type: 'number', required: false, min: 0 },
  { key: 'carryon', type: 'boolean', required: false, hint: 'TRUE o FALSE' },
  { key: 'handbag', type: 'boolean', required: false, hint: 'TRUE o FALSE' },
  { key: 'checkedbag', type: 'boolean', required: false, hint: 'TRUE o FALSE' },
  { key: 'inf_fare', type: 'number', required: false, min: 0 },
  { key: 'chd_fare', type: 'number', required: false, min: 0 },
];

const TIPOS_PRODUCTO_VALIDOS = ['Aereo', 'Hotel', 'Crucero'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'si', 'sí', 'x', 'yes'].includes(s);
}

// Valida y normaliza una fila cruda del Excel/CSV contra el esquema. No tira
// excepciones — siempre devuelve { valid, errors, normalized } para que el
// caller pueda separar filas buenas de malas sin que una fila rota aborte
// todo el lote.
export function validateProductRow(row, validAgencyCodes = []) {
  const errors = [];
  const normalized = {};

  for (const col of PRODUCT_IMPORT_COLUMNS) {
    const raw = row[col.key];
    const hasValue = raw !== undefined && raw !== null && String(raw).trim() !== '';

    if (col.required && !hasValue) {
      errors.push(`Falta "${col.key}"`);
      continue;
    }
    if (!hasValue) {
      if (col.type === 'boolean') normalized[col.key] = false;
      continue;
    }

    if (col.type === 'number') {
      const n = Number(String(raw).trim().replace(',', '.'));
      if (Number.isNaN(n)) {
        errors.push(`"${col.key}" debe ser un número (vino "${raw}")`);
        continue;
      }
      if (col.min !== undefined && n < col.min) {
        errors.push(`"${col.key}" no puede ser menor a ${col.min}`);
        continue;
      }
      normalized[col.key] = n;
    } else if (col.type === 'date') {
      const s = String(raw).trim();
      if (!DATE_RE.test(s)) {
        errors.push(`"${col.key}" debe tener formato YYYY-MM-DD (vino "${raw}")`);
        continue;
      }
      normalized[col.key] = s;
    } else if (col.type === 'boolean') {
      normalized[col.key] = coerceBoolean(raw);
    } else {
      normalized[col.key] = String(raw).trim();
    }
  }

  if (normalized.agencia && validAgencyCodes.length > 0 && !validAgencyCodes.includes(normalized.agencia)) {
    errors.push(`La agencia "${normalized.agencia}" no existe`);
  }
  if (normalized.tipo_producto && !TIPOS_PRODUCTO_VALIDOS.includes(normalized.tipo_producto)) {
    errors.push(`"tipo_producto" debe ser uno de: ${TIPOS_PRODUCTO_VALIDOS.join(', ')} (vino "${normalized.tipo_producto}")`);
  }

  return { valid: errors.length === 0, errors, normalized };
}
