/**
 * Servicio de IA - Cliente API para el frontend
 * Maneja comunicación con el backend para chat y configuración de IA
 */

import ApiClient from './apiClient';

class AIService {
  /**
   * Enviar mensaje al asistente IA con soporte para múltiples imágenes/adjuntos
   */
  static async sendMessage(message, sessionId = null, images = [], providerId = null, expertId = null) {
    const payload = { message };
    if (sessionId) payload.sessionId = sessionId;
    if (providerId) payload.providerId = providerId;
    if (expertId) payload.expertId = expertId;

    if (images && images.length > 0) {
      // Envía todas las imágenes cargadas
      payload.images = images.map(img => ({
        base64: img.base64,
        mime: img.mime,
        name: img.name
      }));
      // Retrocompatibilidad por si se requiere un único campo
      payload.imageBase64 = images[0].base64;
      payload.imageMime = images[0].mime;
    }
    return ApiClient.post('/ai/chat', payload);
  }

  /**
   * Obtener sesiones de chat del usuario
   */
  static async getSessions() {
    return ApiClient.get('/ai/sessions');
  }

  /**
   * Obtener historial de mensajes de una sesión
   */
  static async getSessionMessages(sessionId) {
    return ApiClient.get(`/ai/sessions/${sessionId}/messages`);
  }

  /**
   * Eliminar una sesión de chat
   */
  static async deleteSession(sessionId) {
    return ApiClient.delete(`/ai/sessions/${sessionId}`);
  }

  /**
   * Actualizar título de sesión
   */
  static async updateSessionTitle(sessionId, title) {
    return ApiClient.put(`/ai/sessions/${sessionId}/title`, { title });
  }

  /**
   * Obtener acciones disponibles
   */
  static async getActions() {
    return ApiClient.get('/ai/actions');
  }

  // ==========================================
  // Endpoints de administración (solo admin)
  // ==========================================

  /**
   * Obtener lista de proveedores IA
   */
  static async getProviders() {
    return ApiClient.get('/ai/providers');
  }

  /**
   * Obtener un proveedor específico
   */
  static async getProviderById(providerId) {
    return ApiClient.get(`/ai/providers/${providerId}`);
  }

  /**
   * Crear nuevo proveedor IA
   */
  static async createProvider(provider) {
    return ApiClient.post('/ai/providers', provider);
  }

  /**
   * Actualizar proveedor IA
   */
  static async updateProvider(providerId, provider) {
    return ApiClient.put(`/ai/providers/${providerId}`, provider);
  }

  /**
   * Eliminar proveedor IA
   */
  static async deleteProvider(providerId) {
    return ApiClient.delete(`/ai/providers/${providerId}`);
  }

  /**
   * Probar conexión con proveedor IA
   */
  static async testProvider(providerId) {
    return ApiClient.post(`/ai/providers/${providerId}/test`, {});
  }

  /**
   * Crear nueva acción para el agente IA
   */
  static async createAction(action) {
    return ApiClient.post('/ai/actions', action);
  }

  /**
   * Actualizar acción del agente IA
   */
  static async updateAction(actionId, action) {
    return ApiClient.put(`/ai/actions/${actionId}`, action);
  }

  /**
   * Eliminar acción del agente IA
   */
  static async deleteAction(actionId) {
    return ApiClient.delete(`/ai/actions/${actionId}`);
  }

  /**
   * Obtener estadísticas de uso
   */
  static async getStats(days = 30) {
    return ApiClient.get(`/ai/stats?days=${days}`);
  }

  /**
   * Obtener logs de chat
   */
  static async getLogs(params = {}) {
    const { limit = 50, offset = 0, userId, sessionId } = params;
    let url = `/ai/logs?limit=${limit}&offset=${offset}`;
    if (userId) url += `&userId=${userId}`;
    if (sessionId) url += `&sessionId=${sessionId}`;
    return ApiClient.get(url);
  }

  // ==========================================
  // Expertos (bases de conocimiento por agencia)
  // ==========================================

  /** Listar expertos de la propia agencia (admin puede filtrar con ?agencia=) */
  static async getExperts(agencia = null) {
    const url = agencia ? `/ai/experts?agencia=${encodeURIComponent(agencia)}` : '/ai/experts';
    return ApiClient.get(url);
  }

  static async getExpert(expertId) {
    return ApiClient.get(`/ai/experts/${expertId}`);
  }

  static async createExpert(data) {
    return ApiClient.post('/ai/experts', data);
  }

  static async updateExpert(expertId, data) {
    return ApiClient.put(`/ai/experts/${expertId}`, data);
  }

  static async deleteExpert(expertId) {
    return ApiClient.delete(`/ai/experts/${expertId}`);
  }

  /** Sube un documento de conocimiento (PDF/DOCX/TXT/MD) a un experto */
  static async uploadExpertDocument(expertId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return ApiClient.post(`/ai/experts/${expertId}/documents`, formData);
  }

  /** Agrega conocimiento a un experto a partir de una URL pública */
  static async addExpertDocumentFromUrl(expertId, url) {
    return ApiClient.post(`/ai/experts/${expertId}/documents`, { url });
  }

  static async deleteExpertDocument(expertId, docId) {
    return ApiClient.delete(`/ai/experts/${expertId}/documents/${docId}`);
  }
}

export default AIService;