import { query } from '../db.js';

// Crear una nueva asignación de rol a usuario
exports.createUserRole = async (req, res) => {
  try {
    const { user_id, role_id } = req.body;

    const result = await query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) RETURNING *`,
      [user_id, role_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la asignación de rol a usuario' });
  }
};

// Obtener todas las asignaciones de rol a usuario
exports.getAllUserRoles = async (req, res) => {
  try {
    const result = await query('SELECT * FROM user_roles');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las asignaciones de rol a usuario' });
  }
};

// Obtener una asignación de rol a usuario por ID
exports.getUserRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM user_roles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asignación de rol a usuario no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la asignación de rol a usuario' });
  }
};

// Actualizar una asignación de rol a usuario por ID
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role_id } = req.body;

    const result = await query(
      `UPDATE user_roles SET user_id = $1, role_id = $2 WHERE id = $3 RETURNING *`,
      [user_id, role_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asignación de rol a usuario no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la asignación de rol a usuario' });
  }
};

// Eliminar una asignación de rol a usuario por ID
exports.deleteUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM user_roles WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asignación de rol a usuario no encontrada' });
    }
    res.status(200).json({ message: 'Asignación de rol a usuario eliminada exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la asignación de rol a usuario' });
  }
};
