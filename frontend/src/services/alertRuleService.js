import ApiClient from './apiClient';

class AlertRuleService {
  // Get all alert rules
  static async listAlertRules(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/alert-rules?${queryParams}` : '/alert-rules';
      const result = await ApiClient.get(endpoint);
      return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      throw error;
    }
  }

  // Get alert rule by ID
  static async getAlertRuleById(id) {
    try {
      const result = await ApiClient.get(`/alert-rules/${id}`);
      return result;
    } catch (error) {
      console.error(`Error fetching alert rule with id ${id}:`, error);
      throw error;
    }
  }

  // Create new alert rule
  static async createAlertRule(payload) {
    try {
      const result = await ApiClient.post('/alert-rules', payload);
      return result;
    } catch (error) {
      console.error('Error creating alert rule:', error);
      throw error;
    }
  }

  // Update alert rule
  static async updateAlertRule(id, payload) {
    try {
      const result = await ApiClient.put(`/alert-rules/${id}`, payload);
      return result;
    } catch (error) {
      console.error(`Error updating alert rule with id ${id}:`, error);
      throw error;
    }
  }

  // Delete alert rule
  static async deleteAlertRule(id) {
    try {
      const result = await ApiClient.delete(`/alert-rules/${id}`);
      return result;
    } catch (error) {
      console.error(`Error deleting alert rule with id ${id}:`, error);
      throw error;
    }
  }
}

export default AlertRuleService;