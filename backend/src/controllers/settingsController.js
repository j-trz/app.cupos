import { query } from '../db.js';

export const listSettings = async (req, res) => {
  try {
    const result = await query('SELECT * FROM public.system_settings ORDER BY key ASC');
    res.status(200).json({ settings: result.rows });
  } catch (error) {
    console.error('❌ Error listando settings:', error.message);
    res.status(500).json({ error: 'Error al obtener configuración del sistema.' });
  }
};

export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const result = await query('SELECT * FROM public.system_settings WHERE key = $1 LIMIT 1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada.' });
    }
    res.status(200).json({ setting: result.rows[0] });
  } catch (error) {
    console.error('❌ Error obteniendo setting:', error.message);
    res.status(500).json({ error: 'Error al obtener configuración del sistema.' });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value === 'undefined') {
      return res.status(400).json({ error: 'El valor de la configuración es requerido.' });
    }

    const existing = await query('SELECT key FROM public.system_settings WHERE key = $1', [key]);
    if (existing.rows.length === 0) {
      await query('INSERT INTO public.system_settings (key, value) VALUES ($1, $2)', [key, value]);
    } else {
      await query('UPDATE public.system_settings SET value = $2, updated_at = NOW() WHERE key = $1', [key, value]);
    }

    res.status(200).json({ success: true, message: 'Configuración actualizada correctamente.' });
  } catch (error) {
    console.error('❌ Error actualizando setting:', error.message);
    res.status(500).json({ error: 'Error al actualizar configuración del sistema.' });
  }
};