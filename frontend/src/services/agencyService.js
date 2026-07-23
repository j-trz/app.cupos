import ApiClient from './apiClient';

export class AgencyService {
  static async listAgencies(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/agencies?${queryString}` : '/agencies';
    
    return await ApiClient.get(endpoint);
  }

  static async getAgencyById(id) {
    return await ApiClient.get(`/agencies/${id}`);
  }

  static async createAgency(agencyData) {
    return await ApiClient.post('/agencies', agencyData);
  }

  static async updateAgency(id, agencyData) {
    return await ApiClient.put(`/agencies/${id}`, agencyData);
  }

  static async deleteAgency(id) {
    return await ApiClient.delete(`/agencies/${id}`);
  }

  static async updateAgencyConfig(agencyId, configData) {
    return await ApiClient.put(`/agencies/${agencyId}/config`, configData);
  }

  // Prende/apaga el asistente de IA para la PROPIA agencia (self-service) —
  // el backend resuelve la agencia objetivo del token, nunca de un id acá.
  static async toggleMyAgencyAI(aiHabilitado) {
    return await ApiClient.put('/agencies/me/ai-habilitado', { ai_habilitado: aiHabilitado });
  }

  static async getAgencyConfig(agencyId) {
    return await ApiClient.get(`/agencies/${agencyId}/config`);
  }
}

export default AgencyService;