import { query } from '../db.js';

/**
 * Obtener notificaciones del usuario autenticado
 */
export const getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const onlyUnread = req.query.onlyUnread === 'true';
  const includeHidden = req.query.includeHidden === 'true';

  try {
    const result = await query(
      'SELECT * FROM public.get_user_notifications($1, $2, $3, $4)',
      [userId, limit, onlyUnread, includeHidden]
    );

    res.status(200).json({
      success: true,
      notifications: result.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones.' });
  }
};

/**
 * Obtener conteo de notificaciones no leídas
 */
export const getUnreadCount = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query('SELECT public.get_unread_notifications_count($1) as unread_count', [userId]);
    res.status(200).json({
      success: true,
      unreadCount: result.rows[0]?.unread_count || 0
    });
  } catch (error) {
    console.error('❌ Error obteniendo conteo de notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener conteo de notificaciones.' });
  }
};

/**
 * Marcar una notificación específica como leída
 */
export const markAsRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { isRead } = req.body; // boolean

  try {
    await query('SELECT public.mark_notification_read($1, $2, $3)', [
      userId,
      id,
      typeof isRead !== 'undefined' ? isRead : true
    ]);

    res.status(200).json({
      success: true,
      message: 'Estado de lectura actualizado correctamente.'
    });
  } catch (error) {
    console.error('❌ Error marcando notificación:', error);
    res.status(500).json({ error: 'Error al actualizar estado de lectura.' });
  }
};

/**
 * Marcar todas las notificaciones como leídas
 */
export const markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query('SELECT public.mark_all_notifications_read($1) as updated_count', [userId]);
    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas.',
      updatedCount: result.rows[0]?.updated_count || 0
    });
  } catch (error) {
    console.error('❌ Error marcando todas las notificaciones:', error);
    res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas.' });
  }
};

/**
 * Ocultar una notificación (borrado lógico para el usuario)
 */
export const hideNotification = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { isHidden } = req.body; // boolean

  try {
    await query('SELECT public.hide_notification($1, $2, $3)', [
      userId,
      id,
      typeof isHidden !== 'undefined' ? isHidden : true
    ]);

    res.status(200).json({
      success: true,
      message: 'Notificación ocultada correctamente.'
    });
  } catch (error) {
    console.error('❌ Error ocultando notificación:', error);
    res.status(500).json({ error: 'Error al ocultar notificación.' });
  }
};

/**
 * Crear una nueva notificación (solo para administradores)
 */
export const createNotification = async (req, res) => {
  const { type, title, message, icon, color, priority, targetUserId, targetRole, data } = req.body;
  const createdBy = req.user.id;

  if (!type || !title || !message) {
    return res.status(400).json({ error: 'Tipo, título y mensaje son requeridos.' });
  }

  try {
    const sql = `
      INSERT INTO public.notifications (type, title, message, icon, color, priority, target_user_id, target_role, data, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    const result = await query(sql, [
      type,
      title,
      message,
      icon || '📢',
      color || 'blue',
      priority || 'medium',
      targetUserId || null,
      targetRole || null,
      JSON.stringify(data || {}),
      createdBy
    ]);

    res.status(201).json({
      success: true,
      notificationId: result.rows[0].id,
      message: 'Notificación creada exitosamente.'
    });
  } catch (error) {
    console.error('❌ Error creando notificación:', error);
    res.status(500).json({ error: 'Error al crear la notificación.' });
  }
};
