import { query } from '../db.js';

export const listAlertRules = async (req, res) => {
  try {
    const result = await query('SELECT * FROM public.alert_rules ORDER BY created_at DESC');
    res.status(200).json({ alertRules: result.rows });
  } catch (error) {
    console.error('❌ Error listando alert rules:', error.message);
    res.status(500).json({ error: 'Error al obtener las reglas de alerta.' });
  }
};

export const getAlertRuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM public.alert_rules WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regla de alerta no encontrada.' });
    }
    res.status(200).json({ alertRule: result.rows[0] });
  } catch (error) {
    console.error('❌ Error obteniendo alert rule:', error.message);
    res.status(500).json({ error: 'Error al obtener la regla de alerta.' });
  }
};

export const createAlertRule = async (req, res) => {
  try {
    const { product_id, threshold_quantity, actions, send_email_to_admin, send_email_to_agency, is_active } = req.body;

    if (!product_id || !threshold_quantity || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ error: 'product_id, threshold_quantity y actions son requeridos.' });
    }

    const result = await query(
      `INSERT INTO public.alert_rules (
        product_id, threshold_quantity, actions, send_email_to_admin, send_email_to_agency, is_active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb) RETURNING *`,
      [product_id, threshold_quantity, actions, Boolean(send_email_to_admin), Boolean(send_email_to_agency), is_active !== false]
    );

    res.status(201).json({ alertRule: result.rows[0] });
  } catch (error) {
    console.error('❌ Error creando alert rule:', error.message);
    res.status(500).json({ error: 'Error al crear la regla de alerta.' });
  }
};

export const updateAlertRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { threshold_quantity, actions, send_email_to_admin, send_email_to_agency, is_active } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (threshold_quantity !== undefined) {
      updates.push(`threshold_quantity = $${idx++}`);
      params.push(threshold_quantity);
    }
    if (actions !== undefined) {
      updates.push(`actions = $${idx++}`);
      params.push(actions);
    }
    if (send_email_to_admin !== undefined) {
      updates.push(`send_email_to_admin = $${idx++}`);
      params.push(Boolean(send_email_to_admin));
    }
    if (send_email_to_agency !== undefined) {
      updates.push(`send_email_to_agency = $${idx++}`);
      params.push(Boolean(send_email_to_agency));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    params.push(id);
    const result = await query(
      `UPDATE public.alert_rules SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regla de alerta no encontrada.' });
    }

    res.status(200).json({ alertRule: result.rows[0] });
  } catch (error) {
    console.error('❌ Error actualizando alert rule:', error.message);
    res.status(500).json({ error: 'Error al actualizar la regla de alerta.' });
  }
};

export const deleteAlertRule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM public.alert_rules WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regla de alerta no encontrada.' });
    }
    res.status(200).json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('❌ Error eliminando alert rule:', error.message);
    res.status(500).json({ error: 'Error al eliminar la regla de alerta.' });
  }
};