import { createClient } from "@supabase/supabase-js";

class DataOperationsService {
  // ==================== SUPABASE OPERATIONS ====================

  async insertSupabaseData(credentials, tableName, data, mapping) {
    try {
      const supabaseUrl =
        credentials.projectUrl ||
        credentials.project_url ||
        credentials.url ||
        credentials.supabaseUrl ||
        credentials.supabase_url;
      const anonKey =
        credentials.anonKey || credentials.anon_key || credentials.key;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Credenciales de Supabase incompletas");
      }

      const supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-insert-${tableName}`,
        },
        global: {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
        },
      });

      // Mapear datos según la configuración
      const mappedData = this.mapDataFields(data, mapping);

      console.log("🔄 Insertando datos en Supabase:", {
        tableName,
        mappedData,
      });

      const { data: insertedData, error } = await supabaseClient
        .from(tableName)
        .insert(mappedData)
        .select();

      if (error) {
        throw new Error(`Error inserting data: ${error.message}`);
      }

      console.log("✅ Datos insertados en Supabase:", insertedData);
      return { success: true, data: insertedData, count: insertedData.length };
    } catch (error) {
      console.error("❌ Error en operación Supabase:", error);
      throw error;
    }
  }

  async getSupabaseData(credentials, tableName, limit = 100) {
    try {
      const supabaseUrl =
        credentials.projectUrl ||
        credentials.project_url ||
        credentials.url ||
        credentials.supabaseUrl ||
        credentials.supabase_url;
      const anonKey =
        credentials.anonKey || credentials.anon_key || credentials.key;

      const supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-select-${tableName || "default"}`,
        },
        global: {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      });

      const { data, error } = await supabaseClient
        .from(tableName)
        .select("*")
        .limit(limit);

      if (error) {
        throw new Error(`Error fetching data: ${error.message}`);
      }

      return { success: true, data, count: data.length };
    } catch (error) {
      console.error("❌ Error obteniendo datos Supabase:", error);
      throw error;
    }
  }

  // ==================== SMARTSHEET OPERATIONS ====================

  async insertSmartsheetData(credentials, sheetId, data, mapping) {
    try {
      const accessToken =
        credentials.accessToken || credentials.token || credentials.apiKey;

      if (!accessToken || !sheetId) {
        throw new Error("Credenciales de Smartsheet incompletas");
      }

      // Mapear datos a formato de Smartsheet
      const smartsheetRows = this.mapDataToSmartsheetFormat(data, mapping);

      console.log("🔄 Insertando datos en Smartsheet:", {
        sheetId,
        smartsheetRows,
      });

      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toTop: true,
            rows: smartsheetRows,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error API Smartsheet: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Datos insertados en Smartsheet:", result);

      return {
        success: true,
        data: result.result,
        count: result.result?.length || 0,
        message: result.message,
      };
    } catch (error) {
      console.error("❌ Error en operación Smartsheet:", error);
      throw error;
    }
  }

  async getSmartsheetData(credentials, sheetId, limit = 100) {
    try {
      const accessToken =
        credentials.accessToken || credentials.token || credentials.apiKey;

      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${sheetId}?include=data`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error API Smartsheet: ${response.status} - ${response.statusText}`
        );
      }

      const sheetData = await response.json();

      // Convertir formato Smartsheet a formato estándar
      const standardData = this.convertSmartsheetToStandardFormat(sheetData);

      return {
        success: true,
        data: standardData.slice(0, limit),
        count: standardData.length,
        totalRows: sheetData.totalRowCount,
      };
    } catch (error) {
      console.error("❌ Error obteniendo datos Smartsheet:", error);
      throw error;
    }
  }

  // ==================== MONGODB OPERATIONS ====================

  async insertMongoData(credentials, collection, data, mapping) {
    try {
      // Para MongoDB, necesitaríamos usar un backend intermedio o MongoDB Realm
      // Por ahora, simular la operación
      const mappedData = this.mapDataFields(data, mapping);

      console.log("🔄 Simulando inserción en MongoDB:", {
        collection,
        database: credentials.database,
        mappedData,
      });

      // En implementación real, harías:
      // const client = new MongoClient(credentials.connectionString);
      // const result = await client.db(credentials.database).collection(collection).insertMany(mappedData);

      return {
        success: true,
        data: mappedData,
        count: mappedData.length,
        message: "Operación MongoDB simulada - implementar backend intermedio",
      };
    } catch (error) {
      console.error("❌ Error en operación MongoDB:", error);
      throw error;
    }
  }

  // ==================== TABLEAU OPERATIONS ====================

  async publishTableauData(credentials, datasource, data, mapping) {
    try {
      // Para Tableau, necesitaríamos autenticación y publicación de extract
      const mappedData = this.mapDataFields(data, mapping);

      console.log("🔄 Simulando publicación en Tableau:", {
        datasource,
        serverUrl: credentials.serverUrl,
        mappedData,
      });

      // En implementación real:
      // 1. Autenticar con Tableau Server REST API
      // 2. Crear/actualizar datasource
      // 3. Publicar extract con los datos

      return {
        success: true,
        data: mappedData,
        count: mappedData.length,
        message: "Operación Tableau simulada - implementar REST API completo",
      };
    } catch (error) {
      console.error("❌ Error en operación Tableau:", error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  mapDataFields(data, mapping) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return data;
    }

    return data.map((item) => {
      const mappedItem = {};

      // Mapear según la configuración
      Object.entries(mapping).forEach(([targetField, sourceField]) => {
        if (sourceField && item[sourceField] !== undefined) {
          mappedItem[targetField] = item[sourceField];
        }
      });

      // Agregar campos no mapeados si es necesario
      Object.keys(item).forEach((key) => {
        if (!Object.values(mapping).includes(key)) {
          mappedItem[key] = item[key];
        }
      });

      return mappedItem;
    });
  }

  mapDataToSmartsheetFormat(data, mapping) {
    return data.map((item) => {
      const cells = [];

      Object.entries(mapping).forEach(([_targetField, sourceField]) => {
        if (sourceField && item[sourceField] !== undefined) {
          // Para Smartsheet, necesitamos el columnId
          // Esto debería venir del mapeo de columnas
          cells.push({
            columnId:
              parseInt(sourceField.replace("cells[", "").replace("]", "")) + 1,
            value: item[sourceField],
          });
        }
      });

      return { cells };
    });
  }

  convertSmartsheetToStandardFormat(sheetData) {
    const columns = sheetData.columns || [];
    const rows = sheetData.rows || [];

    return rows.map((row) => {
      const standardRow = {};

      row.cells?.forEach((cell, index) => {
        const column = columns[index];
        if (column) {
          standardRow[column.title] = cell.value;
          standardRow[`cells[${index}]`] = cell.value; // Para compatibilidad con mapeo
        }
      });

      return standardRow;
    });
  }

  // ==================== GENERIC OPERATIONS ====================

  async executeOperation(
    connectionType,
    operation,
    credentials,
    params,
    data,
    mapping
  ) {
    try {
      console.log(`🚀 Ejecutando operación ${operation} en ${connectionType}`);

      switch (connectionType) {
        case "supabase":
          if (operation === "insert") {
            return await this.insertSupabaseData(
              credentials,
              params.tableName,
              data,
              mapping
            );
          } else if (operation === "select") {
            return await this.getSupabaseData(
              credentials,
              params.tableName,
              params.limit
            );
          }
          break;

        case "smartsheet":
          if (operation === "insert") {
            return await this.insertSmartsheetData(
              credentials,
              params.sheetId,
              data,
              mapping
            );
          } else if (operation === "select") {
            return await this.getSmartsheetData(
              credentials,
              params.sheetId,
              params.limit
            );
          }
          break;

        case "mongodb":
          if (operation === "insert") {
            return await this.insertMongoData(
              credentials,
              params.collection,
              data,
              mapping
            );
          }
          break;

        case "tableau":
          if (operation === "publish") {
            return await this.publishTableauData(
              credentials,
              params.datasource,
              data,
              mapping
            );
          }
          break;

        default:
          throw new Error(`Tipo de conexión ${connectionType} no soportado`);
      }

      throw new Error(
        `Operación ${operation} no soportada para ${connectionType}`
      );
    } catch (error) {
      console.error(
        `❌ Error en operación ${operation} para ${connectionType}:`,
        error
      );
      throw error;
    }
  }

  // ==================== GENERIC INSERT METHOD ====================

  /**
   * Método genérico para insertar datos usando la conexión especificada
   * @param {Object} connectionData - Datos de la conexión
   * @param {Array} data - Datos a insertar
   * @param {Object} mapping - Mapeo de campos (opcional)
   * @returns {Promise<Object>} Resultado de la operación
   */
  async insertData(connectionData, data, mapping = {}) {
    try {
      console.log(
        `🚀 Insertando datos usando conexión ${
          connectionData?.type || "undefined"
        }`
      );

      if (!connectionData || !connectionData.type) {
        throw new Error("Datos de conexión incompletos");
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("No hay datos para insertar");
      }

      // Obtener credenciales (ya deberían estar desencriptadas)
      const credentials = connectionData.credentials || {};

      switch (connectionData.type) {
        case "supabase": {
          // Validación estricta: esta operación NO hace fallback a Power Automate
          const hasUrl =
            credentials.projectUrl ||
            credentials.project_url ||
            credentials.url ||
            credentials.supabaseUrl ||
            credentials.supabase_url;
          const hasKey =
            credentials.anonKey || credentials.anon_key || credentials.key;
          const tableName =
            credentials.tableName ||
            credentials.table_name ||
            credentials.table ||
            "productos";

          if (!hasUrl || !hasKey || !tableName) {
            throw new Error(
              "Credenciales de Supabase incompletas para inserción (se requieren projectUrl, anonKey y tableName)"
            );
          }

          return await this.insertSupabaseData(
            credentials,
            tableName,
            data,
            mapping
          );
        }

        case "smartsheet": {
          const sheetId = credentials.sheetId;
          if (!sheetId) {
            throw new Error("Sheet ID es requerido para Smartsheet");
          }
          return await this.insertSmartsheetData(
            credentials,
            sheetId,
            data,
            mapping
          );
        }

        case "mongodb": {
          const collection = credentials.collectionName || "productos";
          return await this.insertMongoData(
            credentials,
            collection,
            data,
            mapping
          );
        }

        case "tableau": {
          const datasource = credentials.datasource || "productos";
          return await this.publishTableauData(
            credentials,
            datasource,
            data,
            mapping
          );
        }

        case "powerautomate": {
          // Power Automate se maneja diferente - a través de HTTP requests
          return await this.insertPowerAutomateData(credentials, data, mapping);
        }

        default:
          throw new Error(
            `Tipo de conexión ${connectionData.type} no soportado para inserción`
          );
      }
    } catch (error) {
      console.error("❌ Error en insertData:", error);
      // No hacer fallback automático: respetar la conexión configurada
      throw error;
    }
  }

  /**
   * Insertar datos en Power Automate
   */
  async insertPowerAutomateData(credentials, data, mapping = {}) {
    try {
      // Para inserción, usar la URL de inserción específica o la variable de entorno POST
      const flowUrl =
        credentials.flowUrl ||
        credentials.url ||
        import.meta.env.VITE_POWERAUTOMATE_POST_URL ||
        import.meta.env.VITE_POWERAUTOMATE_GET_URL;

      if (!flowUrl) {
        throw new Error("URL del Flow es requerida para Power Automate");
      }

      // Mapear datos según la configuración
      const mappedData = this.mapDataFields(data, mapping);

      // Para inserción de productos, usar el formato correcto para Power Automate
      // Normalmente Power Automate espera cada registro individualmente o en formato específico
      let payload;

      if (mappedData.length === 1) {
        // Un solo registro - enviar directamente el objeto (formato más común para Power Automate)
        payload = mappedData[0];
      } else {
        // Múltiples registros - enviar como array en propiedad específica
        payload = {
          items: mappedData,
        };
      }

      console.log("🔄 Enviando datos a Power Automate:", {
        flowUrl,
        payload,
        dataCount: mappedData.length,
      });

      const response = await fetch(flowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(credentials.apiKey && {
            Authorization: `Bearer ${credentials.apiKey}`,
          }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Obtener más detalles del error (texto plano para evitar fallos de parseo)
        const errorText = await response.text();
        console.error("❌ Power Automate error details:", errorText);

        // Intentar con formato alternativo si el primer intento falló (p. ej. 400 Bad Request)
        if (response.status === 400) {
          console.warn(
            "🔄 Intentando con formato alternativo para Power Automate..."
          );

          // Formato alternativo: enviar objeto original o wrapper { data: [...] }
          const alternativePayload =
            Array.isArray(data) && data.length === 1
              ? data[0]
              : { data: mappedData };

          const retryResponse = await fetch(flowUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(credentials.apiKey && {
                Authorization: `Bearer ${credentials.apiKey}`,
              }),
            },
            body: JSON.stringify(alternativePayload),
          });

          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(
              `Error HTTP ${response.status}: ${response.statusText}. Detalles: ${errorText}. Reintento falló: ${retryErrorText}`
            );
          }

          // Manejo robusto del cuerpo: puede venir vacío o no-JSON
          const retryRaw = await retryResponse.text();
          let retryParsed = null;
          try {
            retryParsed = retryRaw ? JSON.parse(retryRaw) : null;
          } catch {
            retryParsed = null;
          }

          console.log(
            "✅ Datos enviados a Power Automate (formato alternativo):",
            retryParsed ?? (retryRaw || "(sin cuerpo)")
          );

          return {
            success: true,
            data: mappedData,
            count: mappedData.length,
            response: retryParsed ?? retryRaw ?? null,
            message:
              "Datos enviados exitosamente a Power Automate (formato alternativo)",
          };
        }

        throw new Error(
          `Error HTTP ${response.status}: ${response.statusText}. Detalles: ${errorText}`
        );
      }

      // Manejo robusto del cuerpo de respuesta exitoso (puede ser vacío)
      const raw = await response.text();
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }

      console.log(
        "✅ Datos enviados a Power Automate:",
        parsed ?? (raw || "(sin cuerpo)")
      );

      return {
        success: true,
        data: mappedData,
        count: mappedData.length,
        response: parsed ?? raw ?? null,
        message: "Datos enviados exitosamente a Power Automate",
      };
    } catch (error) {
      console.error("❌ Error enviando a Power Automate:", error);
      throw error;
    }
  }

  /**
   * Método genérico para actualizar datos usando la conexión especificada
   * @param {string} connectionType - Tipo de conexión
   * @param {Object} connectionData - Datos de la conexión
   * @param {string} recordId - ID del registro a actualizar
   * @param {Object} data - Datos a actualizar
   * @param {string} dataType - Tipo de datos ('productos' o 'pedidos')
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateData(
    connectionType,
    connectionData,
    recordId,
    data,
    _dataType = "productos"
  ) {
    try {
      console.log(
        `🔄 Actualizando datos en ${connectionType}, ID: ${recordId}`
      );

      if (!connectionData || !recordId || !data) {
        throw new Error("Datos incompletos para actualización");
      }

      // Obtener credenciales (ya deberían estar desencriptadas)
      const credentials = connectionData.credentials || {};

      switch (connectionType) {
        case "supabase": {
          const tableName = credentials.tableName || "productos";

          // Resolver ID si no fue provisto (p.ej., cuando viene mapeado sin 'id')
          let targetId = recordId;
          if (!targetId || String(targetId).trim() === "") {
            const supabaseUrl =
              credentials.projectUrl ||
              credentials.project_url ||
              credentials.url ||
              credentials.supabaseUrl ||
              credentials.supabase_url;
            const anonKey =
              credentials.anonKey || credentials.anon_key || credentials.key;

            if (!supabaseUrl || !anonKey) {
              throw new Error("Credenciales de Supabase incompletas");
            }

            // Intento de resolución por clave de negocio: codigo_cupo
            if (data && data.codigo_cupo) {
              const supabaseClient = createClient(supabaseUrl, anonKey, {
                auth: {
                  persistSession: false,
                  autoRefreshToken: false,
                  detectSessionInUrl: false,
                  storageKey: `sb-update-resolveid-${tableName}`,
                },
                global: {
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Prefer: "return=minimal",
                  },
                },
              });

              const { data: rows, error: findErr } = await supabaseClient
                .from(tableName)
                .select("id")
                .eq("codigo_cupo", data.codigo_cupo)
                .order("created_at", { ascending: false })
                .limit(1);

              if (findErr) {
                throw new Error(
                  `No se pudo resolver ID por codigo_cupo: ${findErr.message}`
                );
              }
              targetId = rows?.[0]?.id || null;
              console.log("🆔 ID resuelto por codigo_cupo:", targetId);
            }
          }

          if (!targetId || String(targetId).trim() === "") {
            throw new Error("Datos incompletos para actualización");
          }

          return await this.updateSupabaseData(
            credentials,
            tableName,
            targetId,
            data
          );
        }

        case "smartsheet": {
          const sheetId = credentials.sheetId;
          if (!sheetId) {
            throw new Error("Sheet ID es requerido para Smartsheet");
          }
          return await this.updateSmartsheetData(
            credentials,
            sheetId,
            recordId,
            data
          );
        }

        case "mongodb": {
          const collection = credentials.collectionName || "productos";
          return await this.updateMongoData(
            credentials,
            collection,
            recordId,
            data
          );
        }

        case "powerautomate": {
          // Power Automate normalmente no soporta updates directos
          throw new Error("Power Automate no soporta actualizaciones directas");
        }

        default:
          throw new Error(
            `Tipo de conexión ${connectionType} no soportado para actualización`
          );
      }
    } catch (error) {
      console.error("❌ Error en updateData:", error);
      throw error;
    }
  }

  /**
   * Método genérico para eliminar datos usando la conexión especificada
   * @param {string} connectionType - Tipo de conexión
   * @param {Object} connectionData - Datos de la conexión
   * @param {string} recordId - ID del registro a eliminar
   * @param {string} dataType - Tipo de datos ('productos' o 'pedidos')
   * @returns {Promise<Object>} Resultado de la operación
   */
  async deleteData(
    connectionType,
    connectionData,
    recordId,
    _dataType = "productos"
  ) {
    try {
      console.log(`🗑️ Eliminando datos en ${connectionType}, ID: ${recordId}`);

      if (!connectionData || !recordId) {
        throw new Error("Datos incompletos para eliminación");
      }

      // Obtener credenciales (ya deberían estar desencriptadas)
      const credentials = connectionData.credentials || {};

      switch (connectionType) {
        case "supabase": {
          const tableName = credentials.tableName || "productos";
          return await this.deleteSupabaseData(
            credentials,
            tableName,
            recordId
          );
        }

        case "smartsheet": {
          const sheetId = credentials.sheetId;
          if (!sheetId) {
            throw new Error("Sheet ID es requerido para Smartsheet");
          }
          return await this.deleteSmartsheetData(
            credentials,
            sheetId,
            recordId
          );
        }

        case "mongodb": {
          const collection = credentials.collectionName || "productos";
          return await this.deleteMongoData(credentials, collection, recordId);
        }

        case "powerautomate": {
          // Power Automate normalmente no soporta deletes directos
          throw new Error("Power Automate no soporta eliminaciones directas");
        }

        default:
          throw new Error(
            `Tipo de conexión ${connectionType} no soportado para eliminación`
          );
      }
    } catch (error) {
      console.error("❌ Error en deleteData:", error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE ACTUALIZACIÓN ESPECÍFICOS ====================

  async updateSupabaseData(credentials, tableName, recordId, data) {
    try {
      const supabaseUrl =
        credentials.projectUrl ||
        credentials.project_url ||
        credentials.url ||
        credentials.supabaseUrl ||
        credentials.supabase_url;
      const anonKey =
        credentials.anonKey || credentials.anon_key || credentials.key;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Credenciales de Supabase incompletas");
      }

      const supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-update-${tableName}`,
        },
        global: {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
        },
      });

      console.log("🔄 Actualizando datos en Supabase:", {
        tableName,
        recordId,
        data,
      });

      const { data: updatedData, error } = await supabaseClient
        .from(tableName)
        .update(data)
        .eq("id", recordId)
        .select();

      if (error) {
        throw new Error(`Error updating data: ${error.message}`);
      }

      console.log("✅ Datos actualizados en Supabase:", updatedData);
      return { success: true, data: updatedData, count: updatedData.length };
    } catch (error) {
      console.error("❌ Error en updateSupabaseData:", error);
      throw error;
    }
  }

  async updateSmartsheetData(credentials, sheetId, recordId, data) {
    try {
      const accessToken =
        credentials.accessToken || credentials.token || credentials.apiKey;

      if (!accessToken || !sheetId) {
        throw new Error("Credenciales de Smartsheet incompletas");
      }

      // Para Smartsheet, necesitamos convertir los datos al formato de celdas
      const cells = Object.entries(data).map(([_key, value], index) => ({
        columnId: index + 1, // Esto es simplificado, debería usar mapeo real
        value: value,
      }));

      console.log("🔄 Actualizando datos en Smartsheet:", {
        sheetId,
        recordId,
        cells,
      });

      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows/${recordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: recordId,
            cells: cells,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error API Smartsheet: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Datos actualizados en Smartsheet:", result);

      return {
        success: true,
        data: result.result,
        message: result.message,
      };
    } catch (error) {
      console.error("❌ Error en updateSmartsheetData:", error);
      throw error;
    }
  }

  async updateMongoData(credentials, collection, recordId, data) {
    try {
      console.log("🔄 Simulando actualización en MongoDB:", {
        collection,
        recordId,
        data,
      });

      // En implementación real:
      // const client = new MongoClient(credentials.connectionString);
      // const result = await client.db(credentials.database).collection(collection).updateOne({_id: recordId}, {$set: data});

      return {
        success: true,
        data: { ...data, _id: recordId },
        message: "Operación MongoDB simulada - implementar backend intermedio",
      };
    } catch (error) {
      console.error("❌ Error en updateMongoData:", error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE ELIMINACIÓN ESPECÍFICOS ====================

  async deleteSupabaseData(credentials, tableName, recordId) {
    try {
      const supabaseUrl =
        credentials.projectUrl ||
        credentials.project_url ||
        credentials.url ||
        credentials.supabaseUrl ||
        credentials.supabase_url;
      const anonKey =
        credentials.anonKey || credentials.anon_key || credentials.key;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Credenciales de Supabase incompletas");
      }

      const supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-delete-${tableName}`,
        },
        global: {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
        },
      });

      console.log("🗑️ Eliminando datos en Supabase:", { tableName, recordId });

      const { data: deletedData, error } = await supabaseClient
        .from(tableName)
        .delete()
        .eq("id", recordId)
        .select();

      if (error) {
        throw new Error(`Error deleting data: ${error.message}`);
      }

      console.log("✅ Datos eliminados en Supabase:", deletedData);
      return { success: true, data: deletedData, count: deletedData.length };
    } catch (error) {
      console.error("❌ Error en deleteSupabaseData:", error);
      throw error;
    }
  }

  async deleteSmartsheetData(credentials, sheetId, recordId) {
    try {
      const accessToken =
        credentials.accessToken || credentials.token || credentials.apiKey;

      if (!accessToken || !sheetId) {
        throw new Error("Credenciales de Smartsheet incompletas");
      }

      console.log("🗑️ Eliminando datos en Smartsheet:", { sheetId, recordId });

      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${sheetId}/rows?ids=${recordId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Error API Smartsheet: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Datos eliminados en Smartsheet:", result);

      return {
        success: true,
        data: result.result,
        message: result.message,
      };
    } catch (error) {
      console.error("❌ Error en deleteSmartsheetData:", error);
      throw error;
    }
  }

  async deleteMongoData(credentials, collection, recordId) {
    try {
      console.log("🗑️ Simulando eliminación en MongoDB:", {
        collection,
        recordId,
      });

      // En implementación real:
      // const client = new MongoClient(credentials.connectionString);
      // const result = await client.db(credentials.database).collection(collection).deleteOne({_id: recordId});

      return {
        success: true,
        data: { _id: recordId },
        message: "Operación MongoDB simulada - implementar backend intermedio",
      };
    } catch (error) {
      console.error("❌ Error en deleteMongoData:", error);
      throw error;
    }
  }
}

export default new DataOperationsService();
