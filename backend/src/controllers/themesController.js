import { query } from '../db.js';

// Crear un nuevo tema
export const createTheme = async (req, res) => {
  try {
    const { name, colors, fonts, logo } = req.body;
    
    // Validación de datos
    if (!name || !colors || !fonts) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
    
    const result = await query(
      `INSERT INTO themes (name, colors, fonts, logo) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, colors, fonts, logo]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('💥 Error al crear el tema:', err.stack);
    res.status(500).json({ error: 'Error al crear el tema', details: err.message || 'Detalles no disponibles' });
  }
};

// Obtener todos los temas
export const getAllThemes = async (req, res) => {
  try {
    const result = await query('SELECT * FROM themes');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('💥 Error al obtener los temas:', err.stack);
    res.status(500).json({ error: 'Error al obtener los temas', details: err.message || 'Detalles no disponibles' });
  }
};

// Obtener un tema por ID
export const getThemeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM themes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tema no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('💥 Error al obtener el tema:', err.stack);
    res.status(500).json({ error: 'Error al obtener el tema', details: err.message || 'Detalles no disponibles' });
  }
};

// Actualizar un tema por ID
export const updateTheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, colors, fonts, logo } = req.body;

    const result = await query(
      `UPDATE themes SET name = $1, colors = $2, fonts = $3, logo = $4 WHERE id = $5 RETURNING *`,
      [name, colors, fonts, logo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tema no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('💥 Error al actualizar el tema:', err.stack);
    res.status(500).json({ error: 'Error al actualizar el tema', details: err.message || 'Detalles no disponibles' });
  }
};

// Eliminar un tema por ID
export const deleteTheme = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM themes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tema no encontrado' });
    }
    res.status(200).json({ message: 'Tema eliminado exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error('💥 Error al eliminar el tema:', err.stack);
    res.status(500).json({ error: 'Error al eliminar el tema', details: err.message || 'Detalles no disponibles' });
  }
};
