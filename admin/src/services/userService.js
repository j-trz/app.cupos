import { supabase } from "../supabaseClient";
import AuthorizationService from "./authorizationService";
import dataApiService from './dataApiService';
import ApiClient from './apiClient';

/**
 * Servicio de usuarios con soporte para múltiples backends
 * Puede operar tanto con Supabase como con el backend flexible
 */
export class UserService {
  constructor() {
    // Detectar si usar el backend flexible o Supabase directamente
    this.useFlexibleBackend = import.meta.env.VITE_USE_FLEXIBLE_BACKEND === 'true';
  }

  /**
   * Verificar si estamos en modo API (backend flexible)
   */
  _isApiMode() {
    return ApiClient.isApiEnabled() || this.useFlexibleBackend;
  }

  /**
   * Obtener todos los usuarios (con soporte para ambos backends)
   */
  async getAllUsers() {
    if (this._isApiMode()) {
      // Usar el backend flexible - endpoint /api/users
      try {
        const response = await ApiClient.get('/users');
        // El backend devuelve { success: true, users: [...] }
        return response.users || [];
      } catch (error) {
        console.error('Error obteniendo usuarios desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { operation: "list_users" },
      });

      if (error) throw error;
      
      // Combinar con datos de seguridad si es admin
      const isAdmin = await AuthorizationService.isAdmin();
      if (isAdmin) {
        const { data: securityStatuses } = await supabase
          .from("user_security_status")
          .select("user_id, two_factor_enabled, backup_codes_generated");

        const securityMap = {};
        securityStatuses?.forEach(status => {
          securityMap[status.user_id] = status;
        });

        return data.users.map(user => ({
          ...user,
          security_status: securityMap[user.id] || {}
        }));
      }

      return data.users;
    }
  }

  /**
   * Crear un nuevo usuario
   */
  async createUser(userData) {
    if (this._isApiMode()) {
      // Usar el backend flexible - endpoint POST /api/users
      try {
        const response = await ApiClient.post('/users', userData);
        // El backend devuelve { success: true, userId: ... }
        return response;
      } catch (error) {
        console.error('Error creando usuario desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { 
          operation: "create_user",
          userData
        },
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * Actualizar un usuario existente
   */
  async updateUser(userId, updates) {
    if (this._isApiMode()) {
      // Usar el backend flexible - endpoint PUT /api/users/:id
      try {
        const response = await ApiClient.put(`/users/${userId}`, updates);
        // El backend devuelve { success: true, message: ... }
        return response;
      } catch (error) {
        console.error('Error actualizando usuario desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { 
          operation: "update_user",
          userId,
          updates
        },
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * Eliminar un usuario
   */
  async deleteUser(userId) {
    if (this._isApiMode()) {
      // Usar el backend flexible - endpoint DELETE /api/users/:id
      try {
        const response = await ApiClient.delete(`/users/${userId}`);
        // El backend devuelve { success: true, message: ... }
        return response;
      } catch (error) {
        console.error('Error eliminando usuario desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { 
          operation: "delete_user",
          userId
        },
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * Obtener un usuario por ID
   */
  async getUserById(userId) {
    if (this._isApiMode()) {
      // Usar el backend flexible - consultar directamente la tabla profiles
      try {
        const users = await dataApiService.getData('profiles', { id: { $eq: userId } });
        return users[0] || null;
      } catch (error) {
        console.error('Error obteniendo usuario por ID desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { 
          operation: "get_user",
          userId
        },
      });

      if (error) throw error;
      return data.user;
    }
  }

  /**
   * Bloquear usuarios
   */
  async lockUsers(userIds) {
    if (this._isApiMode()) {
      // En el backend flexible, actualizar el estado de bloqueo
      const updates = userIds.map(userId => ({
        id: userId,
        locked: true,
        locked_at: new Date().toISOString()
      }));

      // Actualizar múltiples usuarios
      const results = [];
      for (const update of updates) {
        results.push(await dataApiService.updateData('profiles', update.id, {
          locked: update.locked,
          locked_at: update.locked_at
        }, 'id'));
      }
      return results;
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { 
          operation: "lock_users",
          userIds
        },
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * Desbloquear un usuario
   */
  async unlockUser(userId) {
    if (this._isApiMode()) {
      // Usar el backend flexible - endpoint POST /api/users/:id/unlock
      try {
        const response = await ApiClient.post(`/users/${userId}/unlock`);
        // El backend devuelve { success: true, message: ... }
        return response;
      } catch (error) {
        console.error('Error desbloqueando usuario desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { 
          operation: "unlock_user",
          userId
        },
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * Obtener usuarios con 2FA habilitado
   */
  async getUsersWith2FA() {
    if (this._isApiMode()) {
      // Usar el backend flexible - endpoint GET /api/users/2fa
      try {
        const response = await ApiClient.get('/users/2fa');
        // El backend devuelve { success: true, users: [...] }
        return response.users || [];
      } catch (error) {
        console.error('Error obteniendo usuarios con 2FA desde API:', error);
        throw error;
      }
    } else {
      // Usar Supabase directamente (funcionalidad existente)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase.functions.invoke("user-management", {
        body: { operation: "get_users_with_2fa" },
      });

      if (error) throw error;
      return data.users;
    }
  }
}

export default new UserService();
