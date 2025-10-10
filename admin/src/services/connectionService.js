import { supabase } from "../supabaseClient";

/**
 * Servicio para gestionar conexiones a APIs externas.
 * Versión simplificada sin seguridad a nivel de usuario y con almacenamiento de credenciales en texto plano.
 */
class ConnectionService {
  /**
   * Crear o actualizar una conexión API.
   * Las credenciales se envían al backend para ser almacenadas en texto plano.
   * @param {Object} connectionData - Datos de la conexión (incluye credenciales, nombre, proveedor).
   * @returns {Promise<Object>} Conexión creada o actualizada.
   */
  static async saveConnection(connectionData) {
    try {
      const { id, name, type, description, credentials } = connectionData;

      if (!name || !type || !credentials) {
        throw new Error("Name, type, and credentials are required.");
      }

      // El ID de la conexión ahora se puede generar en el cliente o backend.
      // Para simplicidad, usaremos un UUID si no se proporciona uno.
      const connection_id = id || crypto.randomUUID();

      // Llama a la función de backend simplificada para guardar las credenciales.
      const { data, error } = await supabase.functions.invoke(
        "save-service-credentials",
        {
          body: {
            connection_id,
            connection_name: name,
            provider: type,
            credentials,
          },
        }
      );

      if (error) throw error;

      return { success: true, connection: { id: connection_id, ...connectionData }, message: data.message };
    } catch (error) {
      console.error("Error saving connection:", error);
      throw new Error(error.message || "Error saving the connection.");
    }
  }

  /**
   * Guarda la configuración de mapeo de columnas para una conexión.
   * @param {string} connectionId - El ID de la conexión.
   * @param {object} mapping - El objeto de mapeo de columnas.
   * @returns {Promise<Object>}
   */
  static async saveMapping(connectionId, mapping) {
    try {
      // Primero, obtenemos los detalles actuales para no sobreescribir las credenciales.
      const connectionDetails = await this.getConnectionDetails(connectionId);

      const { data, error } = await supabase.functions.invoke(
        "save-service-credentials",
        {
          body: {
            connection_id: connectionId,
            connection_name: connectionDetails.name,
            provider: connectionDetails.type,
            credentials: connectionDetails.credentials,
            column_mapping: mapping,
          },
        }
      );

      if (error) {
        throw new Error(`Failed to save mapping: ${error.message}`);
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error saving mapping:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las conexiones.
   * @returns {Promise<Array>} Lista de conexiones (sin credenciales).
   */
  static async getConnections() {
    try {
      // Directamente consultamos la tabla de credenciales de servicio, que ahora es la fuente de verdad.
      const { data, error } = await supabase
        .from("service_credentials")
        .select("connection_id, connection_name, provider, updated_at, is_active, last_tested_at, connection_status")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Mapear al formato que espera el frontend
      const connections = data.map(conn => ({
        id: conn.connection_id,
        name: conn.connection_name,
        type: conn.provider,
        updated_at: conn.updated_at,
        is_active: conn.is_active,
        last_tested_at: conn.last_tested_at,
        connection_status: conn.connection_status,
      }));

      return { success: true, connections };
    } catch (error) {
      console.error("Error fetching connections:", error);
      throw new Error(error.message || "Error fetching connections.");
    }
  }

  /**
   * Obtener los detalles (incluyendo credenciales) de una conexión específica.
   * @param {string} connectionId - El ID de la conexión.
   * @returns {Promise<Object>} Los detalles de la conexión.
   */
  static async getConnectionDetails(connectionId) {
    try {
      const { data, error } = await supabase
        .from("service_credentials")
        .select("*")
        .eq("connection_id", connectionId)
        .single();

      if (error) {
        throw new Error(`Connection with ID ${connectionId} not found.`);
      }

      // Mapear al formato que espera el frontend
      return {
        id: data.connection_id,
        name: data.connection_name,
        type: data.provider,
        credentials: data.credentials,
        updated_at: data.updated_at
      };

    } catch (error) {
      console.error("Error fetching connection details:", error);
      throw error;
    }
  }

  /**
   * Eliminar una conexión.
   * @param {string} connectionId - ID de la conexión.
   * @returns {Promise<Object>} Resultado de la eliminación.
   */
  static async deleteConnection(connectionId) {
    try {
      const { error } = await supabase.functions.invoke(
        "delete-service-credentials",
        { body: { connection_id: connectionId } }
      );

      if (error) throw error;

      return { success: true, message: "Connection deleted successfully." };
    } catch (error) {
      console.error("Error deleting connection:", error);
      throw new Error(error.message || "Error deleting connection.");
    }
  }

  /**
   * Probar una conexión existente.
   * @param {string} connectionId - ID de la conexión a probar.
   * @returns {Promise<Object>} Resultado de la prueba de conexión.
   */
  static async testConnection(connectionId) {
    try {
      if (!connectionId) {
        throw new Error("Connection ID is required to run a test.");
      }

      console.log(`[Connection Test] 🚀 Testing connection with ID: ${connectionId}`);

      // Invocar la Edge Function refactorizada que solo necesita el ID.
      const { data, error } = await supabase.functions.invoke(
        "test-api-connection",
        {
          body: {
            connection_id: connectionId,
          },
        }
      );

      if (error) {
        console.error("Error invoking test-api-connection function:", error);
        return {
          success: false,
          message: `Error invoking test function: ${error.message}`,
        };
      }

      return data;
    } catch (error) {
      console.error("General error in testConnection:", error);
      return {
        success: false,
        message: error.message || "Fatal error testing connection.",
      };
    }
  }

  /**
   * Obtener el esquema de una tabla para una conexión dada.
   * @param {string} connectionId - El ID de la conexión
   * @param {string} tableName - El nombre de la tabla
   * @returns {Promise<Object>}
   */
  static async getTableSchema(connectionId, tableName) {
    try {
        const { data, error } = await supabase.functions.invoke('get-table-schema', {
            body: { connection_id: connectionId, table_name: tableName },
        });

        if (error) {
            throw new Error(`Failed to get schema: ${error.message}`);
        }
        return data;
    } catch (error) {
        console.error('Error getting table schema:', error);
        throw error;
    }
  }

  static async activateConnection(connectionId) {
    try {
      const { data, error } = await supabase.functions.invoke('activate-connection', {
        body: { connection_id: connectionId },
      });

      if (error) {
        throw new Error(`Failed to activate connection: ${error.message}`);
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error activating connection:', error);
      throw error;
    }
  }

  /**
   * Obtener tipos de conexión soportados
   * @returns {Array} Lista de tipos soportados
   */
  static getSupportedConnectionTypes() {
    // Esta función no necesita cambios, ya que define la UI.
    return [
      {
        type: "powerautomate",
        name: "Power Automate",
        fields: [
          { name: "flowUrl", label: "Flow HTTP Request URL", type: "url", required: true },
        ],
      },
      {
        type: "supabase",
        name: "Supabase",
        fields: [
          { name: "url", label: "Project URL", type: "url", required: true },
          { name: "apiKey", label: "API Key (anon)", type: "password", required: true },
        ],
      },
      {
        type: "smartsheet",
        name: "Smartsheet",
        fields: [
          { name: "apiToken", label: "API Token", type: "password", required: true },
        ],
      },
      {
        type: "mongodb",
        name: "MongoDB",
        fields: [
          { name: "connectionString", label: "Connection String", type: "password", required: true },
          { name: "database", label: "Database Name", type: "text", required: true },
        ],
      },
      {
        type: "tableau",
        name: "Tableau",
        fields: [
            { name: "server", label: "Server URL", type: "text", required: true },
            { name: "username", label: "Username", type: "text", required: true },
            { name: "password", label: "Password", type: "password", required: true },
            { name: "siteName", label: "Site Name (optional)", type: "text", required: false },
        ],
      },
    ];
  }
}
export default ConnectionService;