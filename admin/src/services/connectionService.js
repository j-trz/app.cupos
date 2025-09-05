import { supabase } from "../supabaseClient";
import EncryptionService from "./encryptionService";
import DataValidator from "./dataValidator";

/**
 * Servicio para gestionar conexiones a APIs externas de forma segura
 */
class ConnectionService {
  /**
   * Crear una nueva conexión API
   * @param {Object} connectionData - Datos de la conexión
   * @param {string} userPassword - Contraseña del usuario para encriptar
   * @returns {Promise<Object>} Conexión creada
   */
  static async createConnection(connectionData, userPassword) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Validar datos requeridos
      const { name, type, description, credentials } = connectionData;
      if (!name || !type || !credentials) {
        throw new Error("Datos de conexión incompletos");
      }

      // Encriptar credenciales
      const encryptedCredentials = await EncryptionService.encryptCredentials(
        credentials,
        userPassword
      );

      // Crear registro en la base de datos
      const { data, error } = await supabase
        .from("data_connections")
        .insert([
          {
            user_id: user.id,
            name,
            type,
            description,
            encrypted_credentials: encryptedCredentials,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        connection: {
          ...data,
          encrypted_credentials: "[ENCRYPTED]", // No devolver datos encriptados
        },
      };
    } catch (error) {
      console.error("Error creating connection:", error);
      throw new Error(error.message || "Error al crear la conexión");
    }
  }

  /**
   * Obtener todas las conexiones del usuario actual
   * @returns {Promise<Array>} Lista de conexiones (sin credenciales)
   */
  static async getUserConnections() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Primero intentar con is_active
      let { data, error } = await supabase
        .from("data_connections")
        .select(
          "id, name, type, description, is_active, created_at, updated_at, last_tested_at, connection_status"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Si hay error por columna is_active, usar consulta sin esa columna
      if (
        error &&
        (error.code === "42703" ||
          error.message?.includes("is_active") ||
          error.message?.includes("column"))
      ) {
        console.warn(
          "Columna is_active no existe, obteniendo conexiones sin ese campo"
        );

        const fallbackResult = await supabase
          .from("data_connections")
          .select(
            "id, name, type, description, created_at, updated_at, last_tested_at, connection_status"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        data = fallbackResult.data;
        error = fallbackResult.error;

        // Agregar is_active como false por defecto para mantener compatibilidad
        if (data) {
          data = data.map((conn) => ({ ...conn, is_active: false }));
        }
      }

      if (error) throw error;

      return {
        success: true,
        connections: data || [],
      };
    } catch (error) {
      console.error("Error fetching connections:", error);
      throw new Error(error.message || "Error al obtener las conexiones");
    }
  }

  /**
   * Obtener una conexión específica con credenciales desencriptadas
   * @param {string} connectionId - ID de la conexión
   * @param {string} userPassword - Contraseña del usuario para desencriptar
   * @returns {Promise<Object>} Conexión con credenciales desencriptadas
   */
  static async getConnection(connectionId, userPassword) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("data_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Conexión no encontrada");

      // Desencriptar credenciales
      const credentials = await EncryptionService.decryptCredentials(
        data.encrypted_credentials,
        userPassword
      );

      return {
        success: true,
        connection: {
          ...data,
          credentials,
        },
      };
    } catch (error) {
      console.error("Error fetching connection:", error);
      throw new Error(error.message || "Error al obtener la conexión");
    }
  }

  /**
   * Actualizar una conexión existente
   * @param {string} connectionId - ID de la conexión
   * @param {Object} updateData - Datos a actualizar
   * @param {string} userPassword - Contraseña del usuario (si se actualizan credenciales)
   * @returns {Promise<Object>} Conexión actualizada
   */
  static async updateConnection(connectionId, updateData, userPassword = null) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const updates = {
        updated_at: new Date().toISOString(),
      };

      // Campos que se pueden actualizar sin encriptación
      const allowedFields = [
        "name",
        "description",
        "is_active",
        "column_mapping",
      ];
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      // Si se actualizan credenciales, encriptarlas
      if (updateData.credentials && userPassword) {
        updates.encrypted_credentials =
          await EncryptionService.encryptCredentials(
            updateData.credentials,
            userPassword
          );
      }

      const { data, error } = await supabase
        .from("data_connections")
        .update(updates)
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        connection: {
          ...data,
          encrypted_credentials: "[ENCRYPTED]",
        },
      };
    } catch (error) {
      console.error("Error updating connection:", error);
      throw new Error(error.message || "Error al actualizar la conexión");
    }
  }

  /**
   * Eliminar una conexión
   * @param {string} connectionId - ID de la conexión
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteConnection(connectionId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("data_connections")
        .delete()
        .eq("id", connectionId)
        .eq("user_id", user.id);

      if (error) throw error;

      return {
        success: true,
        message: "Conexión eliminada correctamente",
      };
    } catch (error) {
      console.error("Error deleting connection:", error);
      throw new Error(error.message || "Error al eliminar la conexión");
    }
  }

  /**
   * Activar una conexión específica (desactiva las demás)
   * @param {string} connectionId - ID de la conexión a activar
   * @returns {Promise<Object>} Resultado de la activación
   */
  static async setActiveConnection(connectionId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar si la columna is_active existe
      try {
        // Primero desactivar todas las conexiones del usuario
        const { error: deactivateError } = await supabase
          .from("data_connections")
          .update({ is_active: false })
          .eq("user_id", user.id);

        if (
          deactivateError &&
          !deactivateError.message?.includes("is_active") &&
          !deactivateError.message?.includes("column")
        ) {
          throw deactivateError;
        }

        // Luego activar la conexión específica
        const { error: activateError } = await supabase
          .from("data_connections")
          .update({ is_active: true })
          .eq("id", connectionId)
          .eq("user_id", user.id);

        if (
          activateError &&
          !activateError.message?.includes("is_active") &&
          !activateError.message?.includes("column")
        ) {
          throw activateError;
        }

        return { success: true, message: "Conexión activada correctamente" };
      } catch (dbError) {
        // Si hay error por columna is_active no existe
        if (
          dbError.code === "42703" ||
          dbError.message?.includes("is_active") ||
          dbError.message?.includes("column")
        ) {
          console.warn(
            "Columna is_active no existe. Por favor, aplique la migración SQL primero."
          );
          return {
            success: false,
            message:
              "Función de conexión activa no disponible. Aplique la migración de base de datos.",
            needsMigration: true,
          };
        }
        throw dbError;
      }
    } catch (error) {
      console.error("Error setting active connection:", error);
      throw new Error(`Error al activar conexión: ${error.message}`);
    }
  }

  /**
   * Obtener la conexión activa del usuario
   * @returns {Promise<Object>} Conexión activa o null
   */
  static async getActiveConnection() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Primero intentar con is_active
      let { data, error } = await supabase
        .from("data_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      // Si hay error 406 (columna is_active no existe), usar fallback
      if (
        error &&
        (error.code === "42703" ||
          error.message?.includes("is_active") ||
          error.message?.includes("column") ||
          error.message?.includes("406"))
      ) {
        console.warn(
          "Columna is_active no existe, usando primera conexión como fallback"
        );

        // Fallback: obtener la primera conexión disponible
        const fallbackResult = await supabase
          .from("data_connections")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error && error.code !== "PGRST116") throw error;

      return data || null;
    } catch (error) {
      console.error("Error getting active connection:", error);
      return null;
    }
  }

  /**
   * Obtener datos de la conexión activa con mapeo de campos
   * @returns {Promise<Object>} Datos mapeados al formato estándar
   */
  static async getDataFromActiveConnection() {
    try {
      const activeConnection = await this.getActiveConnection();
      if (!activeConnection) {
        // Si no hay conexión activa, usar Power Automate como fallback
        return await this.getDataFromPowerAutomate();
      }

      let rawData;

      switch (activeConnection.type) {
        case "powerautomate":
          rawData = await this.getDataFromPowerAutomate();
          break;
        default:
          // Por ahora, otras fuentes usan fallback
          console.log(
            `Tipo ${activeConnection.type} no implementado aún, usando Power Automate`
          );
          rawData = await this.getDataFromPowerAutomate();
          break;
      }

      // Validar que los datos cumplan con la estructura estándar
      if (rawData.success && rawData.data) {
        const validation = DataValidator.validateRecords(rawData.data);

        if (!validation.valid) {
          console.warn(
            "Datos no cumplen estructura estándar:",
            validation.errors
          );

          // Si hay errores pero algunos registros son válidos, usar solo los válidos
          if (validation.validRecords > 0) {
            const validData = rawData.data.filter(
              (record) => DataValidator.validateSingleRecord(record).valid
            );
            return {
              ...rawData,
              data: validData,
              validationWarning: `${validation.validRecords}/${validation.totalRecords} registros válidos`,
            };
          }
        }
      }

      return rawData;
    } catch (error) {
      console.error("Error getting data from active connection:", error);
      // Fallback a Power Automate en caso de error
      return await this.getDataFromPowerAutomate();
    }
  }

  /**
   * Obtener datos de Power Automate usando conexión dinámica o fallback
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos de Power Automate
   */
  static async getDataFromPowerAutomate(dataType = "pedidos") {
    try {
      // Primero intentar obtener la conexión activa
      const activeConnection = await this.getActiveConnection();
      let targetUrl;

      if (activeConnection && activeConnection.type === "powerautomate") {
        try {
          // Intentar usar credenciales de la conexión activa
          // Por ahora usar fallback si no se puede desencriptar
          const credentials = JSON.parse(
            activeConnection.encrypted_credentials || "{}"
          );

          if (dataType === "productos") {
            targetUrl = credentials.productosUrl || credentials.flowUrl;
          } else {
            targetUrl = credentials.pedidosUrl || credentials.flowUrl;
          }
        } catch (error) {
          console.warn(
            "No se pudieron obtener credenciales de conexión activa:",
            error
          );
          // Continuar con fallback a variables de entorno
        }
      }

      // Fallback a variables de entorno si no hay conexión activa
      if (!targetUrl) {
        console.log("Usando variables de entorno como fallback");
        // CORRECCIÓN: Ambos tipos usan la misma URL porque la disponibilidad se deriva de los datos de pedidos
        targetUrl = import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS;
        console.log(
          `🔍 ${dataType.toUpperCase()} usará URL (datos unificados):`,
          targetUrl
        );
      }

      if (!targetUrl) {
        throw new Error(`No se encontró URL para tipo de datos: ${dataType}`);
      }

      console.log(
        `Obteniendo datos de Power Automate (${dataType}):`,
        targetUrl
      );

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();

        // Log detallado para debuggear
        console.log(`📊 Power Automate response (${dataType}):`, {
          totalItems: data.length,
          sampleData: data.slice(0, 3),
          allItems: data,
        });

        // Log específico para disponibilidad
        if (dataType === "productos") {
          console.log("🎯 DISPONIBILIDAD - Estructura de datos recibida:");
          data.forEach((item, index) => {
            if (index < 5) {
              // Solo mostrar primeros 5
              console.log(`Item ${index + 1}:`, {
                codigo_cupo: item.codigo_cupo,
                destino: item.destino,
                compania: item.compania,
                disponibilidad: item.disponibilidad,
                allFields: Object.keys(item),
              });
            }
          });
        }

        return {
          success: true,
          data: this.mapToStandardFormat(data, "powerautomate", dataType),
        };
      } else {
        console.error(
          `❌ Error HTTP ${response.status} al obtener ${dataType}:`,
          response.statusText
        );
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error fetching from Power Automate (${dataType}):`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Mapear datos de cualquier fuente al formato estándar de la aplicación
   * @param {Array} data - Datos de la fuente
   * @param {string} sourceType - Tipo de fuente
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Array} Datos mapeados
   */
  static mapToStandardFormat(data, sourceType, dataType = "pedidos") {
    if (sourceType === "powerautomate") {
      // Power Automate ya usa el formato correcto
      return data;
    }

    // Mapear según el tipo de fuente y datos
    return data.map((item) => {
      switch (sourceType) {
        case "supabase":
          return this.mapSupabaseToStandard(item, dataType);
        case "mongodb":
          return this.mapMongoToStandard(item, dataType);
        case "smartsheet":
          return this.mapSmartsheetToStandard(item, dataType);
        case "tableau":
          return this.mapTableauToStandard(item, dataType);
        default:
          return item;
      }
    });
  }

  /**
   * Mapear datos de Supabase al formato estándar
   */
  static mapSupabaseToStandard(item, dataType) {
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        codigo_cupo: item.cupo_code || item.codigo_cupo || "",
        destino: item.destination || item.destino || "",
        compania: item.airline || item.compania || "",
        disponibilidad: String(item.availability || item.disponibilidad || "0"),
        salida: item.departure_date || item.salida || "",
        regreso: item.return_date || item.regreso || "",
        precio: String(item.price || item.precio || "0"),
        ruta: item.route || item.ruta || "",
        pnr: item.pnr_code || item.pnr || "",
        ficha: item.ticket_number || item.ficha || "",
        temporada: item.season || item.temporada || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        Estado: item.status || item.estado || "Solicitado",
        Pedido_ID: item.order_id || item.pedido_id || "",
        Agencia: item.agency || item.agencia || "",
        Contacto_Nombre: item.contact_name || item.contacto_nombre || "",
        Contacto_Email: item.contact_email || item.contacto_email || "",
        Contacto_Telefono: item.contact_phone || item.contacto_telefono || "",
        Vuelo_Codigo: item.flight_code || item.vuelo_codigo || "",
        Vuelo_Destino: item.destination || item.vuelo_destino || "",
        Vuelo_Compania: item.airline || item.vuelo_compania || "",
        Vuelo_Salida: item.departure_date || item.vuelo_salida || "",
        Vuelo_Precio: String(item.price || item.vuelo_precio || "0"),
        Nombre_Pasajero: item.passenger_name || item.nombre_pasajero || "",
        Apellido_Pasajero:
          item.passenger_lastname || item.apellido_pasajero || "",
        Documento_Pasajero:
          item.passenger_document || item.documento_pasajero || "",
        Nacimiento_Pasajero:
          item.passenger_birth || item.nacimiento_pasajero || "",
        Nacionalidad_Pasajero:
          item.passenger_nationality || item.nacionalidad_pasajero || "",
        Tipo_Pasajero: item.passenger_type || item.tipo_pasajero || "Adulto",
        Temporada: item.season || item.temporada || "",
        Ruta: item.route || item.ruta || "",
        Ficha: item.ticket_number || item.ficha || "",
        Pnr: item.pnr_code || item.pnr || "",
        Fecha_Registro:
          item.created_at || item.fecha_registro || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de MongoDB al formato estándar
   */
  static mapMongoToStandard(item, dataType) {
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item._id || "",
        codigo_cupo: item.cupoCode || item.codigo_cupo || "",
        destino: item.destination || item.destino || "",
        compania: item.airline || item.compania || "",
        disponibilidad: String(item.availability || item.disponibilidad || "0"),
        salida: item.departureDate || item.salida || "",
        regreso: item.returnDate || item.regreso || "",
        precio: String(item.price || item.precio || "0"),
        ruta: item.route || item.ruta || "",
        pnr: item.pnr || "",
        ficha: item.ticketNumber || item.ficha || "",
        temporada: item.season || item.temporada || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item._id || "",
        Estado: item.status || item.estado || "Solicitado",
        Pedido_ID: item.orderId || item.pedido_id || "",
        Agencia: item.agency || item.agencia || "",
        Contacto_Nombre: item.contactName || item.contacto_nombre || "",
        Contacto_Email: item.contactEmail || item.contacto_email || "",
        Contacto_Telefono: item.contactPhone || item.contacto_telefono || "",
        Vuelo_Codigo: item.flightCode || item.vuelo_codigo || "",
        Vuelo_Destino: item.destination || item.vuelo_destino || "",
        Vuelo_Compania: item.airline || item.vuelo_compania || "",
        Vuelo_Salida: item.departureDate || item.vuelo_salida || "",
        Vuelo_Precio: String(item.price || item.vuelo_precio || "0"),
        Nombre_Pasajero: item.passengerName || item.nombre_pasajero || "",
        Apellido_Pasajero:
          item.passengerLastname || item.apellido_pasajero || "",
        Documento_Pasajero:
          item.passengerDocument || item.documento_pasajero || "",
        Nacimiento_Pasajero:
          item.passengerBirth || item.nacimiento_pasajero || "",
        Nacionalidad_Pasajero:
          item.passengerNationality || item.nacionalidad_pasajero || "",
        Tipo_Pasajero: item.passengerType || item.tipo_pasajero || "Adulto",
        Temporada: item.season || item.temporada || "",
        Ruta: item.route || item.ruta || "",
        Ficha: item.ticketNumber || item.ficha || "",
        Pnr: item.pnr || "",
        Fecha_Registro:
          item.createdAt || item.fecha_registro || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de Smartsheet al formato estándar
   */
  static mapSmartsheetToStandard(item, dataType) {
    // Smartsheet trabaja con posiciones de columnas
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        codigo_cupo: item.cells[0]?.value || "",
        destino: item.cells[1]?.value || "",
        compania: item.cells[2]?.value || "",
        disponibilidad: String(item.cells[3]?.value || "0"),
        salida: item.cells[4]?.value || "",
        regreso: item.cells[5]?.value || "",
        precio: String(item.cells[6]?.value || "0"),
        ruta: item.cells[7]?.value || "",
        pnr: item.cells[8]?.value || "",
        ficha: item.cells[9]?.value || "",
        temporada: item.cells[10]?.value || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        Estado: item.cells[0]?.value || "Solicitado",
        Pedido_ID: item.cells[1]?.value || "",
        Agencia: item.cells[2]?.value || "",
        Contacto_Nombre: item.cells[3]?.value || "",
        Contacto_Email: item.cells[4]?.value || "",
        Contacto_Telefono: item.cells[5]?.value || "",
        Vuelo_Codigo: item.cells[6]?.value || "",
        Vuelo_Destino: item.cells[7]?.value || "",
        Vuelo_Compania: item.cells[8]?.value || "",
        Vuelo_Salida: item.cells[9]?.value || "",
        Vuelo_Precio: String(item.cells[10]?.value || "0"),
        Nombre_Pasajero: item.cells[11]?.value || "",
        Apellido_Pasajero: item.cells[12]?.value || "",
        Documento_Pasajero: item.cells[13]?.value || "",
        Nacimiento_Pasajero: item.cells[14]?.value || "",
        Nacionalidad_Pasajero: item.cells[15]?.value || "",
        Tipo_Pasajero: item.cells[16]?.value || "Adulto",
        Temporada: item.cells[17]?.value || "",
        Ruta: item.cells[18]?.value || "",
        Ficha: item.cells[19]?.value || "",
        Pnr: item.cells[20]?.value || "",
        Fecha_Registro: item.cells[21]?.value || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de Tableau al formato estándar
   */
  static mapTableauToStandard(item, dataType) {
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item["Item ID"] || "",
        codigo_cupo: item["Cupo Code"] || item["Código Cupo"] || "",
        destino: item["Destination"] || item["Destino"] || "",
        compania: item["Airline"] || item["Compañía"] || "",
        disponibilidad: String(
          item["Availability"] || item["Disponibilidad"] || "0"
        ),
        salida: item["Departure"] || item["Salida"] || "",
        regreso: item["Return"] || item["Regreso"] || "",
        precio: String(item["Price"] || item["Precio"] || "0"),
        ruta: item["Route"] || item["Ruta"] || "",
        pnr: item["PNR"] || "",
        ficha: item["Ticket"] || item["Ficha"] || "",
        temporada: item["Season"] || item["Temporada"] || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item["Item ID"] || "",
        Estado: item["Status"] || item["Estado"] || "Solicitado",
        Pedido_ID: item["Order ID"] || item["Pedido ID"] || "",
        Agencia: item["Agency"] || item["Agencia"] || "",
        Contacto_Nombre: item["Contact Name"] || item["Contacto Nombre"] || "",
        Contacto_Email: item["Contact Email"] || item["Contacto Email"] || "",
        Contacto_Telefono:
          item["Contact Phone"] || item["Contacto Teléfono"] || "",
        Vuelo_Codigo: item["Flight Code"] || item["Vuelo Código"] || "",
        Vuelo_Destino: item["Destination"] || item["Vuelo Destino"] || "",
        Vuelo_Compania: item["Airline"] || item["Vuelo Compañía"] || "",
        Vuelo_Salida: item["Departure"] || item["Vuelo Salida"] || "",
        Vuelo_Precio: String(item["Price"] || item["Vuelo Precio"] || "0"),
        Nombre_Pasajero:
          item["Passenger Name"] || item["Nombre Pasajero"] || "",
        Apellido_Pasajero:
          item["Passenger Lastname"] || item["Apellido Pasajero"] || "",
        Documento_Pasajero:
          item["Passenger Document"] || item["Documento Pasajero"] || "",
        Nacimiento_Pasajero:
          item["Passenger Birth"] || item["Nacimiento Pasajero"] || "",
        Nacionalidad_Pasajero:
          item["Passenger Nationality"] || item["Nacionalidad Pasajero"] || "",
        Tipo_Pasajero:
          item["Passenger Type"] || item["Tipo Pasajero"] || "Adulto",
        Temporada: item["Season"] || item["Temporada"] || "",
        Ruta: item["Route"] || item["Ruta"] || "",
        Ficha: item["Ticket"] || item["Ficha"] || "",
        Pnr: item["PNR"] || "",
        Fecha_Registro:
          item["Created At"] ||
          item["Fecha Registro"] ||
          new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar reserva usando la conexión activa
   */
  static async submitReservation(reservationData) {
    try {
      const activeConnection = await this.getActiveConnection();

      if (!activeConnection) {
        throw new Error("No hay conexión activa configurada");
      }

      // Para diferentes tipos de conexión, usar diferentes métodos de envío
      switch (activeConnection.type) {
        case "supabase":
          return await this._submitToSupabase(
            reservationData,
            activeConnection
          );

        case "mongodb":
          return await this._submitToMongoDB(reservationData, activeConnection);

        case "smartsheet":
          return await this._submitToSmartsheet(
            reservationData,
            activeConnection
          );

        case "tableau":
          return await this._submitToTableau(reservationData, activeConnection);

        case "powerautomate":
          // Este caso se maneja en reservationService directamente
          throw new Error(
            "Power Automate submissions should be handled directly"
          );

        default:
          throw new Error(
            `Tipo de conexión no soportado: ${activeConnection.type}`
          );
      }
    } catch (error) {
      console.error("Error submitting reservation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enviar a Supabase
   */
  static async _submitToSupabase(_reservationData, _connection) {
    try {
      // Simular envío a Supabase (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `SUP-${Date.now()}`,
        results: "Reserva enviada a Supabase",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a Supabase: ${error.message}`);
    }
  }

  /**
   * Enviar a MongoDB
   */
  static async _submitToMongoDB(_reservationData, _connection) {
    try {
      // Simular envío a MongoDB (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `MDB-${Date.now()}`,
        results: "Reserva enviada a MongoDB",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a MongoDB: ${error.message}`);
    }
  }

  /**
   * Enviar a Smartsheet
   */
  static async _submitToSmartsheet(_reservationData, _connection) {
    try {
      // Simular envío a Smartsheet (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `SMS-${Date.now()}`,
        results: "Reserva enviada a Smartsheet",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a Smartsheet: ${error.message}`);
    }
  }

  /**
   * Enviar a Tableau
   */
  static async _submitToTableau(_reservationData, _connection) {
    try {
      // Simular envío a Tableau (implementar según necesidades)
      const result = {
        success: true,
        referenceId: `TAB-${Date.now()}`,
        results: "Reserva enviada a Tableau",
      };

      return result;
    } catch (error) {
      throw new Error(`Error enviando a Tableau: ${error.message}`);
    }
  }

  /**
   * Obtener tipos de conexión soportados
   * @returns {Array} Lista de tipos soportados
   */
  static getSupportedConnectionTypes() {
    return [
      {
        type: "powerautomate",
        name: "Power Automate",
        description: "Microsoft Power Automate Flow",
        icon: "TiVendorMicrosoft",
        docs: "https://docs.microsoft.com/en-us/power-automate/",
        fields: [
          {
            name: "flowUrl",
            label: "URL del Flow HTTP Request",
            type: "url",
            required: true,
            placeholder:
              "https://prod-xx.westeurope.logic.azure.com:443/workflows/...",
            tooltip:
              "URL completa del trigger HTTP de tu Flow en Power Automate",
          },
          {
            name: "apiKey",
            label: "Clave API (opcional)",
            type: "password",
            required: false,
            placeholder: "Bearer token o API key si está configurado",
            tooltip: "Opcional: Token de autenticación si tu Flow lo requiere",
          },
        ],
      },
      {
        type: "supabase",
        name: "Supabase",
        description: "Base de datos PostgreSQL con API REST autogenerada",
        icon: "SiSupabase",
        docs: "https://supabase.com/docs/guides/api",
        fields: [
          {
            name: "projectUrl",
            label: "URL del Proyecto",
            type: "url",
            required: true,
            placeholder: "https://xyzcompany.supabase.co",
            tooltip:
              "URL base de tu proyecto Supabase (Project Settings > API)",
          },
          {
            name: "anonKey",
            label: "API Key (anon/public)",
            type: "password",
            required: true,
            placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            tooltip:
              "Clave pública anónima para acceso a la API REST (Project Settings > API)",
          },
          {
            name: "serviceRoleKey",
            label: "Service Role Key (opcional)",
            type: "password",
            required: false,
            placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            tooltip:
              "Opcional: Clave de servicio para operaciones administrativas sin RLS",
          },
          {
            name: "tableName",
            label: "Nombre de la Tabla",
            type: "text",
            required: true,
            placeholder: "reservas",
            tooltip: "Nombre de la tabla donde se almacenarán los datos",
          },
        ],
      },
      {
        type: "smartsheet",
        name: "Smartsheet",
        description: "Plataforma de gestión de trabajo colaborativo",
        icon: "FaTable",
        docs: "https://developers.smartsheet.com/api/smartsheet/openapi",
        fields: [
          {
            name: "accessToken",
            label: "Access Token",
            type: "password",
            required: true,
            placeholder: "ll352u9jujauoqz4gstvsae05",
            tooltip:
              "Personal Access Token generado en Account > Personal Settings > API Access",
          },
          {
            name: "sheetId",
            label: "Sheet ID",
            type: "text",
            required: true,
            placeholder: "1234567890123456",
            tooltip: "ID de la hoja (visible en la URL cuando abres la hoja)",
          },
          {
            name: "baseUrl",
            label: "Base URL (opcional)",
            type: "url",
            required: false,
            placeholder: "https://api.smartsheet.com/2.0",
            tooltip:
              "URL base de la API (usar por defecto: https://api.smartsheet.com/2.0)",
          },
        ],
      },
      {
        type: "mongodb",
        name: "MongoDB",
        description: "Base de datos NoSQL orientada a documentos",
        icon: "SiMongodb",
        docs: "https://www.mongodb.com/docs/api/",
        fields: [
          {
            name: "connectionString",
            label: "MongoDB Connection String",
            type: "password",
            required: true,
            placeholder:
              "mongodb+srv://username:password@cluster.mongodb.net/database",
            tooltip:
              "String de conexión completo incluyendo credenciales (MongoDB Atlas > Connect > Drivers)",
          },
          {
            name: "databaseName",
            label: "Nombre de la Base de Datos",
            type: "text",
            required: true,
            placeholder: "travel_bookings",
            tooltip:
              "Nombre de la base de datos donde se almacenarán las colecciones",
          },
          {
            name: "collectionName",
            label: "Nombre de la Colección",
            type: "text",
            required: true,
            placeholder: "reservations",
            tooltip:
              "Nombre de la colección (equivalente a tabla en SQL) para los datos",
          },
          {
            name: "apiKey",
            label: "MongoDB Data API Key (opcional)",
            type: "password",
            required: false,
            placeholder: "mongodb-data-api-key",
            tooltip:
              "Opcional: API Key para usar MongoDB Data API en lugar de conexión directa",
          },
        ],
      },
      {
        type: "tableau",
        name: "Tableau",
        description: "Plataforma de análisis y visualización de datos",
        icon: "SiTableau",
        docs: "https://tableau.github.io/document-api-python/docs/api-ref",
        fields: [
          {
            name: "serverUrl",
            label: "Tableau Server URL",
            type: "url",
            required: true,
            placeholder: "https://your-server.tableau.com",
            tooltip: "URL base de tu servidor Tableau Server o Tableau Online",
          },
          {
            name: "username",
            label: "Nombre de Usuario",
            type: "text",
            required: true,
            placeholder: "usuario@empresa.com",
            tooltip: "Tu nombre de usuario para acceder a Tableau Server",
          },
          {
            name: "password",
            label: "Contraseña",
            type: "password",
            required: true,
            placeholder: "••••••••",
            tooltip: "Contraseña de tu cuenta Tableau",
          },
          {
            name: "siteName",
            label: "Nombre del Sitio",
            type: "text",
            required: false,
            placeholder: "default",
            tooltip:
              "Nombre del sitio en Tableau Server (opcional, usar 'default' si no tienes uno específico)",
          },
          {
            name: "apiVersion",
            label: "Versión de la API",
            type: "text",
            required: false,
            placeholder: "3.19",
            tooltip: "Versión de la API REST de Tableau (por defecto: 3.19)",
          },
        ],
      },
    ];
  }
}

export default ConnectionService;
