/**
 * Herramientas de IA para gestión de productos
 * Permite al agente IA interactuar con el sistema de productos
 */

import { query } from '../db.js';

/**
 * Definición de herramientas de productos para function calling
 */
export const productToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Buscar productos por diferentes criterios (nombre, destino, fecha, disponibilidad, etc.)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Texto de búsqueda (nombre o descripción)'
          },
          destino: {
            type: 'string',
            description: 'Filtrar por destino'
          },
          origen: {
            type: 'string',
            description: 'Filtrar por origen'
          },
          date_from: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          date_to: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          },
          min_price: {
            type: 'number',
            description: 'Precio mínimo'
          },
          max_price: {
            type: 'number',
            description: 'Precio máximo'
          },
          only_available: {
            type: 'boolean',
            description: 'Solo productos con disponibilidad'
          },
          agency_id: {
            type: 'string',
            description: 'Filtrar por agencia'
          },
          limit: {
            type: 'integer',
            description: 'Límite de resultados (default: 10)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Obtener detalles completos de un producto específico',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto'
          }
        },
        required: ['product_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_product',
      description: 'Crear un nuevo producto (vuelo, tour, paquete, etc.)',
      parameters: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            description: 'Nombre del producto'
          },
          descripcion: {
            type: 'string',
            description: 'Descripción detallada'
          },
          tipo: {
            type: 'string',
            enum: ['flight', 'tour', 'package', 'transfer', 'other'],
            description: 'Tipo de producto'
          },
          origen: {
            type: 'string',
            description: 'Ciudad/origen'
          },
          destino: {
            type: 'string',
            description: 'Ciudad/destino'
          },
          fecha_inicio: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          fecha_fin: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          },
          precio_base: {
            type: 'number',
            description: 'Precio base por persona'
          },
          moneda: {
            type: 'string',
            enum: ['USD', 'EUR', 'ARS', 'BRL'],
            description: 'Moneda del precio'
          },
          capacidad_total: {
            type: 'integer',
            description: 'Capacidad total de pasajeros'
          },
          duracion_horas: {
            type: 'number',
            description: 'Duración en horas'
          },
          incluye: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de servicios incluidos'
          },
          agency_id: {
            type: 'string',
            description: 'ID de la agencia'
          }
        },
        required: ['nombre', 'tipo', 'destino', 'precio_base', 'capacidad_total']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_product',
      description: 'Actualizar datos de un producto existente',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto'
          },
          nombre: {
            type: 'string',
            description: 'Nombre del producto'
          },
          descripcion: {
            type: 'string',
            description: 'Descripción'
          },
          precio_base: {
            type: 'number',
            description: 'Precio base'
          },
          capacidad_total: {
            type: 'integer',
            description: 'Capacidad total'
          },
          estado: {
            type: 'string',
            enum: ['draft', 'active', 'paused', 'cancelled', 'completed'],
            description: 'Estado del producto'
          }
        },
        required: ['product_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_product_inventory',
      description: 'Actualizar inventario/disponibilidad de un producto',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto'
          },
          capacity_adjustment: {
            type: 'integer',
            description: 'Ajuste de capacidad (+/-)'
          },
          block_seats: {
            type: 'integer',
            description: 'Bloquear asientos temporalmente'
          },
          release_seats: {
            type: 'integer',
            description: 'Liberar asientos bloqueados'
          }
        },
        required: ['product_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_availability',
      description: 'Obtener disponibilidad actual de un producto',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto'
          },
          date: {
            type: 'string',
            description: 'Fecha específica a consultar (YYYY-MM-DD)'
          }
        },
        required: ['product_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_stats',
      description: 'Obtener estadísticas de ventas de un producto',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto'
          },
          date_from: {
            type: 'string',
            description: 'Fecha de inicio'
          },
          date_to: {
            type: 'string',
            description: 'Fecha de fin'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_availability_by_route',
      description: 'Buscar disponibilidad por ruta y fecha',
      parameters: {
        type: 'object',
        properties: {
          origen: {
            type: 'string',
            description: 'Ciudad de origen'
          },
          destino: {
            type: 'string',
            description: 'Ciudad de destino'
          },
          fecha: {
            type: 'string',
            description: 'Fecha del viaje (YYYY-MM-DD)'
          },
          pasajeros: {
            type: 'integer',
            description: 'Número de pasajeros'
          }
        },
        required: ['destino', 'fecha', 'pasajeros']
      }
    }
  }
];

/**
 * Ejecutar herramienta de productos
 */
export async function executeProductTool(toolName, parameters, userContext) {
  const { agencia, role } = userContext;

  switch (toolName) {
    case 'search_products':
      return await searchProducts(parameters, agencia, role);
    case 'get_product_details':
      return await getProductDetails(parameters.product_id, agencia, role);
    case 'create_product':
      return await createProduct(parameters, userContext);
    case 'update_product':
      return await updateProduct(parameters, agencia, role);
    case 'update_product_inventory':
      return await updateProductInventory(parameters, agencia, role);
    case 'get_product_availability':
      return await getProductAvailability(parameters);
    case 'get_product_stats':
      return await getProductStats(parameters, agencia, role);
    case 'search_availability_by_route':
      return await searchAvailabilityByRoute(parameters);
    default:
      throw new Error(`Herramienta de productos no reconocida: ${toolName}`);
  }
}

/**
 * Buscar productos con filtros
 */
async function searchProducts(params, agencia, role) {
  let queryText = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.tipo,
      p.origen,
      p.destino,
      p.fecha_inicio,
      p.fecha_fin,
      p.precio_base,
      p.moneda,
      p.capacidad_total,
      p.estado,
      p.created_at,
      a.nombre as agencia_nombre,
      (SELECT COALESCE(SUM(r.pasajeros), 0) 
       FROM public.reservations r 
       WHERE r.product_id = p.id 
       AND r.estado IN ('pending', 'confirmed')) as pasajeros_reservados
    FROM public.products p
    LEFT JOIN public.agencies a ON p.agency_id = a.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Filtrar por agencia si no es admin global
  if (role !== 'admin' && agencia) {
    queryText += ` AND p.agency_id = $${paramIndex++}`;
    values.push(agencia);
  }

  if (params.query) {
    queryText += ` AND (p.nombre ILIKE $${paramIndex} OR p.descripcion ILIKE $${paramIndex})`;
    values.push(`%${params.query}%`);
    paramIndex++;
  }

  if (params.destino) {
    queryText += ` AND p.destino ILIKE $${paramIndex++}`;
    values.push(`%${params.destino}%`);
  }

  if (params.origen) {
    queryText += ` AND p.origen ILIKE $${paramIndex++}`;
    values.push(`%${params.origen}%`);
  }

  if (params.date_from) {
    queryText += ` AND p.fecha_inicio >= $${paramIndex++}`;
    values.push(params.date_from);
  }

  if (params.date_to) {
    queryText += ` AND p.fecha_fin <= $${paramIndex++}`;
    values.push(params.date_to);
  }

  if (params.min_price !== undefined) {
    queryText += ` AND p.precio_base >= $${paramIndex++}`;
    values.push(params.min_price);
  }

  if (params.max_price !== undefined) {
    queryText += ` AND p.precio_base <= $${paramIndex++}`;
    values.push(params.max_price);
  }

  if (params.only_available) {
    queryText += ` AND p.estado = 'active' AND p.capacidad_total > (
      SELECT COALESCE(SUM(r.pasajeros), 0) 
      FROM public.reservations r 
      WHERE r.product_id = p.id 
      AND r.estado IN ('pending', 'confirmed')
    )`;
  }

  if (params.agency_id && role === 'admin') {
    queryText += ` AND p.agency_id = $${paramIndex++}`;
    values.push(params.agency_id);
  }

  const limit = params.limit || 10;
  queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++}`;
  values.push(limit);

  const result = await query(queryText, values);

  // Calcular disponibilidad
  const products = result.rows.map(p => ({
    ...p,
    disponibles: p.capacidad_total - p.pasajeros_reservados
  }));

  return {
    success: true,
    count: products.length,
    products
  };
}

/**
 * Obtener detalles de un producto
 */
async function getProductDetails(productId, agencia, role) {
  let queryText = `
    SELECT 
      p.*,
      a.nombre as agencia_nombre,
      (SELECT COALESCE(SUM(r.pasajeros), 0) 
       FROM public.reservations r 
       WHERE r.product_id = p.id 
       AND r.estado IN ('pending', 'confirmed')) as pasajeros_reservados,
      (SELECT COUNT(*) 
       FROM public.reservations r 
       WHERE r.product_id = p.id) as total_reservas
    FROM public.products p
    LEFT JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.id = $1
  `;

  const values = [productId];

  if (role !== 'admin' && agencia) {
    queryText += ` AND p.agency_id = $2`;
    values.push(agencia);
  }

  const result = await query(queryText, values);

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Producto no encontrado o sin permisos'
    };
  }

  const product = result.rows[0];
  product.disponibles = product.capacidad_total - product.pasajeros_reservados;

  return {
    success: true,
    product
  };
}

/**
 * Crear nuevo producto
 */
async function createProduct(params, userContext) {
  const { agencia, role } = userContext;

  // Solo admin o agency_admin pueden crear productos
  if (!['admin', 'agency_admin'].includes(role)) {
    return {
      success: false,
      error: 'No tienes permisos para crear productos'
    };
  }

  const result = await query(
    `INSERT INTO public.products (
      nombre,
      descripcion,
      tipo,
      origen,
      destino,
      fecha_inicio,
      fecha_fin,
      precio_base,
      moneda,
      capacidad_total,
      duracion_horas,
      incluye,
      estado,
      agency_id,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      params.nombre,
      params.descripcion || null,
      params.tipo || 'other',
      params.origen || null,
      params.destino,
      params.fecha_inicio || null,
      params.fecha_fin || null,
      params.precio_base,
      params.moneda || 'USD',
      params.capacidad_total,
      params.duracion_horas || null,
      params.incluye ? JSON.stringify(params.incluye) : null,
      'active',
      params.agency_id || agencia,
      userContext.id
    ]
  );

  return {
    success: true,
    message: 'Producto creado exitosamente',
    product: result.rows[0]
  };
}

/**
 * Actualizar producto
 */
async function updateProduct(params, agencia, role) {
  if (!['admin', 'agency_admin'].includes(role)) {
    return {
      success: false,
      error: 'No tienes permisos para actualizar productos'
    };
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['nombre', 'descripcion', 'precio_base', 'capacidad_total', 'estado'];

  for (const field of allowedFields) {
    if (params[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push(params[field]);
    }
  }

  if (updates.length === 0) {
    return {
      success: false,
      error: 'No hay campos para actualizar'
    };
  }

  updates.push(`updated_at = NOW()`);
  values.push(params.product_id);

  let queryText = `
    UPDATE public.products 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
  `;

  if (role !== 'admin' && agencia) {
    paramIndex++;
    queryText += ` AND agency_id = $${paramIndex}`;
    values.push(agencia);
  }

  queryText += ` RETURNING *`;

  const result = await query(queryText, values);

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Producto no encontrado o sin permisos'
    };
  }

  return {
    success: true,
    message: 'Producto actualizado',
    product: result.rows[0]
  };
}

/**
 * Actualizar inventario
 */
async function updateProductInventory(params, agencia, role) {
  if (!['admin', 'agency_admin'].includes(role)) {
    return {
      success: false,
      error: 'No tienes permisos para modificar inventario'
    };
  }

  // Obtener capacidad actual
  const current = await query(
    `SELECT capacidad_total, asientos_bloqueados FROM public.products WHERE id = $1`,
    [params.product_id]
  );

  if (current.rows.length === 0) {
    return {
      success: false,
      error: 'Producto no encontrado'
    };
  }

  const { capacidad_total, asientos_bloqueados } = current.rows[0];
  let newCapacity = capacidad_total;
  let newBlocked = asientos_bloqueados || 0;

  if (params.capacity_adjustment) {
    newCapacity += params.capacity_adjustment;
  }

  if (params.block_seats) {
    newBlocked += params.block_seats;
  }

  if (params.release_seats) {
    newBlocked = Math.max(0, newBlocked - params.release_seats);
  }

  const result = await query(
    `UPDATE public.products 
     SET capacidad_total = $1,
         asientos_bloqueados = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newCapacity, newBlocked, params.product_id]
  );

  return {
    success: true,
    message: 'Inventario actualizado',
    product: result.rows[0]
  };
}

/**
 * Obtener disponibilidad
 */
async function getProductAvailability(params) {
  const { product_id, date } = params;

  const result = await query(
    `SELECT 
      p.capacidad_total,
      p.estado,
      (SELECT COALESCE(SUM(r.pasajeros), 0) 
       FROM public.reservations r 
       WHERE r.product_id = p.id 
       AND ($2::date IS NULL OR r.fecha_vuelo = $2::date)
       AND r.estado IN ('pending', 'confirmed')) as reservados
     FROM public.products p
     WHERE p.id = $1`,
    [product_id, date]
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Producto no encontrado'
    };
  }

  const { capacidad_total, reservados, estado } = result.rows[0];

  return {
    success: true,
    availability: {
      total: capacidad_total,
      reserved: reservados,
      available: capacidad_total - reservados,
      status: estado,
      date: date || 'all_dates'
    }
  };
}

/**
 * Obtener estadísticas de producto
 */
async function getProductStats(params, agencia, role) {
  const { product_id, date_from, date_to } = params;

  // Verificar permisos
  if (role !== 'admin' && agencia) {
    const check = await query(
      `SELECT id FROM public.products WHERE id = $1 AND agency_id = $2`,
      [product_id, agencia]
    );
    if (check.rows.length === 0) {
      return {
        success: false,
        error: 'Producto no encontrado o sin permisos'
      };
    }
  }

  let queryText = `
    SELECT 
      COUNT(*) as total_reservas,
      SUM(pasajeros) as total_pasajeros,
      SUM(precio_total) as ingresos_totales,
      estado,
      moneda
    FROM public.reservations
    WHERE product_id = $1
  `;

  const values = [product_id];
  let paramIndex = 2;

  if (date_from) {
    queryText += ` AND fecha_creacion >= $${paramIndex++}`;
    values.push(date_from);
  }

  if (date_to) {
    queryText += ` AND fecha_creacion <= $${paramIndex++}`;
    values.push(date_to);
  }

  queryText += ` GROUP BY estado, moneda`;

  const result = await query(queryText, values);

  // Obtener info del producto
  const productInfo = await query(
    `SELECT nombre, capacidad_total, precio_base FROM public.products WHERE id = $1`,
    [product_id]
  );

  return {
    success: true,
    product: productInfo.rows[0],
    stats: result.rows
  };
}

/**
 * Buscar disponibilidad por ruta
 */
async function searchAvailabilityByRoute(params) {
  const { origen, destino, fecha, pasajeros } = params;

  let queryText = `
    SELECT 
      p.id,
      p.nombre,
      p.origen,
      p.destino,
      p.fecha_inicio,
      p.fecha_fin,
      p.precio_base,
      p.moneda,
      p.capacidad_total,
      a.nombre as agencia_nombre,
      (SELECT COALESCE(SUM(r.pasajeros), 0) 
       FROM public.reservations r 
       WHERE r.product_id = p.id 
       AND r.fecha_vuelo = $3
       AND r.estado IN ('pending', 'confirmed')) as reservados
    FROM public.products p
    LEFT JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.estado = 'active'
  `;

  const values = [];
  let paramIndex = 1;

  if (origen) {
    queryText += ` AND p.origen ILIKE $${paramIndex++}`;
    values.push(`%${origen}%`);
  }

  queryText += ` AND p.destino ILIKE $${paramIndex++}`;
  values.push(`%${destino}%`);

  queryText += ` AND (p.fecha_inicio IS NULL OR p.fecha_inicio <= $${paramIndex})`;
  queryText += ` AND (p.fecha_fin IS NULL OR p.fecha_fin >= $${paramIndex})`;
  values.push(fecha);
  paramIndex++;

  const result = await query(queryText, values);

  // Filtrar por disponibilidad
  const available = result.rows
    .map(p => ({
      ...p,
      disponibles: p.capacidad_total - p.reservados
    }))
    .filter(p => p.disponibles >= pasajeros);

  return {
    success: true,
    count: available.length,
    products: available
  };
}

export default {
  productToolDefinitions,
  executeProductTool
};