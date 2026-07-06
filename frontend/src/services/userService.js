import ApiClient from './apiClient';

export class UserService {
  static async listUsers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    
    return await ApiClient.get(endpoint);
  }

  static async getUserById(id) {
    return await ApiClient.get(`/users/${id}`);
  }

  static async createUser(userData) {
    return await ApiClient.post('/users', userData);
  }

  static async updateUser(id, userData) {
    return await ApiClient.put(`/users/${id}`, userData);
  }

  static async deleteUser(id) {
    return await ApiClient.delete(`/users/${id}`);
  }

  static async toggleUserStatus(id, isActive) {
    return await ApiClient.put(`/users/${id}/status`, { active: isActive });
  }

  static async assignRole(userId, roleId) {
    return await ApiClient.post(`/users/${userId}/roles/${roleId}`);
  }

  static async removeRole(userId, roleId) {
    return await ApiClient.delete(`/users/${userId}/roles/${roleId}`);
  }
}