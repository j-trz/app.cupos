import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware para autenticar usuarios vía JWT
 * Soporta tanto tokens locales firmados por la API, como tokens de Supabase Auth
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Se requiere token Bearer.' });
  }

  const token = authHeader.split(' ')[1];

  // 1. Intentar validar con la clave secreta JWT local de la API
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    req.user = decoded;
    return next();
  } catch (localError) {
    // Si falla, intentamos validar como token de Supabase si la clave secreta de Supabase está configurada
    if (process.env.SUPABASE_JWT_SECRET) {
      try {
        const decodedSupabase = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        
        // Mapear campos de Supabase al formato estándar de req.user
        // Supabase JWT típicamente guarda la metadata en decoded.user_metadata
        req.user = {
          id: decodedSupabase.sub, // sub es el user_id de Supabase
          email: decodedSupabase.email,
          role: decodedSupabase.user_metadata?.role || decodedSupabase.role || 'agency_user',
          agencia: decodedSupabase.user_metadata?.agencia || decodedSupabase.user_metadata?.agency || 'default'
        };
        return next();
      } catch (supabaseError) {
        console.error('❌ Error de validación de token de Supabase:', supabaseError.message);
      }
    }
    
    console.error('❌ Error de validación de token local:', localError.message);
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware para requerir rol de Administrador
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado. Se requiere autenticación.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso prohibido. Se requiere rol de administrador.' });
  }

  next();
};

/**
 * Middleware para requerir rol de Agency Admin o Administrador
 */
export const isAgencyAdminOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado. Se requiere autenticación.' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'agency_admin') {
    return res.status(403).json({ error: 'Acceso prohibido. Permisos insuficientes.' });
  }

  next();
};

/**
 * Middleware para verificar permisos granulares
 * @param {string|string[]} permissionCodes - Código(s) de permiso requerido(s)
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.requireAll - Si es true, requiere todos los permisos (default: false - requiere al menos uno)
 * @param {boolean} options.allowAdmin - Si los admins siempre tienen acceso (default: true)
 */
export const requirePermission = (permissionCodes, options = {}) => {
  const { requireAll = false, allowAdmin = true } = options;
  
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado. Se requiere autenticación.' });
    }

    // Los administradores siempre tienen acceso si allowAdmin está habilitado
    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }

    // Convertir a array si es un solo código
    const requiredCodes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];

    if (requiredCodes.length === 0) {
      return next();
    }

    try {
      // Obtener permisos del usuario desde la base de datos
      const { query } = await import('../db.js');
      
      const result = await query(`
        SELECT DISTINCT p.code
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        INNER JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = $1 AND p.is_active = true
      `, [req.user.id]);

      const userPermissions = result.rows.map(row => row.code);

      // Verificar si tiene los permisos requeridos
      const hasPermission = requireAll
        ? requiredCodes.every(code => userPermissions.includes(code))
        : requiredCodes.some(code => userPermissions.includes(code));

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Acceso prohibido. Permisos insuficientes.',
          required: requiredCodes,
          message: `Se requiere ${requireAll ? 'todos los permisos' : 'al menos uno de los permisos'}: ${requiredCodes.join(', ')}`
        });
      }

      // Adjuntar permisos al request para uso posterior
      req.userPermissions = userPermissions;
      next();
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return res.status(500).json({ error: 'Error al verificar permisos.' });
    }
  };
};

/**
 * Middleware para verificar si el usuario tiene algún rol de una lista
 * @param {string[]} allowedRoles - Array de roles permitidos
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado. Se requiere autenticación.' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso prohibido. Rol insuficiente.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware para proteger endpoints internos/cron con token secreto.
 */
export const requireInternalToken = (req, res, next) => {
  const token = req.headers['x-internal-token'] || req.headers['x-cron-token'] || req.headers.authorization?.split(' ')[1];
  const expected = process.env.INTERNAL_CRON_TOKEN;

  if (!expected) {
    return res.status(500).json({ error: 'Configuración interna de cron no definida.' });
  }

  if (!token || token !== expected) {
    return res.status(403).json({ error: 'Token interno inválido.' });
  }

  next();
};
