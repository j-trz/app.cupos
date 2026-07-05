import { query } from '../db.js';

/**
 * Obtener datos de una tabla
 */
export const getData = async (req, res) => {
  try {
    const { table, filters = '{}', limit, offset, order } = req.query;
    
    // Validar nombre de tabla para prevenir inyección SQL
    if (!isValidTableName(table)) {
      return res.status(400).json({ error: 'Nombre de tabla inválido' });
    }

    let sql = `SELECT * FROM "${table}"`;
    const params = [];
    let paramIndex = 1;
    let hasWhere = false;

    // Procesar filtros
    const parsedFilters = JSON.parse(filters);
    if (Object.keys(parsedFilters).length > 0) {
      sql += ' WHERE ';
      const conditions = [];

      for (const [field, value] of Object.entries(parsedFilters)) {
        if (!isValidFieldName(field)) {
          return res.status(400).json({ error: `Campo inválido: ${field}` });
        }

        if (typeof value === 'object' && value !== null) {
          // Manejar operadores especiales como $gt, $lt, etc.
          for (const [op, opValue] of Object.entries(value)) {
            switch (op) {
              case '$eq':
                conditions.push(`"${field}" = $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$ne':
              case '$neq':
                conditions.push(`"${field}" != $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$gt':
                conditions.push(`"${field}" > $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$gte':
                conditions.push(`"${field}" >= $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$lt':
                conditions.push(`"${field}" < $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$lte':
                conditions.push(`"${field}" <= $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$in':
                const inValues = Array.isArray(opValue) ? opValue : [opValue];
                const placeholders = inValues.map(() => `$${paramIndex++}`).join(',');
                conditions.push(`"${field}" IN (${placeholders})`);
                params.push(...inValues);
                break;
              case '$like':
                conditions.push(`"${field}" LIKE $${paramIndex}`);
                params.push(`%${opValue}%`);
                paramIndex++;
                break;
              case '$ilike':
                conditions.push(`"${field}" ILIKE $${paramIndex}`);
                params.push(`%${opValue}%`);
                paramIndex++;
                break;
            }
          }
        } else {
          conditions.push(`"${field}" = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      sql += conditions.join(' AND ');
      hasWhere = true;
    }

    // Ordenamiento
    if (order) {
      const [field, direction] = order.split(':');
      if (isValidFieldName(field)) {
        sql += ` ORDER BY "${field}" ${direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      }
    }

    // Límites
    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
      paramIndex++;
    }

    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset));
    }

    const result = await query(sql, params);

    // Sanitizar campos sensibles según tabla y rol
    const tbl = String(table).toLowerCase();
    const isAdminUser = req.user && req.user.role === 'admin';

    if (!isAdminUser && (tbl === 'reservations' || tbl === 'solicitudes' || tbl === 'products' || tbl === 'productos')) {
      const sanitized = result.rows.map((r) => {
        const copy = { ...r };
        if (Object.prototype.hasOwnProperty.call(copy, 'neto_1')) delete copy.neto_1;
        return copy;
      });
      return res.json(sanitized);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error en getData:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Operaciones CRUD (insert, update, delete)
 */
export const crudOperation = async (req, res) => {
  try {
    const { table, operation, data, id, idField = 'id' } = req.body;
    const isAdminUser = req.user && req.user.role === 'admin';

    // Validar nombre de tabla
    if (!isValidTableName(table)) {
      return res.status(400).json({ error: 'Nombre de tabla inválido' });
    }

    if (!isValidFieldName(idField)) {
      return res.status(400).json({ error: 'Campo ID inválido' });
    }

    let result;

    switch (operation) {
      case 'insert':
        if (!data || typeof data !== 'object') {
          return res.status(400).json({ error: 'Datos inválidos para inserción' });
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        
        if (columns.length === 0) {
          return res.status(400).json({ error: 'No hay datos para insertar' });
        }

        const insertColumns = columns.map(col => `"${col}"`).join(', ');
        const insertPlaceholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        
        const insertSql = `INSERT INTO "${table}" (${insertColumns}) VALUES (${insertPlaceholders}) RETURNING *`;
        result = await query(insertSql, values);
        // Sanitizar respuesta si es tabla sensible
        if (table && !isAdminUser && (table.toLowerCase() === 'reservations' || table.toLowerCase() === 'solicitudes' || table.toLowerCase() === 'products' || table.toLowerCase() === 'productos')) {
          const row = { ...result.rows[0] };
          if (Object.prototype.hasOwnProperty.call(row, 'neto_1')) delete row.neto_1;
          res.status(201).json(row);
        } else {
          res.status(201).json(result.rows[0]);
        }
        break;

      case 'update':
        if (!data || typeof data === 'undefined') {
          return res.status(400).json({ error: 'Datos inválidos para actualización' });
        }

        if (!id) {
          return res.status(400).json({ error: 'ID requerido para actualización' });
        }

        const updateColumns = Object.keys(data);
        const updateValues = Object.values(data);

        if (updateColumns.length === 0) {
          return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        const setClause = updateColumns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
        const updateSql = `UPDATE "${table}" SET ${setClause} WHERE "${idField}" = $${updateColumns.length + 1} RETURNING *`;
        const updateParams = [...updateValues, id];

        result = await query(updateSql, updateParams);
        
        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Registro no encontrado' });
        }

        if (table && !isAdminUser && (table.toLowerCase() === 'reservations' || table.toLowerCase() === 'solicitudes' || table.toLowerCase() === 'products' || table.toLowerCase() === 'productos')) {
          const row = { ...result.rows[0] };
          if (Object.prototype.hasOwnProperty.call(row, 'neto_1')) delete row.neto_1;
          res.json(row);
        } else {
          res.json(result.rows[0]);
        }
        break;

      case 'delete':
        if (!id) {
          return res.status(400).json({ error: 'ID requerido para eliminación' });
        }

        const deleteSql = `DELETE FROM "${table}" WHERE "${idField}" = $${1} RETURNING *`;
        result = await query(deleteSql, [id]);

        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Registro no encontrado' });
        }

        // Sanitizar deleted
        const deletedRow = { ...result.rows[0] };
        if (table && !isAdminUser && (table.toLowerCase() === 'reservations' || table.toLowerCase() === 'solicitudes' || table.toLowerCase() === 'products' || table.toLowerCase() === 'productos')) {
          if (Object.prototype.hasOwnProperty.call(deletedRow, 'neto_1')) delete deletedRow.neto_1;
        }
        res.json({ message: 'Registro eliminado exitosamente', deleted: deletedRow });
        break;

      default:
        res.status(400).json({ error: 'Operación no válida' });
    }
  } catch (error) {
    console.error('Error en crudOperation:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Ejecutar consulta SQL personalizada
 */
export const executeQuery = async (req, res) => {
  try {
    const { query: sqlQuery, params = [] } = req.body;
    const isAdminUser = req.user && req.user.role === 'admin';

    // Validar que la consulta no contenga comandos peligrosos
    if (!isValidQuery(sqlQuery)) {
      return res.status(400).json({ error: 'Consulta SQL no permitida' });
    }

    const result = await query(sqlQuery, params);

    // Intentar detección simple de tabla en la consulta para sanitizar neto_1
    const lower = String(sqlQuery).toLowerCase();
    const mentionsReservations = lower.includes(' from reservations') || lower.includes(' from "reservations"') || lower.includes(' from solicitudes') || lower.includes(' from "solicitudes"');
    const mentionsProducts = lower.includes(' from products') || lower.includes(' from "products"') || lower.includes(' from productos') || lower.includes(' from "productos"');
    if (!isAdminUser && (mentionsReservations || mentionsProducts)) {
      const sanitized = result.rows.map((r) => {
        const copy = { ...r };
        if (Object.prototype.hasOwnProperty.call(copy, 'neto_1')) delete copy.neto_1;
        return copy;
      });
      return res.json(sanitized);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error en executeQuery:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener esquema de una tabla
 */
export const getTableSchema = async (req, res) => {
  try {
    const { table } = req.params;

    if (!isValidTableName(table)) {
      return res.status(400).json({ error: 'Nombre de tabla inválido' });
    }

    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const result = await query(schemaQuery, [table]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error en getTableSchema:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtener lista de tablas
 */
export const getTables = async (req, res) => {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json(result.rows.map(row => row.table_name));
  } catch (error) {
    console.error('Error en getTables:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Funciones de validación para prevenir inyección SQL
const validTableNames = [
  'profiles', 'agencies', 'data_connections', 'api_credentials',
  'connection_data_types', 'solicitudes', 'productos', 'notifications',
  'user_security_status', 'user_sessions', 'admin_actions',
  // Tablas en inglés
  'products', 'reservations', 'system_settings', 'email_templates', 'email_log', 'alert_rules'
]; // Lista blanca de nombres de tablas válidas

function isValidTableName(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Permitir nombres de tablas de la lista blanca o que sigan formato estándar
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 63 && 
         (validTableNames.includes(name) || name.startsWith('custom_'));
}

function isValidFieldName(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 63;
}

function isValidQuery(sql) {
  if (!sql || typeof sql !== 'string') return false;
  
  // Convertir a minúsculas para la verificación
  const lowerSql = sql.toLowerCase().trim();
  
  // Bloquear comandos potencialmente peligrosos
  const dangerousCommands = [
    'drop', 'truncate', 'alter', 'create', 'delete', 'update', 'insert', 'grant', 'revoke',
    'execute', 'exec', 'sp_', 'xp_', 'sys.', 'information_schema'
  ];
  
  // Solo permitir consultas SELECT simples
  if (!lowerSql.startsWith('select')) {
    return false;
  }
  
  // Verificar si contiene comandos peligrosos
  return !dangerousCommands.some(cmd => lowerSql.includes(cmd));
}