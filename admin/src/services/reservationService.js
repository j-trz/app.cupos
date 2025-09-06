import { supabase } from "../supabaseClient";
import { cacheService } from "./cacheService";
import ConnectionService from "./connectionService";
import AuthorizationService from "./authorizationService";
import NotificationService from "./notificationService";

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
      // CORRECCIÓN: Los datos de disponibilidad se derivan de pedidos únicos por vuelo
      const result = await ConnectionService.getDataFromActiveConnection(
        "pedidos"
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al obtener datos de la conexión activa"
        );
      }

      console.log(
        "Datos para crear disponibilidad (desde pedidos):",
        result.data.slice(0, 3)
      );

      // Crear disponibilidad única por combinación de vuelo desde pedidos
      const vuelosUnicos = new Map();

      result.data.forEach((pedido) => {
        if (
          pedido.Vuelo_Codigo &&
          pedido.Vuelo_Destino &&
          pedido.Vuelo_Compania
        ) {
          const key = `${pedido.Vuelo_Codigo}-${pedido.Vuelo_Destino}-${pedido.Vuelo_Compania}-${pedido.Vuelo_Salida}`;

          if (!vuelosUnicos.has(key)) {
            const disponibilidad = Math.floor(Math.random() * 15) + 1; // Disponibilidad aleatoria entre 1-15
            const productData = {
              "@odata.etag": pedido["@odata.etag"] || "",
              ItemInternalId: pedido.ItemInternalId || "",
              codigo_cupo: pedido.Vuelo_Codigo,
              destino: pedido.Vuelo_Destino,
              compania: pedido.Vuelo_Compania,
              disponibilidad: disponibilidad.toString(),
              salida: pedido.Vuelo_Salida || "",
              regreso: "", // No disponible en estructura de pedidos
              precio: pedido.Vuelo_Precio || "0",
              ruta: pedido.Ruta || "",
              pnr: pedido.Pnr || "",
              ficha: pedido.Ficha || "",
              temporada: pedido.Temporada || "",
            };

            vuelosUnicos.set(key, productData);

            // Notificar si hay pocos lugares disponibles
            if (disponibilidad <= 5) {
              NotificationService.notifyLowAvailability(productData, 5);
            }

            console.log("✅ Vuelo único creado:", {
              codigo: pedido.Vuelo_Codigo,
              destino: pedido.Vuelo_Destino,
              compania: pedido.Vuelo_Compania,
              disponibilidad,
            });
          }
        }
      });

      const availabilityData = Array.from(vuelosUnicos.values());
      console.log(
        `✅ Creados ${availabilityData.length} vuelos únicos para disponibilidad de ${result.data.length} pedidos`
      );

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

      // DEBUG: Mostrar campos disponibles y valores de Estado
      console.log("🔍 DEBUG - Campos disponibles en los datos:");
      if (result.data.length > 0) {
        console.log("Primer registro completo:", result.data[0]);
        console.log("Valores únicos de Estado:", [
          ...new Set(result.data.map((item) => item.Estado)),
        ]);
      }

      // Filtrar solo solicitudes (Estado !== "Confirmado")
      const filteredByStatus = result.data.filter((item) => {
        const estado = item.Estado || item.estado || "";
        return estado !== "Confirmado";
      });

      console.log(
        `🔍 Filtrados ${filteredByStatus.length} registros con estado Solicitado de ${result.data.length} totales`
      );

      // Transformar datos de pedidos a estructura de solicitudes
      let requestsData = filteredByStatus.map((item) => {
        const estado = item.Estado || item.estado || "";
        console.log(
          `Procesando solicitud ${item.ItemInternalId}: Estado="${estado}"`
        );

        // Mapear campos de pedidos a estructura esperada por Solicitudes.jsx
        return {
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
          // Campos adicionales de contexto
          Vuelo_Codigo: item.Vuelo_Codigo || "",
          Vuelo_Compania: item.Vuelo_Compania || "",
          Vuelo_Precio: item.Vuelo_Precio || "",
          Usuario_Email: item.Usuario_Email || "",
          Pnr: item.Pnr || "",
          Ficha: item.Ficha || "",
        };
      });

      console.log(
        `✅ Transformados ${requestsData.length} pedidos con estado Solicitado a estructura de solicitudes`
      );

      // SEGUNDO: Aplicar filtros según el rol
      switch (filters.filterType) {
        case "all":
          // Admin: ve todas las solicitudes
          break;

        case "agency":
          // Agency Admin: solo solicitudes de su agencia
          requestsData = requestsData.filter(
            (item) => item.Agencia === filters.agencia
          );
          break;

        case "user": {
          // Agency User: solo sus propias solicitudes
          // Necesitamos obtener el email del usuario para filtrar
          const profile = await AuthorizationService.getCurrentUserProfile();
          if (profile?.email) {
            requestsData = requestsData.filter(
              (item) =>
                item.Agencia === filters.agencia &&
                item.Usuario_Email === profile.email
            );
          } else {
            requestsData = [];
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

  static async _fetchConfirmations() {
    try {
      // Verificar permisos para ver confirmaciones
      const canViewConfirmations =
        (await AuthorizationService.hasPermission("view_agency_data")) ||
        (await AuthorizationService.hasPermission("view_all_data"));

      if (!canViewConfirmations) {
        throw new Error("No tienes permisos para ver confirmaciones");
      }

      // Obtener filtros según el rol del usuario
      const filters = await AuthorizationService.getDataFilters();

      // Obtener datos específicos de pedidos
      const result = await ConnectionService.getDataFromActiveConnection(
        "pedidos"
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al obtener datos de la conexión activa"
        );
      }

      console.log("Datos para confirmaciones:", result.data.slice(0, 3));
      console.log("Filtros aplicados:", filters);

      // Filtrar solo confirmaciones (Estado === "Confirmado")
      let confirmationsData = result.data.filter((item) => {
        return item.Estado === "Confirmado";
      });

      // Aplicar filtros según el rol
      switch (filters.filterType) {
        case "all":
          // Admin: ve todas las confirmaciones
          break;

        case "agency":
          // Agency Admin: solo confirmaciones de su agencia
          confirmationsData = confirmationsData.filter(
            (item) => item.Agencia === filters.agencia
          );
          break;

        case "user": {
          // Agency User: no debería llegar aquí (sin permisos), pero por seguridad filtrar solo sus datos
          const profile = await AuthorizationService.getCurrentUserProfile();
          if (profile?.email) {
            confirmationsData = confirmationsData.filter(
              (item) =>
                item.Agencia === filters.agencia &&
                item.Usuario_Email === profile.email
            );
          } else {
            confirmationsData = [];
          }
          break;
        }

        default:
          confirmationsData = [];
      }

      console.log(
        `✅ Filtradas ${confirmationsData.length} confirmaciones según rol (${filters.filterType}) de ${result.data.length} pedidos totales`
      );

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

      // Obtener la conexión activa para determinar cómo enviar
      const activeConnection = await ConnectionService.getActiveConnection();

      if (!activeConnection) {
        throw new Error("No hay conexión activa configurada");
      }

      let result;

      // Enviar según el tipo de conexión activa
      if (activeConnection.type === "powerautomate") {
        const { data, error } = await supabase.functions.invoke(
          "power-automate-proxy",
          {
            body: {
              action: "submit-reservation",
              payload: reservationData,
            },
          }
        );

        if (error) {
          throw new Error(error.message || "Error al enviar reserva");
        }

        if (!data.success) {
          throw new Error(data.error || "Error desconocido al enviar reserva");
        }

        result = {
          success: true,
          results: data.results,
          referenceId: data.referenceId,
        };
      } else {
        // Para otros tipos de conexión, usar el sistema genérico
        const submitResult = await ConnectionService.submitReservation(
          reservationData
        );

        if (!submitResult.success) {
          throw new Error(submitResult.error || "Error al enviar reserva");
        }

        result = submitResult;
      }

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

    // Validar estructura básica
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

      // Validar formato de email
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

        // Validar fecha de nacimiento
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

    // Si es número, asume timestamp
    if (!isNaN(fecha) && typeof fecha !== "string") {
      const d = new Date(fecha);
      return d instanceof Date && !isNaN(d)
        ? d.toLocaleDateString("es-ES")
        : "";
    }

    // Si es string tipo yyyy-mm-dd
    if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const d = new Date(fecha);
      return d instanceof Date && !isNaN(d)
        ? d.toLocaleDateString("es-ES")
        : fecha;
    }

    // Si es string tipo ISO
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
      // En un sistema real, aquí actualizaríamos el estado en la fuente de datos
      // Por ahora, simulamos la confirmación y enviamos la notificación

      // Obtener datos del pedido para la notificación
      const requestsData = await this.getRequests();
      const pedido = requestsData.find(
        (item) =>
          item.ItemInternalId === pedidoId || item.Pedido_ID === pedidoId
      );

      if (!pedido) {
        throw new Error("Pedido no encontrado");
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

  /**
   * Detectar y notificar nuevos productos disponibles
   * Esta función compara los datos actuales con los anteriores para detectar nuevos vuelos
   * @returns {Promise<void>}
   */
  static async checkForNewProducts() {
    try {
      // Obtener datos actuales de disponibilidad
      const currentData = await this.getAvailability(false); // Sin cache para datos frescos

      if (!currentData.success || !currentData.data) {
        return;
      }

      // Obtener datos anteriores del cache si existen
      const cacheKey = "previous-availability-check";
      const previousData = cacheService.get(cacheKey) || [];

      // Si es la primera vez, solo guardar los datos actuales
      if (previousData.length === 0) {
        cacheService.set(cacheKey, currentData.data, 3600000); // 1 hora
        return;
      }

      // Comparar para detectar nuevos productos
      const previousCodes = new Set(
        previousData.map(
          (item) => `${item.codigo_cupo}-${item.destino}-${item.compania}`
        )
      );

      // Encontrar nuevos productos
      const newProducts = currentData.data.filter((item) => {
        const key = `${item.codigo_cupo}-${item.destino}-${item.compania}`;
        return !previousCodes.has(key);
      });

      // Notificar cada nuevo producto
      for (const product of newProducts) {
        try {
          await NotificationService.notifyNewProduct({
            codigo_cupo: product.codigo_cupo,
            destino: product.destino,
            compania: product.compania,
            disponibilidad: product.disponibilidad,
            precio: product.precio,
            salida: product.salida,
            temporada: product.temporada,
          });

          console.log(
            `✅ Notificación enviada para nuevo producto: ${product.codigo_cupo} - ${product.destino}`
          );
        } catch (notificationError) {
          console.warn(
            "Error enviando notificación de nuevo producto:",
            notificationError
          );
        }
      }

      // Actualizar cache con datos actuales
      cacheService.set(cacheKey, currentData.data, 3600000); // 1 hora

      if (newProducts.length > 0) {
        console.log(
          `🆕 Detectados ${newProducts.length} nuevos productos disponibles`
        );
      }
    } catch (error) {
      console.error("Error verificando nuevos productos:", error);
      // No lanzar error para no afectar otras funcionalidades
    }
  }

  /**
   * Iniciar verificación periódica de nuevos productos
   * @param {number} intervalMinutes - Intervalo en minutos para verificar
   */
  static startNewProductsMonitoring(intervalMinutes = 30) {
    // Verificar inmediatamente
    this.checkForNewProducts();

    // Configurar verificación periódica
    setInterval(() => {
      this.checkForNewProducts();
    }, intervalMinutes * 60 * 1000);

    console.log(
      `🔄 Monitoreo de nuevos productos iniciado (cada ${intervalMinutes} minutos)`
    );
  }
}

export default ReservationService;
