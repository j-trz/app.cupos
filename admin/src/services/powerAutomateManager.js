import ConnectionService from "./connectionService";
import ApiClient from "./apiClient";

/**
 * Servicio para gestionar conexiones Power Automate automáticamente
 */
class PowerAutomateManager {
  /**
   * Crear conexión Power Automate automáticamente para el usuario actual
   * @param {string} userPassword - Contraseña del usuario para encriptar
   * @returns {Promise<Object>} Resultado de la creación
   */
  static async createDefaultPowerAutomateConnection(userPassword) {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Verificar si ya tiene una conexión Power Automate
      const existingConnections = await ConnectionService.getUserConnections();
      const hasPowerAutomate = existingConnections.connections.some(
        (conn) => conn.type === "powerautomate"
      );

      if (hasPowerAutomate) {
        console.log("El usuario ya tiene una conexión Power Automate");
        return {
          success: true,
          message: "Conexión Power Automate ya existe",
          exists: true,
        };
      }

      // Crear conexión con las credenciales actuales de Power Automate
      const connectionData = {
        name: "Power Automate Principal",
        type: "powerautomate",
        description:
          "Conexión principal a Microsoft Power Automate para cupos de vuelo",
        credentials: {
          flowUrl: import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS,
          apiKey: "", // Power Automate actual no usa API key
          postUrl: import.meta.env.VITE_POWERAUTOMATE_POST_URL || "",
        },
      };

      const result = await ConnectionService.createConnection(
        connectionData,
        userPassword
      );

      if (result.success) {
        console.log("Conexión Power Automate creada exitosamente");
        return {
          success: true,
          message: "Conexión Power Automate creada exitosamente",
          connection: result.connection,
          created: true,
        };
      } else {
        throw new Error("Error al crear conexión Power Automate");
      }
    } catch (error) {
      console.error("Error creating default Power Automate connection:", error);
      return {
        success: false,
        error: error.message,
        message: "Error al crear conexión Power Automate",
      };
    }
  }

  /**
   * Verificar y crear conexión si es necesario
   * @param {string} userPassword - Contraseña del usuario
   * @returns {Promise<Object>} Estado de la conexión
   */
  static async ensurePowerAutomateConnection(userPassword) {
    try {
      const connections = await ConnectionService.getUserConnections();
      const powerAutomateConnection = connections.connections.find(
        (conn) => conn.type === "powerautomate"
      );

      if (powerAutomateConnection) {
        return {
          success: true,
          exists: true,
          connection: powerAutomateConnection,
          message: "Conexión Power Automate disponible",
        };
      }

      // Si no existe, crear una nueva
      return await this.createDefaultPowerAutomateConnection(userPassword);
    } catch (error) {
      console.error("Error ensuring Power Automate connection:", error);
      return {
        success: false,
        error: error.message,
        message: "Error verificando conexión Power Automate",
      };
    }
  }

  /**
   * Obtener información de la conexión Power Automate actual
   * @returns {Promise<Object>} Información de la conexión
   */
  static async getPowerAutomateInfo() {
    try {
      const connections = await ConnectionService.getUserConnections();
      const powerAutomateConnection = connections.connections.find(
        (conn) => conn.type === "powerautomate"
      );

      if (powerAutomateConnection) {
        return {
          success: true,
          exists: true,
          connection: {
            id: powerAutomateConnection.id,
            name: powerAutomateConnection.name,
            description: powerAutomateConnection.description,
            created_at: powerAutomateConnection.created_at,
            updated_at: powerAutomateConnection.updated_at,
            is_active: powerAutomateConnection.is_active,
            connection_status: powerAutomateConnection.connection_status,
          },
        };
      }

      return {
        success: true,
        exists: false,
        message: "No hay conexión Power Automate configurada",
      };
    } catch (error) {
      console.error("Error getting Power Automate info:", error);
      return {
        success: false,
        error: error.message,
        message: "Error obteniendo información de Power Automate",
      };
    }
  }

  /**
   * Mostrar prompt para crear conexión Power Automate
   * @returns {Promise<string|null>} Contraseña del usuario o null si cancela
   */
  static async promptForPasswordToCreateConnection() {
    return new Promise((resolve) => {
      const password = prompt(
        "Para crear la conexión Power Automate necesitamos tu contraseña de usuario.\n\nEsta contraseña se usa para encriptar las credenciales de forma segura.\n\nIngresa tu contraseña:"
      );

      if (password && password.trim()) {
        resolve(password.trim());
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Inicializar conexión Power Automate con prompt automático
   * @returns {Promise<Object>} Resultado de la inicialización
   */
  static async initializePowerAutomateConnection() {
    try {
      // Verificar si ya existe
      const info = await this.getPowerAutomateInfo();
      if (info.exists) {
        return {
          success: true,
          exists: true,
          message: "Conexión Power Automate ya configurada",
        };
      }

      // Solicitar contraseña al usuario
      const password = await this.promptForPasswordToCreateConnection();
      if (!password) {
        return {
          success: false,
          cancelled: true,
          message: "Creación de conexión cancelada por el usuario",
        };
      }

      // Crear la conexión
      const result = await this.createDefaultPowerAutomateConnection(password);

      if (result.success) {
        // Mostrar mensaje de éxito
        alert(
          "✅ Conexión Power Automate creada exitosamente!\n\nAhora puedes gestionar tus conexiones desde el panel de administración."
        );
      }

      return result;
    } catch (error) {
      console.error("Error initializing Power Automate connection:", error);
      return {
        success: false,
        error: error.message,
        message: "Error inicializando conexión Power Automate",
      };
    }
  }
}

export default PowerAutomateManager;
