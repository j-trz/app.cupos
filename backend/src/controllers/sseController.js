import sseService from '../services/sseService.js';
import { query } from '../db.js';

/**
 * Controlador para manejar conexiones SSE (Server-Sent Events)
 * Permite notificaciones en tiempo real a los clientes conectados
 */

/**
 * Establece una conexión SSE para un usuario autenticado
 * GET /api/sse/connect
 */
export const connect = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const userAgency = req.user.agencia;

  // Determinar canales a suscribir según el rol
  const channels = ['notifications'];

  // Admins reciben notificaciones globales
  if (userRole === 'admin') {
    channels.push('admin', 'system');
  }

  // Usuarios de agencia reciben notificaciones de su agencia
  if (userAgency) {
    channels.push(`agency:${userAgency}`);
  }

  // Agregar cliente al servicio SSE
  sseService.addClient(userId, res, { channels });
};

/**
 * Envía una notificación a un usuario específico
 * POST /api/sse/notify-user
 */
export const notifyUser = async (req, res) => {
  try {
    const { userId, event, data } = req.body;

    if (!userId || !event) {
      return res.status(400).json({ error: 'userId y event son requeridos' });
    }

    const sent = sseService.sendToUser(userId, event, data || {});

    res.json({
      success: true,
      delivered: sent,
      message: sent ? 'Notificación enviada' : 'Usuario no conectado'
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Envía una notificación a todos los admins
 * POST /api/sse/notify-admins
 */
export const notifyAdmins = async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'event es requerido' });
    }

    // Obtener IDs de usuarios admin
    const adminResult = await query(
      "SELECT id FROM profiles WHERE role = 'admin'"
    );
    const adminIds = adminResult.rows.map(r => r.id);

    const sentCount = sseService.notifyAdmins(event, data || {}, adminIds);

    res.json({
      success: true,
      delivered: sentCount,
      totalAdmins: adminIds.length
    });
  } catch (error) {
    console.error('Error notificando admins:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Envía una notificación a un canal de agencia
 * POST /api/sse/notify-agency
 */
export const notifyAgency = async (req, res) => {
  try {
    const { agencyCode, event, data } = req.body;

    if (!agencyCode || !event) {
      return res.status(400).json({ error: 'agencyCode y event son requeridos' });
    }

    const channel = `agency:${agencyCode}`;
    const sent = sseService.sendToChannel(channel, event, data || {});

    res.json({
      success: true,
      delivered: sent,
      channel
    });
  } catch (error) {
    console.error('Error notificando agencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene estadísticas del servicio SSE
 * GET /api/sse/stats
 */
export const getStats = async (req, res) => {
  try {
    const stats = sseService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas SSE:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Notifica sobre cambios en reservas
 * POST /api/sse/notify-reservation
 */
export const notifyReservation = async (req, res) => {
  try {
    const { reservationId, event, data, agencyCode } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'event es requerido' });
    }

    const notificationData = {
      reservationId,
      timestamp: new Date().toISOString(),
      ...data
    };

    // Notificar al canal de la agencia si se especifica
    if (agencyCode) {
      sseService.sendToChannel(`agency:${agencyCode}`, event, notificationData);
    }

    // También notificar al canal global de reservas para admins
    sseService.sendToChannel('system', event, notificationData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error notificando reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Notifica sobre cambios en productos
 * POST /api/sse/notify-product
 */
export const notifyProduct = async (req, res) => {
  try {
    const { productId, event, data, agencyCode } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'event es requerido' });
    }

    const notificationData = {
      productId,
      timestamp: new Date().toISOString(),
      ...data
    };

    // Notificar al canal de la agencia si se especifica
    if (agencyCode) {
      sseService.sendToChannel(`agency:${agencyCode}`, event, notificationData);
    }

    // También notificar al canal global de productos para admins
    sseService.sendToChannel('system', event, notificationData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error notificando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export default {
  connect,
  notifyUser,
  notifyAdmins,
  notifyAgency,
  getStats,
  notifyReservation,
  notifyProduct
};
