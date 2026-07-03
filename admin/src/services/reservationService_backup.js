import { supabase } from "../supabaseClient";
import { cacheService } from "./cacheService";
import ConnectionService from "./connectionService";

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
            vuelosUnicos.set(key, {
              "@odata.etag": pedido["@odata.etag"] || "",
              ItemInternalId: pedido.ItemInternalId || "",
              codigo_cupo: pedido.Vuelo_Codigo,
              destino: pedido.Vuelo_Destino,
              compania: pedido.Vuelo_Compania,
              disponibilidad: "10", // Disponibilidad ficticia
              salida: pedido.Vuelo_Salida || "",
              regreso: "", // No disponible en estructura de pedidos
              precio: pedido.Vuelo_Precio || "0",
              ruta: pedido.Ruta || "",
              pnr: pedido.Pnr || "",
              ficha: pedido.Ficha || "",
              temporada: pedido.Temporada || "",
            });

            console.log("✅ Vuelo único creado:", {
              codigo: pedido.Vuelo_Codigo,
              destino: pedido.Vuelo_Destino,
              compania: pedido.Vuelo_Compania,
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

      // La estructura real de "Tabla pedidos" usa Estado específico
      // Filtrar solicitudes por Estado: "Solicitado"
      const requestsData = result.data.filter(
        (item) =>
          item.Pedido_ID !== undefined && // Campo específico de pedidos
          item.Estado === "Solicitado" // Estado específico para solicitudes
      );

      console.log(
        `Filtradas ${requestsData.length} solicitudes de ${result.data.length} pedidos totales`
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

      // La estructura real de "Tabla pedidos" usa Estado específico
      // Filtrar confirmaciones por Estado: "Confirmado"
      const confirmationsData = result.data.filter(
        (item) =>
          item.Pedido_ID !== undefined && // Campo específico de pedidos
          item.Estado === "Confirmado" // Estado específico para confirmaciones
      );

      console.log(
        `Filtradas ${confirmationsData.length} confirmaciones de ${result.data.length} pedidos totales`
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
}

export default ReservationService;
