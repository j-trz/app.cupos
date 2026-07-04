import ApiClient from "./apiClient";

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
      const config = this.NOTIFICATION_CONFIG[type];
      const res = await ApiClient.post("/notifications", {
        type,
        title: title || config.title,
        message,
        icon: config.icon,
        color: config.color,
        priority: config.priority,
        targetUserId,
        targetRole,
        data
      });
      return {
        success: true,
        notification: { id: res.notificationId }
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
   */
  static async getNotifications(
    limit = 50,
    onlyUnread = false,
    includeHidden = false
  ) {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (onlyUnread) params.set('onlyUnread', 'true');
      if (includeHidden) params.set('includeHidden', 'true');
      const data = await ApiClient.get(`/notifications?${params.toString()}`);
      
      const notifications = (data.notifications || []).map((notification) => ({
        ...notification,
        id: notification.notification_id,
        data: this.safeParseJSON(notification.data),
      }));

      return {
        success: true,
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read && !n.is_hidden).length,
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
   */
  static async markAsRead(notificationId, readStatus = true) {
    try {
      await ApiClient.put(`/notifications/${notificationId}/read`, { isRead: readStatus });
      return { success: true };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marcar todas las notificaciones como leídas para el usuario actual
   */
  static async markAllAsRead() {
    try {
      const data = await ApiClient.put("/notifications/read-all", {});
      return { success: true, updatedCount: data.updatedCount || 0 };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ocultar notificación para el usuario actual
   */
  static async hideNotification(notificationId, hiddenStatus = true) {
    try {
      await ApiClient.put(`/notifications/${notificationId}/hide`, { isHidden: hiddenStatus });
      return { success: true };
    } catch (error) {
      console.error("Error hiding notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar notificación completamente (solo administradores)
   */
  static async deleteNotification(notificationId) {
    try {
      await ApiClient.delete(`/notifications/${notificationId}`);
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
      targetRole: "admin",
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
      targetUserId: requestData.Usuario_Email ? null : null,
      targetRole: "agency_admin",
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
      targetRole: null,
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
        targetRole: null,
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
   * En modo API, el backend no soporta websockets todavía.
   * Se retorna un no-op.
   */
  static async subscribeToNotifications(_callback) {
    console.log("⚠️ Suscripción en tiempo real no disponible en modo API. Usando polling.");
    return () => {};
  }

  /**
   * Obtener estadísticas de notificaciones personales del usuario
   */
  static async getNotificationStats() {
    try {
      const { notifications } = await this.getNotifications(1000, false, true);

      const stats = {
        total: notifications.filter((n) => !n.is_hidden).length,
        unread: notifications.filter((n) => !n.is_read && !n.is_hidden).length,
        hidden: notifications.filter((n) => n.is_hidden).length,
        byType: {},
      };

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
   */
  static async getUnreadCount() {
    try {
      const data = await ApiClient.get("/notifications/unread-count");
      return {
        success: true,
        unreadCount: data.unreadCount || 0,
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
   */
  static safeParseJSON(data) {
    if (!data) return {};

    if (typeof data === "object") return data;

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
