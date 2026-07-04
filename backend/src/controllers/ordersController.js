import { query } from '../db.js';

// Crear una nueva reserva
exports.createReservation = async (req, res) => {
  try {
    const { 
      estado, pedido_id, agencia, contacto_nombre, contacto_email, contacto_telefono, 
      vuelo_codigo, vuelo_destino, vuelo_compania, vuelo_salida, vuelo_precio, 
      nombre_pasajero, apellido_pasajero, documento_pasajero, nacimiento_pasajero, 
      nacionalidad_pasajero, tipo_pasajero 
    } = req.body;

    const result = await query(
      `INSERT INTO reservations (
        estado, pedido_id, agencia, contacto_nombre, contacto_email, contacto_telefono, 
        vuelo_codigo, vuelo_destino, vuelo_compania, vuelo_salida, vuelo_precio, 
        nombre_pasajero, apellido_pasajero, documento_pasajero, nacimiento_pasajero, 
        nacionalidad_pasajero, tipo_pasajero
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        estado, pedido_id, agencia, contacto_nombre, contacto_email, contacto_telefono, 
        vuelo_codigo, vuelo_destino, vuelo_compania, vuelo_salida, vuelo_precio, 
        nombre_pasajero, apellido_pasajero, documento_pasajero, nacimiento_pasajero, 
        nacionalidad_pasajero, tipo_pasajero
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
};

// Obtener todas las reservas
exports.getAllReservations = async (req, res) => {
  try {
    const result = await query('SELECT * FROM reservations');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
};

// Obtener una reserva por ID
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la reserva' });
  }
};

// Actualizar una reserva por ID
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      estado, pedido_id, agencia, contacto_nombre, contacto_email, contacto_telefono, 
      vuelo_codigo, vuelo_destino, vuelo_compania, vuelo_salida, vuelo_precio, 
      nombre_pasajero, apellido_pasajero, documento_pasajero, nacimiento_pasajero, 
      nacionalidad_pasajero, tipo_pasajero 
    } = req.body;

    const result = await query(
      `UPDATE reservations SET 
        estado = $1, pedido_id = $2, agencia = $3, contacto_nombre = $4, contacto_email = $5, contacto_telefono = $6, 
        vuelo_codigo = $7, vuelo_destino = $8, vuelo_compania = $9, vuelo_salida = $10, vuelo_precio = $11, 
        nombre_pasajero = $12, apellido_pasajero = $13, documento_pasajero = $14, nacimiento_pasajero = $15, 
        nacionalidad_pasajero = $16, tipo_pasajero = $17 
      WHERE id = $18 RETURNING *`,
      [
        estado, pedido_id, agencia, contacto_nombre, contacto_email, contacto_telefono, 
        vuelo_codigo, vuelo_destino, vuelo_compania, vuelo_salida, vuelo_precio, 
        nombre_pasajero, apellido_pasajero, documento_pasajero, nacimiento_pasajero, 
        nacionalidad_pasajero, tipo_pasajero, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la reserva' });
  }
};

// Eliminar una reserva por ID
exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.status(200).json({ message: 'Reserva eliminada exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
};
