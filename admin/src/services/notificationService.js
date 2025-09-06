import { supabase } from "../supabaseClient";
import AuthorizationService from "./authorizationService";

/**
 * Servicio para gestionar notificaciones del sistema
 */
class NotificationService {
  /**
   * Tipos de notificaciones disponibles
   */
  static NOTIFICATION_TYPES = {
    NEW_REQUEST: "new_request",
    REQUEST_CONFIRMED: "request_confirmed",
    NEW_PRODUCT: "new_product",
    LOW_AVAILABILITY: "low_availability",
    SYSTEM_UPDATE: "system_update",
  };

  /**
   * Configuración de notificaciones por tipo
   */
  static NOTIFICATION_CONFIG = {
    [this.NOTIFICATION_TYPES.NEW_REQUEST]: {
      title: "Nueva Solicitud",
      icon: "📋",
      color: "blue",
      priority: "medium",
    },
    [this.NOTIFICATION_TYPES.REQUEST_CONFIRMED]: {
      title: "Solicitud Confirmada",
      icon: "✅",
      color: "green",
      priority: "high",
    },
    [this.NOTIFICATION_TYPES.NEW_PRODUCT]: {
      title: "Nuevo Producto",
      icon: "🆕",
      color: "purple",
      priority: "medium",
    },
    [this.NOTIFICATION_TYPES.LOW_AVAILABILITY]: {
      title: "Pocos Lugares",
      icon: "⚠️",
      color: "orange",
      priority: "high",
    },
    [this.NOTIFICATION_TYPES.SYSTEM_UPDATE]: {
      title: "Actualización",
      icon: "🔄",
      color: "gray",
      priority: "low",
    },
  };

  /**
   * Crear una nueva notificación
   * @param {Object} notificationData - Datos de la notificación
   * @returns {Promise<Object>} Resultado de la creación
   */
  static async createNotification({
    type,
    title,
    message,
    targetUserId = null,
    targetRole = null,
    data = {},
  }) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Validar tipo de notificación
      if (!Object.values(this.NOTIFICATION_TYPES).includes(type)) {
        throw new Error(`Tipo de notificación inválido: ${type}`);
      }

      const config = this.NOTIFICATION_CONFIG[type];

      const notificationData = {
        type,
        title: title || config.title,
        message,
        icon: config.icon,
        color: config.color,
        priority: config.priority,
        data: JSON.stringify(data),
        target_user_id: targetUserId,
        target_role: targetRole,
        created_by: user.id,
        created_at: new Date().toISOString(),
        read: false,
      };

      const { data: notification, error } = await supabase
        .from("notifications")
        .insert([notificationData])
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Notificación creada: ${type} - ${message}`);
      return {
        success: true,
        notification,
      };
    } catch (error) {
      console.error("Error creating notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtener notificaciones para el usuario actual
   * @param {number} limit - Límite de notificaciones a obtener
   * @param {boolean} onlyUnread - Solo notificaciones no leídas
   * @returns {Promise<Array>} Lista de notificaciones
   */
  static async getNotifications(limit = 50, onlyUnread = false) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener rol del usuario
      const userProfile = await AuthorizationService.getCurrentUserProfile();
      const userRole = userProfile?.role || "agency_user";

      let query = supabase
        .from("notifications")
        .select("*")
        .or(
          `target_user_id.eq.${user.id},target_role.eq.${userRole},and(target_user_id.is.null,target_role.is.null)`
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (onlyUnread) {
        query = query.eq("read", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parsear datos JSON
      const notifications = data.map((notification) => ({
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : {},
      }));

      return {
        success: true,
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Marcar notificación como leída
   * @param {string} notificationId - ID de la notificación
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const userProfile = await AuthorizationService.getCurrentUserProfile();
      const userRole = userProfile?.role || "agency_user";

      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .or(
          `target_user_id.eq.${user.id},target_role.eq.${userRole},and(target_user_id.is.null,target_role.is.null)`
        )
        .eq("read", false);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar notificación
   * @param {string} notificationId - ID de la notificación
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error deleting notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear notificación para nuevo pedido solicitado
   */
  static async notifyNewRequest(requestData) {
    return await this.createNotification({
      type: this.NOTIFICATION_TYPES.NEW_REQUEST,
      message: `Nueva solicitud de ${requestData.Contacto_Nombre} para ${requestData.Vuelo_Destino}`,
      targetRole: "admin", // Solo para administradores
      data: {
        requestId: requestData.ItemInternalId,
        destination: requestData.Vuelo_Destino,
        agency: requestData.Agencia,
        contact: requestData.Contacto_Nombre,
      },
    });
  }

  /**
   * Crear notificación para pedido confirmado
   */
  static async notifyRequestConfirmed(requestData) {
    return await this.createNotification({
      type: this.NOTIFICATION_TYPES.REQUEST_CONFIRMED,
      message: `Solicitud confirmada: ${requestData.Vuelo_Destino} para ${requestData.Nombre_Pasajero}`,
      targetUserId: requestData.Usuario_Email ? null : null, // Enviar al usuario específico si se puede identificar
      targetRole: "agency_admin", // Y también a administradores de agencia
      data: {
        requestId: requestData.ItemInternalId,
        destination: requestData.Vuelo_Destino,
        passenger: `${requestData.Nombre_Pasajero} ${requestData.Apellido_Pasajero}`,
        agency: requestData.Agencia,
      },
    });
  }

  /**
   * Crear notificación para nuevo producto disponible
   */
  static async notifyNewProduct(productData) {
    return await this.createNotification({
      type: this.NOTIFICATION_TYPES.NEW_PRODUCT,
      message: `Nuevo destino disponible: ${productData.destino} con ${productData.compania}`,
      targetRole: null, // Para todos los usuarios
      data: {
        productId: productData.ItemInternalId,
        destination: productData.destino,
        airline: productData.compania,
        availability: productData.disponibilidad,
        price: productData.precio,
      },
    });
  }

  /**
   * Crear notificación para pocos lugares disponibles
   */
  static async notifyLowAvailability(productData, threshold = 5) {
    const availability = parseInt(productData.disponibilidad || 0);

    if (availability > 0 && availability <= threshold) {
      return await this.createNotification({
        type: this.NOTIFICATION_TYPES.LOW_AVAILABILITY,
        message: `¡Solo quedan ${availability} lugares para ${productData.destino}!`,
        targetRole: null, // Para todos los usuarios
        data: {
          productId: productData.ItemInternalId,
          destination: productData.destino,
          airline: productData.compania,
          availability: availability,
          threshold,
        },
      });
    }

    return { success: false, message: "No se requiere notificación" };
  }

  /**
   * Suscribirse a notificaciones en tiempo real
   * @param {Function} callback - Función a ejecutar cuando llegue una notificación
   * @returns {Function} Función para cancelar la suscripción
   */
  static subscribeToNotifications(callback) {
    try {
      const {
        data: { user },
      } = supabase.auth.getUser();

      if (!user) {
        console.warn(
          "Usuario no autenticado para suscripción de notificaciones"
        );
        return () => {};
      }

      const subscription = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            console.log("Nueva notificación recibida:", payload.new);
            if (callback && typeof callback === "function") {
              callback(payload.new);
            }
          }
        )
        .subscribe();

      console.log("✅ Suscrito a notificaciones en tiempo real");

      // Retornar función para cancelar suscripción
      return () => {
        subscription.unsubscribe();
        console.log("❌ Suscripción a notificaciones cancelada");
      };
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
      return () => {};
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  static async getNotificationStats() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const userProfile = await AuthorizationService.getCurrentUserProfile();
      const userRole = userProfile?.role || "agency_user";

      const { data, error } = await supabase
        .from("notifications")
        .select("type, read")
        .or(
          `target_user_id.eq.${user.id},target_role.eq.${userRole},and(target_user_id.is.null,target_role.is.null)`
        );

      if (error) throw error;

      const stats = {
        total: data.length,
        unread: data.filter((n) => !n.read).length,
        byType: {},
      };

      // Agrupar por tipo
      Object.values(this.NOTIFICATION_TYPES).forEach((type) => {
        const typeNotifications = data.filter((n) => n.type === type);
        stats.byType[type] = {
          total: typeNotifications.length,
          unread: typeNotifications.filter((n) => !n.read).length,
        };
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      return {
        success: false,
        stats: { total: 0, unread: 0, byType: {} },
        error: error.message,
      };
    }
  }
}

export default NotificationService;
