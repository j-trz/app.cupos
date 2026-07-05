import { query } from '../db.js';

/**
 * Obtener configuración de marca blanca de la agencia del usuario autenticado
 * GET /api/white-label/config
 */
export const getConfig = async (req, res) => {
  try {
    // Obtener agencia del usuario autenticado
    const agencyId = req.user?.agencia || 'default';
    
    const result = await query(
      `SELECT * FROM public.white_label_configs
       WHERE agency_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      // Retornar configuración por defecto si no existe
      const defaultConfig = {
        primary_color: '#3b82f6',
        primary_hover_color: '#2563eb',
        secondary_color: '#64748b',
        secondary_hover_color: '#475569',
        accent_color: '#f59e0b',
        background_color: '#f8fafc',
        surface_color: '#ffffff',
        text_primary_color: '#0f172a',
        text_secondary_color: '#64748b',
        border_color: '#e2e8f0',
        success_color: '#22c55e',
        warning_color: '#f59e0b',
        error_color: '#ef4444',
        info_color: '#3b82f6',
        font_heading: 'Inter',
        font_body: 'Inter',
        font_mono: 'JetBrains Mono',
        button_radius: '0.5rem',
        button_shadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        button_hover_scale: '1.02',
        button_transition: 'all 0.2s ease',
        sidebar_bg_color: '#0f172a',
        sidebar_text_color: '#e2e8f0',
        sidebar_active_bg: '#3b82f6',
        sidebar_active_text: '#ffffff',
        sidebar_width: '320px',
        sidebar_collapsed_width: '80px',
        border_radius_sm: '0.25rem',
        border_radius_md: '0.5rem',
        border_radius_lg: '0.75rem',
        border_radius_xl: '1rem',
        shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
      };
      return res.status(200).json({ config: defaultConfig, isDefault: true });
    }

    res.status(200).json({ config: result.rows[0], isDefault: false });
  } catch (error) {
    console.error('❌ Error obteniendo configuración de marca blanca:', error.message);
    res.status(500).json({ error: 'Error al obtener configuración de marca blanca' });
  }
};

/**
 * Crear nueva configuración de marca blanca
 * POST /api/white-label
 */
export const createConfig = async (req, res) => {
  try {
    const { agency_id, ...configData } = req.body;

    if (!agency_id) {
      return res.status(400).json({ error: 'agency_id es requerido' });
    }

    // Verificar si ya existe una configuración para esta agencia
    const existing = await query(
      'SELECT id FROM public.white_label_configs WHERE agency_id = $1',
      [agency_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Ya existe una configuración para esta agencia',
        existingId: existing.rows[0].id
      });
    }

    // Construir campos dinámicamente
    const fields = ['agency_id'];
    const values = [agency_id];
    let paramCounter = 2;

    Object.keys(configData).forEach(key => {
      if (configData[key] !== undefined && configData[key] !== null) {
        fields.push(key);
        values.push(configData[key]);
      }
    });

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `
      INSERT INTO public.white_label_configs (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query(sql, values);
    res.status(201).json({ 
      message: 'Configuración de marca blanca creada exitosamente',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creando configuración de marca blanca:', error.message);
    res.status(500).json({ error: 'Error al crear configuración de marca blanca' });
  }
};

/**
 * Actualizar configuración de marca blanca
 * PUT /api/white-label/:id
 */
export const updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Construir SET dinámicamente
    const fields = [];
    const values = [];
    let paramCounter = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'agency_id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCounter}`);
        values.push(updates[key]);
        paramCounter++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE public.white_label_configs 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.status(200).json({ 
      message: 'Configuración de marca blanca actualizada exitosamente',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error actualizando configuración de marca blanca:', error.message);
    res.status(500).json({ error: 'Error al actualizar configuración de marca blanca' });
  }
};

/**
 * Eliminar configuración de marca blanca
 * DELETE /api/white-label/:id
 */
export const deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM public.white_label_configs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.status(200).json({ 
      message: 'Configuración de marca blanca eliminada exitosamente',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error eliminando configuración de marca blanca:', error.message);
    res.status(500).json({ error: 'Error al eliminar configuración de marca blanca' });
  }
};

/**
 * Obtener todos los presets de temas
 * GET /api/white-label/presets
 */
export const getPresets = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM public.theme_presets ORDER BY is_dark, label'
    );

    res.status(200).json({ presets: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo presets de temas:', error.message);
    res.status(500).json({ error: 'Error al obtener presets de temas' });
  }
};

/**
 * Obtener todos los presets de fuentes
 * GET /api/white-label/fonts
 */
export const getFonts = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM public.font_presets ORDER BY name'
    );

    res.status(200).json({ fonts: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo presets de fuentes:', error.message);
    res.status(500).json({ error: 'Error al obtener presets de fuentes' });
  }
};

/**
 * Obtener todos los presets de botones
 * GET /api/white-label/buttons
 */
export const getButtons = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM public.button_presets ORDER BY name'
    );

    res.status(200).json({ buttons: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo presets de botones:', error.message);
    res.status(500).json({ error: 'Error al obtener presets de botones' });
  }
};

/**
 * Exportar configuración como JSON
 * POST /api/white-label/export/:id
 */
export const exportConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM public.white_label_configs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    const config = result.rows[0];
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      config: {
        company_name: config.company_name,
        company_tagline: config.company_tagline,
        colors: {
          primary: config.primary_color,
          primary_hover: config.primary_hover_color,
          secondary: config.secondary_color,
          secondary_hover: config.secondary_hover_color,
          accent: config.accent_color,
          background: config.background_color,
          surface: config.surface_color,
          text_primary: config.text_primary_color,
          text_secondary: config.text_secondary_color,
          border: config.border_color,
          success: config.success_color,
          warning: config.warning_color,
          error: config.error_color,
          info: config.info_color
        },
        fonts: {
          heading: config.font_heading,
          body: config.font_body,
          mono: config.font_mono,
          size_base: config.font_size_base,
          weight_normal: config.font_weight_normal,
          weight_medium: config.font_weight_medium,
          weight_bold: config.font_weight_bold
        },
        buttons: {
          radius: config.button_radius,
          shadow: config.button_shadow,
          hover_scale: config.button_hover_scale,
          transition: config.button_transition
        },
        sidebar: {
          bg_color: config.sidebar_bg_color,
          text_color: config.sidebar_text_color,
          active_bg: config.sidebar_active_bg,
          active_text: config.sidebar_active_text,
          width: config.sidebar_width,
          collapsed_width: config.sidebar_collapsed_width
        },
        layout: {
          border_radius_sm: config.border_radius_sm,
          border_radius_md: config.border_radius_md,
          border_radius_lg: config.border_radius_lg,
          border_radius_xl: config.border_radius_xl,
          shadow_sm: config.shadow_sm,
          shadow_md: config.shadow_md,
          shadow_lg: config.shadow_lg
        }
      }
    };

    res.status(200).json(exportData);
  } catch (error) {
    console.error('❌ Error exportando configuración:', error.message);
    res.status(500).json({ error: 'Error al exportar configuración' });
  }
};

/**
 * Importar configuración desde JSON
 * POST /api/white-label/import
 */
export const importConfig = async (req, res) => {
  try {
    const { agency_id, config } = req.body;

    if (!agency_id || !config) {
      return res.status(400).json({ error: 'agency_id y config son requeridos' });
    }

    // Transformar estructura JSON a campos de base de datos
    const dbConfig = {
      agency_id,
      company_name: config.company_name || null,
      company_tagline: config.company_tagline || null,
      primary_color: config.colors?.primary || '#3b82f6',
      primary_hover_color: config.colors?.primary_hover || '#2563eb',
      secondary_color: config.colors?.secondary || '#64748b',
      secondary_hover_color: config.colors?.secondary_hover || '#475569',
      accent_color: config.colors?.accent || '#f59e0b',
      background_color: config.colors?.background || '#f8fafc',
      surface_color: config.colors?.surface || '#ffffff',
      text_primary_color: config.colors?.text_primary || '#0f172a',
      text_secondary_color: config.colors?.text_secondary || '#64748b',
      border_color: config.colors?.border || '#e2e8f0',
      success_color: config.colors?.success || '#22c55e',
      warning_color: config.colors?.warning || '#f59e0b',
      error_color: config.colors?.error || '#ef4444',
      info_color: config.colors?.info || '#3b82f6',
      font_heading: config.fonts?.heading || 'Inter',
      font_body: config.fonts?.body || 'Inter',
      font_mono: config.fonts?.mono || 'JetBrains Mono',
      font_size_base: config.fonts?.size_base || '16px',
      font_weight_normal: config.fonts?.weight_normal || 400,
      font_weight_medium: config.fonts?.weight_medium || 500,
      font_weight_bold: config.fonts?.weight_bold || 700,
      button_radius: config.buttons?.radius || '0.5rem',
      button_shadow: config.buttons?.shadow || '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      button_hover_scale: config.buttons?.hover_scale || '1.02',
      button_transition: config.buttons?.transition || 'all 0.2s ease',
      sidebar_bg_color: config.sidebar?.bg_color || '#0f172a',
      sidebar_text_color: config.sidebar?.text_color || '#e2e8f0',
      sidebar_active_bg: config.sidebar?.active_bg || '#ffffff',
      sidebar_active_text: config.sidebar?.active_text || '#0f172a',
      sidebar_width: config.sidebar?.width || '320px',
      sidebar_collapsed_width: config.sidebar?.collapsed_width || '80px',
      border_radius_sm: config.layout?.border_radius_sm || '0.25rem',
      border_radius_md: config.layout?.border_radius_md || '0.5rem',
      border_radius_lg: config.layout?.border_radius_lg || '0.75rem',
      border_radius_xl: config.layout?.border_radius_xl || '1rem',
      shadow_sm: config.layout?.shadow_sm || '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      shadow_md: config.layout?.shadow_md || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      shadow_lg: config.layout?.shadow_lg || '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    };

    // Verificar si ya existe
    const existing = await query(
      'SELECT id FROM public.white_label_configs WHERE agency_id = $1',
      [agency_id]
    );

    if (existing.rows.length > 0) {
      // Actualizar existente
      const result = await query(
        'UPDATE public.white_label_configs SET * FROM (SELECT $2::jsonb) AS new_config WHERE id = $1',
        [existing.rows[0].id, JSON.stringify(dbConfig)]
      );
    } else {
      // Crear nueva
      const fields = Object.keys(dbConfig);
      const values = Object.values(dbConfig);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

      const sql = `
        INSERT INTO public.white_label_configs (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      await query(sql, values);
    }

    res.status(200).json({ 
      message: 'Configuración importada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error importando configuración:', error.message);
    res.status(500).json({ error: 'Error al importar configuración' });
  }
};
