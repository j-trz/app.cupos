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
   * Obtener notificaciones para el usuario actual con estados personales
   * @param {number} limit - Límite de notificaciones a obtener
   * @param {boolean} onlyUnread - Solo notificaciones no leídas
   * @param {boolean} includeHidden - Incluir notificaciones ocultas
   * @returns {Promise<Array>} Lista de notificaciones con estados personales
   */
  static async getNotifications(
    limit = 50,
    onlyUnread = false,
    includeHidden = false
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Usar función SQL para obtener notificaciones con estados personales
      const { data, error } = await supabase.rpc("get_user_notifications", {
        user_uuid: user.id,
        limit_count: limit,
        only_unread: onlyUnread,
        include_hidden: includeHidden,
      });

      if (error) throw error;

      // Parsear datos JSON de forma segura y mapear notification_id a id
      const notifications = data.map((notification) => ({
        ...notification,
        id: notification.notification_id, // Mapear para compatibilidad con frontend
        data: this.safeParseJSON(notification.data),
      }));

      return {
        success: true,
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read && !n.is_hidden)
          .length,
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
   * Marcar notificación como leída para el usuario actual
   * @param {string} notificationId - ID de la notificación
   * @param {boolean} readStatus - Estado de lectura (true = leída, false = no leída)
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async markAsRead(notificationId, readStatus = true) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: _data, error } = await supabase.rpc(
        "mark_notification_read",
        {
          user_uuid: user.id,
          notification_uuid: notificationId,
          read_status: readStatus,
        }
      );

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marcar todas las notificaciones como leídas para el usuario actual
   * @returns {Promise<Object>} Resultado de la actualización
   */
  static async markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc(
        "mark_all_user_notifications_read",
        {
          user_uuid: user.id,
        }
      );

      if (error) throw error;

      console.log(`✅ Marcadas ${data || 0} notificaciones como leídas`);
      return { success: true, updatedCount: data || 0 };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ocultar notificación para el usuario actual (equivalente a eliminar personalmente)
   * @param {string} notificationId - ID de la notificación
   * @param {boolean} hiddenStatus - Estado de ocultamiento (true = oculta, false = visible)
   * @returns {Promise<Object>} Resultado de la ocultación
   */
  static async hideNotification(notificationId, hiddenStatus = true) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: _data, error } = await supabase.rpc("hide_notification", {
        user_uuid: user.id,
        notification_uuid: notificationId,
        hidden_status: hiddenStatus,
      });

      if (error) throw error;

      console.log(
        `✅ Notificación ${
          hiddenStatus ? "ocultada" : "restaurada"
        } para el usuario`
      );
      return { success: true };
    } catch (error) {
      console.error("Error hiding notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar notificación completamente (solo administradores)
   * @param {string} notificationId - ID de la notificación
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteNotification(notificationId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar permisos de administrador
      const userProfile = await AuthorizationService.getCurrentUserProfile();
      if (!userProfile || userProfile.role !== "admin") {
        throw new Error(
          "Solo los administradores pueden eliminar notificaciones completamente"
        );
      }

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      console.log("✅ Notificación eliminada completamente por administrador");
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
  static async subscribeToNotifications(callback) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
   * Obtener estadísticas de notificaciones personales del usuario
   */
  static async getNotificationStats() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener todas las notificaciones del usuario (incluyendo ocultas para estadísticas)
      const { notifications } = await this.getNotifications(1000, false, true);

      const stats = {
        total: notifications.filter((n) => !n.is_hidden).length,
        unread: notifications.filter((n) => !n.is_read && !n.is_hidden).length,
        hidden: notifications.filter((n) => n.is_hidden).length,
        byType: {},
      };

      // Agrupar por tipo (solo notificaciones no ocultas)
      const visibleNotifications = notifications.filter((n) => !n.is_hidden);
      Object.values(this.NOTIFICATION_TYPES).forEach((type) => {
        const typeNotifications = visibleNotifications.filter(
          (n) => n.type === type
        );
        stats.byType[type] = {
          total: typeNotifications.length,
          unread: typeNotifications.filter((n) => !n.is_read).length,
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
        stats: { total: 0, unread: 0, hidden: 0, byType: {} },
        error: error.message,
      };
    }
  }

  /**
   * Obtener conteo rápido de notificaciones no leídas
   * @returns {Promise<number>} Número de notificaciones no leídas
   */
  static async getUnreadCount() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.rpc(
        "get_user_unread_notifications_count",
        {
          user_uuid: user.id,
        }
      );

      if (error) throw error;

      return {
        success: true,
        unreadCount: data || 0,
      };
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return {
        success: false,
        unreadCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Parsear JSON de forma segura
   * @param {string|object} data - Datos a parsear
   * @returns {object} Objeto parseado o vacío
   */
  static safeParseJSON(data) {
    if (!data) return {};

    // Si ya es un objeto, devolverlo tal como está
    if (typeof data === "object") return data;

    // Si es string, intentar parsearlo
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn("Error parsing JSON data:", error, "Data:", data);
        return {};
      }
    }

    return {};
  }
}

export default NotificationService;
