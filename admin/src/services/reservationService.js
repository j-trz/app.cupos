import { supabase } from "../supabaseClient";
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
        const result = await ApiClient.get("/power-automate-proxy/availability");
        
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
          data: availabilityData
        };
      }

      // TEMPORAL: Obtener datos directamente sin Edge Function
      console.log("🔄 [TEMPORAL] Obteniendo disponibilidad directamente...");

      // Primero intentar con el sistema de conexiones
      let result;
      try {
        result = await ConnectionService.getDataFromActiveConnection(
          "productos"
        );
      } catch (connectionError) {
        console.error("❌ Error con sistema de conexiones:", connectionError);

        // FALLBACK TEMPORAL: Usar URL directa de Power Automate
        console.warn("⚠️ [TEMPORAL] Usando fallback directo a Power Automate");
        const powerAutomateUrl = import.meta.env.VITE_POWERAUTOMATE_GET_URL;

        if (!powerAutomateUrl) {
          throw new Error(
            "URL de Power Automate no configurada en variables de entorno"
          );
        }

        try {
          const response = await fetch(powerAutomateUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          result = {
            success: true,
            data: data || [],
          };
        } catch (fetchError) {
          console.error("❌ Error en fallback directo:", fetchError);
          throw new Error(
            "No se pudo obtener disponibilidad de ninguna fuente"
          );
        }
      }

      if (!result.success) {
        throw new Error(
          result.error || "Error al obtener datos de la conexión activa"
        );
      }

      console.log(
        "Datos de productos recibidos directamente:",
        result.data.slice(0, 3)
      );

      // Los datos ya vienen como productos, solo necesitamos procesar notificaciones
      const availabilityData = result.data.map((producto) => {
        // Notificar si hay pocos lugares disponibles
        const disponibilidad = parseInt(producto.disponibilidad || 0);
        if (disponibilidad <= 5 && disponibilidad > 0) {
          NotificationService.notifyLowAvailability(producto, 5);
        }

        console.log("✅ Producto procesado:", {
          codigo: producto.codigo_cupo,
          destino: producto.destino,
          compania: producto.compania,
          disponibilidad: producto.disponibilidad,
        });

        return producto;
      });

      console.log(
        `✅ Procesados ${availabilityData.length} productos de disponibilidad`
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
      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Obteniendo solicitudes desde API backend flexible...");
        const result = await ApiClient.get("/power-automate-proxy/requests");
        
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
          data: requestsData
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
          Neto_1: item.Neto_1 || "",
          Op: item.Op || "",
        };
      });

      console.log(
        `✅ Transformados ${requestsData.length} pedidos con estado Solicitado a estructura de solicitudes`
      );

      // SEGUNDO: Aplicar filtros según el rol
      switch (filters.filterType) {
        case "all":
          // Admin: ve todas las solicitudes
          console.log("🔓 Admin - mostrando todas las solicitudes");
          break;

        case "agency":
          // Agency Admin: solo solicitudes de su agencia actual
          requestsData = requestsData.filter(
            (item) => item.Agencia === filters.agencia
          );
          console.log(
            `🏢 Agency Admin - filtradas ${requestsData.length} solicitudes de agencia "${filters.agencia}"`
          );
          break;

        case "user": {
          // Agency User: solo sus propias solicitudes Y de su agencia actual
          // AMBAS condiciones deben cumplirse:
          // 1. La solicitud pertenece a su agencia actual
          // 2. La solicitud fue creada por él (mismo email)
          const profile = await AuthorizationService.getCurrentUserProfile();
          if (profile?.email && filters.agencia) {
            requestsData = requestsData.filter(
              (item) =>
                item.Agencia === filters.agencia && // Agencia actual
                item.Usuario_Email === profile.email // Su email
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

  static async _fetchConfirmations() {
    try {
      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Obteniendo confirmaciones desde API backend flexible...");
        const result = await ApiClient.get("/power-automate-proxy/confirmations");
        
        if (!result.success) {
          throw new Error(result.error || "Error al obtener confirmaciones");
        }

        const confirmationsData = (result.data || []).map((item) => ({
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
          Estado: "Confirmado",
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
          data: confirmationsData
        };
      }

      // Verificar permisos para ver confirmaciones
      // CORRECCIÓN: agency_user SÍ puede ver sus propias confirmaciones
      const canViewConfirmations =
        (await AuthorizationService.hasPermission("view_agency_data")) ||
        (await AuthorizationService.hasPermission("view_all_data")) ||
        (await AuthorizationService.hasPermission("view_own_data")); // Agregar permiso para datos propios

      if (!canViewConfirmations) {
        throw new Error("No tienes permisos para ver confirmaciones");
      }

      // Obtener filtros según el rol del usuario
      const filters = await AuthorizationService.getDataFilters();
      console.log("🔍 Permisos para confirmaciones - Filtros:", filters);

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
          console.log("🔓 Admin - mostrando todas las confirmaciones");
          break;

        case "agency":
          // Agency Admin: solo confirmaciones de su agencia actual
          confirmationsData = confirmationsData.filter(
            (item) => item.Agencia === filters.agencia
          );
          console.log(
            `🏢 Agency Admin - filtradas ${confirmationsData.length} confirmaciones de agencia "${filters.agencia}"`
          );
          break;

        case "user": {
          // Agency User: solo sus propias confirmaciones Y de su agencia actual
          // AMBAS condiciones deben cumplirse:
          // 1. La confirmación pertenece a su agencia actual
          // 2. La confirmación fue creada por él (mismo email)
          const profile = await AuthorizationService.getCurrentUserProfile();
          if (profile?.email && filters.agencia) {
            // Log antes del filtrado para debugging
            console.log(
              `🔍 Agency User confirmaciones - Datos antes del filtro:`,
              {
                totalConfirmaciones: confirmationsData.length,
                agenciaFiltro: filters.agencia,
                emailFiltro: profile.email,
                primerasConfirmaciones: confirmationsData
                  .slice(0, 3)
                  .map((item) => ({
                    id: item.ItemInternalId,
                    agencia: item.Agencia,
                    email: item.Usuario_Email,
                  })),
              }
            );

            confirmationsData = confirmationsData.filter(
              (item) =>
                item.Agencia === filters.agencia && // Agencia actual
                item.Usuario_Email === profile.email // Su email
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

      let result;

      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Enviando reserva a través de la API backend flexible...");
        const data = await ApiClient.post("/power-automate-proxy/submit-reservation", {
          payload: reservationData
        });

        if (!data.success) {
          throw new Error(data.error || "Error al enviar reserva");
        }

        result = {
          success: true,
          results: data.results,
          referenceId: data.referenceId || reservationData.pedidoId
        };
      } else {
        // Obtener la conexión activa para determinar cómo enviar
        const activeConnection = await ConnectionService.getActiveConnection();

        if (!activeConnection) {
          throw new Error("No hay conexión activa configurada");
        }

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
}

export default ReservationService;
