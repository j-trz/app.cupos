import { query } from '../db.js';

// Crear una nueva configuración de agencia
exports.createAgencyConfiguration = async (req, res) => {
  try {
    const { agency_id, configuration } = req.body;
    
    // Validación de datos
    if (!agency_id || !configuration) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }

    const result = await query(
      `INSERT INTO agency_configurations (agency_id, configuration) VALUES ($1, $2) RETURNING *`,
      [agency_id, configuration]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la configuración de agencia' });
  }
};

// Obtener todas las configuraciones de agencia
exports.getAllAgencyConfigurations = async (req, res) => {
  try {
    const result = await query('SELECT * FROM agency_configurations');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las configuraciones de agencia', details: err.message });
  }
};

// Obtener una configuración de agencia por ID
exports.getAgencyConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM agency_configurations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de agencia no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la configuración de agencia', details: err.message });
  }
};

// Actualizar una configuración de agencia por ID
exports.updateAgencyConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const { agency_id, configuration } = req.body;

    const result = await query(
      `UPDATE agency_configurations SET agency_id = $1, configuration = $2 WHERE id = $3 RETURNING *`,
      [agency_id, configuration, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de agencia no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la configuración de agencia', details: err.message });
  }
};

// Eliminar una configuración de agencia por ID
exports.deleteAgencyConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agency_configurations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de agencia no encontrada' });
    }
    res.status(200).json({ message: 'Configuración de agencia eliminada exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la configuración de agencia', details: err.message });
  }
};
