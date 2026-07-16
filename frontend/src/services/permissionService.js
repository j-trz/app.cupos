import ApiClient from './apiClient';

export class PermissionService {
  static async listPermissions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/permissions?${queryString}` : '/permissions';
    
    return await ApiClient.get(endpoint);
  }

  static async getPermissionById(id) {
    return await ApiClient.get(`/permissions/${id}`);
  }

  static async createPermission(permissionData) {
    return await ApiClient.post('/permissions', permissionData);
  }

  static async updatePermission(id, permissionData) {
    return await ApiClient.put(`/permissions/${id}`, permissionData);
  }

  static async deletePermission(id) {
    return await ApiClient.delete(`/permissions/${id}`);
  }
}

export default PermissionService;