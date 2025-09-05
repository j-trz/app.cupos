import { supabase } from "../supabaseClient";
import AuthorizationService from "./authorizationService";

class UserService {
  /**
   * Crear un nuevo usuario (solo para administradores)
   */
  static async createUser(userData) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: {
            action: "create",
            userData: {
              email: userData.email,
              password: userData.password,
              nombre: userData.nombre,
              agencia: userData.agencia,
              role: userData.role || AuthorizationService.ROLES.AGENCY_USER,
              admin: userData.admin || false, // Mantener por compatibilidad
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Error al crear usuario");
      }

      if (!data.success) {
        throw new Error(data.error || "Error desconocido al crear usuario");
      }

      return {
        success: true,
        userId: data.userId,
        message: data.message,
      };
    } catch (error) {
      console.error("Error in createUser:", error);
      throw new Error(error.message || "Error al crear usuario");
    }
  }

  /**
   * Actualizar un usuario existente (solo para administradores)
   */
  static async updateUser(userData) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: {
            action: "update",
            userData: {
              id: userData.id,
              nombre: userData.nombre,
              agencia: userData.agencia,
              role: userData.role || AuthorizationService.ROLES.AGENCY_USER,
              admin: userData.admin, // Mantener por compatibilidad
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Error al actualizar usuario");
      }

      if (!data.success) {
        throw new Error(
          data.error || "Error desconocido al actualizar usuario"
        );
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw new Error(error.message || "Error al actualizar usuario");
    }
  }

  /**
   * Eliminar un usuario (solo para administradores)
   */
  static async deleteUser(userId) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: {
            action: "delete",
            userData: { id: userId },
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Error al eliminar usuario");
      }

      if (!data.success) {
        throw new Error(data.error || "Error desconocido al eliminar usuario");
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw new Error(error.message || "Error al eliminar usuario");
    }
  }

  /**
   * Listar todos los usuarios (solo para administradores)
   */
  static async listUsers() {
    try {
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: {
            action: "list",
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Error al obtener usuarios");
      }

      if (!data.success) {
        throw new Error(data.error || "Error desconocido al obtener usuarios");
      }

      return {
        success: true,
        users: data.users || [],
      };
    } catch (error) {
      console.error("Error in listUsers:", error);
      throw new Error(error.message || "Error al obtener usuarios");
    }
  }

  /**
   * Verificar si el usuario actual es administrador
   * @deprecated Usar AuthorizationService.isAdmin() en su lugar
   */
  static async isCurrentUserAdmin() {
    try {
      return await AuthorizationService.isAdmin();
    } catch (error) {
      console.error("Error in isCurrentUserAdmin:", error);
      return false;
    }
  }

  /**
   * Obtener el rol del usuario actual
   */
  static async getCurrentUserRole() {
    try {
      return await AuthorizationService.getCurrentUserRole();
    } catch (error) {
      console.error("Error getting user role:", error);
      return AuthorizationService.ROLES.AGENCY_USER;
    }
  }

  /**
   * Verificar si el usuario tiene permisos específicos
   */
  static async hasPermission(permission) {
    try {
      return await AuthorizationService.hasPermission(permission);
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  /**
   * Obtener el perfil del usuario actual
   */
  static async getCurrentUserProfile() {
    try {
      return await AuthorizationService.getCurrentUserProfile();
    } catch (error) {
      console.error("Error in getCurrentUserProfile:", error);
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
      errors.push("Email es requerido");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push("Email no válido");
    }

    // Validar nombre
    if (!userData.nombre || userData.nombre.length < 2) {
      errors.push("Nombre debe tener al menos 2 caracteres");
    }

    // Validar agencia
    if (!userData.agencia) {
      errors.push("Agencia es requerida");
    }

    // Validar rol
    if (
      userData.role &&
      !Object.values(AuthorizationService.ROLES).includes(userData.role)
    ) {
      errors.push("Rol no válido");
    }

    // Validar contraseña solo para creación
    if (!isEdit && (!userData.password || userData.password.length < 6)) {
      errors.push("Contraseña debe tener al menos 6 caracteres");
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
      "Destinico",
    ];
  }
}

export default UserService;
