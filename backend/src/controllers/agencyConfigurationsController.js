import { query } from '../db.js';

// Crear una nueva configuración de agencia
exports.createAgencyConfiguration = async (req, res) => {
  try {
    const { agency_id, configuration } = req.body;

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
    res.status(500).json({ error: 'Error al obtener las configuraciones de agencia' });
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
    res.status(500).json({ error: 'Error al obtener la configuración de agencia' });
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
    res.status(500).json({ error: 'Error al actualizar la configuración de agencia' });
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
    res.status(500).json({ error: 'Error al eliminar la configuración de agencia' });
  }
};

// Crear una nueva configuración de tema de agencia
exports.createAgencyThemeConfig = async (req, res) => {
  try {
    const { agency_id, theme_id, configuration } = req.body;

    const result = await query(
      `INSERT INTO agency_theme_configs (agency_id, theme_id, configuration) VALUES ($1, $2, $3) RETURNING *`,
      [agency_id, theme_id, configuration]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la configuración de tema de agencia' });
  }
};

// Obtener todas las configuraciones de tema de agencia
exports.getAllAgencyThemeConfigs = async (req, res) => {
  try {
    const result = await query('SELECT * FROM agency_theme_configs');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las configuraciones de tema de agencia' });
  }
};

// Obtener una configuración de tema de agencia por ID
exports.getAgencyThemeConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM agency_theme_configs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de tema de agencia no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la configuración de tema de agencia' });
  }
};

// Actualizar una configuración de tema de agencia por ID
exports.updateAgencyThemeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { agency_id, theme_id, configuration } = req.body;

    const result = await query(
      `UPDATE agency_theme_configs SET agency_id = $1, theme_id = $2, configuration = $3 WHERE id = $4 RETURNING *`,
      [agency_id, theme_id, configuration, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de tema de agencia no encontrada' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la configuración de tema de agencia' });
  }
};

// Eliminar una configuración de tema de agencia por ID
exports.deleteAgencyThemeConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agency_theme_configs WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración de tema de agencia no encontrada' });
    }
    res.status(200).json({ message: 'Configuración de tema de agencia eliminada exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la configuración de tema de agencia' });
  }
};
