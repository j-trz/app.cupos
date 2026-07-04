import ConnectionService from "./connectionService";
import ApiClient from "./apiClient";

/**
 * Servicio para gestionar fuentes de datos configurables
 */
class DataSourceService {
  /**
   * Obtener la conexión activa para solicitudes
   */
  static async getActiveConnectionForSolicitudes() {
    try {
      // Usar el nuevo sistema de conexión activa
      const activeConnection = await ConnectionService.getActiveConnection();

      // getActiveConnection() retorna directamente la conexión o null
      return activeConnection;
    } catch (error) {
      console.error("Error getting active connection:", error);
      return null;
    }
  }

  /**
   * Obtener datos de solicitudes usando la conexión activa
   */
  static async getSolicitudesData(userPassword) {
    try {
      const connection = await this.getActiveConnectionForSolicitudes();

      if (!connection) {
        // Fallback a Power Automate por defecto
        return await this.getPowerAutomateData();
      }

      switch (connection.type) {
        case "powerautomate":
          return await this.getPowerAutomateDataFromConnection(
            connection,
            userPassword
          );
        case "supabase":
          return await this.getSupabaseData(connection, userPassword);
        case "smartsheet":
          return await this.getSmartsheetData(connection, userPassword);
        default:
          throw new Error(`Tipo de conexión no soportado: ${connection.type}`);
      }
    } catch (error) {
      console.error("Error fetching solicitudes data:", error);
      // Fallback a Power Automate por defecto
      return await this.getPowerAutomateData();
    }
  }

  /**
   * Obtener datos de Power Automate (método original)
   */
  static async getPowerAutomateData() {
    try {
      const response = await fetch(
        "https://prod-51.westus.logic.azure.com/workflows/7d5bf5e4a93642e985b3ee9c5e969976/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xJ0sARG8Yx36L5Z9f86SPL7VHRyD7BHLG6aYQKEf6ak",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error("Error fetching Power Automate data:", error);
      return [];
    }
  }

  /**
   * Obtener datos de Power Automate usando conexión configurada
   */
  static async getPowerAutomateDataFromConnection(connection, _userPassword) {
    try {
      // Obtener credenciales desencriptadas desde el backend
      const credentials = await ConnectionService.getDecryptedCredentials(connection.id);

      const flowUrl = credentials.flowUrl || credentials.url;
      if (!flowUrl) {
        throw new Error("URL del Flow no encontrada en credenciales");
      }

      const response = await fetch(flowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials.apiKey && {
            Authorization: `Bearer ${credentials.apiKey}`,
          }),
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return this.mapDataToStandardFormat(data, connection.column_mapping);
    } catch (error) {
      console.error("Error fetching configured Power Automate data:", error);
      // Fallback al método original
      return await this.getPowerAutomateData();
    }
  }

  /**
   * Obtener datos de Supabase (vía backend proxy)
   */
  static async getSupabaseData(connection, _userPassword) {
    try {
      // Obtener credenciales desencriptadas desde el backend
      const credentials = await ConnectionService.getDecryptedCredentials(connection.id);

      // Obtener nombre de tabla (priorizar credenciales si el usuario lo definió)
      const tableName =
        credentials?.tableName ||
        credentials?.table_name ||
        connection.column_mapping?.tableName ||
        "solicitudes";

      const result = await ApiClient.post("/connections/external-fetch", {
        credentials,
        operation: "select",
        tableName,
        orderBy: "created_at",
        ascending: false,
      });

      const data = result.data || [];
      return this.mapDataToStandardFormat(data, connection.column_mapping);
    } catch (error) {
      console.error("Error fetching Supabase data:", error);
      return [];
    }
  }

  /**
   * Obtener datos de Smartsheet
   */
  static async getSmartsheetData(connection, _userPassword) {
    try {
      // Obtener credenciales desencriptadas desde el backend
      const credentials = await ConnectionService.getDecryptedCredentials(connection.id);

      const sheetId = connection.column_mapping?.sheetId;
      if (!sheetId) {
        throw new Error("Sheet ID no configurado");
      }

      const apiToken = credentials.apiToken || credentials.token || credentials.apiKey;

      const response = await fetch(
        `https://api.smartsheet.com/2.0/sheets/${sheetId}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const sheetData = await response.json();
      const formattedData = this.convertSmartsheetToStandardFormat(sheetData);

      return this.mapDataToStandardFormat(
        formattedData,
        connection.column_mapping
      );
    } catch (error) {
      console.error("Error fetching Smartsheet data:", error);
      return [];
    }
  }

  /**
   * Convertir datos de Smartsheet a formato estándar
   */
  static convertSmartsheetToStandardFormat(sheetData) {
    const columns = sheetData.columns;
    const rows = sheetData.rows;

    return rows.map((row) => {
      const rowData = {};
      row.cells.forEach((cell, index) => {
        const column = columns[index];
        if (column && cell.value !== undefined) {
          rowData[column.title] = cell.value;
        }
      });
      return rowData;
    });
  }

  /**
   * Mapear datos a formato estándar usando mapeo de columnas
   */
  static mapDataToStandardFormat(data, columnMapping) {
    if (!columnMapping || !columnMapping.mappings) {
      return data;
    }

    return data.map((item) => {
      const mappedItem = {};

      // Mapear campos según configuración
      Object.entries(columnMapping.mappings).forEach(
        ([standardField, sourceField]) => {
          if (sourceField && item[sourceField] !== undefined) {
            mappedItem[standardField] = item[sourceField];
          }
        }
      );

      // Mantener campos originales que no están mapeados
      Object.entries(item).forEach(([key, value]) => {
        if (!Object.values(columnMapping.mappings).includes(key)) {
          mappedItem[key] = value;
        }
      });

      return mappedItem;
    });
  }

  /**
   * Configurar conexión activa para solicitudes
   */
  static async setActiveConnectionForSolicitudes(connectionId, columnMapping) {
    try {
      // Desactivar otras conexiones de solicitudes
      const connections = await ConnectionService.getUserConnections();
      for (const conn of connections.connections) {
        if (
          conn.column_mapping?.type === "solicitudes" &&
          conn.id !== connectionId
        ) {
          await ConnectionService.updateConnection(conn.id, {
            is_active: false,
          });
        }
      }

      // Activar la conexión seleccionada
      await ConnectionService.updateConnection(connectionId, {
        is_active: true,
        column_mapping: {
          ...columnMapping,
          type: "solicitudes",
          updated_at: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error setting active connection:", error);
      throw error;
    }
  }

  /**
   * Obtener información de la fuente de datos activa
   */
  static async getActiveDataSourceInfo() {
    try {
      const connection = await this.getActiveConnectionForSolicitudes();

      if (!connection) {
        return {
          type: "powerautomate",
          name: "Power Automate (Por defecto)",
          description: "Conexión Power Automate predeterminada",
          isDefault: true,
        };
      }

      return {
        type: connection.type,
        name: connection.name,
        description: connection.description,
        isDefault: false,
        lastTested: connection.last_tested_at,
        status: connection.connection_status,
      };
    } catch (error) {
      console.error("Error getting active data source info:", error);
      return {
        type: "powerautomate",
        name: "Power Automate (Por defecto)",
        description: "Conexión Power Automate predeterminada",
        isDefault: true,
      };
    }
  }
}

export default DataSourceService;
