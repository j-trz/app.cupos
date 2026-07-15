import ApiClient from './apiClient';

class NotificationTemplatesService {
  /**
   * Obtener plantillas de notificaciones in-app
   */
  static async getTemplates() {
    return ApiClient.request('/notification-config/templates');
  }

  /**
   * Actualizar plantilla de notificación (title/message/icon/color)
   */
  static async updateTemplate(id, template) {
    return ApiClient.request(`/notification-config/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
  }

  /**
   * Obtener vista previa renderizada de una plantilla
   */
  static async previewTemplate(id) {
    return ApiClient.request(`/notification-config/templates/${id}/preview`);
  }
}

export default NotificationTemplatesService;
