import bcrypt from 'bcryptjs';
import { query } from '../db.js';

/**
 * Listar usuarios con paginación, filtros y ordenación
 */
export const listUsers = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
  const search = (req.query.search || '').trim();
  const sortBy = req.query.sortBy || 'created_at';
  const sortOrder = (req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const offset = (page - 1) * limit;

  try {
    let selectQuery = 'SELECT id, email, nombre, agencia, role, admin, created_at, updated_at FROM public.profiles';
    let countQuery = 'SELECT COUNT(*) FROM public.profiles';
    const queryParams = [];
    const countParams = [];

    if (search) {
      const searchPattern = `%${search}%`;
      selectQuery += ' WHERE email ILIKE $1 OR nombre ILIKE $1 OR agencia ILIKE $1';
      countQuery += ' WHERE email ILIKE $1 OR nombre ILIKE $1 OR agencia ILIKE $1';
      queryParams.push(searchPattern);
      countParams.push(searchPattern);
    }

    // Validación segura de columna para orden
    const allowedSortCols = ['id', 'email', 'nombre', 'agencia', 'role', 'admin', 'created_at', 'updated_at'];
    const finalSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'created_at';

    selectQuery += ` ORDER BY ${finalSortBy} ${sortOrder} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const dataResult = await query(selectQuery, queryParams);
    const countResult = await query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      users: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Error listando usuarios:', error);
    res.status(500).json({ error: 'Error al obtener listado de usuarios.' });
  }
};

/**
 * Crear un nuevo usuario (solo para administradores)
 */
export const createUser = async (req, res) => {
  const { email, password, nombre, agencia, role, admin } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Email, password y nombre son requeridos.' });
  }

  try {
    // 1. Verificar si ya existe
    const existing = await query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado.' });
    }

    // 2. Encriptar password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Crear usuario en auth.users
    const authInsert = await query(
      'INSERT INTO auth.users (email, encrypted_password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    const userId = authInsert.rows[0].id;

    // 4. Crear perfil
    const userRole = role || (admin ? 'admin' : 'agency_user');
    await query(
      'INSERT INTO public.profiles (id, email, nombre, agencia, admin, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, email, nombre, agencia || 'default', admin || false, userRole]
    );

    // 5. Inicializar seguridad
    await query('INSERT INTO public.user_security_status (user_id) VALUES ($1)', [userId]);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente.',
      userId
    });
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario.' });
  }
};

/**
 * Actualizar un usuario existente
 */
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, password, nombre, agencia, role, admin } = req.body;

  try {
    // 1. Verificar si existe
    const userCheck = await query('SELECT id FROM public.profiles WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // 2. Actualizar email y contraseña en auth.users si se proporcionan
    if (email) {
      await query('UPDATE auth.users SET email = $1, updated_at = NOW() WHERE id = $2', [email, id]);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await query('UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id]);
    }

    // 3. Actualizar perfil
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (email) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (nombre) {
      updates.push(`nombre = $${paramIndex++}`);
      params.push(nombre);
    }
    if (agencia) {
      updates.push(`agencia = $${paramIndex++}`);
      params.push(agencia);
    }
    if (role) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (typeof admin !== 'undefined') {
      updates.push(`admin = $${paramIndex++}`);
      params.push(admin);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(
        `UPDATE public.profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        params
      );
    }

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente.'
    });
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario.' });
  }
};

/**
 * Eliminar un usuario
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const userCheck = await query('SELECT id FROM public.profiles WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Eliminar de auth.users (el borrado en cascada se encargará del perfil y estados de seguridad)
    await query('DELETE FROM auth.users WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado correctamente.'
    });
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario.' });
  }
};

/**
 * Listar usuarios con cuentas bloqueadas
 */
export const listLockedUsers = async (req, res) => {
  try {
    const sql = `
      SELECT p.id, p.email, p.nombre, p.agencia, p.role,
             s.is_locked, s.locked_at, s.locked_reason, s.failed_attempts_count
      FROM public.user_security_status s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE s.is_locked = TRUE
    `;
    const result = await query(sql);

    res.status(200).json({
      success: true,
      lockedUsers: result.rows
    });
  } catch (error) {
    console.error('❌ Error listando usuarios bloqueados:', error);
    res.status(500).json({ error: 'Error al obtener usuarios bloqueados.' });
  }
};

/**
 * Desbloquear usuario
 */
export const unlockUser = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  try {
    await query('SELECT public.unlock_user($1, $2)', [id, adminId]);
    res.status(200).json({
      success: true,
      message: 'Usuario desbloqueado exitosamente.'
    });
  } catch (error) {
    console.error('❌ Error desbloqueando usuario:', error);
    res.status(500).json({ error: error.message || 'Error al desbloquear al usuario.' });
  }
};

/**
 * Listar usuarios con 2FA activo
 */
export const listUsers2FA = async (req, res) => {
  try {
    const sql = `
      SELECT p.id, p.email, p.nombre, p.agencia, p.role,
             s.two_factor_enabled, s.created_at as security_setup_date
      FROM public.user_security_status s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE s.two_factor_enabled = TRUE
    `;
    const result = await query(sql);

    res.status(200).json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('❌ Error listando usuarios 2FA:', error);
    res.status(500).json({ error: 'Error al obtener usuarios con 2FA.' });
  }
};
