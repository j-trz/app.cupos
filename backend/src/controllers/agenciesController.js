import { query } from '../db.js';

export const listAgencies = async (req, res) => {
  try {
    const result = await query('SELECT * FROM agencies ORDER BY name');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener agencias:', error);
    res.status(500).json({ error: 'Error al obtener las agencias', details: error.message });
  }
};

export const getAgency = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM agencies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agencia no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener agencia:', error);
    res.status(500).json({ error: 'Error al obtener la agencia', details: error.message });
  }
};

export const createAgency = async (req, res) => {
  try {
    const { code, name, email, address, color } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    }
    // Convert undefined to null for optional fields to avoid SQL errors
    const safeEmail = email ?? null;
    const safeAddress = address ?? null;
    const safeColor = color ?? '#3b82f6';
    const result = await query(
      'INSERT INTO agencies (code, name, email, address, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [code, name, safeEmail, safeAddress, safeColor]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear agencia:', error);
    res.status(500).json({ error: 'Error al crear la agencia', details: error.message });
  }
};

export const updateAgency = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, email, address, color } = req.body;
    // Use existing values if not provided - first fetch the agency
    const existingResult = await query('SELECT * FROM agencies WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agencia no encontrada' });
    }
    const existing = existingResult.rows[0];
    const safeCode = code ?? existing.code;
    const safeName = name ?? existing.name;
    const safeEmail = email ?? existing.email ?? null;
    const safeAddress = address ?? existing.address ?? null;
    const safeColor = color ?? existing.color ?? '#3b82f6';
    const result = await query(
      'UPDATE agencies SET code = $1, name = $2, email = $3, address = $4, color = $5 WHERE id = $6 RETURNING *',
      [safeCode, safeName, safeEmail, safeAddress, safeColor, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agencia no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar agencia:', error);
    res.status(500).json({ error: 'Error al actualizar la agencia', details: error.message });
  }
};

export const deleteAgency = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agencies WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agencia no encontrada' });
    }
    res.status(200).json({ message: 'Agencia eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar agencia:', error);
    res.status(500).json({ error: 'Error al eliminar la agencia', details: error.message });
  }
};
