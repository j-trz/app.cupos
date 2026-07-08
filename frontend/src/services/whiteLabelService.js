import ApiClient from './apiClient';

class WhiteLabelService {
  /**
   * Obtener configuración de white-label para la agencia actual
   * @returns {Promise<Object>} Configuración de white-label
   */
  static async getConfig() {
    try {
      const response = await ApiClient.request('/white-label/config');
      // El backend siempre retorna { config, isDefault } — nunca null
      if (response && typeof response === 'object' && 'config' in response) {
        return response;
      }
      return { config: null, isDefault: true };
    } catch (error) {
      // 404 u otro error: no hay config guardada aún
      return { config: null, isDefault: true };
    }
  }

  /**
   * Crear nueva configuración de white-label
   * @param {Object} configData - Datos de la configuración
   * @returns {Promise<Object>} Configuración creada
   */
  static async createConfig(configData) {
    try {
      const response = await ApiClient.post('/white-label/config', configData);
      return response;
    } catch (error) {
      console.error('Error al crear configuración white-label:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de white-label existente
   * @param {string|number} configId - ID de la configuración
   * @param {Object} configData - Datos a actualizar
   * @returns {Promise<Object>} Configuración actualizada
   */
  static async updateConfig(configId, configData) {
    try {
      const response = await ApiClient.put(`/white-label/config/${configId}`, configData);
      return response;
    } catch (error) {
      console.error('Error al actualizar configuración white-label:', error);
      throw error;
    }
  }

  /**
   * Eliminar configuración de white-label
   * @param {string|number} configId - ID de la configuración
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  static async deleteConfig(configId) {
    try {
      const response = await ApiClient.request(`/white-label/config/${configId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error al eliminar configuración white-label:', error);
      throw error;
    }
  }

  /**
   * Obtener presets de temas disponibles
   * @returns {Promise<Array>} Lista de temas preset
   */
  static async getPresets() {
    try {
      const response = await ApiClient.request('/white-label/presets');
      return response.presets || [];
    } catch (error) {
      console.error('Error al obtener presets de temas:', error);
      throw error;
    }
  }

  /**
   * Obtener presets de fuentes tipográficas
   * @returns {Promise<Array>} Lista de fuentes preset
   */
  static async getFonts() {
    try {
      const response = await ApiClient.request('/white-label/fonts');
      return response.fonts || [];
    } catch (error) {
      console.error('Error al obtener presets de fuentes:', error);
      throw error;
    }
  }

  /**
   * Obtener presets de estilos de botones
   * @returns {Promise<Array>} Lista de botones preset
   */
  static async getButtons() {
    try {
      const response = await ApiClient.request('/white-label/buttons');
      return response.buttons || [];
    } catch (error) {
      console.error('Error al obtener presets de botones:', error);
      throw error;
    }
  }

  /**
   * Exportar configuración como JSON
   * @param {string|number} configId - ID de la configuración
   * @returns {Promise<Object>} Configuración exportada
   */
  static async exportConfig(configId) {
    try {
      const response = await ApiClient.request(`/white-label/export/${configId}`);
      return response;
    } catch (error) {
      console.error('Error al exportar configuración white-label:', error);
      throw error;
    }
  }

  /**
   * Importar configuración desde JSON
   * @param {Object} configData - Datos de configuración a importar
   * @returns {Promise<Object>} Configuración importada
   */
  static async importConfig(configData) {
    try {
      const response = await ApiClient.post('/white-label/import', configData);
      return response;
    } catch (error) {
      console.error('Error al importar configuración white-label:', error);
      throw error;
    }
  }

  /**
   * Descargar configuración como archivo JSON
   * @param {string|number} configId - ID de la configuración
   * @param {string} filename - Nombre del archivo (opcional)
   */
  static async downloadConfig(configId, filename = 'white-label-config.json') {
    try {
      const config = await this.exportConfig(configId);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar configuración:', error);
      throw error;
    }
  }

  /**
   * Cargar configuración desde archivo JSON
   * @param {File} file - Archivo JSON a cargar
   * @returns {Promise<Object>} Datos del archivo parseados
   */
  static async loadConfigFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          resolve(config);
        } catch {
          reject(new Error('Archivo JSON inválido'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }
}

export default WhiteLabelService;
