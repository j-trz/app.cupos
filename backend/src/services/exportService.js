import { query } from '../db.js';

/**
 * Servicio de exportación de datos en múltiples formatos
 * Soporta CSV, Excel (XLSX) y PDF
 */

/**
 * Convierte datos a formato CSV
 * @param {Array} data - Array de objetos a exportar
 * @param {Object} options - Opciones de configuración
 * @param {string[]} options.columns - Columnas a incluir (si no se especifica, usa todas)
 * @param {string} options.delimiter - Delimitador (default: ',')
 * @param {boolean} options.includeBOM - Incluir BOM para UTF-8 (default: true para Excel)
 * @returns {string} CSV string
 */
export function toCSV(data, options = {}) {
  if (!data || data.length === 0) {
    return '';
  }

  const {
    columns = Object.keys(data[0]),
    delimiter = ',',
    includeBOM = true
  } = options;

  // Función para escapar valores CSV
  const escapeValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Si contiene comillas, comas o saltos de línea, envolver en comillas
    if (str.includes('"') || str.includes(delimiter) || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Crear header
  const header = columns.map(col => escapeValue(col)).join(delimiter);

  // Crear filas
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col];
      return escapeValue(value);
    }).join(delimiter);
  });

  const csv = [header, ...rows].join('\r\n');
  
  // Agregar BOM para UTF-8 (recomendado para Excel)
  return includeBOM ? '\uFEFF' + csv : csv;
}

/**
 * Obtiene datos de reservas para exportación
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.agencyCode - Código de agencia
 * @param {string} filters.status - Estado de reserva
 * @param {string} filters.dateFrom - Fecha desde (YYYY-MM-DD)
 * @param {string} filters.dateTo - Fecha hasta (YYYY-MM-DD)
 * @returns {Array} Array de reservas
 */
export async function getReservationsForExport(filters = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.agencyCode) {
    conditions.push(`r.agencia = $${paramIndex}`);
    params.push(filters.agencyCode);
    paramIndex++;
  }

  if (filters.status) {
    conditions.push(`r.estado = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.dateFrom) {
    conditions.push(`r.fecha_creacion >= $${paramIndex}`);
    params.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    conditions.push(`r.fecha_creacion <= $${paramIndex}`);
    params.push(filters.dateTo + ' 23:59:59');
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      r.id,
      r.pedido_id,
      r.estado,
      r.contacto_nombre,
      r.contacto_email,
      r.contacto_telefono,
      r.agencia,
      r.fecha_creacion,
      r.fecha_expiracion,
      r.fecha_confirmacion,
      p.codigo AS producto_codigo,
      p.nombre AS producto_nombre,
      p.nivel,
      r.cantidad_adultos,
      r.cantidad_ninos,
      r.cantidad_infantes,
      r.observaciones,
      u.nombre AS creado_por_nombre,
      u.email AS creado_por_email
    FROM reservations r
    LEFT JOIN products p ON r.producto_id = p.id
    LEFT JOIN users u ON r.creado_por = u.id
    ${whereClause}
    ORDER BY r.fecha_creacion DESC
    LIMIT 10000
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Obtiene datos de productos para exportación
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Array de productos
 */
export async function getProductsForExport(filters = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.nivel) {
    conditions.push(`p.nivel = $${paramIndex}`);
    params.push(filters.nivel);
    paramIndex++;
  }

  if (filters.agencyCode) {
    conditions.push(`p.agencia = $${paramIndex}`);
    params.push(filters.agencyCode);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      p.id,
      p.codigo,
      p.nombre,
      p.nivel,
      p.disponibilidad_total,
      p.disponibilidad_confirmada,
      p.disponibilidad_pendiente,
      p.disponibilidad_bloqueada,
      p.fecha_salida,
      p.fecha_retorno,
      p.precio,
      p.moneda,
      p.agencia,
      p.activo,
      p.fecha_creacion,
      p.fecha_actualizacion
    FROM products p
    ${whereClause}
    ORDER BY p.fecha_creacion DESC
    LIMIT 10000
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Obtiene datos de usuarios para exportación
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} Array de usuarios
 */
export async function getUsersForExport(filters = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.agencyCode) {
    conditions.push(`u.agencia = $${paramIndex}`);
    params.push(filters.agencyCode);
    paramIndex++;
  }

  if (filters.role) {
    conditions.push(`u.role = $${paramIndex}`);
    params.push(filters.role);
    paramIndex++;
  }

  if (filters.active !== undefined) {
    conditions.push(`u.activo = $${paramIndex}`);
    params.push(filters.active);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      u.id,
      u.nombre,
      u.email,
      u.role,
      u.agencia,
      u.activo,
      u.fecha_creacion,
      u.ultimo_acceso,
      u.intentos_fallidos,
      u.bloqueado_hasta
    FROM users u
    ${whereClause}
    ORDER BY u.fecha_creacion DESC
    LIMIT 10000
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Obtiene datos de agencias para exportación
 * @returns {Array} Array de agencias
 */
export async function getAgenciesForExport() {
  const sql = `
    SELECT 
      a.id,
      a.codigo,
      a.nombre,
      a.email,
      a.telefono,
      a.direccion,
      a.activa,
      a.fecha_creacion
    FROM agencies a
    ORDER BY a.nombre ASC
  `;

  const result = await query(sql);
  return result.rows;
}

/**
 * Formatea datos para exportación según el tipo de entidad
 * @param {string} entityType - Tipo de entidad (reservations, products, users, agencies)
 * @param {Array} data - Datos a formatear
 * @returns {Object} Datos formateados con columnas y filas
 */
export function formatExportData(entityType, data) {
  const formatters = {
    reservations: (rows) => ({
      columns: [
        'ID', 'Pedido ID', 'Estado', 'Contacto Nombre', 'Contacto Email', 
        'Contacto Teléfono', 'Agencia', 'Producto Código', 'Producto Nombre',
        'Nivel', 'Adultos', 'Niños', 'Infantes', 'Fecha Creación', 
        'Fecha Expiración', 'Fecha Confirmación', 'Creado Por', 'Observaciones'
      ],
      rows: rows.map(r => ({
        'ID': r.id,
        'Pedido ID': r.pedido_id,
        'Estado': r.estado,
        'Contacto Nombre': r.contacto_nombre,
        'Contacto Email': r.contacto_email,
        'Contacto Teléfono': r.contacto_telefono,
        'Agencia': r.agencia,
        'Producto Código': r.producto_codigo,
        'Producto Nombre': r.producto_nombre,
        'Nivel': r.nivel,
        'Adultos': r.cantidad_adultos,
        'Niños': r.cantidad_ninos,
        'Infantes': r.cantidad_infantes,
        'Fecha Creación': r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleString('es-AR') : '',
        'Fecha Expiración': r.fecha_expiracion ? new Date(r.fecha_expiracion).toLocaleString('es-AR') : '',
        'Fecha Confirmación': r.fecha_confirmacion ? new Date(r.fecha_confirmacion).toLocaleString('es-AR') : '',
        'Creado Por': r.creado_por_nombre || r.creado_por_email || '',
        'Observaciones': r.observaciones || ''
      }))
    }),
    products: (rows) => ({
      columns: [
        'ID', 'Código', 'Nombre', 'Nivel', 'Disponibilidad Total',
        'Disponibilidad Confirmada', 'Disponibilidad Pendiente', 'Disponibilidad Bloqueada',
        'Fecha Salida', 'Fecha Retorno', 'Precio', 'Moneda', 'Agencia', 'Activo',
        'Fecha Creación', 'Fecha Actualización'
      ],
      rows: rows.map(p => ({
        'ID': p.id,
        'Código': p.codigo,
        'Nombre': p.nombre,
        'Nivel': p.nivel,
        'Disponibilidad Total': p.disponibilidad_total,
        'Disponibilidad Confirmada': p.disponibilidad_confirmada,
        'Disponibilidad Pendiente': p.disponibilidad_pendiente,
        'Disponibilidad Bloqueada': p.disponibilidad_bloqueada,
        'Fecha Salida': p.fecha_salida || '',
        'Fecha Retorno': p.fecha_retorno || '',
        'Precio': p.precio || '',
        'Moneda': p.moneda || '',
        'Agencia': p.agencia || '',
        'Activo': p.activo ? 'Sí' : 'No',
        'Fecha Creación': p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleString('es-AR') : '',
        'Fecha Actualización': p.fecha_actualizacion ? new Date(p.fecha_actualizacion).toLocaleString('es-AR') : ''
      }))
    }),
    users: (rows) => ({
      columns: [
        'ID', 'Nombre', 'Email', 'Rol', 'Agencia', 'Activo',
        'Fecha Creación', 'Último Acceso', 'Intentos Fallidos', 'Bloqueado Hasta'
      ],
      rows: rows.map(u => ({
        'ID': u.id,
        'Nombre': u.nombre,
        'Email': u.email,
        'Rol': u.role,
        'Agencia': u.agencia || '',
        'Activo': u.activo ? 'Sí' : 'No',
        'Fecha Creación': u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleString('es-AR') : '',
        'Último Acceso': u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-AR') : 'Nunca',
        'Intentos Fallidos': u.intentos_fallidos || 0,
        'Bloqueado Hasta': u.bloqueado_hasta ? new Date(u.bloqueado_hasta).toLocaleString('es-AR') : ''
      }))
    }),
    agencies: (rows) => ({
      columns: [
        'ID', 'Código', 'Nombre', 'Email', 'Teléfono', 'Dirección', 'Activa', 'Fecha Creación'
      ],
      rows: rows.map(a => ({
        'ID': a.id,
        'Código': a.codigo,
        'Nombre': a.nombre,
        'Email': a.email || '',
        'Teléfono': a.telefono || '',
        'Dirección': a.direccion || '',
        'Activa': a.activa ? 'Sí' : 'No',
        'Fecha Creación': a.fecha_creacion ? new Date(a.fecha_creacion).toLocaleString('es-AR') : ''
      }))
    })
  };

  const formatter = formatters[entityType];
  if (!formatter) {
    throw new Error(`Tipo de entidad no soportado: ${entityType}`);
  }

  return formatter(data);
}

export default {
  toCSV,
  getReservationsForExport,
  getProductsForExport,
  getUsersForExport,
  getAgenciesForExport,
  formatExportData
};
