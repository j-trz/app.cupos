import { query } from '../db.js';
import nodemailer from 'nodemailer';

/**
 * Obtener configuración SMTP de la agencia del usuario autenticado
 */
export const getConfig = async (req, res) => {
  try {
    const agencyId = req.user?.agencia || 'default';

    const result = await query(
      `SELECT * FROM email_smtp_configs
       WHERE agency_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        config: null,
        isDefault: true,
        message: 'No hay configuración SMTP. Usando variables de entorno.'
      });
    }

    // No retornar la contraseña en texto plano por seguridad
    const config = result.rows[0];
    const safeConfig = {
      ...config,
      smtp_pass: config.smtp_pass ? '••••••••' : null,
      has_password: !!config.smtp_pass
    };

    res.status(200).json({ config: safeConfig, isDefault: false });
  } catch (error) {
    console.error('❌ Error obteniendo configuración SMTP:', error.message);
    res.status(500).json({ error: 'Error al obtener configuración SMTP' });
  }
};

/**
 * Crear nueva configuración SMTP
 */
export const createConfig = async (req, res) => {
  try {
    const agencyId = req.user?.agencia || 'default';
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, email_from } = req.body;

    // Validar datos requeridos
    if (!smtp_host || !smtp_user) {
      return res.status(400).json({ error: 'Host SMTP y usuario son requeridos' });
    }

    // Verificar si ya existe una configuración activa
    const existing = await query(
      `SELECT id FROM email_smtp_configs WHERE agency_id = $1 AND is_active = TRUE`,
      [agencyId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya existe una configuración SMTP activa para esta agencia',
        configId: existing.rows[0].id
      });
    }

    const result = await query(
      `INSERT INTO email_smtp_configs (
        agency_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, email_from
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, agency_id, smtp_host, smtp_port, smtp_user, smtp_secure, email_from, created_at`,
      [agencyId, smtp_host, smtp_port || 587, smtp_user, smtp_pass, smtp_secure || false, email_from]
    );

    res.status(201).json({
      message: 'Configuración SMTP creada exitosamente',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creando configuración SMTP:', error.message);
    res.status(500).json({ error: 'Error al crear configuración SMTP' });
  }
};

/**
 * Actualizar configuración SMTP existente
 */
export const updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, email_from } = req.body;

    // Verificar que la configuración existe
    const existing = await query(
      `SELECT id, smtp_pass FROM email_smtp_configs WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración SMTP no encontrada' });
    }

    // Si no se proporciona nueva contraseña, mantener la existente
    const finalPass = smtp_pass === '••••••••' ? existing.rows[0].smtp_pass : smtp_pass;

    const result = await query(
      `UPDATE email_smtp_configs
       SET smtp_host = $1, smtp_port = $2, smtp_user = $3, smtp_pass = $4,
           smtp_secure = $5, email_from = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id, agency_id, smtp_host, smtp_port, smtp_user, smtp_secure, email_from, updated_at`,
      [smtp_host, smtp_port || 587, smtp_user, finalPass, smtp_secure || false, email_from, id]
    );

    res.status(200).json({
      message: 'Configuración SMTP actualizada',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error actualizando configuración SMTP:', error.message);
    res.status(500).json({ error: 'Error al actualizar configuración SMTP' });
  }
};

/**
 * Eliminar configuración SMTP
 */
export const deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM email_smtp_configs WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración SMTP no encontrada' });
    }

    res.status(200).json({ message: 'Configuración SMTP eliminada' });
  } catch (error) {
    console.error('❌ Error eliminando configuración SMTP:', error.message);
    res.status(500).json({ error: 'Error al eliminar configuración SMTP' });
  }
};

/**
 * Probar conexión SMTP
 */
export const testConnection = async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure } = req.body;

    if (!smtp_host || !smtp_user || !smtp_pass) {
      return res.status(400).json({ error: 'Host, usuario y contraseña son requeridos' });
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port || 587,
      secure: smtp_secure || false,
      auth: {
        user: smtp_user,
        pass: smtp_pass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    await transporter.verify();

    res.status(200).json({
      success: true,
      message: 'Conexión SMTP exitosa'
    });
  } catch (error) {
    console.error('❌ Error en test de conexión SMTP:', error.message);
    res.status(400).json({
      success: false,
      message: 'Error en conexión SMTP',
      error: error.message
    });
  }
};

/**
 * Enviar email de prueba
 */
export const sendTestEmail = async (req, res) => {
  try {
    const agencyId = req.user?.agencia || 'default';
    const { to_email } = req.body;

    if (!to_email) {
      return res.status(400).json({ error: 'Email destinatario es requerido' });
    }

    // Obtener configuración SMTP de la agencia
    const configResult = await query(
      `SELECT * FROM email_smtp_configs WHERE agency_id = $1 AND is_active = TRUE LIMIT 1`,
      [agencyId]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'No hay configuración SMTP activa' });
    }

    const config = configResult.rows[0];

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      }
    });

    await transporter.sendMail({
      from: config.email_from || config.smtp_user,
      to: to_email,
      subject: 'Email de prueba - Configuración SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">✅ Configuración SMTP Exitosa</h2>
          <p>Este es un email de prueba enviado desde el sistema de gestión de cupos.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
          <p><strong>Agencia:</strong> ${agencyId}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Si recibiste este email, la configuración SMTP está funcionando correctamente.
          </p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: `Email de prueba enviado exitosamente a ${to_email}`
    });
  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error.message);
    res.status(400).json({
      success: false,
      message: 'Error enviando email de prueba',
      error: error.message
    });
  }
};

/**
 * Obtener todas las plantillas de email
 */
export const getTemplates = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM email_templates ORDER BY event_code`
    );

    res.status(200).json({ templates: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo plantillas de email:', error.message);
    res.status(500).json({ error: 'Error al obtener plantillas de email' });
  }
};

/**
 * Actualizar plantilla de email
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body_html, is_active } = req.body;

    const result = await query(
      `UPDATE email_templates
       SET subject = $1, body_html = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [subject, body_html, is_active !== false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.status(200).json({
      message: 'Plantilla actualizada exitosamente',
      template: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error actualizando plantilla de email:', error.message);
    res.status(500).json({ error: 'Error al actualizar plantilla de email' });
  }
};
