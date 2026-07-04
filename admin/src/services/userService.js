import dataApiService from './dataApiService';
import ApiClient from './apiClient';

/**
 * Servicio de usuarios con soporte para el backend flexible
 */
export class UserService {
  constructor() {
    // Detectar si usar el backend flexible
    this.useFlexibleBackend = import.meta.env.VITE_USE_FLEXIBLE_BACKEND === 'true';
  }

  /**
   * Verificar si estamos en modo API (backend flexible)
   */
  _isApiMode() {
    return ApiClient.isApiEnabled() || this.useFlexibleBackend;
  }

  /**
   * Obtener todos los usuarios
   */
  async getAllUsers() {
    if (this._isApiMode()) {
      try {
        const response = await ApiClient.get('/users');
        return response.users || [];
      } catch (error) {
        console.error('Error obteniendo usuarios desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Crear un nuevo usuario
   */
  async createUser(userData) {
    if (this._isApiMode()) {
      try {
        const response = await ApiClient.post('/users', userData);
        return response;
      } catch (error) {
        console.error('Error creando usuario desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Actualizar un usuario existente
   */
  async updateUser(userId, updates) {
    if (this._isApiMode()) {
      try {
        const response = await ApiClient.put(`/users/${userId}`, updates);
        return response;
      } catch (error) {
        console.error('Error actualizando usuario desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Eliminar un usuario
   */
  async deleteUser(userId) {
    if (this._isApiMode()) {
      try {
        const response = await ApiClient.delete(`/users/${userId}`);
        return response;
      } catch (error) {
        console.error('Error eliminando usuario desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Obtener un usuario por ID
   */
  async getUserById(userId) {
    if (this._isApiMode()) {
      try {
        const users = await dataApiService.getData('profiles', { id: { $eq: userId } });
        return users[0] || null;
      } catch (error) {
        console.error('Error obteniendo usuario por ID desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Bloquear usuarios
   */
  async lockUsers(userIds) {
    if (this._isApiMode()) {
      const updates = userIds.map(userId => ({
        id: userId,
        locked: true,
        locked_at: new Date().toISOString()
      }));

      const results = [];
      for (const update of updates) {
        results.push(await dataApiService.updateData('profiles', update.id, {
          locked: update.locked,
          locked_at: update.locked_at
        }, 'id'));
      }
      return results;
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Desbloquear un usuario
   */
  async unlockUser(userId) {
    if (this._isApiMode()) {
      try {
        const response = await ApiClient.post(`/users/${userId}/unlock`);
        return response;
      } catch (error) {
        console.error('Error desbloqueando usuario desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }

  /**
   * Obtener usuarios con 2FA habilitado
   */
  async getUsersWith2FA() {
    if (this._isApiMode()) {
      try {
        const response = await ApiClient.get('/users/2fa');
        return response.users || [];
      } catch (error) {
        console.error('Error obteniendo usuarios con 2FA desde API:', error);
        throw error;
      }
    } else {
      throw new Error("Modo API no disponible. Configure VITE_API_URL.");
    }
  }
}

export default new UserService();
