import { cacheService } from "./cacheService";
import ConnectionService from "./connectionService";
import AuthorizationService from "./authorizationService";
import NotificationService from "./notificationService";
import ApiClient from "./apiClient";

class ReservationService {
  /**
   * Obtener disponibilidad de cupos aéreos
   */
  static async getAvailability(useCache = true) {
    try {
      const cacheKey = "availability-data";

      if (useCache) {
        return await cacheService.getWithCache(cacheKey, async () => {
          return await this._fetchAvailability();
        });
      }

      return await this._fetchAvailability();
    } catch (error) {
      console.error("Error in getAvailability:", error);
      throw new Error(error.message || "Error al obtener disponibilidad");
    }
  }

  static async _fetchAvailability() {
    try {
      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Obteniendo disponibilidad desde API backend flexible...");
        // Ruta real registrada en index.js: app.use('/api/products', productRouter)
        // No existe /api/availability; los cupos se sirven desde /api/products.
        const result = await ApiClient.get("/products");

        if (!result.success) {
          throw new Error(result.error || "Error al obtener disponibilidad");
        }

        const availabilityData = (result.data || []).map((producto) => {
          const disponibilidad = parseInt(producto.disponibilidad || 0);
          if (disponibilidad <= 5 && disponibilidad > 0) {
            NotificationService.notifyLowAvailability(producto, 5);
          }
          return producto;
        });

        return {
          success: true,
          data: availabilityData,
        };
      }

      // Modo legado (API backend deshabilitada): usar la conexión activa configurada
      const result = await ConnectionService.getDataFromActiveConnection(
        "productos"
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al obtener datos de la conexión activa"
        );
      }

      const availabilityData = result.data.map((producto) => {
        const disponibilidad = parseInt(producto.disponibilidad || 0);
        if (disponibilidad <= 5 && disponibilidad > 0) {
          NotificationService.notifyLowAvailability(producto, 5);
        }
        return producto;
      });

      return {
        success: true,
        data: availabilityData,
      };
    } catch (error) {
      console.error("Error fetching availability:", error);
      throw new Error(error.message || "Error al obtener disponibilidad");
    }
  }

  /**
   * Obtener solicitudes (filtradas según el usuario)
   */
  static async getRequests(useCache = true) {
    try {
      const cacheKey = "requests-data";

      if (useCache) {
        return await cacheService.getWithCache(cacheKey, async () => {
          return await this._fetchRequests();
        });
      }

      return await this._fetchRequests();
    } catch (error) {
      console.error("Error in getRequests:", error);
      throw new Error(error.message || "Error al obtener solicitudes");
    }
  }

  static async _fetchRequests() {
    try {
      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Obteniendo solicitudes desde API backend flexible...");
        // Ruta real registrada en index.js: app.use('/api/orders', orderRouter)
        const result = await ApiClient.get("/orders");

        if (!result.success) {
          throw new Error(result.error || "Error al obtener solicitudes");
        }

        const requestsData = (result.data || []).map((item) => ({
          "@odata.etag": item["@odata.etag"] || "",
          ItemInternalId: item.ItemInternalId || "",
          Pedido_ID: item.Pedido_ID || item.Numero_Pedido || item.ItemInternalId || "",
          Agencia: item.Agencia || "",
          Contacto_Nombre: item.Contacto_Nombre || item.Usuario_Nombre || "",
          Vuelo_Destino: item.Vuelo_Destino || item.Destino || "",
          Nombre_Pasajero: item.Nombre_Pasajero || item.Pasajero_Nombre || "",
          Apellido_Pasajero: item.Apellido_Pasajero || item.Pasajero_Apellido || "",
          Temporada: item.Temporada || "",
          Vuelo_Salida: item.Vuelo_Salida || item.Fecha_Salida || "",
          Estado: "Solicitado",
          Ruta: item.Ruta || "",
          Fecha_Registro: item.Fecha_Registro || item.Created || "",
          Vuelo_Codigo: item.Vuelo_Codigo || "",
          Vuelo_Compania: item.Vuelo_Compania || "",
          Vuelo_Precio: item.Vuelo_Precio || "",
          Usuario_Email: item.Usuario_Email || "",
          Pnr: item.Pnr || "",
          Ficha: item.Ficha || "",
          Neto_1: item.Neto_1 || "",
          Op: item.Op || "",
        }));

        return {
          success: true,
          data: requestsData,
        };
      }

      // Obtener filtros según el rol del usuario
      const filters = await AuthorizationService.getDataFilters();
      if (!filters.canView) {
        throw new Error("No tienes permisos para ver solicitudes");
      }

      // Obtener datos específicos de pedidos
      const result = await ConnectionService.getDataFromActiveConnection(
        "pedidos"
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al obtener datos de la conexión activa"
        );
      }

      console.log("Datos para solicitudes:", result.data.slice(0, 3));
      console.log("Filtros aplicados:", filters);

      // Filtrar solo solicitudes (Estado !== "Confirmado")
      const filteredByStatus = result.data.filter((item) => {
        const estado = item.Estado || item.estado || "";
        return estado !== "Confirmado";
      });

      // Transformar datos de pedidos a estructura de solicitudes
      let requestsData = filteredByStatus.map((item) => ({
        "@odata.etag": item["@odata.etag"] || "",
        ItemInternalId: item.ItemInternalId || "",
        Pedido_ID:
          item.Pedido_ID || item.Numero_Pedido || item.ItemInternalId || "",
        Agencia: item.Agencia || "",
        Contacto_Nombre: item.Contacto_Nombre || item.Usuario_Nombre || "",
        Vuelo_Destino: item.Vuelo_Destino || item.Destino || "",
        Nombre_Pasajero: item.Nombre_Pasajero || item.Pasajero_Nombre || "",
        Apellido_Pasajero:
          item.Apellido_Pasajero || item.Pasajero_Apellido || "",
        Temporada: item.Temporada || "",
        Vuelo_Salida: item.Vuelo_Salida || item.Fecha_Salida || "",
        Estado: "Solicitado", // Forzar estado para solicitudes
        Ruta: item.Ruta || "",
        Fecha_Registro: item.Fecha_Registro || item.Created || "",
        Vuelo_Codigo: item.Vuelo_Codigo || "",
        Vuelo_Compania: item.Vuelo_Compania || "",
        Vuelo_Precio: item.Vuelo_Precio || "",
        Usuario_Email: item.Usuario_Email || "",
        Pnr: item.Pnr || "",
        Ficha: item.Ficha || "",
        Neto_1: item.Neto_1 || "",
        Op: item.Op || "",
      }));

      // Aplicar filtros según el rol
      switch (filters.filterType) {
        case "all":
          console.log("🔓 Admin - mostrando todas las solicitudes");
          break;

        case "agency":
          requestsData = requestsData.filter(
            (item) => item.Agencia === filters.agencia
          );
          console.log(
            `🏢 Agency Admin - filtradas ${requestsData.length} solicitudes de agencia "${filters.agencia}"`
          );
          break;

        case "user": {
          const profile = await AuthorizationService.getCurrentUserProfile();
          if (profile?.email && filters.agencia) {
            requestsData = requestsData.filter(
              (item) =>
                item.Agencia === filters.agencia &&
                item.Usuario_Email === profile.email
            );
            console.log(
              `🔒 Agency User - filtradas ${requestsData.length} solicitudes de agencia="${filters.agencia}" y email="${profile.email}"`
            );
          } else {
            requestsData = [];
            console.warn("🚫 Agency User sin email o agencia definida");
          }
          break;
        }

        default:
          requestsData = [];
      }

      console.log(
        `✅ Filtradas ${requestsData.length} solicitudes según rol (${filters.filterType}) de ${result.data.length} pedidos totales`
      );

      return {
        success: true,
        data: requestsData,
      };
    } catch (error) {
      console.error("Error fetching requests:", error);
      throw new Error(error.message || "Error al obtener solicitudes");
    }
  }

  /**
   * Obtener confirmaciones (filtradas según el usuario)
   */
  static async getConfirmations(useCache = true) {
    try {
      const cacheKey = "confirmations-data";

      if (useCache) {
        return await cacheService.getWithCache(cacheKey, async () => {
          return await this._fetchConfirmations();
        });
      }

      return await this._fetchConfirmations();
    } catch (error) {
      console.error("Error in getConfirmations:", error);
      throw new Error(error.message || "Error al obtener confirmaciones");
    }
  }

  static async _fetchConfirmations(userId) {
    try {
      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Obteniendo confirmaciones desde API backend...");
        // Ruta real registrada en index.js: app.use('/api/data', dataRouter)
        const filters = JSON.stringify({ user_id: userId, Estado: "Confirmado" });
        const result = await ApiClient.get(
          `/data?table=reservations&filters=${encodeURIComponent(filters)}`
        );

        const rawData = Array.isArray(result) ? result : result?.data || [];

        const confirmationsData = rawData.map((item) => ({
          "@odata.etag": item["@odata.etag"] || "",
          ItemInternalId: item.ItemInternalId || "",
          Pedido_ID: item.Pedido_ID || item.Numero_Pedido || item.ItemInternalId || "",
          Agencia: item.Agencia || "",
          Contacto_Nombre: item.Contacto_Nombre || item.Usuario_Nombre || "",
          Vuelo_Destino: item.Vuelo_Destino || item.Destino || "",
          Nombre_Pasajero: item.Nombre_Pasajero || item.Pasajero_Nombre || "",
          Apellido_Pasajero: item.Apellido_Pasajero || item.Pasajero_Apellido || "",
          Temporada: item.Temporada || "",
          Vuelo_Salida: item.Vuelo_Salida || item.Fecha_Salida || "",
          Estado: item.Estado || "Confirmado",
          Ruta: item.Ruta || "",
          Fecha_Registro: item.Fecha_Registro || item.Created || "",
          Vuelo_Codigo: item.Vuelo_Codigo || "",
          Vuelo_Compania: item.Vuelo_Compania || "",
          Vuelo_Precio: item.Vuelo_Precio || "",
          Usuario_Email: item.Usuario_Email || "",
          Pnr: item.Pnr || "",
          Ficha: item.Ficha || "",
          Neto_1: item.Neto_1 || "",
          Op: item.Op || "",
        }));

        return {
          success: true,
          data: confirmationsData,
        };
      }

      // Verificar permisos para ver confirmaciones
      const canViewConfirmations =
        (await AuthorizationService.hasPermission("view_agency_data")) ||
        (await AuthorizationService.hasPermission("view_all_data")) ||
        (await AuthorizationService.hasPermission("view_own_data"));

      if (!canViewConfirmations) {
        throw new Error("No tienes permisos para ver confirmaciones");
      }

      const filters = await AuthorizationService.getDataFilters();

      const result = await ConnectionService.getDataFromActiveConnection(
        "pedidos"
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al obtener datos de la conexión activa"
        );
      }

      let confirmationsData = result.data.filter((item) => item.Estado === "Confirmado");

      switch (filters.filterType) {
        case "all":
          console.log("🔓 Admin - mostrando todas las confirmaciones");
          break;

        case "agency":
          confirmationsData = confirmationsData.filter(
            (item) => item.Agencia === filters.agencia
          );
          console.log(
            `🏢 Agency Admin - filtradas ${confirmationsData.length} confirmaciones de agencia "${filters.agencia}"`
          );
          break;

        case "user": {
          const profile = await AuthorizationService.getCurrentUserProfile();
          if (profile?.email && filters.agencia) {
            confirmationsData = confirmationsData.filter(
              (item) =>
                item.Agencia === filters.agencia &&
                item.Usuario_Email === profile.email
            );
            console.log(
              `🔒 Agency User - filtradas ${confirmationsData.length} confirmaciones de agencia="${filters.agencia}" y email="${profile.email}"`
            );
          } else {
            confirmationsData = [];
            console.warn(
              "🚫 Agency User sin email o agencia definida para confirmaciones"
            );
          }
          break;
        }

        default:
          confirmationsData = [];
      }

      return {
        success: true,
        data: confirmationsData,
      };
    } catch (error) {
      console.error("Error fetching confirmations:", error);
      throw new Error(error.message || "Error al obtener confirmaciones");
    }
  }

  /**
   * Enviar reserva de vuelo
   */
  static async submitReservation(reservationData) {
    try {
      // Validar datos antes de enviar
      const validationErrors = this.validateReservationData(reservationData);
      if (validationErrors.length > 0) {
        throw new Error(`Datos inválidos: ${validationErrors.join(", ")}`);
      }

      console.log("🌐 Enviando reserva a través de la API backend flexible...");
      // Ruta real registrada en index.js:
      // orderRouter.post('/', isAdmin, ordersController.createReservation) montado en /api/orders
      // Antes se posteaba a la raíz ("/"), que no existe como ruta.
      const data = await ApiClient.post("/orders", reservationData);

      if (!data.success) {
        throw new Error(data.error || "Error al enviar reserva");
      }

      const result = {
        success: true,
        results: data.results,
        referenceId: data.referenceId || reservationData.pedidoId,
      };

      // Invalidar cache después de enviar reserva
      cacheService.invalidatePattern("availability");
      cacheService.invalidatePattern("requests");

      // Notificar nueva solicitud a los administradores
      try {
        await NotificationService.notifyNewRequest({
          ItemInternalId: result.referenceId || reservationData.pedidoId,
          Contacto_Nombre: reservationData.contacto?.nombre || "Usuario",
          Vuelo_Destino: reservationData.vuelo?.destino || "Destino",
          Agencia: reservationData.contacto?.agencia || "Agencia",
        });
      } catch (notificationError) {
        console.warn(
          "Error enviando notificación de nueva solicitud:",
          notificationError
        );
        // No fallar la reserva por error de notificación
      }

      return result;
    } catch (error) {
      console.error("Error in submitReservation:", error);
      throw new Error(error.message || "Error al enviar reserva");
    }
  }

  /**
   * Refrescar cache manualmente
   */
  static refreshCache() {
    cacheService.invalidatePattern("availability");
    cacheService.invalidatePattern("requests");
    cacheService.invalidatePattern("confirmations");
  }

  /**
   * Validar datos de reserva
   */
  static validateReservationData(data) {
    const errors = [];

    if (!data.pedidoId) {
      errors.push("ID de pedido es requerido");
    }

    if (!data.vuelo) {
      errors.push("Información de vuelo es requerida");
    } else {
      if (!data.vuelo.codigo_cupo) errors.push("Código de cupo es requerido");
      if (!data.vuelo.destino) errors.push("Destino es requerido");
      if (!data.vuelo.compania) errors.push("Compañía es requerida");
    }

    if (!data.contacto) {
      errors.push("Información de contacto es requerida");
    } else {
      if (!data.contacto.nombre) errors.push("Nombre de contacto es requerido");
      if (!data.contacto.email) errors.push("Email de contacto es requerido");
      if (!data.contacto.telefono)
        errors.push("Teléfono de contacto es requerido");
      if (!data.contacto.agencia) errors.push("Agencia es requerida");

      if (
        data.contacto.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contacto.email)
      ) {
        errors.push("Email de contacto no válido");
      }
    }

    if (
      !data.pasajeros ||
      !Array.isArray(data.pasajeros) ||
      data.pasajeros.length === 0
    ) {
      errors.push("Al menos un pasajero es requerido");
    } else {
      data.pasajeros.forEach((pasajero, index) => {
        if (!pasajero.nombre)
          errors.push(`Nombre del pasajero ${index + 1} es requerido`);
        if (!pasajero.apellido)
          errors.push(`Apellido del pasajero ${index + 1} es requerido`);
        if (!pasajero.documento)
          errors.push(`Documento del pasajero ${index + 1} es requerido`);
        if (!pasajero.nacimiento)
          errors.push(
            `Fecha de nacimiento del pasajero ${index + 1} es requerida`
          );
        if (!pasajero.nacionalidad)
          errors.push(`Nacionalidad del pasajero ${index + 1} es requerida`);
        if (
          !pasajero.tipo ||
          !["Adulto", "Niño", "Bebé"].includes(pasajero.tipo)
        ) {
          errors.push(`Tipo de pasajero ${index + 1} no válido`);
        }

        if (pasajero.nacimiento) {
          const fechaNacimiento = new Date(pasajero.nacimiento);
          const hoy = new Date();
          if (fechaNacimiento > hoy) {
            errors.push(
              `Fecha de nacimiento del pasajero ${
                index + 1
              } no puede ser futura`
            );
          }
        }
      });
    }

    return errors;
  }

  /**
   * Formatear fecha para mostrar
   */
  static formatDate(fecha) {
    if (!fecha) return "";

    if (!isNaN(fecha) && typeof fecha !== "string") {
      const d = new Date(fecha);
      return d instanceof Date && !isNaN(d)
        ? d.toLocaleDateString("es-ES")
        : "";
    }

    if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const d = new Date(fecha);
      return d instanceof Date && !isNaN(d)
        ? d.toLocaleDateString("es-ES")
        : fecha;
    }

    if (typeof fecha === "string" && !isNaN(Date.parse(fecha))) {
      const d = new Date(Date.parse(fecha));
      return d instanceof Date && !isNaN(d)
        ? d.toLocaleDateString("es-ES")
        : fecha;
    }

    return fecha;
  }

  /**
   * Generar ID de pedido único
   */
  static generatePedidoId() {
    const year = new Date().getFullYear();
    const randomPart = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    return `PED-${year}-${randomPart}`;
  }

  /**
   * Validar disponibilidad antes de reservar
   */
  static validateAvailability(vuelo, pasajeros) {
    if (!vuelo || !vuelo.disponibilidad) {
      throw new Error("Información de disponibilidad no válida");
    }

    const disponibilidad = parseInt(vuelo.disponibilidad);
    const cantidadPasajeros = pasajeros ? pasajeros.length : 0;

    if (disponibilidad <= 0) {
      throw new Error("No hay cupos disponibles para este vuelo");
    }

    if (cantidadPasajeros > disponibilidad) {
      throw new Error(
        `Solo hay ${disponibilidad} cupos disponibles, pero se solicitan ${cantidadPasajeros} pasajeros`
      );
    }

    return true;
  }

  /**
   * Obtener tipos de pasajero válidos
   */
  static getValidPassengerTypes() {
    return ["Adulto", "Niño", "Bebé"];
  }

  /**
   * Obtener nacionalidades comunes
   */
  static getCommonNationalities() {
    return [
      "Argentina",
      "Uruguay",
      "Brasil",
      "Chile",
      "Paraguay",
      "Bolivia",
      "Perú",
      "Colombia",
      "Venezuela",
      "Ecuador",
      "España",
      "Estados Unidos",
      "Canadá",
      "México",
      "Otra",
    ];
  }

  /**
   * Confirmar un pedido (cambiar estado de "Solicitud" a "Confirmado")
   * @param {string} pedidoId - ID del pedido a confirmar
   * @param {Object} adminUser - Usuario que confirma (para notificación)
   * @returns {Promise<Object>} Resultado de la confirmación
   */
  static async confirmRequest(pedidoId, adminUser = {}) {
    try {
      // Obtener datos del pedido para la notificación
      const requestsResult = await this.getRequests();
      const requestsData = requestsResult.data || [];
      const pedido = requestsData.find(
        (item) =>
          item.ItemInternalId === pedidoId || item.Pedido_ID === pedidoId
      );

      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      // Persistir el cambio de estado en el backend real.
      // Ruta registrada en index.js: orderRouter.put('/:id', isAdmin, ordersController.updateReservation)
      // montada en /api/orders/:id.
      if (ApiClient.isApiEnabled()) {
        const updateResult = await ApiClient.put(`/orders/${pedidoId}`, {
          Estado: "Confirmado",
        });

        if (!updateResult.success) {
          throw new Error(
            updateResult.error || "Error al confirmar el pedido en el backend"
          );
        }
      }

      // Notificar confirmación del pedido
      try {
        await NotificationService.notifyRequestConfirmed({
          ItemInternalId: pedido.ItemInternalId || pedido.Pedido_ID,
          Contacto_Nombre: pedido.Contacto_Nombre || "Usuario",
          Vuelo_Destino: pedido.Vuelo_Destino || "Destino",
          Agencia: pedido.Agencia || "Agencia",
          adminName: adminUser.name || "Administrador",
        });
      } catch (notificationError) {
        console.warn(
          "Error enviando notificación de confirmación:",
          notificationError
        );
        // No fallar la confirmación por error de notificación
      }

      // Invalidar cache
      cacheService.invalidatePattern("requests");
      cacheService.invalidatePattern("confirmations");

      return {
        success: true,
        message: "Pedido confirmado exitosamente",
        pedidoId: pedidoId,
      };
    } catch (error) {
      console.error("Error confirmando pedido:", error);
      throw error;
    }
  }
}

export default ReservationService;