/**
 * Herramientas de IA para gestión de reservas
 * Permite al agente IA interactuar con el sistema de reservas
 */

import { query } from '../db.js';

/**
 * Definición de herramientas de reservas para function calling
 */
export const reservationToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'search_reservations',
      description: 'Buscar reservas por diferentes criterios (fecha, estado, cliente, etc.)',
      parameters: {
        type: 'object',
        properties: {
          date_from: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          date_to: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'cancelled', 'expired'],
            description: 'Estado de la reserva'
          },
          customer_email: {
            type: 'string',
            description: 'Email del cliente'
          },
          customer_name: {
            type: 'string',
            description: 'Nombre del cliente'
          },
          product_id: {
            type: 'string',
            description: 'ID del producto'
          },
          agency_id: {
            type: 'string',
            description: 'ID de la agencia'
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
      name: 'get_reservation_details',
      description: 'Obtener detalles completos de una reserva específica',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: {
            type: 'string',
            description: 'ID de la reserva'
          }
        },
        required: ['reservation_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_reservation',
      description: 'Crear una nueva reserva temporal',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto a reservar'
          },
          customer_name: {
            type: 'string',
            description: 'Nombre completo del cliente'
          },
          customer_email: {
            type: 'string',
            description: 'Email del cliente'
          },
          customer_phone: {
            type: 'string',
            description: 'Teléfono del cliente'
          },
          passengers: {
            type: 'integer',
            description: 'Número de pasajeros'
          },
          flight_date: {
            type: 'string',
            description: 'Fecha del vuelo (YYYY-MM-DD)'
          },
          flight_number: {
            type: 'string',
            description: 'Número de vuelo'
          },
          observations: {
            type: 'string',
            description: 'Observaciones adicionales'
          }
        },
        required: ['product_id', 'customer_name', 'customer_email', 'passengers', 'flight_date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_reservation',
      description: 'Actualizar datos de una reserva existente',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: {
            type: 'string',
            description: 'ID de la reserva'
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'cancelled'],
            description: 'Nuevo estado'
          },
          customer_name: {
            type: 'string',
            description: 'Nombre del cliente'
          },
          customer_email: {
            type: 'string',
            description: 'Email del cliente'
          },
          customer_phone: {
            type: 'string',
            description: 'Teléfono del cliente'
          },
          passengers: {
            type: 'integer',
            description: 'Número de pasajeros'
          },
          observations: {
            type: 'string',
            description: 'Observaciones'
          }
        },
        required: ['reservation_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'confirm_reservation',
      description: 'Confirmar una reserva pendiente',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: {
            type: 'string',
            description: 'ID de la reserva'
          }
        },
        required: ['reservation_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancel_reservation',
      description: 'Cancelar una reserva',
      parameters: {
        type: 'object',
        properties: {
          reservation_id: {
            type: 'string',
            description: 'ID de la reserva'
          },
          reason: {
            type: 'string',
            description: 'Motivo de cancelación'
          }
        },
        required: ['reservation_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Verificar disponibilidad de un producto para una fecha',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto'
          },
          date: {
            type: 'string',
            description: 'Fecha a consultar (YYYY-MM-DD)'
          },
          passengers: {
            type: 'integer',
            description: 'Número de pasajeros requeridos'
          }
        },
        required: ['product_id', 'date', 'passengers']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_reservation_stats',
      description: 'Obtener estadísticas de reservas por período',
      parameters: {
        type: 'object',
        properties: {
          date_from: {
            type: 'string',
            description: 'Fecha de inicio (YYYY-MM-DD)'
          },
          date_to: {
            type: 'string',
            description: 'Fecha de fin (YYYY-MM-DD)'
          },
          group_by: {
            type: 'string',
            enum: ['day', 'week', 'month', 'status', 'product', 'agency'],
            description: 'Agrupamiento de resultados'
          }
        }
      }
    }
  }
];

/**
 * Ejecutar herramienta de reservas
 */
export async function executeReservationTool(toolName, parameters, userContext) {
  const { agencia, role } = userContext;

  switch (toolName) {
    case 'search_reservations':
      return await searchReservations(parameters, agencia, role);
    case 'get_reservation_details':
      return await getReservationDetails(parameters.reservation_id, agencia, role);
    case 'create_reservation':
      return await createReservation(parameters, userContext);
    case 'update_reservation':
      return await updateReservation(parameters, agencia, role);
    case 'confirm_reservation':
      return await confirmReservation(parameters.reservation_id, userContext);
    case 'cancel_reservation':
      return await cancelReservation(parameters, userContext);
    case 'check_availability':
      return await checkAvailability(parameters);
    case 'get_reservation_stats':
      return await getReservationStats(parameters, agencia, role);
    default:
      throw new Error(`Herramienta de reservas no reconocida: ${toolName}`);
  }
}

/**
 * Buscar reservas con filtros
 */
async function searchReservations(params, agencia, role) {
  let queryText = `
    SELECT 
      r.id,
      r.estado,
      r.contacto_nombre,
      r.contacto_email,
      r.contacto_telefono,
      r.pasajeros,
      r.fecha_vuelo,
      r.numero_vuelo,
      r.fecha_creacion,
      r.precio_total,
      p.nombre as producto_nombre,
      a.nombre as agencia_nombre
    FROM public.reservations r
    LEFT JOIN public.products p ON r.product_id = p.id
    LEFT JOIN public.agencies a ON r.agency_id = a.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  // Filtrar por agencia si no es admin global
  if (role !== 'admin' && agencia) {
    queryText += ` AND r.agency_id = $${paramIndex++}`;
    values.push(agencia);
  }

  if (params.date_from) {
    queryText += ` AND r.fecha_vuelo >= $${paramIndex++}`;
    values.push(params.date_from);
  }

  if (params.date_to) {
    queryText += ` AND r.fecha_vuelo <= $${paramIndex++}`;
    values.push(params.date_to);
  }

  if (params.status) {
    queryText += ` AND r.estado = $${paramIndex++}`;
    values.push(params.status);
  }

  if (params.customer_email) {
    queryText += ` AND r.contacto_email ILIKE $${paramIndex++}`;
    values.push(`%${params.customer_email}%`);
  }

  if (params.customer_name) {
    queryText += ` AND r.contacto_nombre ILIKE $${paramIndex++}`;
    values.push(`%${params.customer_name}%`);
  }

  if (params.product_id) {
    queryText += ` AND r.product_id = $${paramIndex++}`;
    values.push(params.product_id);
  }

  if (params.agency_id && role === 'admin') {
    queryText += ` AND r.agency_id = $${paramIndex++}`;
    values.push(params.agency_id);
  }

  const limit = params.limit || 10;
  queryText += ` ORDER BY r.fecha_creacion DESC LIMIT $${paramIndex++}`;
  values.push(limit);

  const result = await query(queryText, values);

  return {
    success: true,
    count: result.rows.length,
    reservations: result.rows
  };
}

/**
 * Obtener detalles de una reserva
 */
async function getReservationDetails(reservationId, agencia, role) {
  let queryText = `
    SELECT 
      r.*,
      p.nombre as producto_nombre,
      p.descripcion as producto_descripcion,
      a.nombre as agencia_nombre
    FROM public.reservations r
    LEFT JOIN public.products p ON r.product_id = p.id
    LEFT JOIN public.agencies a ON r.agency_id = a.id
    WHERE r.id = $1
  `;

  const values = [reservationId];

  if (role !== 'admin' && agencia) {
    queryText += ` AND r.agency_id = $2`;
    values.push(agencia);
  }

  const result = await query(queryText, values);

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Reserva no encontrada o sin permisos'
    };
  }

  return {
    success: true,
    reservation: result.rows[0]
  };
}

/**
 * Crear nueva reserva
 */
async function createReservation(params, userContext) {
  const { id: userId, agencia: agencyId } = userContext;

  // Verificar disponibilidad primero
  const availability = await checkAvailability({
    product_id: params.product_id,
    date: params.flight_date,
    passengers: params.passengers
  });

  if (!availability.success || !availability.available) {
    return {
      success: false,
      error: 'No hay disponibilidad para los parámetros seleccionados',
      details: availability
    };
  }

  // Obtener precio del producto
  const productResult = await query(
    `SELECT precio_base, moneda FROM public.products WHERE id = $1`,
    [params.product_id]
  );

  if (productResult.rows.length === 0) {
    return {
      success: false,
      error: 'Producto no encontrado'
    };
  }

  const product = productResult.rows[0];
  const precioTotal = product.precio_base * params.passengers;

  // Crear reserva temporal
  const result = await query(
    `INSERT INTO public.reservations (
      product_id,
      agency_id,
      estado,
      contacto_nombre,
      contacto_email,
      contacto_telefono,
      pasajeros,
      fecha_vuelo,
      numero_vuelo,
      observaciones,
      precio_total,
      moneda,
      created_by
    ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      params.product_id,
      agencyId,
      params.customer_name,
      params.customer_email,
      params.customer_phone || null,
      params.passengers,
      params.flight_date,
      params.flight_number || null,
      params.observations || null,
      precioTotal,
      product.moneda || 'USD',
      userId
    ]
  );

  return {
    success: true,
    message: 'Reserva creada exitosamente',
    reservation: result.rows[0]
  };
}

/**
 * Actualizar reserva
 */
async function updateReservation(params, agencia, role) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'status', 'customer_name', 'customer_email', 
    'customer_phone', 'passengers', 'observations'
  ];

  const fieldMapping = {
    status: 'estado',
    customer_name: 'contacto_nombre',
    customer_email: 'contacto_email',
    customer_phone: 'contacto_telefono',
    passengers: 'pasajeros',
    observations: 'observaciones'
  };

  for (const [key, column] of Object.entries(fieldMapping)) {
    if (params[key] !== undefined) {
      updates.push(`${column} = $${paramIndex++}`);
      values.push(params[key]);
    }
  }

  if (updates.length === 0) {
    return {
      success: false,
      error: 'No hay campos para actualizar'
    };
  }

  updates.push(`updated_at = NOW()`);
  values.push(params.reservation_id);

  let queryText = `
    UPDATE public.reservations 
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
      error: 'Reserva no encontrada o sin permisos'
    };
  }

  return {
    success: true,
    message: 'Reserva actualizada',
    reservation: result.rows[0]
  };
}

/**
 * Confirmar reserva
 */
async function confirmReservation(reservationId, userContext) {
  const { agencia, role } = userContext;

  let queryText = `
    UPDATE public.reservations 
    SET estado = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND estado = 'pending'
  `;

  const values = [reservationId];

  if (role !== 'admin' && agencia) {
    queryText += ` AND agency_id = $2`;
    values.push(agencia);
  }

  queryText += ` RETURNING *`;

  const result = await query(queryText, values);

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Reserva no encontrada, sin permisos, o ya confirmada'
    };
  }

  return {
    success: true,
    message: 'Reserva confirmada exitosamente',
    reservation: result.rows[0]
  };
}

/**
 * Cancelar reserva
 */
async function cancelReservation(params, userContext) {
  const { agencia, role } = userContext;

  let queryText = `
    UPDATE public.reservations 
    SET estado = 'cancelled', 
        observaciones = COALESCE(observaciones || E'\\n\\n', '') || 'Cancelada: ' || COALESCE($2, 'Sin motivo'),
        updated_at = NOW()
    WHERE id = $1 AND estado IN ('pending', 'confirmed')
  `;

  const values = [params.reservation_id, params.reason];

  if (role !== 'admin' && agencia) {
    queryText += ` AND agency_id = $3`;
    values.push(agencia);
  }

  queryText += ` RETURNING *`;

  const result = await query(queryText, values);

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Reserva no encontrada, sin permisos, o no cancelable'
    };
  }

  return {
    success: true,
    message: 'Reserva cancelada',
    reservation: result.rows[0]
  };
}

/**
 * Verificar disponibilidad
 */
async function checkAvailability(params) {
  const { product_id, date, passengers } = params;

  // Obtener capacidad del producto
  const productResult = await query(
    `SELECT 
      capacidad_total,
      (SELECT COALESCE(SUM(pasajeros), 0) 
       FROM public.reservations 
       WHERE product_id = $1 
       AND fecha_vuelo = $2 
       AND estado IN ('pending', 'confirmed')) as reservados
     FROM public.products 
     WHERE id = $1`,
    [product_id, date]
  );

  if (productResult.rows.length === 0) {
    return {
      success: false,
      error: 'Producto no encontrado'
    };
  }

  const { capacidad_total, reservados } = productResult.rows[0];
  const disponibles = capacidad_total - reservados;

  return {
    success: true,
    available: disponibles >= passengers,
    capacity: {
      total: capacidad_total,
      reserved: reservados,
      available: disponibles,
      requested: passengers
    }
  };
}

/**
 * Obtener estadísticas de reservas
 */
async function getReservationStats(params, agencia, role) {
  const { date_from, date_to, group_by = 'status' } = params;

  let groupColumn;
  switch (group_by) {
    case 'day':
      groupColumn = "DATE(r.fecha_creacion)";
      break;
    case 'week':
      groupColumn = "DATE_TRUNC('week', r.fecha_creacion)";
      break;
    case 'month':
      groupColumn = "DATE_TRUNC('month', r.fecha_creacion)";
      break;
    case 'status':
      groupColumn = "r.estado";
      break;
    case 'product':
      groupColumn = "p.nombre";
      break;
    case 'agency':
      groupColumn = "a.nombre";
      break;
    default:
      groupColumn = "r.estado";
  }

  let queryText = `
    SELECT 
      ${groupColumn} as group_key,
      COUNT(*) as count,
      SUM(r.pasajeros) as total_passengers,
      SUM(r.precio_total) as total_revenue
    FROM public.reservations r
    LEFT JOIN public.products p ON r.product_id = p.id
    LEFT JOIN public.agencies a ON r.agency_id = a.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  if (role !== 'admin' && agencia) {
    queryText += ` AND r.agency_id = $${paramIndex++}`;
    values.push(agencia);
  }

  if (date_from) {
    queryText += ` AND r.fecha_creacion >= $${paramIndex++}`;
    values.push(date_from);
  }

  if (date_to) {
    queryText += ` AND r.fecha_creacion <= $${paramIndex++}`;
    values.push(date_to);
  }

  queryText += ` GROUP BY ${groupColumn} ORDER BY count DESC`;

  const result = await query(queryText, values);

  return {
    success: true,
    group_by,
    stats: result.rows
  };
}

export default {
  reservationToolDefinitions,
  executeReservationTool
};