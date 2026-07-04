import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { query } from '../db.js';

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const emailFrom = process.env.EMAIL_FROM || smtpUser || 'no-reply@form-cupos.local';
const secure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure,
  auth: smtpUser && smtpPass ? {
    user: smtpUser,
    pass: smtpPass
  } : undefined
});

const renderTemplate = (text, data = {}) => {
  return text.replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => {
    const value = data[key];
    return typeof value !== 'undefined' && value !== null ? String(value) : '';
  });
};

export const sendTemplateEmail = async (eventCode, recipientEmail, data = {}) => {
  const templateResult = await query(
    'SELECT * FROM email_templates WHERE event_code = $1 AND is_active = TRUE LIMIT 1',
    [eventCode]
  );

  if (templateResult.rows.length === 0) {
    throw new Error(`Email template no encontrado para evento: ${eventCode}`);
  }

  const template = templateResult.rows[0];
  const subject = renderTemplate(template.subject, data);
  const bodyHtml = renderTemplate(template.body_html, data);

  let status = 'sent';
  let errorMessage = null;

  try {
    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('SMTP no está configurado. Configure SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS.');
    }

    await transporter.sendMail({
      from: emailFrom,
      to: recipientEmail,
      subject,
      html: bodyHtml
    });
  } catch (error) {
    status = 'failed';
    errorMessage = error.message;
    console.error('❌ Error enviando email transaccional:', error.message);
  } finally {
    await query(
      `INSERT INTO email_log (template_id, recipient_email, subject, body_html, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [template.id, recipientEmail, subject, bodyHtml, status, errorMessage]
    );
  }

  if (status === 'failed') {
    throw new Error(errorMessage || 'Error enviando email transaccional');
  }

  return { status };
};
