import ApiClient from './apiClient';

class UserService {
  // Get all users
  static async listUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/users?${queryParams}` : '/users';
      const result = await ApiClient.get(endpoint);
      return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(id) {
    try {
      const result = await ApiClient.get(`/users/${id}`);
      return result;
    } catch (error) {
      console.error(`Error fetching user with id ${id}:`, error);
      throw error;
    }
  }

  // Create new user
  static async createUser(payload) {
    try {
      const result = await ApiClient.post('/users', payload);
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(id, payload) {
    try {
      const result = await ApiClient.put(`/users/${id}`, payload);
      return result;
    } catch (error) {
      console.error(`Error updating user with id ${id}:`, error);
      throw error;
    }
  }

  // Delete user
  static async deleteUser(id) {
    try {
      const result = await ApiClient.delete(`/users/${id}`);
      return result;
    } catch (error) {
      console.error(`Error deleting user with id ${id}:`, error);
      throw error;
    }
  }

  // Unlock user account
  static async unlockUser(id) {
    try {
      const result = await ApiClient.post(`/users/${id}/unlock`);
      return result;
    } catch (error) {
      console.error(`Error unlocking user with id ${id}:`, error);
      throw error;
    }
  }

  // Toggle 2FA for user
  static async toggleTwoFactor(id, enabled) {
    try {
      const result = await ApiClient.put(`/users/${id}/2fa`, { enabled });
      return result;
    } catch (error) {
      console.error(`Error toggling 2FA for user with id ${id}:`, error);
      throw error;
    }
  }
}

export default UserService;