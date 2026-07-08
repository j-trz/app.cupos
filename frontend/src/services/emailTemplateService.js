import ApiClient from './apiClient';

class EmailTemplateService {
  // Get all email templates
  static async listTemplates(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/email-templates?${queryParams}` : '/email-templates';
      const result = await ApiClient.get(endpoint);
      return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw error;
    }
  }

  // Get email template by ID
  static async getTemplateById(id) {
    try {
      const result = await ApiClient.get(`/email-templates/${id}`);
      return result;
    } catch (error) {
      console.error(`Error fetching email template with id ${id}:`, error);
      throw error;
    }
  }

  // Create new email template
  static async createTemplate(payload) {
    try {
      const result = await ApiClient.post('/email-templates', payload);
      return result;
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }

  // Update email template
  static async updateTemplate(id, payload) {
    try {
      const result = await ApiClient.put(`/email-templates/${id}`, payload);
      return result;
    } catch (error) {
      console.error(`Error updating email template with id ${id}:`, error);
      throw error;
    }
  }

  // Delete email template
  static async deleteTemplate(id) {
    try {
      const result = await ApiClient.delete(`/email-templates/${id}`);
      return result;
    } catch (error) {
      console.error(`Error deleting email template with id ${id}:`, error);
      throw error;
    }
  }

  // Toggle template activation
  static async toggleActivation(id, isActive) {
    try {
      const result = await ApiClient.put(`/email-templates/${id}/activate`, { is_active: isActive });
      return result;
    } catch (error) {
      console.error(`Error toggling activation for template with id ${id}:`, error);
      throw error;
    }
  }
}

export default EmailTemplateService;