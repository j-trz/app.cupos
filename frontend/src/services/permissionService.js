import ApiClient from './apiClient';

class PermissionService {
  /**
   * Lista todos los permisos con paginación y filtros
   */
  static async listPermissions(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.module) queryParams.append('module', params.module);
    if (params.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    const response = await ApiClient.get(`/permissions${query ? `?${query}` : ''}`);
    return response;
  }

  /**
   * Obtiene un permiso por ID
   */
  static async getPermissionById(id) {
    const response = await ApiClient.get(`/permissions/${id}`);
    return response;
  }

  /**
   * Crea un nuevo permiso
   */
  static async createPermission(payload) {
    const response = await ApiClient.post('/permissions', payload);
    return response;
  }

  /**
   * Actualiza un permiso existente
   */
  static async updatePermission(id, payload) {
    const response = await ApiClient.put(`/permissions/${id}`, payload);
    return response;
  }

  /**
   * Elimina un permiso
   */
  static async deletePermission(id) {
    const response = await ApiClient.delete(`/permissions/${id}`);
    return response;
  }

  /**
   * Obtiene la lista de módulos disponibles
   */
  static async getModules() {
    const response = await ApiClient.get('/permissions/modules');
    return response;
  }

  /**
   * Obtiene los permisos de un rol específico
   */
  static async getRolePermissions(roleId) {
    const response = await ApiClient.get(`/permissions/role/${roleId}`);
    return response;
  }

  /**
   * Asigna permisos a un rol
   */
  static async assignPermissionsToRole(roleId, permissionIds) {
    const response = await ApiClient.post(`/permissions/role/${roleId}`, {
      permission_ids: permissionIds
    });
    return response;
  }

  /**
   * Remueve permisos de un rol
   */
  static async removePermissionsFromRole(roleId, permissionIds) {
    const response = await ApiClient.delete(`/permissions/role/${roleId}`, {
      permission_ids: permissionIds
    });
    return response;
  }
}

export default PermissionService;
