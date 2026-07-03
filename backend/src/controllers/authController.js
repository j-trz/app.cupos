import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Registro de un nuevo usuario en base de datos local
 * Útil cuando se ejecuta fuera de Supabase
 */
export const register = async (req, res) => {
  const { email, password, nombre, agencia, role, admin } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Email, password y nombre son requeridos.' });
  }

  try {
    // 1. Verificar si el usuario ya existe
    const existingUser = await query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya está registrado.' });
    }

    // 2. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insertar en auth.users
    const authInsert = await query(
      'INSERT INTO auth.users (email, encrypted_password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    const userId = authInsert.rows[0].id;

    // 4. Crear perfil en public.profiles
    const userRole = role || (admin ? 'admin' : 'agency_user');
    await query(
      'INSERT INTO public.profiles (id, email, nombre, agencia, admin, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, email, nombre, agencia || 'default', admin || false, userRole]
    );

    // 5. Inicializar registro en user_security_status
    await query('INSERT INTO public.user_security_status (user_id) VALUES ($1)', [userId]);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente.',
      userId
    });
  } catch (error) {
    console.error('❌ Error en registro de usuario:', error);
    res.status(500).json({ error: 'Error al registrar el usuario en el servidor.' });
  }
};

/**
 * Login local con email y password
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos.' });
  }

  try {
    // 1. Buscar en auth.users
    const userResult = await query('SELECT id, email, encrypted_password FROM auth.users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Registrar intento fallido genérico (no revelamos si existe el email por seguridad)
      await query('SELECT public.log_login_attempt(NULL, $1, $2, $3, FALSE, $4)', [
        email,
        ipAddress,
        userAgent,
        'Usuario no encontrado'
      ]);
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const authUser = userResult.rows[0];
    const userId = authUser.id;

    // 2. Comprobar estado de bloqueo llamando a la función Postgres
    const lockResult = await query('SELECT * FROM public.check_and_update_lock_status($1, $2)', [userId, email]);
    const securityStatus = lockResult.rows[0];

    if (securityStatus.is_locked) {
      const lockedUntil = securityStatus.locked_until;
      return res.status(423).json({
        error: `Cuenta temporalmente bloqueada por demasiados intentos fallidos. Intente nuevamente después de: ${new Date(lockedUntil).toLocaleTimeString()}`
      });
    }

    // 3. Comparar contraseñas
    // Si no tiene password encriptada (ej: creado en Supabase), pero existe de otra forma
    if (!authUser.encrypted_password) {
      return res.status(400).json({ error: 'Este usuario debe autenticarse usando Supabase Auth.' });
    }

    const isMatch = await bcrypt.compare(password, authUser.encrypted_password);
    if (!isMatch) {
      // Registrar intento fallido
      await query('SELECT public.log_login_attempt($1, $2, $3, $4, FALSE, $5)', [
        userId,
        email,
        ipAddress,
        userAgent,
        'Contraseña incorrecta'
      ]);

      // Volver a comprobar bloqueo para actualizar el conteo
      const reCheck = await query('SELECT * FROM public.check_and_update_lock_status($1, $2)', [userId, email]);
      const attemptsRemaining = reCheck.rows[0].attempts_remaining;

      return res.status(401).json({
        error: `Credenciales inválidas. Intentos restantes: ${attemptsRemaining}`
      });
    }

    // 4. Login exitoso - Obtener perfil
    const profileResult = await query('SELECT nombre, agencia, role, admin FROM public.profiles WHERE id = $1', [userId]);
    const profile = profileResult.rows[0] || {
      nombre: email.split('@')[0],
      agencia: 'default',
      role: 'agency_user',
      admin: false
    };

    // Registrar intento exitoso
    await query('SELECT public.log_login_attempt($1, $2, $3, $4, TRUE)', [userId, email, ipAddress, userAgent]);

    // Actualizar datos de login en user_security_status
    await query(
      `UPDATE public.user_security_status 
       SET failed_attempts_count = 0, last_login = NOW(), total_logins = total_logins + 1, is_locked = FALSE 
       WHERE user_id = $1`,
      [userId]
    );

    // 5. Generar token JWT
    const payload = {
      id: userId,
      email: authUser.email,
      nombre: profile.nombre,
      agencia: profile.agencia,
      role: profile.role,
      admin: profile.admin
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Guardar sesión en base de datos
    const sessionToken = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '7d' });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      'INSERT INTO public.user_sessions (user_id, session_token, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, sessionToken, ipAddress, userAgent, expiresAt]
    );

    res.status(200).json({
      success: true,
      token,
      sessionToken,
      user: payload
    });
  } catch (error) {
    console.error('❌ Error en login de usuario:', error);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
};

/**
 * Obtener perfil del usuario autenticado actual
 */
export const getProfile = async (req, res) => {
  try {
    const profileResult = await query(
      'SELECT id, email, nombre, agencia, role, admin, created_at, updated_at FROM public.profiles WHERE id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado.' });
    }

    res.status(200).json({
      success: true,
      profile: profileResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
};
