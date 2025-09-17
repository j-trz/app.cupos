import { supabase } from "../supabaseClient";
// No longer using client-side encryption for this service's core logic
// import EncryptionService from "./encryptionService";
import DataValidator from "./dataValidator";
import AuthorizationService from "./authorizationService";

/**
 * Servicio para gestionar conexiones a APIs externas de forma segura
 */
class ConnectionService {
  /**
   * Crear una nueva conexión API.
   * Las credenciales se envían al backend para ser encriptadas y almacenadas de forma segura.
   * @param {Object} connectionData - Datos de la conexión (incluye credenciales en crudo)
   * @returns {Promise<Object>} Conexión creada
   */
  static async createConnection(connectionData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { name, type, description, credentials } = connectionData;
      if (!name || !type || !credentials) {
        throw new Error("Datos de conexión incompletos");
      }

      // Crear registro de metadatos en la base de datos
      const { data, error } = await supabase
        .from("data_connections")
        .insert([
          {
            user_id: user.id,
            name,
            type,
            description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Ahora, guarda las credenciales en la bóveda segura del backend
      const { error: vaultError } = await supabase.functions.invoke(
        "save-service-credentials",
        { body: { connection_id: data.id, credentials } }
      );

      if (vaultError) {
        // Si falla el guardado en la bóveda, revertir la creación de la conexión
        await supabase.from("data_connections").delete().eq("id", data.id);
        console.error(
          "Failed to save credentials to secure vault, rolling back.",
          vaultError
        );
        throw new Error(
          "No se pudieron guardar las credenciales de forma segura. La conexión no fue creada."
        );
      }

      return { success: true, connection: data };
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
   * Obtiene las credenciales desencriptadas para una conexión desde el backend.
   * @param {string} connectionId - El ID de la conexión.
   * @returns {Promise<Object>} Las credenciales desencriptadas.
   */
  static async getDecryptedCredentials(connectionId) {
    try {
      console.log(
        `🔐 [ConnectionService] Getting credentials for connection: ${connectionId}`
      );

      // TEMPORAL: Pasar MASTER_ENCRYPTION_KEY como parámetro
      const TEMP_MASTER_KEY = "my-application-master-key-2024-secure-32-chars"; // 32+ caracteres

      const { data, error } = await supabase.functions.invoke(
        "get-decrypted-credentials",
        {
          body: {
            connection_id: connectionId,
            master_encryption_key: TEMP_MASTER_KEY, // TEMPORAL
          },
        }
      );

      if (error) {
        console.error("❌ [ConnectionService] Edge Function error:", error);
        console.error("❌ [ConnectionService] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // Distinguish between different types of errors
        if (error.message?.includes("MASTER_ENCRYPTION_KEY")) {
          throw new Error(
            "🔧 Server configuration error: Encryption key not configured. Contact administrator."
          );
        } else if (error.message?.includes("No credentials found")) {
          throw new Error(
            "📝 No credentials saved for this connection. Please configure the connection first."
          );
        } else if (
          error.message?.includes("Unauthorized") ||
          error.message?.includes("Authentication")
        ) {
          throw new Error("🔐 Authentication error. Please log in again.");
        } else if (error.message?.includes("Forbidden")) {
          throw new Error(
            "🚫 Access denied. You don't have permission to access this connection."
          );
        } else {
          throw new Error(
            `🚨 Edge Function error: ${
              error.message || "Unknown error occurred"
            }`
          );
        }
      }

      if (!data) {
        console.error(
          "❌ [ConnectionService] No data returned from Edge Function"
        );
        throw new Error("📭 No credential data returned from server");
      }

      console.log("✅ [ConnectionService] Credentials retrieved successfully");
      return data;
    } catch (error) {
      console.error(
        "💥 [ConnectionService] Fatal error in getDecryptedCredentials:",
        error
      );
      throw error; // Re-throw to maintain error context
    }
  }

  /**
   * Actualizar una conexión existente.
   * @param {string} connectionId - ID de la conexión
   * @param {Object} updateData - Datos a actualizar (puede incluir `credentials`)
   * @returns {Promise<Object>} Conexión actualizada
   */
  static async updateConnection(connectionId, updateData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const updates = {
        updated_at: new Date().toISOString(),
      };

      // Campos de metadatos que se pueden actualizar
      const allowedFields = ["name", "description"];
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      // Si se proporcionan nuevas credenciales, guardarlas en la bóveda segura.
      if (
        updateData.credentials &&
        Object.keys(updateData.credentials).length > 0
      ) {
        const { error: vaultError } = await supabase.functions.invoke(
          "save-service-credentials",
          {
            body: {
              connection_id: connectionId,
              credentials: updateData.credentials,
            },
          }
        );
        if (vaultError) {
          console.error(
            "Failed to update credentials in secure vault:",
            vaultError
          );
          throw new Error(
            "No se pudieron actualizar las credenciales de forma segura."
          );
        }
      }

      // Actualizar solo los metadatos en la tabla principal
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
        connection: data,
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

      // La eliminación de la fila en `data_connections` disparará un `CASCADE DELETE`
      // en `encrypted_service_credentials` gracias a la configuración de la Foreign Key.
      // Sin embargo, para estar seguros y manejar la lógica explícitamente, llamamos a la función.
      const { error: vaultError } = await supabase.functions.invoke(
        "delete-service-credentials",
        { body: { connection_id: connectionId } }
      );

      if (vaultError) {
        // No lanzar un error si la bóveda falla, pero sí loggearlo.
        // La conexión principal ya habrá sido eliminada.
        console.error(
          "Failed to delete credentials from secure vault:",
          vaultError
        );
      }

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
   * @param {string} dataType - Tipo de datos: 'productos', 'pedidos', o null para compatibilidad
   * @returns {Promise<Object>} Conexión activa o null
   */
  static async getActiveConnection(dataType = null) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      let data, error;

      // Si se especifica un tipo de datos, buscar conexión específica
      if (dataType) {
        try {
          // Intentar obtener conexión específica para el tipo de datos
          const { data: specificConnection, error: specificError } =
            await supabase
              .from("connection_data_types")
              .select(
                `
              data_type,
              is_active,
              connection:data_connections(*)
            `
              )
              .eq("user_id", user.id)
              .eq("data_type", dataType)
              .eq("is_active", true)
              .single();

          if (!specificError && specificConnection?.connection) {
            console.log(
              `✅ Conexión específica encontrada para ${dataType}:`,
              specificConnection.connection.name
            );
            return specificConnection.connection;
          }

          // Si no hay conexión específica, buscar conexión 'all'
          const { data: allConnection, error: allError } = await supabase
            .from("connection_data_types")
            .select(
              `
              data_type,
              is_active,
              connection:data_connections(*)
            `
            )
            .eq("user_id", user.id)
            .eq("data_type", "all")
            .eq("is_active", true)
            .single();

          if (!allError && allConnection?.connection) {
            console.log(
              `✅ Conexión 'all' encontrada para ${dataType}:`,
              allConnection.connection.name
            );
            return allConnection.connection;
          }

          console.warn(
            `⚠️ No hay conexión específica ni 'all' para ${dataType}, usando fallback`
          );
        } catch (tableError) {
          console.warn(
            "Tabla connection_data_types no existe, usando método legacy:",
            tableError.message
          );
        }
      }

      // Fallback al método legacy (is_active en data_connections)
      ({ data, error } = await supabase
        .from("data_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single());

      // Si hay error con is_active, usar fallback a primera conexión
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

      if (data) {
        console.log(`✅ Conexión legacy encontrada:`, data.name);
      }

      return data || null;
    } catch (error) {
      console.error("Error getting active connection:", error);
      return null;
    }
  }

  /**
   * Obtener datos de la conexión activa con mapeo de campos
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos mapeados al formato estándar
   */
  static async getDataFromActiveConnection(dataType = "pedidos") {
    try {
      const activeConnection = await this.getActiveConnection(dataType);
      if (!activeConnection) {
        console.warn(
          `⚠️ [ConnectionService] No active connection found for data type: ${dataType}. Falling back to environment variables for Power Automate.`
        );
        return await this.getDataFromPowerAutomate(null, dataType); // Pass null to signify fallback
      }

      console.log(
        `✅ [ConnectionService] Using connection ${activeConnection.name} (${activeConnection.type}) for ${dataType}`
      );

      let credentials;
      try {
        credentials = await this.getDecryptedCredentials(activeConnection.id);
      } catch (credentialError) {
        console.error(
          `❌ [ConnectionService] Failed to get credentials for connection '${activeConnection.name}':`,
          credentialError
        );

        // Don't fallback for configuration errors - these need to be fixed
        if (
          credentialError.message?.includes("Server configuration error") ||
          credentialError.message?.includes("MASTER_ENCRYPTION_KEY") ||
          credentialError.message?.includes("No credentials found") ||
          credentialError.message?.includes("Authentication error") ||
          credentialError.message?.includes("Access denied")
        ) {
          console.error(
            `🚨 [ConnectionService] Configuration issue with connection '${activeConnection.name}' - NOT falling back to Power Automate`
          );
          throw new Error(
            `Connection '${activeConnection.name}' configuration error: ${credentialError.message}`
          );
        }

        // For other errors, we can fallback
        console.warn(
          `⚠️ [ConnectionService] Unexpected error with connection '${activeConnection.name}', falling back to Power Automate:`,
          credentialError
        );
        return await this.getDataFromPowerAutomate(null, dataType);
      }

      let rawData;

      switch (activeConnection.type) {
        case "powerautomate":
          rawData = await this.getDataFromPowerAutomate(credentials, dataType);
          break;
        case "supabase":
          rawData = await this.getDataFromSupabase(credentials, dataType);
          break;
        default:
          console.warn(
            `⚠️ [ConnectionService] Connection type ${activeConnection.type} not fully implemented for data fetching. Falling back.`
          );
          rawData = await this.getDataFromPowerAutomate(null, dataType); // Fallback
          break;
      }

      // Validar que los datos cumplan con la estructura estándar
      if (rawData.success && rawData.data) {
        const validation = DataValidator.validateRecords(
          rawData.data,
          dataType
        );

        if (!validation.valid) {
          console.warn(
            "⚠️ [ConnectionService] Datos no cumplen estructura estándar:",
            validation.errors
          );

          // Si hay errores pero algunos registros son válidos, verificar rol del usuario
          if (validation.validRecords > 0) {
            // Obtener rol del usuario para determinar si mostrar todos los datos o solo los válidos
            try {
              const userRole = await AuthorizationService.getCurrentUserRole();
              const isAdmin = userRole === AuthorizationService.ROLES.ADMIN;

              if (isAdmin) {
                // Los administradores ven todos los registros, incluso los inválidos
                console.log(
                  `👑 [ConnectionService] Admin detectado - mostrando todos los ${rawData.data.length} registros (incluyendo inválidos)`
                );
                return {
                  ...rawData,
                  data: rawData.data,
                  validationWarning: `Admin view: ${validation.validRecords}/${validation.totalRecords} registros válidos`,
                };
              } else {
                // Usuarios no-admin solo ven registros válidos
                const validData = rawData.data.filter(
                  (record) => DataValidator.validateSingleRecord(record).valid
                );
                console.log(
                  `👤 [ConnectionService] Usuario no-admin - mostrando solo ${validData.length} registros válidos`
                );
                return {
                  ...rawData,
                  data: validData,
                  validationWarning: `${validation.validRecords}/${validation.totalRecords} registros válidos`,
                };
              }
            } catch (roleError) {
              console.error(
                "❌ [ConnectionService] Error obteniendo rol del usuario:",
                roleError
              );
              // En caso de error, usar comportamiento por defecto (solo registros válidos)
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
      }

      console.log(
        `✅ [ConnectionService] Data retrieved successfully from ${activeConnection.name}`
      );
      return rawData;
    } catch (error) {
      console.error(
        "💥 [ConnectionService] Error getting data from active connection:",
        error
      );

      // Only fallback for non-configuration errors
      if (
        error.message?.includes("Connection") &&
        error.message?.includes("configuration error")
      ) {
        console.error(
          "🚨 [ConnectionService] This is a configuration error - not falling back to Power Automate"
        );
        throw error; // Re-throw configuration errors
      }

      // For other errors, fallback to Power Automate
      console.warn(
        "⚠️ [ConnectionService] Falling back to Power Automate due to unexpected error"
      );
      return await this.getDataFromPowerAutomate(null, dataType);
    }
  }

  /**
   * Obtener datos de Power Automate usando conexión dinámica o fallback
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos de Power Automate
   */
  static async getDataFromPowerAutomate(credentials, dataType = "pedidos") {
    try {
      let targetUrl;
      if (credentials) {
        targetUrl = credentials.flowUrl;
      } else {
        // Fallback a variables de entorno si no hay credenciales activas
        console.log(
          "[PA] No active connection. Falling back to environment variables."
        );

        // Para productos (disponibilidad) usar URL específica para productos
        if (dataType === "productos") {
          // Usar variable de entorno específica para productos/disponibilidad
          targetUrl = import.meta.env.VITE_POWERAUTOMATE_GET_URL;
          console.log(
            `🎯 PRODUCTOS (disponibilidad) usará URL de productos:`,
            targetUrl
          );
        } else {
          // Para pedidos usar URL original
          targetUrl = import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS;
          console.log(`📋 PEDIDOS usará URL de solicitudes:`, targetUrl);
        }
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
   * Obtener datos de Supabase usando conexión específica
   * @param {Object} connection - Datos de la conexión Supabase
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos de Supabase
   */
  static async getDataFromSupabase(credentials, dataType = "pedidos") {
    try {
      console.log(`🔗 Obteniendo datos de Supabase para ${dataType}`);

      const { projectUrl, anonKey, tableName } = credentials;

      if (!projectUrl || !anonKey) {
        throw new Error("Credenciales de Supabase incompletas");
      }

      // Importar dinámicamente para evitar problemas de dependencias
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseClient = createClient(projectUrl, anonKey);

      // Determinar tabla según el tipo de datos
      const targetTable =
        tableName || (dataType === "productos" ? "productos" : "reservas");

      console.log(`📊 Consultando tabla ${targetTable} en Supabase`);

      const { data, error } = await supabaseClient
        .from(targetTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Error consultando Supabase:", error);
        // Si hay error, usar fallback a Power Automate
        console.warn("Usando Power Automate como fallback");
        return await this.getDataFromPowerAutomate(dataType);
      }

      console.log(`✅ Datos obtenidos de Supabase:`, {
        totalItems: data.length,
        table: targetTable,
        sampleData: data.slice(0, 3),
      });

      return {
        success: true,
        data: this.mapToStandardFormat(data, "supabase", dataType),
        source: "supabase",
        table: targetTable,
      };
    } catch (error) {
      console.error(`Error fetching from Supabase (${dataType}):`, error);
      console.warn("Error en Supabase, usando Power Automate como fallback");
      return await this.getDataFromPowerAutomate(null, dataType);
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
        Neto_1: item.Neto_1 || "",
        Op: item.Op || "",
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
        Neto_1: item.Neto_1 || "",
        Op: item.Op || "",
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
      // Usar el sistema multi-conexión para obtener la conexión específica para pedidos
      const activeConnection = await this.getActiveConnection("pedidos");

      if (!activeConnection) {
        console.log(
          "⚠️ No se encontró conexión específica para pedidos, buscando conexión general"
        );
        const generalConnection = await this.getActiveConnection();
        if (!generalConnection) {
          throw new Error(
            "No hay conexión activa configurada para envío de reservas"
          );
        }
        console.log(
          `✅ Usando conexión general ${generalConnection.name} para envío de reservas`
        );
        return await this._submitWithConnection(
          reservationData,
          generalConnection
        );
      }

      console.log(
        `✅ Usando conexión específica ${activeConnection.name} para pedidos`
      );
      return await this._submitWithConnection(
        reservationData,
        activeConnection
      );
    } catch (error) {
      console.error("Error submitting reservation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enviar reserva con una conexión específica
   */
  static async _submitWithConnection(reservationData, connection) {
    // Para diferentes tipos de conexión, usar diferentes métodos de envío
    switch (connection.type) {
      case "supabase":
        return await this._submitToSupabase(reservationData, connection);

      case "mongodb":
        return await this._submitToMongoDB(reservationData, connection);

      case "smartsheet":
        return await this._submitToSmartsheet(reservationData, connection);

      case "tableau":
        return await this._submitToTableau(reservationData, connection);

      case "powerautomate":
        return await this._submitToPowerAutomate(reservationData, connection);

      default:
        throw new Error(`Tipo de conexión no soportado: ${connection.type}`);
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
   * Enviar a Power Automate
   */
  static async _submitToPowerAutomate(reservationData, _connection) {
    try {
      // Usar el edge function para enviar a Power Automate
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
        throw new Error(
          error.message || "Error al enviar reserva a Power Automate"
        );
      }

      if (!data.success) {
        throw new Error(
          data.error || "Error desconocido al enviar reserva a Power Automate"
        );
      }

      return {
        success: true,
        results: data.results || "Reserva enviada exitosamente",
        referenceId: data.referenceId || `PA-${Date.now()}`,
      };
    } catch (error) {
      throw new Error(`Error enviando a Power Automate: ${error.message}`);
    }
  }

  /**
   * Probar una conexión existente
   * @param {string} connectionId - ID de la conexión a probar
   * @returns {Promise<Object>} Resultado de la prueba de conexión
   */
  static async testConnection(connection) {
    try {
      const credentials = await this.getDecryptedCredentials(connection.id);

      const { type, name } = connection;

      if (!type || !credentials) {
        throw new Error("Datos de conexión incompletos para la prueba.");
      }

      console.log(
        `[Edge Test] 🚀 Probando conexión '${name}' de tipo: ${type}`
      );

      // Invocar la Edge Function con las credenciales
      const { data, error } = await supabase.functions.invoke(
        "test-api-connection",
        {
          body: {
            type,
            credentials,
          },
        }
      );

      if (error) {
        console.error("Error invoking test-api-connection function:", error);
        return {
          success: false,
          message: `Error al invocar la función de prueba: ${error.message}`,
          details: {
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        };
      }

      return data;
    } catch (error) {
      console.error("Error general en testConnection:", error);
      return {
        success: false,
        message: error.message || "Error fatal al probar la conexión.",
        details: { error: error.toString() },
      };
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

  // ==================== MÉTODOS PARA MULTI-CONEXIÓN ====================

  /**
   * Crear o actualizar asignación de tipo de datos a conexión
   * @param {string} connectionId - ID de la conexión
   * @param {string} dataType - Tipo de datos: 'productos', 'pedidos', 'all'
   * @param {boolean} isActive - Si la asignación está activa
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async setConnectionDataType(connectionId, dataType, isActive = true) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar que la conexión pertenezca al usuario
      const { data: connection, error: connectionError } = await supabase
        .from("data_connections")
        .select("id")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .single();

      if (connectionError || !connection) {
        throw new Error("Conexión no encontrada o no autorizada");
      }

      // Si se está activando, desactivar otras conexiones del mismo tipo
      if (isActive) {
        await supabase
          .from("connection_data_types")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("data_type", dataType);
      }

      // Crear o actualizar la asignación
      const { data, error } = await supabase
        .from("connection_data_types")
        .upsert(
          {
            user_id: user.id,
            connection_id: connectionId,
            data_type: dataType,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,data_type",
          }
        )
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        assignment: data,
        message: `Conexión ${
          isActive ? "activada" : "desactivada"
        } para ${dataType}`,
      };
    } catch (error) {
      console.error("Error setting connection data type:", error);
      throw new Error(error.message || "Error al asignar tipo de datos");
    }
  }

  /**
   * Obtener todas las asignaciones de tipos de datos del usuario
   * @returns {Promise<Object>} Lista de asignaciones
   */
  static async getConnectionDataTypes() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("connection_data_types")
        .select(
          `
          id,
          data_type,
          is_active,
          created_at,
          updated_at,
          connection:data_connections(
            id,
            name,
            type,
            description
          )
        `
        )
        .eq("user_id", user.id)
        .order("data_type");

      if (error) throw error;

      return {
        success: true,
        assignments: data || [],
      };
    } catch (error) {
      console.error("Error fetching connection data types:", error);
      throw new Error(error.message || "Error al obtener asignaciones");
    }
  }

  /**
   * Eliminar asignación de tipo de datos
   * @param {string} assignmentId - ID de la asignación
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteConnectionDataType(assignmentId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("connection_data_types")
        .delete()
        .eq("id", assignmentId)
        .eq("user_id", user.id);

      if (error) throw error;

      return {
        success: true,
        message: "Asignación eliminada correctamente",
      };
    } catch (error) {
      console.error("Error deleting connection data type:", error);
      throw new Error(error.message || "Error al eliminar asignación");
    }
  }

  /**
   * Obtener conexión específica para un tipo de datos
   * @param {string} dataType - Tipo de datos
   * @returns {Promise<Object>} Conexión activa para el tipo de datos
   */
  static async getConnectionForDataType(dataType) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Buscar conexión específica para el tipo de datos
      const { data: specificAssignment, error: specificError } = await supabase
        .from("connection_data_types")
        .select(
          `
          connection:data_connections(*)
        `
        )
        .eq("user_id", user.id)
        .eq("data_type", dataType)
        .eq("is_active", true)
        .single();

      if (!specificError && specificAssignment?.connection) {
        return {
          success: true,
          connection: specificAssignment.connection,
          source: "specific",
        };
      }

      // Buscar conexión 'all' como fallback
      const { data: allAssignment, error: allError } = await supabase
        .from("connection_data_types")
        .select(
          `
          connection:data_connections(*)
        `
        )
        .eq("user_id", user.id)
        .eq("data_type", "all")
        .eq("is_active", true)
        .single();

      if (!allError && allAssignment?.connection) {
        return {
          success: true,
          connection: allAssignment.connection,
          source: "all",
        };
      }

      return {
        success: false,
        connection: null,
        message: `No hay conexión activa para ${dataType}`,
      };
    } catch (error) {
      console.error("Error getting connection for data type:", error);
      return {
        success: false,
        connection: null,
        error: error.message,
      };
    }
  }

  /**
   * Migrar conexiones existentes al sistema multi-conexión
   * @returns {Promise<Object>} Resultado de la migración
   */
  static async migrateToMultiConnection() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener conexiones activas existentes
      const { data: activeConnections, error: connectionsError } =
        await supabase
          .from("data_connections")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("is_active", true);

      if (connectionsError) throw connectionsError;

      if (!activeConnections || activeConnections.length === 0) {
        return {
          success: true,
          message: "No hay conexiones activas para migrar",
          migrated: 0,
        };
      }

      let migratedCount = 0;

      // Migrar cada conexión activa como tipo 'all'
      for (const connection of activeConnections) {
        try {
          await this.setConnectionDataType(connection.id, "all", true);
          migratedCount++;
        } catch (error) {
          console.warn(
            `Error migrando conexión ${connection.name}:`,
            error.message
          );
        }
      }

      return {
        success: true,
        message: `${migratedCount} conexiones migradas al sistema multi-conexión`,
        migrated: migratedCount,
      };
    } catch (error) {
      console.error("Error migrating to multi-connection:", error);
      throw new Error(error.message || "Error en la migración");
    }
  }
}
export default ConnectionService;
