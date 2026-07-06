import { query } from '../db.js';
import {
  createTemporaryReservation,
  serializeReservation,
  expireTemporaryReservations,
  confirmTemporaryReservation
} from '../services/reservationService.js';
import { sendTemplateEmail } from '../services/emailService.js';

const enforceReservationScope = (reservations, user) => {
  if (user.role === 'admin') return reservations;
  if (user.role === 'agency_admin') {
    return reservations.filter((reservation) => reservation.agencia === user.agencia);
  }
  return reservations.filter((reservation) => reservation.created_by === user.id);
};

const sanitizeReservation = (reservation, user) => {
  const isAdmin = user.role === 'admin';
  return serializeReservation(reservation, isAdmin);
};

export const createReservation = async (req, res) => {
  try {
    const reservation = await createTemporaryReservation({
      productId: Number(req.body.product_id),
      createdBy: req.user.id,
      body: req.body
    });

    res.status(201).json(sanitizeReservation(reservation, req.user));
  } catch (error) {
    console.error('❌ Error al crear reserva temporal:', error.message);
    res.status(400).json({ error: error.message });
  }
};

export const getAllReservations = async (req, res) => {
  try {
    // Primero, verificar qué columnas existen en la tabla
    const columnsResult = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'reservations' AND column_name IN ('created_at', 'updated_at', 'fecha_creacion')
    `);
    const availableColumns = columnsResult.rows.map(r => r.column_name);
    const orderColumn = availableColumns.find(col => ['created_at', 'updated_at', 'fecha_creacion'].includes(col)) || 'id';

    console.log('📋 Columnas de tiempo disponibles:', availableColumns);
    console.log('📋 Ordenando por:', orderColumn);

    let sql = `SELECT * FROM reservations ORDER BY ${orderColumn} DESC`;
    let params = [];

    if (req.user.role === 'agency_admin') {
      sql = `SELECT * FROM reservations WHERE agencia = $1 ORDER BY ${orderColumn} DESC`;
      params = [req.user.agencia];
    } else if (req.user.role !== 'admin') {
      sql = `SELECT * FROM reservations WHERE created_by = $1 ORDER BY ${orderColumn} DESC`;
      params = [req.user.id];
    }

    console.log('📋 Ejecutando consulta:', sql, 'params:', params);
    const result = await query(sql, params);
    console.log('📋 Resultado:', result?.rows?.length || 0, 'filas');
    const rows = result?.rows || [];
    const sanitized = rows.map((reservation) => sanitizeReservation(reservation, req.user));
    res.status(200).json(sanitized);
  } catch (error) {
    console.error('❌ Error detallado al obtener reservas:', error);
    console.error('❌ SQL State:', error.code);
    res.status(500).json({ error: 'Error al obtener las reservas.', details: error.message });
  }
};

export const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM reservations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const reservation = result.rows[0];
    const scoped = enforceReservationScope([reservation], req.user);
    if (scoped.length === 0) {
      return res.status(403).json({ error: 'Acceso prohibido a esta reserva.' });
    }

    res.status(200).json(sanitizeReservation(reservation, req.user));
  } catch (error) {
    console.error('❌ Error al obtener reserva:', error.message);
    res.status(500).json({ error: 'Error al obtener la reserva.' });
  }
};

export const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, pedido_id, contacto_nombre, contacto_email, contacto_telefono, ficha_venta, doc_contable } = req.body;

    const allowedFields = [];
    const params = [];
    let setClause = '';
    let index = 1;

    if (estado) {
      allowedFields.push(`estado = $${index++}`);
      params.push(estado);
    }
    if (pedido_id) {
      allowedFields.push(`pedido_id = $${index++}`);
      params.push(pedido_id);
    }
    if (contacto_nombre) {
      allowedFields.push(`contacto_nombre = $${index++}`);
      params.push(contacto_nombre);
    }
    if (contacto_email) {
      allowedFields.push(`contacto_email = $${index++}`);
      params.push(contacto_email);
    }
    if (contacto_telefono) {
      allowedFields.push(`contacto_telefono = $${index++}`);
      params.push(contacto_telefono);
    }
    if (ficha_venta !== undefined) {
      allowedFields.push(`ficha_venta = $${index++}`);
      params.push(ficha_venta);
    }
    if (doc_contable !== undefined) {
      allowedFields.push(`doc_contable = $${index++}`);
      params.push(doc_contable);
      // Al agregar doc_contable, marcamos como confirmado por usuario y setteamos la fecha
      allowedFields.push(`doc_contable_added_at = $${index++}`);
      params.push(new Date());
      allowedFields.push(`confirmada_por_usuario = $${index++}`);
      params.push(true);
    }

    if (allowedFields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar.' });
    }

    setClause = allowedFields.join(', ');
    params.push(id);

    const result = await query(`UPDATE reservations SET ${setClause}, updated_at = NOW() WHERE id = $${index} RETURNING *`, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    res.status(200).json(sanitizeReservation(result.rows[0], req.user));
  } catch (error) {
    console.error('❌ Error al actualizar reserva:', error.message);
    res.status(500).json({ error: 'Error al actualizar la reserva.' });
  }
};

/**
 * Agregar documento contable a una reserva bloqueada
 */
export const addDocContable = async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_contable, ficha_venta } = req.body;

    if (!doc_contable) {
      return res.status(400).json({ error: 'El documento contable es requerido.' });
    }

    // Verificar que la reserva existe y pertenece al usuario
    const result = await query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const reservation = result.rows[0];
    
    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'agency_admin' && reservation.created_by !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar esta reserva.' });
    }

    // Verificar que la reserva esté en estado de bloqueo temporal
    if (reservation.estado !== 'bloqueo_temporal') {
      return res.status(400).json({ error: 'La reserva no está en estado de bloqueo temporal.' });
    }

    // Actualizar con el documento contable
    const updateResult = await query(
      `UPDATE reservations
       SET doc_contable = $1,
           doc_contable_added_at = NOW(),
           confirmada_por_usuario = TRUE,
           ficha_venta = COALESCE($2, ficha_venta),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [doc_contable, ficha_venta || null, id]
    );

    res.status(200).json({
      success: true,
      message: 'Documento contable agregado correctamente.',
      reservation: sanitizeReservation(updateResult.rows[0], req.user)
    });
  } catch (error) {
    console.error('❌ Error al agregar documento contable:', error.message);
    res.status(500).json({ error: 'Error al agregar el documento contable.' });
  }
};

/**
 * Obtener reservas bloqueadas pendientes de documento contable del usuario
 */
export const getMyBlockedReservations = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM reservations
       WHERE created_by = $1
         AND estado = 'bloqueo_temporal'
         AND (doc_contable IS NULL OR doc_contable = '')
       ORDER BY bloqueo_expira_at ASC`,
      [req.user.id]
    );

    const reservations = result.rows.map(r => sanitizeReservation(r, req.user));
    res.status(200).json(reservations);
  } catch (error) {
    console.error('❌ Error al obtener reservas bloqueadas:', error.message);
    res.status(500).json({ error: 'Error al obtener las reservas bloqueadas.' });
  }
};

export const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    res.status(200).json({ success: true, deleted: sanitizeReservation(result.rows[0], req.user) });
  } catch (error) {
    console.error('❌ Error al eliminar reserva:', error.message);
    res.status(500).json({ error: 'Error al eliminar la reserva.' });
  }
};

export const confirmReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const confirmed = await confirmTemporaryReservation(Number(id));
    res.status(200).json(sanitizeReservation(confirmed, req.user));
  } catch (error) {
    console.error('❌ Error al confirmar reserva:', error.message);
    res.status(400).json({ error: error.message });
  }
};

export const resendReservationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const reservationResult = await query('SELECT * FROM reservations WHERE id = $1', [id]);

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const reservation = reservationResult.rows[0];
    await sendTemplateEmail('reservation_details', reservation.contacto_email, {
      nombre_usuario: reservation.contacto_nombre,
      pedido_id: reservation.pedido_id,
      product_code: reservation.product_id,
      vuelo_codigo: reservation.vuelo_codigo,
      vuelo_destino: reservation.vuelo_destino,
      vuelo_compania: reservation.vuelo_compania,
      vuelo_salida: reservation.vuelo_salida,
      precio_venta: reservation.precio_venta
    });

    res.status(200).json({ success: true, message: 'Email de detalle enviado correctamente.' });
  } catch (error) {
    console.error('❌ Error reenviando email de reserva:', error.message);
    res.status(500).json({ error: 'Error al reenviar el email de reserva.' });
  }
};

export const expireReservationsViaCron = async (req, res) => {
  try {
    const processed = await expireTemporaryReservations();
    res.status(200).json({ success: true, processed });
  } catch (error) {
    console.error('❌ Error en expiración cron de reservas:', error.message);
    res.status(500).json({ error: 'Error al procesar la expiración de reservas.' });
  }
};

