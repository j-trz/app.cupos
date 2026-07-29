import ApiClient from './apiClient';

class AtlasConfigService {
  static async getConfig() {
    return ApiClient.get('/atlas-config/config');
  }

  static async createConfig(config) {
    return ApiClient.post('/atlas-config/config', config);
  }

  static async updateConfig(id, config) {
    return ApiClient.put(`/atlas-config/config/${id}`, config);
  }

  static async deleteConfig(id) {
    return ApiClient.delete(`/atlas-config/config/${id}`);
  }

  static async testConnection(config) {
    return ApiClient.post('/atlas-config/test', config);
  }
}

export default AtlasConfigService;
