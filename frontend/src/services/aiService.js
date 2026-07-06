/**
 * Servicio de IA - Cliente API para el frontend
 * Maneja comunicación con el backend para chat y configuración de IA
 */

import ApiClient from './apiClient';

class AIService {
  /**
   * Enviar mensaje al asistente IA
   */
  static async sendMessage(message, sessionId = null, providerId = null) {
    const payload = { message };
    if (sessionId) payload.sessionId = sessionId;
    if (providerId) payload.providerId = providerId;

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
}

export default AIService;