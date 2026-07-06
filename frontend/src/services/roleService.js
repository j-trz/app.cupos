import ApiClient from './apiClient';

class RoleService {
  /**
   * Lista todos los roles con paginación y filtros
   */
  static async listRoles(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    const response = await ApiClient.get(`/roles${query ? `?${query}` : ''}`);
    return response;
  }

  /**
   * Obtiene un rol por ID
   */
  static async getRoleById(id) {
    const response = await ApiClient.get(`/roles/${id}`);
    return response;
  }

  /**
   * Crea un nuevo rol
   */
  static async createRole(payload) {
    const response = await ApiClient.post('/roles', payload);
    return response;
  }

  /**
   * Actualiza un rol existente
   */
  static async updateRole(id, payload) {
    const response = await ApiClient.put(`/roles/${id}`, payload);
    return response;
  }

  /**
   * Elimina un rol
   */
  static async deleteRole(id) {
    const response = await ApiClient.delete(`/roles/${id}`);
    return response;
  }

  /**
   * Obtiene usuarios asignados a un rol
   */
  static async getRoleUsers(roleId) {
    const response = await ApiClient.get(`/roles/${roleId}/users`);
    return response;
  }

  /**
   * Asigna un rol a un usuario
   */
  static async assignRoleToUser(userId, roleId) {
    const response = await ApiClient.post(`/roles/${roleId}/users`, {
      user_id: userId
    });
    return response;
  }

  /**
   * Remueve un rol de un usuario
   */
  static async removeRoleFromUser(userId, roleId) {
    const response = await ApiClient.delete(`/roles/${roleId}/users`, {
      user_id: userId
    });
    return response;
  }

  /**
   * Obtiene los roles de un usuario
   */
  static async getUserRoles(userId) {
    const response = await ApiClient.get(`/users/${userId}/roles`);
    return response;
  }
}

export default RoleService;
