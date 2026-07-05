import ApiClient from './apiClient';

class AgencyService {
  // Get all agencies
  static async listAgencies(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/agencies?${queryParams}` : '/agencies';
      const result = await ApiClient.get(endpoint);
      return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching agencies:', error);
      throw error;
    }
  }

  // Get agency by ID
  static async getAgencyById(id) {
    try {
      const result = await ApiClient.get(`/agencies/${id}`);
      return result;
    } catch (error) {
      console.error(`Error fetching agency with id ${id}:`, error);
      throw error;
    }
  }

  // Create new agency
  static async createAgency(payload) {
    try {
      const result = await ApiClient.post('/agencies', payload);
      return result;
    } catch (error) {
      console.error('Error creating agency:', error);
      throw error;
    }
  }

  // Update agency
  static async updateAgency(id, payload) {
    try {
      const result = await ApiClient.put(`/agencies/${id}`, payload);
      return result;
    } catch (error) {
      console.error(`Error updating agency with id ${id}:`, error);
      throw error;
    }
  }

  // Delete agency
  static async deleteAgency(id) {
    try {
      const result = await ApiClient.delete(`/agencies/${id}`);
      return result;
    } catch (error) {
      console.error(`Error deleting agency with id ${id}:`, error);
      throw error;
    }
  }

}

// Note: uploadLogo removed - no corresponding endpoint in backend (/api/agencies/:id/logo does not exist)

export default AgencyService;