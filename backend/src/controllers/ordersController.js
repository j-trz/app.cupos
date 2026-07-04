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
    let sql = 'SELECT * FROM reservations ORDER BY created_at DESC';
    let params = [];

    if (req.user.role === 'agency_admin') {
      sql = 'SELECT * FROM reservations WHERE agencia = $1 ORDER BY created_at DESC';
      params = [req.user.agencia];
    } else if (req.user.role !== 'admin') {
      sql = 'SELECT * FROM reservations WHERE created_by = $1 ORDER BY created_at DESC';
      params = [req.user.id];
    }

    const result = await query(sql, params);
    const sanitized = result.rows.map((reservation) => sanitizeReservation(reservation, req.user));
    res.status(200).json(sanitized);
  } catch (error) {
    console.error('❌ Error al obtener reservas:', error.message);
    res.status(500).json({ error: 'Error al obtener las reservas.' });
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
    const { estado, pedido_id, contacto_nombre, contacto_email, contacto_telefono } = req.body;

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

