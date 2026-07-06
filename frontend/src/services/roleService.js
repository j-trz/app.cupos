import ApiClient from './apiClient';

export const RoleService = {
  /**
   * Lista todos los roles con filtros
   */
  listRoles: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/roles?${queryString}` : '/roles';
    
    return await ApiClient.get(endpoint);
  },

  /**
   * Obtiene un rol por ID
   */
  getRoleById: async (id) => {
    return await ApiClient.get(`/roles/${id}`);
  },

  /**
   * Crea un nuevo rol
   */
  createRole: async (roleData) => {
    return await ApiClient.post('/roles', roleData);
  },

  /**
   * Actualiza un rol existente
   */
  updateRole: async (id, roleData) => {
    return await ApiClient.put(`/roles/${id}`, roleData);
  },

  /**
   * Elimina un rol
   */
  deleteRole: async (id) => {
    return await ApiClient.delete(`/roles/${id}`);
  },

  /**
   * Asigna permisos a un rol
   */
  assignPermissionsToRole: async (roleId, permissions) => {
    return await ApiClient.post(`/roles/${roleId}/permissions`, { permissions });
  },

  /**
   * Obtiene los permisos de un rol
   */
  getRolePermissions: async (roleId) => {
    return await ApiClient.get(`/roles/${roleId}/permissions`);
  }
};

export default RoleService;