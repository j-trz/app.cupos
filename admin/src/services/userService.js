import { supabase } from "../supabaseClient";
import AuthorizationService from "./authorizationService";
import dataApiService from './dataApiService';

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
   * Obtener todos los usuarios (con soporte para ambos backends)
   */
  async getAllUsers() {
    if (this.useFlexibleBackend) {
      // Usar el backend flexible
      return await dataApiService.getData('profiles', {}, { order: 'created_at:desc' });
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
    if (this.useFlexibleBackend) {
      // Usar el backend flexible
      return await dataApiService.insertData('profiles', userData);
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
    if (this.useFlexibleBackend) {
      // Usar el backend flexible
      return await dataApiService.updateData('profiles', userId, updates, 'id');
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
    if (this.useFlexibleBackend) {
      // Usar el backend flexible
      return await dataApiService.deleteData('profiles', userId, 'id');
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
    if (this.useFlexibleBackend) {
      // Usar el backend flexible
      const users = await dataApiService.getData('profiles', { id: { $eq: userId } });
      return users[0] || null;
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
    if (this.useFlexibleBackend) {
      // En el backend flexible, podríamos tener una tabla专门 para estados de usuario
      const updates = userIds.map(userId => ({
        id: userId,
        locked: true,
        locked_at: new Date().toISOString()
      }));

      // Actualizar múltiples usuarios (esto requeriría extensión del servicio de datos)
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
    if (this.useFlexibleBackend) {
      // Usar el backend flexible
      return await dataApiService.updateData('profiles', userId, {
        locked: false,
        locked_at: null
      }, 'id');
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
    if (this.useFlexibleBackend) {
      // Consultar usuarios con 2FA habilitado desde la tabla de estado de seguridad
      const securityStatuses = await dataApiService.getData('user_security_status', {
        two_factor_enabled: { $eq: true }
      });

      const userIds = securityStatuses.map(status => status.user_id);
      if (userIds.length === 0) return [];

      // Obtener perfiles de usuarios
      const userProfiles = await dataApiService.getData('profiles', {
        id: { $in: userIds }
      });

      return userProfiles.map(profile => ({
        ...profile,
        security_status: securityStatuses.find(status => status.user_id === profile.id) || {}
      }));
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
