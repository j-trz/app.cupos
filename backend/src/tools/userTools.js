/**
 * Herramientas de IA para gestión de usuarios
 * Permite al agente IA interactuar con el sistema de usuarios
 */

import { query } from '../db.js';

/**
 * Definición de herramientas de usuarios para function calling
 */
export const userToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'search_users',
      description: 'Buscar usuarios por diferentes criterios (nombre, email, rol, estado, etc.)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Texto de búsqueda (nombre o email)'
          },
          role: {
            type: 'string',
            enum: ['admin', 'agency_admin', 'user'],
            description: 'Filtrar por rol'
          },
          status: {
            type: 'string',
            enum: ['active', 'locked', 'all'],
            description: 'Estado del usuario'
          },
          agency_id: {
            type: 'string',
            description: 'Filtrar por agencia'
          },
          has_2fa: {
            type: 'boolean',
            description: 'Filtrar por usuarios con 2FA habilitado'
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
      name: 'get_user_details',
      description: 'Obtener detalles completos de un usuario específico',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID del usuario'
          }
        },
        required: ['user_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_user',
      description: 'Crear un nuevo usuario en el sistema',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email del usuario'
          },
          password: {
            type: 'string',
            description: 'Contraseña temporal'
          },
          nombre: {
            type: 'string',
            description: 'Nombre del usuario'
          },
          role: {
            type: 'string',
            enum: ['admin', 'agency_admin', 'user'],
            description: 'Rol del usuario'
          },
          agencia_id: {
            type: 'string',
            description: 'ID de la agencia (si aplica)'
          },
          require_password_change: {
            type: 'boolean',
            description: 'Requerir cambio de contraseña en primer login'
          }
        },
        required: ['email', 'password', 'nombre', 'role']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_user',
      description: 'Actualizar datos de un usuario existente',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID del usuario'
          },
          nombre: {
            type: 'string',
            description: 'Nombre del usuario'
          },
          role: {
            type: 'string',
            enum: ['admin', 'agency_admin', 'user'],
            description: 'Rol del usuario'
          },
          agencia_id: {
            type: 'string',
            description: 'ID de la agencia'
          },
          status: {
            type: 'string',
            enum: ['active', 'locked'],
            description: 'Estado del usuario'
          }
        },
        required: ['user_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'unlock_user',
      description: 'Desbloquear una cuenta de usuario bloqueada',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID del usuario'
          }
        },
        required: ['user_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reset_user_password',
      description: 'Resetear la contraseña de un usuario',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID del usuario'
          },
          new_password: {
            type: 'string',
            description: 'Nueva contraseña temporal'
          },
          require_change: {
            type: 'boolean',
            description: 'Requerir cambio en próximo login'
          }
        },
        required: ['user_id', 'new_password']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_stats',
      description: 'Obtener estadísticas de usuarios',
      parameters: {
        type: 'object',
        properties: {
          group_by: {
            type: 'string',
            enum: ['role', 'agency', 'status', '2fa_status'],
            description: 'Agrupamiento de resultados'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_login_history',
      description: 'Obtener historial de inicios de sesión de un usuario',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID del usuario'
          },
          limit: {
            type: 'integer',
            description: 'Límite de resultados (default: 10)'
          }
        },
        required: ['user_id']
      }
    }
  }
];

/**
 * Ejecutar herramienta de usuarios
 */
export async function executeUserTool(toolName, parameters, userContext) {
  const { role, agencia } = userContext;

  // Solo admins globales pueden gestionar usuarios
  if (role !== 'admin') {
    return {
      success: false,
      error: 'No tienes permisos para gestionar usuarios'
    };
  }

  switch (toolName) {
    case 'search_users':
      return await searchUsers(parameters);
    case 'get_user_details':
      return await getUserDetails(parameters.user_id);
    case 'create_user':
      return await createUser(parameters);
    case 'update_user':
      return await updateUser(parameters);
    case 'unlock_user':
      return await unlockUser(parameters.user_id);
    case 'reset_user_password':
      return await resetUserPassword(parameters);
    case 'get_user_stats':
      return await getUserStats(parameters);
    case 'get_login_history':
      return await getLoginHistory(parameters);
    default:
      throw new Error(`Herramienta de usuarios no reconocida: ${toolName}`);
  }
}

/**
 * Buscar usuarios con filtros
 */
async function searchUsers(params) {
  let queryText = `
    SELECT 
      u.id,
      u.email,
      u.nombre,
      u.role,
      u.agencia,
      u.intentos_fallidos,
      u.bloqueado_hasta,
      u.two_factor_enabled,
      u.created_at,
      u.last_login,
      a.nombre as agencia_nombre,
      CASE 
        WHEN u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW() THEN 'locked'
        ELSE 'active'
      END as status
    FROM public.users u
    LEFT JOIN public.agencies a ON u.agencia::uuid = a.id
    WHERE 1=1
  `;

  const values = [];
  let paramIndex = 1;

  if (params.query) {
    queryText += ` AND (u.email ILIKE $${paramIndex} OR u.nombre ILIKE $${paramIndex})`;
    values.push(`%${params.query}%`);
    paramIndex++;
  }

  if (params.role) {
    queryText += ` AND u.role = $${paramIndex++}`;
    values.push(params.role);
  }

  if (params.status === 'locked') {
    queryText += ` AND u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()`;
  } else if (params.status === 'active') {
    queryText += ` AND (u.bloqueado_hasta IS NULL OR u.bloqueado_hasta <= NOW())`;
  }

  if (params.agency_id) {
    queryText += ` AND u.agencia::uuid = $${paramIndex++}`;
    values.push(params.agency_id);
  }

  if (params.has_2fa !== undefined) {
    queryText += ` AND u.two_factor_enabled = $${paramIndex++}`;
    values.push(params.has_2fa);
  }

  const limit = params.limit || 10;
  queryText += ` ORDER BY u.created_at DESC LIMIT $${paramIndex++}`;
  values.push(limit);

  const result = await query(queryText, values);

  return {
    success: true,
    count: result.rows.length,
    users: result.rows
  };
}

/**
 * Obtener detalles de un usuario
 */
async function getUserDetails(userId) {
  const result = await query(
    `SELECT 
      u.id,
      u.email,
      u.nombre,
      u.role,
      u.agencia,
      u.two_factor_enabled,
      u.created_at,
      u.updated_at,
      u.last_login,
      u.intentos_fallidos,
      u.bloqueado_hasta,
      a.nombre as agencia_nombre
     FROM public.users u
     LEFT JOIN public.agencies a ON u.agencia::uuid = a.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Usuario no encontrado'
    };
  }

  return {
    success: true,
    user: result.rows[0]
  };
}

/**
 * Crear nuevo usuario
 */
async function createUser(params) {
  // Verificar si el email ya existe
  const existing = await query(
    `SELECT id FROM public.users WHERE email = $1`,
    [params.email]
  );

  if (existing.rows.length > 0) {
    return {
      success: false,
      error: 'Ya existe un usuario con este email'
    };
  }

  // Hashear contraseña (en producción usar bcrypt)
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash(params.password, 10);

  const result = await query(
    `INSERT INTO public.users (
      email, 
      password, 
      nombre, 
      role, 
      agencia,
      require_password_change
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, nombre, role, agencia, created_at`,
    [
      params.email,
      hashedPassword,
      params.nombre,
      params.role,
      params.agencia_id || null,
      params.require_password_change !== false
    ]
  );

  return {
    success: true,
    message: 'Usuario creado exitosamente',
    user: result.rows[0]
  };
}

/**
 * Actualizar usuario
 */
async function updateUser(params) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['nombre', 'role', 'agencia_id', 'status'];
  const fieldMapping = {
    nombre: 'nombre',
    role: 'role',
    agencia_id: 'agencia',
    status: null // Manejo especial
  };

  for (const [key, column] of Object.entries(fieldMapping)) {
    if (params[key] !== undefined && column) {
      updates.push(`${column} = $${paramIndex++}`);
      values.push(params[key]);
    }
  }

  // Manejar status/bloqueo
  if (params.status === 'active') {
    updates.push(`bloqueado_hasta = NULL`);
    updates.push(`intentos_fallidos = 0`);
  } else if (params.status === 'locked') {
    // Bloquear por 24 horas
    updates.push(`bloqueado_hasta = NOW() + INTERVAL '24 hours'`);
  }

  if (updates.length === 0) {
    return {
      success: false,
      error: 'No hay campos para actualizar'
    };
  }

  updates.push(`updated_at = NOW()`);
  values.push(params.user_id);

  const result = await query(
    `UPDATE public.users 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, nombre, role, agencia, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Usuario no encontrado'
    };
  }

  return {
    success: true,
    message: 'Usuario actualizado',
    user: result.rows[0]
  };
}

/**
 * Desbloquear usuario
 */
async function unlockUser(userId) {
  const result = await query(
    `UPDATE public.users 
     SET bloqueado_hasta = NULL, 
         intentos_fallidos = 0,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, nombre`,
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Usuario no encontrado'
    };
  }

  return {
    success: true,
    message: 'Usuario desbloqueado exitosamente',
    user: result.rows[0]
  };
}

/**
 * Resetear contraseña
 */
async function resetUserPassword(params) {
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash(params.new_password, 10);

  const updates = ['password = $1'];
  const values = [hashedPassword];
  let paramIndex = 2;

  if (params.require_change !== false) {
    updates.push(`require_password_change = true`);
  }

  values.push(params.user_id);

  const result = await query(
    `UPDATE public.users 
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING id, email, nombre`,
    values
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Usuario no encontrado'
    };
  }

  return {
    success: true,
    message: 'Contraseña actualizada exitosamente',
    user: result.rows[0]
  };
}

/**
 * Obtener estadísticas de usuarios
 */
async function getUserStats(params) {
  const { group_by = 'role' } = params;

  let groupColumn;
  switch (group_by) {
    case 'role':
      groupColumn = 'u.role';
      break;
    case 'agency':
      groupColumn = 'a.nombre';
      break;
    case 'status':
      groupColumn = `CASE 
        WHEN u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW() THEN 'locked'
        ELSE 'active'
      END`;
      break;
    case '2fa_status':
      groupColumn = `CASE WHEN u.two_factor_enabled THEN 'enabled' ELSE 'disabled' END`;
      break;
    default:
      groupColumn = 'u.role';
  }

  const result = await query(
    `SELECT 
      ${groupColumn} as group_key,
      COUNT(*) as count
     FROM public.users u
     LEFT JOIN public.agencies a ON u.agencia::uuid = a.id
     GROUP BY ${groupColumn}
     ORDER BY count DESC`
  );

  return {
    success: true,
    group_by,
    stats: result.rows
  };
}

/**
 * Obtener historial de login
 */
async function getLoginHistory(params) {
  const { user_id, limit = 10 } = params;

  // Esta tabla puede no existir en todas las instalaciones
  try {
    const result = await query(
      `SELECT 
        id,
        ip_address,
        user_agent,
        success,
        created_at
       FROM public.login_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [user_id, limit]
    );

    return {
      success: true,
      count: result.rows.length,
      history: result.rows
    };
  } catch (error) {
    // Si la tabla no existe, retornar array vacío
    return {
      success: true,
      count: 0,
      history: [],
      note: 'Historial de login no disponible'
    };
  }
}

export default {
  userToolDefinitions,
  executeUserTool
};