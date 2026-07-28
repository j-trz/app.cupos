import ApiClient from './apiClient';

export class ApiKeyService {
  /**
   * Obtiene la lista de API Keys registradas (Solo Super Admin).
   */
  static async getApiKeys() {
    return await ApiClient.get('/api-keys');
  }

  /**
   * Genera una nueva API Key.
   * @param {Object} payload { name: string, agency_id?: string, scopes?: string[] }
   */
  static async createApiKey(payload) {
    return await ApiClient.post('/api-keys', payload);
  }

  /**
   * Revoca una API Key por ID.
   * @param {string} id
   */
  static async revokeApiKey(id) {
    return await ApiClient.delete(`/api-keys/${id}`);
  }
}

export default ApiKeyService;
