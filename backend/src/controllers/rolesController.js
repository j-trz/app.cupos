import { query } from '../db.js';

// Crear un nuevo rol
exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    const result = await query(
      `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('💥 Error al crear el rol:', err.stack);
    res.status(500).json({ error: 'Error al crear el rol', details: err.message || 'Detalles no disponibles' });
  }
};

// Obtener todos los roles
exports.getAllRoles = async (req, res) => {
  try {
    const result = await query('SELECT * FROM roles');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('💥 Error al obtener los roles:', err.stack);
    res.status(500).json({ error: 'Error al obtener los roles', details: err.message || 'Detalles no disponibles' });
  }
};

// Obtener un rol por ID
exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM roles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('💥 Error al obtener el rol:', err.stack);
    res.status(500).json({ error: 'Error al obtener el rol', details: err.message || 'Detalles no disponibles' });
  }
};

// Actualizar un rol por ID
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await query(
      `UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('💥 Error al actualizar el rol:', err.stack);
    res.status(500).json({ error: 'Error al actualizar el rol', details: err.message || 'Detalles no disponibles' });
  }
};

// Eliminar un rol por ID
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM roles WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.status(200).json({ message: 'Rol eliminado exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error('💥 Error al eliminar el rol:', err.stack);
    res.status(500).json({ error: 'Error al eliminar el rol', details: err.message || 'Detalles no disponibles' });
  }
};
