import DataValidator from "./dataValidator";
import AuthorizationService from "./authorizationService";
import ApiClient from "./apiClient";
import dataApiService from "./dataApiService";

/**
 * Servicio para gestionar conexiones a APIs externas de forma segura
 * Todas las operaciones de base de datos se delegan al backend API.
 */
class ConnectionService {
  /**
   * Crear una nueva conexión API
   * @param {Object} connectionData - Datos de la conexión
   * @returns {Promise<Object>} Conexión creada
   */
  static async createConnection(connectionData) {
    try {
      const result = await ApiClient.post("/connections", connectionData);
      if (!result.success) throw new Error(result.error || "Error al crear conexión");
      return { success: true, connection: result.connection };
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
      const result = await ApiClient.get("/connections");
      return { success: true, connections: result.connections || [] };
    } catch (error) {
      console.error("Error fetching connections:", error);
      throw new Error(error.message || "Error al obtener las conexiones");
    }
  }

  /**
   * Obtener credenciales de una conexión
   * @param {string} connectionId - ID de la conexión
   * @returns {Promise<Object>} Credenciales
   */
  static async getDecryptedCredentials(connectionId) {
    try {
      // Obtener credenciales desde la base de datos vía API
      const filters = JSON.stringify({ connection_id: connectionId });
      const data = await ApiClient.get(
        `/data?table=api_credentials&filters=${encodeURIComponent(filters)}`
      );

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) {
        throw new Error("No se encontraron credenciales para esta conexión");
      }

      // Convertir array a objeto
      const credentials = {};
      rows.forEach((item) => {
        credentials[item.credential_key] = item.credential_value;
      });

      console.log("✅ Credenciales obtenidas exitosamente");
      return credentials;
    } catch (error) {
      console.error("Error obteniendo credenciales:", error);
      throw error;
    }
  }

  /**
   * Actualizar una conexión existente
   * @param {string} connectionId - ID de la conexión
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Conexión actualizada
   */
  static async updateConnection(connectionId, updateData) {
    try {
      // Actualizar metadatos de la conexión vía API
      const updates = {
        updated_at: new Date().toISOString(),
      };

      const allowedFields = [
        "name",
        "description",
        "column_mapping",
        "scope",
        "target_agency",
        "is_active",
      ];
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      // Completar agency por defecto cuando el scope sea 'agency'
      if (
        updates.scope === "agency" &&
        (updates.target_agency === undefined ||
          updates.target_agency === null ||
          updates.target_agency === "")
      ) {
        const profile = await AuthorizationService.getCurrentUserProfile();
        updates.target_agency = profile?.agencia || null;
      }

      const result = await dataApiService.updateData(
        "data_connections",
        connectionId,
        updates
      );

      // Si hay nuevas credenciales, actualizarlas
      if (
        updateData.credentials &&
        Object.keys(updateData.credentials).length > 0
      ) {
        // Eliminar credenciales antiguas
        const oldCreds = await ApiClient.get(
          `/data?table=api_credentials&filters=${encodeURIComponent(JSON.stringify({ connection_id: connectionId }))}`
        );
        const oldRows = Array.isArray(oldCreds) ? oldCreds : [];
        for (const row of oldRows) {
          await dataApiService.deleteData("api_credentials", row.id);
        }

        // Insertar nuevas credenciales
        const user = ApiClient.getSessionUser();
        const credentialEntries = Object.entries(updateData.credentials);
        for (const [key, value] of credentialEntries) {
          await dataApiService.insertData("api_credentials", {
            connection_id: connectionId,
            user_id: user?.id,
            credential_key: key,
            credential_value: String(value),
          });
        }
      }

      return { success: true, connection: result };
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
      await ApiClient.delete(`/connections/${connectionId}`);
      return { success: true, message: "Conexión eliminada correctamente" };
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
      await ApiClient.post(`/connections/${connectionId}/activate`);
      return { success: true, message: "Conexión activada correctamente" };
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
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener todas las conexiones accesibles vía API
      const result = await ApiClient.get("/connections");
      const connections = result.connections || [];

      if (connections.length === 0) return null;

      const profile = await AuthorizationService.getCurrentUserProfile();
      const agency = profile?.agencia || null;
      const normScope = (s) => (s == null ? "user" : s);

      // Filtrar conexiones activas
      const activeConns = connections.filter((c) => c.is_active);

      if (activeConns.length === 0) {
        // Si no hay is_active, usar la primera conexión como fallback
        if (connections.length > 0) {
          return connections[0];
        }
        return null;
      }

      // Preferencia por proveedor según tipo de datos
      const typePref = (c) => {
        if (dataType === "pedidos")
          return c?.type === "powerautomate" ? 0 : 1;
        if (dataType === "productos") return 0;
        return 0;
      };
      const sortByType = (list) =>
        [...list].filter(Boolean).sort((a, b) => typePref(a) - typePref(b));

      const ownList = activeConns.filter(
        (c) => normScope(c.scope) === "user" && c.user_id === user.id
      );
      const agencyList = activeConns.filter(
        (c) =>
          normScope(c.scope) === "agency" &&
          agency &&
          c.target_agency === agency
      );
      const globalList = activeConns.filter(
        (c) => normScope(c.scope) === "all"
      );
      const restList = activeConns.filter(
        (c) =>
          !ownList.includes(c) &&
          !agencyList.includes(c) &&
          !globalList.includes(c)
      );

      const ordered = [
        ...sortByType(ownList),
        ...sortByType(agencyList),
        ...sortByType(globalList),
        ...sortByType(restList),
      ];

      const chosen = ordered[0] || null;
      if (chosen) {
        console.log(
          "✅ Conexión activa seleccionada (alcance + tipo preferido):",
          {
            id: chosen.id,
            name: chosen.name,
            type: chosen.type,
            scope: normScope(chosen.scope),
            target_agency: chosen.target_agency || null,
          }
        );
      }

      return chosen;
    } catch (error) {
      console.error("Error getting active connection:", error);
      return null;
    }
  }

  // ===== Helper mapping utilities (custom column_mapping) =====
  static applyUserMapping(records, mapping, _dataType = "productos") {
    if (!Array.isArray(records) || !mapping) return records || [];

    return records.map((item) => {
      const out = {};
      for (const [stdKey, srcPath] of Object.entries(mapping)) {
        let val = this.getValueByPath(item, srcPath);

        // Fallback: si el valor mapeado viene vacío, usar el campo estándar si ya existe en el item
        if (val === undefined || val === null || val === "") {
          if (Object.prototype.hasOwnProperty.call(item, stdKey)) {
            val = item[stdKey];
          }
        }

        // Fallbacks específicos por tipo para fechas de disponibilidad
        if (_dataType === "productos") {
          if (
            (val === undefined || val === null || val === "") &&
            stdKey === "salida"
          ) {
            val =
              item.salida ||
              item.Salida ||
              item.departure_date ||
              item.Departure ||
              item["Fecha_Salida"] ||
              item.fecha_salida ||
              item.departure ||
              item.DepartureDate ||
              item.departureDate ||
              "";
          }
          if (
            (val === undefined || val === null || val === "") &&
            stdKey === "regreso"
          ) {
            val =
              item.regreso ||
              item.Regreso ||
              item.return_date ||
              item.Return ||
              item["Fecha_Regreso"] ||
              item.fecha_regreso ||
              item.return ||
              item.ReturnDate ||
              item.returnDate ||
              "";
          }
        }

        out[stdKey] = val;
      }

      // Asegurar preservación de identificadores y metadatos clave aunque no estén en el mapping
      const ensure = (k, v) => {
        if (out[k] === undefined || out[k] === null || out[k] === "") {
          out[k] = v;
        }
      };
      ensure(
        "ItemInternalId",
        item.ItemInternalId ?? item.id ?? item._id ?? ""
      );
      ensure("@odata.etag", item["@odata.etag"] ?? "");

      // Para productos, mantener también fechas normalizadas si el mapping las omitió
      if (_dataType === "productos") {
        ensure(
          "fecha_salida",
          item.fecha_salida ??
            item.salida ??
            item.Salida ??
            item.departure_date ??
            item.Departure ??
            ""
        );
        ensure(
          "fecha_regreso",
          item.fecha_regreso ??
            item.regreso ??
            item.Regreso ??
            item.return_date ??
            item.Return ??
            ""
        );
      }

      return out;
    });
  }

  static getValueByPath(obj, path) {
    if (!obj || !path) return undefined;

    // fast path: top-level property
    if (Object.prototype.hasOwnProperty.call(obj, path)) {
      return obj[path];
    }

    // normalize bracket notation: cells[0] -> cells.0
    const norm = String(path).replace(/\[(\d+)\]/g, ".$1");
    const parts = norm.split(".").filter(Boolean);

    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (cur == null) return undefined;

      // array index
      if (Array.isArray(cur) && /^\d+$/.test(part)) {
        const idx = parseInt(part, 10);
        const cell = cur[idx];

        // Smartsheet-like: prefer .value when present at leaf
        if (
          cell &&
          typeof cell === "object" &&
          "value" in cell &&
          i === parts.length - 1
        ) {
          return cell.value;
        }

        cur = cell;
        continue;
      }

      cur = cur?.[part];
    }

    // Smartsheet-like final value fallback
    if (cur && typeof cur === "object" && "value" in cur) {
      return cur.value;
    }

    return cur;
  }

  /**
   * Obtener datos de la conexión activa con mapeo de campos
   * @param {string} dataType - Tipo de datos: 'pedidos' o 'productos'
   * @returns {Promise<Object>} Datos mapeados al formato estándar
   */
  static async getDataFromActiveConnection(dataType = "pedidos") {
    try {
      // En modo API, usar el backend proxy para obtener datos
      if (ApiClient.isApiEnabled()) {
        try {
          const result = await ApiClient.get(`/power-automate-proxy/${dataType === "productos" ? "availability" : "requests"}`);
          if (result.success && result.data) {
            const mappedData = this.mapToStandardFormat(
              result.data,
              "powerautomate",
              dataType
            );
            return {
              success: true,
              data: mappedData,
              source: "api-proxy",
            };
          }
        } catch (proxyError) {
          console.warn("⚠️ Backend proxy no disponible, usando conexión directa:", proxyError.message);
        }
      }

      // Fallback: obtener datos directamente de la conexión activa
      const activeConnection = await this.getActiveConnection(dataType);
      if (!activeConnection) {
        console.warn(
          `⚠️ [ConnectionService] No active connection found for data type: ${dataType}. Falling back to Power Automate.`
        );
        return await this.getDataFromPowerAutomate(null, dataType);
      }

      console.log(
        `✅ [ConnectionService] Using connection ${activeConnection.name} (${activeConnection.type}) for ${dataType}`
      );

      // Obtener credenciales
      let credentials;
      try {
        credentials = await this.getDecryptedCredentials(activeConnection.id);
      } catch (credentialError) {
        console.error(
          `❌ [ConnectionService] Failed to get credentials for connection '${activeConnection.name}':`,
          credentialError
        );

        if (
          dataType === "pedidos" &&
          activeConnection.type === "powerautomate"
        ) {
          console.warn(
            "⚠️ [ConnectionService] Sin credenciales PA; usando fallback de entorno para pedidos"
          );
          return await this.getDataFromPowerAutomate(null, dataType);
        }

        throw new Error(
          `Connection '${activeConnection.name}' configuration error: ${credentialError.message}`
        );
      }

      let rawData;

      switch (activeConnection.type) {
        case "powerautomate":
          rawData = await this.getDataFromPowerAutomate(credentials, dataType);
          break;
        case "supabase":
          // Para conexiones Supabase externas, los datos se obtienen vía backend proxy
          rawData = await this.getDataFromExternalSupabase(credentials, dataType);
          break;
        case "smartsheet":
          rawData = await this.getDataFromSmartsheet(credentials, dataType);
          break;
        default:
          console.warn(
            `⚠️ [ConnectionService] Connection type ${activeConnection.type} not fully implemented. Falling back.`
          );
          rawData = await this.getDataFromPowerAutomate(null, dataType);
          break;
      }

      // Aplicar mapeo personalizado si existe (column_mapping)
      try {
        if (
          activeConnection.column_mapping &&
          rawData?.success &&
          Array.isArray(rawData.data)
        ) {
          let mapObj = null;
          const _cm = activeConnection.column_mapping;
          if (typeof _cm === "string" && /[[{]/.test(_cm.trim())) {
            try {
              mapObj = JSON.parse(_cm);
            } catch {
              mapObj = null;
            }
          }
          if (!mapObj) {
            throw new Error("SKIP_PARSE");
          }

          const esKey = dataType;
          const enKey =
            esKey === "productos"
              ? "products"
              : esKey === "pedidos"
              ? "orders"
              : esKey;

          const mapping = mapObj?.[esKey] || mapObj?.[enKey];

          if (mapping && typeof mapping === "object") {
            rawData = {
              ...rawData,
              data: ConnectionService.applyUserMapping(
                rawData.data,
                mapping,
                esKey
              ),
            };
          }
        }
      } catch (mapErr) {
        if (mapErr?.message !== "SKIP_PARSE") {
          console.warn(
            "⚠️ [ConnectionService] column_mapping inválido o no parseable (omitido):",
            mapErr
          );
        }
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

          if (validation.validRecords > 0) {
            try {
              const userRole = await AuthorizationService.getCurrentUserRole();
              const isAdmin = userRole === AuthorizationService.ROLES.ADMIN;

              if (isAdmin) {
                console.log(
                  `👑 [ConnectionService] Admin detectado - mostrando todos los ${rawData.data.length} registros`
                );
                return {
                  ...rawData,
                  data: rawData.data,
                  validationWarning: `Admin view: ${validation.validRecords}/${validation.totalRecords} registros válidos`,
                };
              } else {
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

      // Fallback final: Power Automate directo
      try {
        console.warn(
          "⚠️ [ConnectionService] All methods failed, falling back to Power Automate environment variables"
        );
        return await this.getDataFromPowerAutomate(null, dataType);
      } catch (fallbackError) {
        console.error("💥 [ConnectionService] Power Automate fallback also failed:", fallbackError);
        return {
          success: false,
          data: [],
          error: error.message,
          fallbackError: fallbackError.message,
        };
      }
    }
  }

  /**
   * Obtener datos de Power Automate usando conexión configurada o variables de entorno
   * @param {Object|null} credentials - Credenciales de la conexión (null = usar env vars)
   * @param {string} dataType - Tipo de datos
   * @returns {Promise<Object>} Datos de Power Automate
   */
  static async getDataFromPowerAutomate(credentials, dataType = "pedidos") {
    try {
      const flowUrl =
        credentials?.flowUrl ||
        credentials?.url ||
        import.meta.env.VITE_POWERAUTOMATE_GET_URL;

      if (!flowUrl) {
        throw new Error(
          "URL de Power Automate no configurada en credenciales ni variables de entorno"
        );
      }

      console.log(`🔗 Obteniendo datos de Power Automate para ${dataType}`);

      const response = await fetch(flowUrl, {
        method: dataType === "pedidos" ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(credentials?.apiKey
            ? { Authorization: `Bearer ${credentials.apiKey}` }
            : {}),
        },
        body: dataType === "pedidos" ? JSON.stringify({}) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Power Automate puede devolver datos en diferentes formatos
      const resultData = Array.isArray(data) ? data : data?.value || data?.data || [data];

      console.log(`✅ Datos obtenidos de Power Automate:`, {
        totalItems: resultData.length,
        dataType,
      });

      return {
        success: true,
        data: this.mapToStandardFormat(resultData, "powerautomate", dataType),
        source: "powerautomate",
      };
    } catch (error) {
      console.error(`Error fetching from Power Automate (${dataType}):`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Obtener datos de una conexión Supabase externa vía backend proxy
   * @param {Object} credentials - Credenciales de la conexión externa
   * @param {string} dataType - Tipo de datos
   * @returns {Promise<Object>} Datos de Supabase externo
   */
  static async getDataFromExternalSupabase(credentials, dataType = "pedidos") {
    try {
      console.log(`🔗 Obteniendo datos de Supabase externo para ${dataType} vía backend proxy`);

      const cred = credentials || {};
      const projectUrl =
        cred.projectUrl ||
        cred.project_url ||
        cred.url ||
        cred.supabaseUrl ||
        cred.supabase_url;
      const anonKey =
        cred.anonKey ||
        cred.anon_key ||
        cred.apiKey ||
        cred.key;
      const tableName = cred.tableName || cred.table_name || cred.table;

      if (!projectUrl || !anonKey || !tableName) {
        throw new Error(
          "Credenciales de Supabase externo incompletas: se requiere projectUrl, anonKey y tableName"
        );
      }

      // Usar el backend como proxy para acceder a Supabase externo
      const result = await ApiClient.post("/connections/external-fetch", {
        type: "supabase",
        projectUrl,
        anonKey,
        tableName,
        dataType,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al obtener datos de Supabase externo");
      }

      return {
        success: true,
        data: this.mapToStandardFormat(result.data || [], "supabase", dataType),
        source: "supabase",
        table: tableName,
      };
    } catch (error) {
      console.error(`Error fetching from external Supabase (${dataType}):`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Obtener datos de Smartsheet vía backend proxy
   * @param {Object} credentials - Credenciales
   * @param {string} dataType - Tipo de datos
   * @returns {Promise<Object>} Datos de Smartsheet
   */
  static async getDataFromSmartsheet(credentials, dataType = "pedidos") {
    try {
      console.log(`🔗 Obteniendo datos de Smartsheet para ${dataType} vía backend proxy`);

      const accessToken =
        credentials?.accessToken || credentials?.token || credentials?.apiKey;
      const sheetId = credentials?.sheetId;

      if (!accessToken || !sheetId) {
        throw new Error("Credenciales de Smartsheet incompletas");
      }

      // Usar backend como proxy
      const result = await ApiClient.post("/connections/external-fetch", {
        type: "smartsheet",
        accessToken,
        sheetId,
        dataType,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al obtener datos de Smartsheet");
      }

      return {
        success: true,
        data: this.mapToStandardFormat(result.data || [], "smartsheet", dataType),
        source: "smartsheet",
      };
    } catch (error) {
      console.error(`Error fetching from Smartsheet (${dataType}):`, error);
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
      // Normalizar productos de Power Automate a claves estándar
      if (dataType === "productos") {
        return Array.isArray(data)
          ? data.map((item) => ({
              "@odata.etag": item["@odata.etag"] || "",
              ItemInternalId: item.ItemInternalId || item.id || "",
              codigo_cupo:
                item.codigo_cupo ||
                item.Codigo_Cupo ||
                item.Cupo ||
                item.cupo_code ||
                item.cupoCode ||
                "",
              destino:
                item.destino ||
                item.Destino ||
                item.destination ||
                item.Destination ||
                "",
              compania:
                item.compania ||
                item.Compania ||
                item["Compañía"] ||
                item.airline ||
                item.Airline ||
                "",
              disponibilidad: String(
                item.disponibilidad ??
                  item.Disponibilidad ??
                  item.availability ??
                  item.Availability ??
                  "0"
              ),
              salida:
                item.salida ||
                item.Salida ||
                item.departure_date ||
                item.Departure ||
                item["Fecha_Salida"] ||
                item.fecha_salida ||
                "",
              regreso:
                item.regreso ||
                item.Regreso ||
                item.return_date ||
                item.Return ||
                item["Fecha_Regreso"] ||
                item.fecha_regreso ||
                "",
              fecha_salida:
                item.fecha_salida ||
                item["Fecha_Salida"] ||
                item.salida ||
                item.Salida ||
                item.departure_date ||
                item.Departure ||
                "",
              fecha_regreso:
                item.fecha_regreso ||
                item["Fecha_Regreso"] ||
                item.regreso ||
                item.Regreso ||
                item.return_date ||
                item.Return ||
                "",
              precio: String(
                item.precio ?? item.Precio ?? item.price ?? item.Price ?? "0"
              ),
              ruta: item.ruta || item.Ruta || item.route || item.Route || "",
              pnr: item.pnr || item.Pnr || item.PNR || "",
              ficha:
                item.ficha || item.Ficha || item.ticket || item.Ticket || "",
              temporada:
                item.temporada ||
                item.Temporada ||
                item.season ||
                item.Season ||
                "",
              neto_1: String(item.neto_1 ?? item.Neto_1 ?? ""),
              op: item.op ?? item.Op ?? "",
              carryon: Boolean(
                item.carryon ??
                  item.CarryOn ??
                  item.carry_on ??
                  item.carryOn ??
                  false
              ),
              handbag: Boolean(
                item.handbag ??
                  item.HandBag ??
                  item.hand_bag ??
                  item.handBag ??
                  false
              ),
              checkedbag: Boolean(
                item.checkedbag ??
                  item.CheckedBag ??
                  item.checked_bag ??
                  item.checkedBag ??
                  false
              ),
              inf_fare: String(item.inf_fare ?? item.Inf_Fare ?? ""),
            }))
          : [];
      }
      // Para otros tipos, ya vienen en formato esperado
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
      const salida =
        item.salida ||
        item.Salida ||
        item.departure_date ||
        item.departureDate ||
        item.DepartureDate ||
        item.Departure ||
        item["Fecha_Salida"] ||
        item.fecha_salida ||
        item.fechaSalida ||
        "";
      const regreso =
        item.regreso ||
        item.Regreso ||
        item.return_date ||
        item.returnDate ||
        item.ReturnDate ||
        item.Return ||
        item["Fecha_Regreso"] ||
        item.fecha_regreso ||
        item.fechaRegreso ||
        "";
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        id: item.id,
        codigo_cupo:
          (item.cupo_code || item.codigo_cupo || "").trim?.() ||
          item.cupo_code ||
          item.codigo_cupo ||
          "",
        destino: item.destination || item.destino || "",
        compania: item.airline || item.compania || "",
        disponibilidad: String(item.availability || item.disponibilidad || "0"),
        salida,
        regreso,
        fecha_salida: item.fecha_salida || salida,
        fecha_regreso: item.fecha_regreso || regreso,
        precio: String(item.price || item.precio || "0"),
        ruta: item.route || item.ruta || "",
        pnr: item.pnr_code || item.pnr || "",
        ficha: item.ticket_number || item.ficha || "",
        temporada: item.season || item.temporada || "",
        neto_1: String(item.neto_1 ?? item.Neto_1 ?? ""),
        op: item.op || item.Op || "",
        carryon: Boolean(
          item.carryon ?? item.carry_on ?? item.carryOn ?? false
        ),
        handbag: Boolean(
          item.handbag ?? item.hand_bag ?? item.handBag ?? false
        ),
        checkedbag: Boolean(
          item.checkedbag ?? item.checked_bag ?? item.checkedBag ?? false
        ),
        inf_fare: String(item.inf_fare ?? item.Inf_Fare ?? ""),
      };
    } else {
      const vueloSalida =
        item.vuelo_salida ||
        item.Vuelo_Salida ||
        item.departure_date ||
        item.departureDate ||
        item.DepartureDate ||
        item.Departure ||
        item["Fecha_Salida"] ||
        item.fecha_salida ||
        item.fechaSalida ||
        "";
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        id: item.id,
        Estado: item.status || item.estado || "Solicitado",
        Pedido_ID: item.order_id || item.pedido_id || "",
        Agencia: item.agency || item.agencia || "",
        Contacto_Nombre: item.contact_name || item.contacto_nombre || "",
        Contacto_Email: item.contact_email || item.contacto_email || "",
        Contacto_Telefono: item.contact_phone || item.contacto_telefono || "",
        Vuelo_Codigo: item.flight_code || item.vuelo_codigo || "",
        Vuelo_Destino: item.destination || item.vuelo_destino || "",
        Vuelo_Compania: item.airline || item.vuelo_compania || "",
        Vuelo_Salida: vueloSalida,
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
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        codigo_cupo: item.CupoCode || item.codigo_cupo || "",
        destino: item.Destination || item.destino || "",
        compania: item.Airline || item.compania || "",
        disponibilidad: String(item.Availability || item.disponibilidad || "0"),
        salida: item.DepartureDate || item.salida || "",
        regreso: item.ReturnDate || item.regreso || "",
        precio: String(item.Price || item.precio || "0"),
        ruta: item.Route || item.ruta || "",
        pnr: item.PNR || item.pnr || "",
        ficha: item.Ticket || item.ficha || "",
        temporada: item.Season || item.temporada || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        Estado: item.Status || item.estado || "Solicitado",
        Pedido_ID: item.OrderId || item.pedido_id || "",
        Agencia: item.Agency || item.agencia || "",
        Contacto_Nombre: item.ContactName || item.contacto_nombre || "",
        Vuelo_Destino: item.Destination || item.vuelo_destino || "",
        Vuelo_Compania: item.Airline || item.vuelo_compania || "",
        Vuelo_Salida: item.DepartureDate || item.vuelo_salida || "",
        Vuelo_Precio: String(item.Price || item.vuelo_precio || "0"),
        Nombre_Pasajero: item.PassengerName || item.nombre_pasajero || "",
        Apellido_Pasajero:
          item.PassengerLastname || item.apellido_pasajero || "",
        Temporada: item.Season || item.temporada || "",
        Ruta: item.Route || item.ruta || "",
        Ficha: item.Ticket || item.ficha || "",
        Pnr: item.PNR || item.pnr || "",
        Neto_1: item.Neto_1 || "",
        Op: item.Op || "",
        Fecha_Registro:
          item.CreatedAt || item.fecha_registro || new Date().toISOString(),
      };
    }
  }

  /**
   * Mapear datos de Tableau al formato estándar
   */
  static mapTableauToStandard(item, dataType) {
    // Similar structure, using Tableau field names
    if (dataType === "productos") {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        codigo_cupo: item.cupoCode || item.codigo_cupo || "",
        destino: item.destination || item.destino || "",
        compania: item.airline || item.compania || "",
        disponibilidad: String(item.availability || item.disponibilidad || "0"),
        salida: item.departureDate || item.salida || "",
        regreso: item.returnDate || item.regreso || "",
        precio: String(item.price || item.precio || "0"),
        ruta: item.route || item.ruta || "",
        pnr: item.pnr || "",
        ficha: item.ticket || item.ficha || "",
        temporada: item.season || item.temporada || "",
      };
    } else {
      return {
        "@odata.etag": "",
        ItemInternalId: item.id || "",
        Estado: item.status || item.estado || "Solicitado",
        Pedido_ID: item.orderId || item.pedido_id || "",
        Agencia: item.agency || item.agencia || "",
        Contacto_Nombre: item.contactName || item.contacto_nombre || "",
        Vuelo_Destino: item.destination || item.vuelo_destino || "",
        Vuelo_Salida: item.departureDate || item.vuelo_salida || "",
        Nombre_Pasajero: item.passengerName || item.nombre_pasajero || "",
        Fecha_Registro:
          item.createdAt || item.fecha_registro || new Date().toISOString(),
      };
    }
  }

  /**
   * Enviar reserva/solicitud
   * @param {Object} reservationData - Datos de la reserva
   * @returns {Promise<Object>} Resultado del envío
   */
  static async submitReservation(reservationData) {
    try {
      // En modo API, enviar al backend proxy
      const result = await ApiClient.post(
        "/power-automate-proxy/submit",
        reservationData
      );

      if (!result.success) {
        throw new Error(result.error || "Error al enviar reserva");
      }

      return {
        success: true,
        results: result.results || "Reserva enviada exitosamente",
        referenceId: result.referenceId || `PA-${Date.now()}`,
      };
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
    switch (connection.type) {
      case "powerautomate":
        return await this.submitReservation(reservationData);

      case "mongodb":
        return await this._submitToMongoDB(reservationData, connection);

      case "smartsheet":
        return await this._submitToSmartsheet(reservationData, connection);

      case "tableau":
        return await this._submitToTableau(reservationData, connection);

      default:
        throw new Error(`Tipo de conexión no soportado: ${connection.type}`);
    }
  }

  /**
   * Enviar a MongoDB (stub - requiere backend intermedio)
   */
  static async _submitToMongoDB(_reservationData, _connection) {
    try {
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
   * Enviar a Smartsheet (stub - requiere backend intermedio)
   */
  static async _submitToSmartsheet(_reservationData, _connection) {
    try {
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
   * Enviar a Tableau (stub - requiere backend intermedio)
   */
  static async _submitToTableau(_reservationData, _connection) {
    try {
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
   * Probar una conexión
   * @param {Object} connection - Conexión a probar
   * @returns {Promise<Object>} Resultado de la prueba
   */
  static async testConnection(connection) {
    try {
      const result = await ApiClient.post(`/connections/${connection.id}/test`, {});
      return result;
    } catch (error) {
      console.error("Error testing connection:", error);
      return {
        success: false,
        message: error.message || "Error al probar la conexión",
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
        name: "Supabase (externo)",
        description:
          "Conexión a una base de datos Supabase externa (requiere backend proxy)",
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
              "URL base de tu proyecto Supabase externo (Project Settings > API)",
          },
          {
            name: "anonKey",
            label: "API Key (anon/public)",
            type: "password",
            required: true,
            placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            tooltip:
              "Clave pública anónima para acceso a la API REST del proyecto externo",
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
        description:
          "Plataforma de gestión de trabajo colaborativo (requiere backend proxy)",
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
        ],
      },
      {
        type: "mongodb",
        name: "MongoDB",
        description:
          "Base de datos NoSQL orientada a documentos (requiere backend intermedio)",
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
              "String de conexión completo incluyendo credenciales",
          },
          {
            name: "databaseName",
            label: "Nombre de la Base de Datos",
            type: "text",
            required: true,
            placeholder: "travel_bookings",
            tooltip: "Nombre de la base de datos",
          },
          {
            name: "collectionName",
            label: "Nombre de la Colección",
            type: "text",
            required: true,
            placeholder: "reservations",
            tooltip: "Nombre de la colección (equivalente a tabla en SQL)",
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
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Si se está activando, desactivar otras del mismo tipo
      if (isActive) {
        const existingFilters = JSON.stringify({
          user_id: user.id,
          data_type: dataType,
        });
        const existing = await ApiClient.get(
          `/data?table=connection_data_types&filters=${encodeURIComponent(existingFilters)}`
        );
        const existingRows = Array.isArray(existing) ? existing : [];
        for (const row of existingRows) {
          await dataApiService.updateData("connection_data_types", row.id, {
            is_active: false,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Upsert: verificar si ya existe
      const upsertFilters = JSON.stringify({
        user_id: user.id,
        data_type: dataType,
      });
      const existingAssignment = await ApiClient.get(
        `/data?table=connection_data_types&filters=${encodeURIComponent(upsertFilters)}`
      );
      const existingRows = Array.isArray(existingAssignment) ? existingAssignment : [];

      if (existingRows.length > 0) {
        // Actualizar existente
        const updated = await dataApiService.updateData(
          "connection_data_types",
          existingRows[0].id,
          {
            connection_id: connectionId,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          }
        );
        return {
          success: true,
          assignment: updated,
          message: `Conexión ${isActive ? "activada" : "desactivada"} para ${dataType}`,
        };
      } else {
        // Crear nueva
        const created = await dataApiService.insertData("connection_data_types", {
          user_id: user.id,
          connection_id: connectionId,
          data_type: dataType,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return {
          success: true,
          assignment: created,
          message: `Conexión ${isActive ? "activada" : "desactivada"} para ${dataType}`,
        };
      }
    } catch (error) {
      console.error("Error setting connection data type:", error);
      throw new Error(error.message || "Error al asignar tipo de datos");
    }
  }

  /**
   * Diagnóstico: Mostrar credenciales guardadas
   * @param {string} connectionId - ID de la conexión
   * @returns {Promise<Object>} Estructura de credenciales guardadas
   */
  static async diagnoseConnectionCredentials(connectionId) {
    try {
      const credentials = await this.getDecryptedCredentials(connectionId);

      console.log("🔎 Diagnóstico de credenciales:", credentials);

      return {
        success: true,
        credentials,
        keys: credentials ? Object.keys(credentials) : [],
        structure: JSON.stringify(credentials, null, 2),
      };
    } catch (error) {
      console.error("Error en diagnóstico de credenciales:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener todas las asignaciones de tipos de datos del usuario
   * @returns {Promise<Object>} Lista de asignaciones
   */
  static async getConnectionDataTypes() {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      const filters = JSON.stringify({ user_id: user.id });
      const data = await ApiClient.get(
        `/data?table=connection_data_types&filters=${encodeURIComponent(filters)}&order=data_type:ASC`
      );

      const assignments = Array.isArray(data) ? data : [];

      // Enriquecer con info de conexión
      const enriched = assignments.map((a) => ({
        ...a,
        connection: {
          id: a.connection_id,
          name: a.connection_name || "Conexión",
          type: a.connection_type || "unknown",
        },
      }));

      return {
        success: true,
        assignments: enriched,
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
      await dataApiService.deleteData("connection_data_types", assignmentId);
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
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Buscar conexión específica para el tipo de datos
      const specificFilters = JSON.stringify({
        user_id: user.id,
        data_type: dataType,
        is_active: true,
      });
      const specificData = await ApiClient.get(
        `/data?table=connection_data_types&filters=${encodeURIComponent(specificFilters)}`
      );
      const specificRows = Array.isArray(specificData) ? specificData : [];

      if (specificRows.length > 0 && specificRows[0].connection_id) {
        // Obtener la conexión completa
        const connFilters = JSON.stringify({ id: specificRows[0].connection_id });
        const connData = await ApiClient.get(
          `/data?table=data_connections&filters=${encodeURIComponent(connFilters)}`
        );
        const connRows = Array.isArray(connData) ? connData : [];
        if (connRows.length > 0) {
          return {
            success: true,
            connection: connRows[0],
            source: "specific",
          };
        }
      }

      // Buscar conexión 'all' como fallback
      const allFilters = JSON.stringify({
        user_id: user.id,
        data_type: "all",
        is_active: true,
      });
      const allData = await ApiClient.get(
        `/data?table=connection_data_types&filters=${encodeURIComponent(allFilters)}`
      );
      const allRows = Array.isArray(allData) ? allData : [];

      if (allRows.length > 0 && allRows[0].connection_id) {
        const connFilters = JSON.stringify({ id: allRows[0].connection_id });
        const connData = await ApiClient.get(
          `/data?table=data_connections&filters=${encodeURIComponent(connFilters)}`
        );
        const connRows = Array.isArray(connData) ? connData : [];
        if (connRows.length > 0) {
          return {
            success: true,
            connection: connRows[0],
            source: "all",
          };
        }
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
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener conexiones activas existentes
      const activeFilters = JSON.stringify({ is_active: true });
      const data = await ApiClient.get(
        `/data?table=data_connections&filters=${encodeURIComponent(activeFilters)}`
      );
      const activeConnections = Array.isArray(data) ? data : [];

      if (activeConnections.length === 0) {
        return {
          success: true,
          message: "No hay conexiones activas para migrar",
          migrated: 0,
        };
      }

      let migratedCount = 0;

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
