import { query } from '../db.js';

// Crear un nuevo permiso
export const createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validación de datos
    if (!name) {
      return res.status(400).json({ error: 'Campo obligatorio faltante' });
    }

    const result = await query(
      `INSERT INTO permissions (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el permiso' });
  }
};

// Obtener todos los permisos
export const getAllPermissions = async (req, res) => {
  try {
    const result = await query('SELECT * FROM permissions');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los permisos', details: err.message });
  }
};

// Obtener un permiso por ID
export const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM permissions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el permiso', details: err.message });
  }
};

// Actualizar un permiso por ID
export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await query(
      `UPDATE permissions SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el permiso', details: err.message });
  }
};

// Eliminar un permiso por ID
export const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM permissions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    res.status(200).json({ message: 'Permiso eliminado exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el permiso', details: err.message });
  }
};

// Exportar todas las funciones como objeto por si se importan así
export default {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission
};