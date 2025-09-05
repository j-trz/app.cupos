import { supabase } from '../supabaseClient';

class UserService {
  /**
   * Crear un nuevo usuario (solo para administradores)
   */
  static async createUser(userData) {
    try {
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'create',
          userData: {
            email: userData.email,
            password: userData.password,
            nombre: userData.nombre,
            agencia: userData.agencia,
            admin: userData.admin || false
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Error al crear usuario');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al crear usuario');
      }

      return {
        success: true,
        userId: data.userId,
        message: data.message
      };
    } catch (error) {
      console.error('Error in createUser:', error);
      throw new Error(error.message || 'Error al crear usuario');
    }
  }

  /**
   * Actualizar un usuario existente (solo para administradores)
   */
  static async updateUser(userData) {
    try {
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'update',
          userData: {
            id: userData.id,
            nombre: userData.nombre,
            agencia: userData.agencia,
            admin: userData.admin
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Error al actualizar usuario');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al actualizar usuario');
      }

      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw new Error(error.message || 'Error al actualizar usuario');
    }
  }

  /**
   * Eliminar un usuario (solo para administradores)
   */
  static async deleteUser(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'delete',
          userData: { id: userId }
        }
      });

      if (error) {
        throw new Error(error.message || 'Error al eliminar usuario');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al eliminar usuario');
      }

      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw new Error(error.message || 'Error al eliminar usuario');
    }
  }

  /**
   * Listar todos los usuarios (solo para administradores)
   */
  static async listUsers() {
    try {
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'list'
        }
      });

      if (error) {
        throw new Error(error.message || 'Error al obtener usuarios');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al obtener usuarios');
      }

      return {
        success: true,
        users: data.users || []
      };
    } catch (error) {
      console.error('Error in listUsers:', error);
      throw new Error(error.message || 'Error al obtener usuarios');
    }
  }

  /**
   * Verificar si el usuario actual es administrador
   */
  static async isCurrentUserAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return profile?.admin || false;
    } catch (error) {
      console.error('Error in isCurrentUserAdmin:', error);
      return false;
    }
  }

  /**
   * Obtener el perfil del usuario actual
   */
  static async getCurrentUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error in getCurrentUserProfile:', error);
      return null;
    }
  }

  /**
   * Validar datos de usuario antes de enviar
   */
  static validateUserData(userData, isEdit = false) {
    const errors = [];

    // Validar email
    if (!userData.email) {
      errors.push('Email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Email no válido');
    }

    // Validar nombre
    if (!userData.nombre || userData.nombre.length < 2) {
      errors.push('Nombre debe tener al menos 2 caracteres');
    }

    // Validar agencia
    if (!userData.agencia) {
      errors.push('Agencia es requerida');
    }

    // Validar contraseña solo para creación
    if (!isEdit && (!userData.password || userData.password.length < 6)) {
      errors.push('Contraseña debe tener al menos 6 caracteres');
    }

    return errors;
  }

  /**
   * Obtener lista de agencias válidas
   */
  static getValidAgencies() {
    return [
      "Jetmar Viajes",
      "Guamatur", 
      "Hiperviajes",
      "Freeway",
      "T&T",
      "Tienda Viajes",
      "TravelOz",
      "Destinico"
    ];
  }
}

export default UserService;