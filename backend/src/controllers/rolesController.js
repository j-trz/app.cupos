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
    console.error(err);
    res.status(500).json({ error: 'Error al crear el rol' });
  }
};

// Obtener todos los roles
exports.getAllRoles = async (req, res) => {
  try {
    const result = await query('SELECT * FROM roles');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los roles' });
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
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el rol' });
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
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el rol' });
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
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el rol' });
  }
};
