import ApiClient from './apiClient';

class EmailConfigService {
  /**
   * Obtener configuración SMTP de la agencia
   */
  static async getConfig() {
    return ApiClient.request('/email-config/config');
  }

  /**
   * Crear nueva configuración SMTP
   */
  static async createConfig(config) {
    return ApiClient.request('/email-config/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }

  /**
   * Actualizar configuración SMTP existente
   */
  static async updateConfig(id, config) {
    return ApiClient.request(`/email-config/config/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }

  /**
   * Eliminar configuración SMTP
   */
  static async deleteConfig(id) {
    return ApiClient.request(`/email-config/config/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Probar conexión SMTP
   */
  static async testConnection(config) {
    return ApiClient.request('/email-config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }

  /**
   * Enviar email de prueba
   */
  static async sendTestEmail(to_email) {
    return ApiClient.request('/email-config/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email })
    });
  }

  /**
   * Obtener plantillas de email
   */
  static async getTemplates() {
    return ApiClient.request('/email-config/templates');
  }

  /**
   * Actualizar plantilla de email
   */
  static async updateTemplate(id, template) {
    return ApiClient.request(`/email-config/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
  }
}

export default EmailConfigService;
