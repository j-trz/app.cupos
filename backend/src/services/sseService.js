/**
 * Servicio SSE (Server-Sent Events) para notificaciones en tiempo real
 * Permite enviar eventos a clientes conectados sin necesidad de polling
 */

class SSEService {
  constructor() {
    // Mapa de clientes conectados: userId -> Set de conexiones
    this.clients = new Map();
    // Mapa de canales globales: channel -> Set de conexiones
    this.channels = new Map();
  }

  /**
   * Agrega un cliente al servicio SSE
   * @param {string} userId - ID del usuario
   * @param {Response} res - Response object de Express
   * @param {Object} options - Opciones adicionales
   * @param {string[]} options.channels - Canales a suscribir (ej: ['notifications', 'reservations'])
   */
  addClient(userId, res, options = {}) {
    const client = {
      id: `${userId}-${Date.now()}`,
      userId,
      res,
      channels: new Set(options.channels || ['notifications']),
      connectedAt: new Date()
    };

    // Configurar headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Desactivar buffer de nginx

    // Agregar cliente al mapa de usuarios
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(client);

    // Suscribir a canales
    client.channels.forEach(channel => {
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Set());
      }
      this.channels.get(channel).add(client);
    });

    // Enviar evento de conexión exitosa
    this.sendToClient(client, 'connected', {
      clientId: client.id,
      timestamp: new Date().toISOString()
    });

    // Heartbeat para mantener conexión viva
    client.heartbeat = setInterval(() => {
      this.sendToClient(client, 'heartbeat', { timestamp: new Date().toISOString() });
    }, 30000); // Cada 30 segundos

    // Manejar desconexión
    res.on('close', () => {
      this.removeClient(client);
    });

    console.log(`🔌 SSE: Cliente ${userId} conectado (${this.getClientCount()} clientes activos)`);
    return client;
  }

  /**
   * Remueve un cliente del servicio
   * @param {Object} client - Cliente a remover
   */
  removeClient(client) {
    // Limpiar heartbeat
    if (client.heartbeat) {
      clearInterval(client.heartbeat);
    }

    // Remover del mapa de usuarios
    const userClients = this.clients.get(client.userId);
    if (userClients) {
      userClients.delete(client);
      if (userClients.size === 0) {
        this.clients.delete(client.userId);
      }
    }

    // Remover de canales
    client.channels.forEach(channel => {
      const channelClients = this.channels.get(channel);
      if (channelClients) {
        channelClients.delete(client);
        if (channelClients.size === 0) {
          this.channels.delete(channel);
        }
      }
    });

    console.log(`🔌 SSE: Cliente ${client.userId} desconectado (${this.getClientCount()} clientes activos)`);
  }

  /**
   * Envía un evento a un cliente específico
   * @param {Object} client - Cliente destino
   * @param {string} event - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  sendToClient(client, event, data) {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.res.write(message);
    } catch (error) {
      console.error(`Error enviando SSE a cliente ${client.id}:`, error);
      this.removeClient(client);
    }
  }

  /**
   * Envía un evento a todos los clientes de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} event - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  sendToUser(userId, event, data) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      return false;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let sentCount = 0;

    userClients.forEach(client => {
      try {
        client.res.write(message);
        sentCount++;
      } catch (error) {
        console.error(`Error enviando SSE a cliente ${client.id}:`, error);
        this.removeClient(client);
      }
    });

    return sentCount > 0;
  }

  /**
   * Envía un evento a todos los clientes suscritos a un canal
   * @param {string} channel - Nombre del canal
   * @param {string} event - Tipo de evento
   * @param {Object} data - Datos del evento
   * @param {string[]} excludeUserIds - IDs de usuarios a excluir
   */
  sendToChannel(channel, event, data, excludeUserIds = []) {
    const channelClients = this.channels.get(channel);
    if (!channelClients || channelClients.size === 0) {
      return false;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let sentCount = 0;

    channelClients.forEach(client => {
      // Excluir usuarios si es necesario
      if (excludeUserIds.includes(client.userId)) {
        return;
      }

      try {
        client.res.write(message);
        sentCount++;
      } catch (error) {
        console.error(`Error enviando SSE a cliente ${client.id}:`, error);
        this.removeClient(client);
      }
    });

    return sentCount > 0;
  }

  /**
   * Envía un evento a todos los clientes conectados (broadcast)
   * @param {string} event - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  broadcast(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let sentCount = 0;

    this.clients.forEach(userClients => {
      userClients.forEach(client => {
        try {
          client.res.write(message);
          sentCount++;
        } catch (error) {
          console.error(`Error enviando SSE a cliente ${client.id}:`, error);
          this.removeClient(client);
        }
      });
    });

    return sentCount;
  }

  /**
   * Notifica a un usuario sobre una nueva notificación
   * @param {string} userId - ID del usuario destinatario
   * @param {Object} notification - Datos de la notificación
   */
  notifyUser(userId, notification) {
    return this.sendToUser(userId, 'notification', notification);
  }

  /**
   * Notifica a todos los admins sobre un evento
   * @param {string} event - Tipo de evento
   * @param {Object} data - Datos del evento
   * @param {string[]} adminUserIds - IDs de usuarios admin
   */
  notifyAdmins(event, data, adminUserIds) {
    let sentCount = 0;
    adminUserIds.forEach(adminId => {
      if (this.sendToUser(adminId, event, data)) {
        sentCount++;
      }
    });
    return sentCount;
  }

  /**
   * Notifica sobre cambios en reservas
   * @param {string} channel - Canal (ej: 'reservations:agency_XXX')
   * @param {string} event - Tipo de evento (reservation_created, reservation_confirmed, etc.)
   * @param {Object} reservation - Datos de la reserva
   */
  notifyReservationChange(channel, event, reservation) {
    return this.sendToChannel(channel, event, reservation);
  }

  /**
   * Notifica sobre cambios en productos
   * @param {string} event - Tipo de evento (product_created, product_updated, low_availability)
   * @param {Object} product - Datos del producto
   * @param {string} agencyCode - Código de agencia (opcional, para notificar solo a esa agencia)
   */
  notifyProductChange(event, product, agencyCode = null) {
    const channel = agencyCode ? `products:${agencyCode}` : 'products';
    return this.sendToChannel(channel, event, product);
  }

  /**
   * Obtiene el número total de clientes conectados
   */
  getClientCount() {
    let count = 0;
    this.clients.forEach(clients => {
      count += clients.size;
    });
    return count;
  }

  /**
   * Obtiene estadísticas del servicio SSE
   */
  getStats() {
    const stats = {
      totalClients: this.getClientCount(),
      totalUsers: this.clients.size,
      channels: {}
    };

    this.channels.forEach((clients, channel) => {
      stats.channels[channel] = clients.size;
    });

    return stats;
  }

  /**
   * Limpia todas las conexiones (útil para shutdown)
   */
  shutdown() {
    this.clients.forEach(userClients => {
      userClients.forEach(client => {
        if (client.heartbeat) {
          clearInterval(client.heartbeat);
        }
        try {
          client.res.end();
        } catch (e) {
          // Ignorar errores al cerrar
        }
      });
    });

    this.clients.clear();
    this.channels.clear();
    console.log('🔌 SSE: Servicio apagado');
  }
}

// Instancia singleton
const sseService = new SSEService();

export default sseService;
