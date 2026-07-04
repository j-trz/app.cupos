import ApiClient from "./apiClient";

class AuthorizationService {
  /**
   * Roles disponibles en el sistema
   */
  static ROLES = {
    ADMIN: "admin",
    AGENCY_ADMIN: "agency_admin",
    AGENCY_USER: "agency_user",
  };

  /**
   * Cache para perfiles de usuario y roles
   */
  static _profileCache = new Map();
  static _cacheExpiry = new Map();
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en ms

  /**
   * Permisos por rol
   */
  static PERMISSIONS = {
    [this.ROLES.ADMIN]: [
      "view_all_data",
      "manage_users",
      "manage_connections",
      "view_all_agencies",
      "system_administration",
    ],
    [this.ROLES.AGENCY_ADMIN]: [
      "view_agency_data",
      "manage_agency_users",
      "view_agency_requests",
      "view_agency_confirmations",
    ],
    [this.ROLES.AGENCY_USER]: [
      "view_own_data",
      "view_availability",
      "create_requests",
    ],
  };

  /**
   * Verificar si el cache es válido para un usuario
   */
  static _isCacheValid(userId) {
    const expiry = this._cacheExpiry.get(userId);
    return expiry && Date.now() < expiry;
  }

  /**
   * Limpiar cache del usuario
   */
  static _clearUserCache(userId) {
    this._profileCache.delete(userId);
    this._cacheExpiry.delete(userId);
  }

  /**
   * Limpiar todo el cache
   */
  static clearCache() {
    this._profileCache.clear();
    this._cacheExpiry.clear();
  }

  /**
   * Obtener el perfil completo del usuario actual (con cache)
   */
  static async getCurrentUserProfile() {
    try {
      // Verificar cache primero
      const sessionUser = ApiClient.getSessionUser();
      if (sessionUser && this._isCacheValid(sessionUser.id)) {
        const cached = this._profileCache.get(sessionUser.id);
        if (cached) {
          return cached;
        }
      }

      // Obtener perfil fresco desde la API
      const response = await ApiClient.get('/auth/profile');
      if (!response || !response.profile) {
        console.error("Error getting user profile from API:", response);
        return null;
      }

      const profile = response.profile;

      // Guardar en cache
      if (profile.id) {
        this._profileCache.set(profile.id, profile);
        this._cacheExpiry.set(profile.id, Date.now() + this.CACHE_DURATION);
      }

      return profile;
    } catch (error) {
      console.error("Error in getCurrentUserProfile:", error);
      return null;
    }
  }

  /**
   * Obtener el rol del usuario actual
   */
  static async getCurrentUserRole() {
    try {
      const profile = await this.getCurrentUserProfile();
      return profile?.role || this.ROLES.AGENCY_USER;
    } catch (error) {
      console.error("Error getting user role:", error);
      return this.ROLES.AGENCY_USER;
    }
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  static async hasPermission(permission) {
    try {
      const role = await this.getCurrentUserRole();
      const rolePermissions = this.PERMISSIONS[role] || [];
      return rolePermissions.includes(permission);
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  /**
   * Verificar si el usuario tiene uno de los roles especificados
   */
  static async hasRole(roles) {
    try {
      const userRole = await this.getCurrentUserRole();
      const rolesArray = Array.isArray(roles) ? roles : [roles];
      return rolesArray.includes(userRole);
    } catch (error) {
      console.error("Error checking role:", error);
      return false;
    }
  }

  /**
   * Verificar si el usuario es administrador
   */
  static async isAdmin() {
    return this.hasRole(this.ROLES.ADMIN);
  }

  /**
   * Verificar si el usuario es admin de agencia
   */
  static async isAgencyAdmin() {
    return this.hasRole(this.ROLES.AGENCY_ADMIN);
  }

  /**
   * Verificar si el usuario puede gestionar usuarios
   */
  static async canManageUsers() {
    return this.hasPermission("manage_users");
  }

  /**
   * Verificar si el usuario puede gestionar conexiones
   */
  static async canManageConnections() {
    return this.hasPermission("manage_connections");
  }

  /**
   * Verificar si el usuario puede ver datos de todas las agencias
   */
  static async canViewAllAgencies() {
    return this.hasPermission("view_all_agencies");
  }

  /**
   * Verificar si el usuario puede ver datos de su agencia
   */
  static async canViewAgencyData() {
    const role = await this.getCurrentUserRole();
    return role === this.ROLES.ADMIN || role === this.ROLES.AGENCY_ADMIN;
  }

  /**
   * Obtener filtros de datos según el rol del usuario
   */
  static async getDataFilters() {
    try {
      const profile = await this.getCurrentUserProfile();
      if (!profile) return { canView: false };

      const role = profile.role || this.ROLES.AGENCY_USER;

      switch (role) {
        case this.ROLES.ADMIN:
          return {
            canView: true,
            filterType: "all",
            agencia: null,
            userId: null,
          };

        case this.ROLES.AGENCY_ADMIN:
          return {
            canView: true,
            filterType: "agency",
            agencia: profile.agencia,
            userId: null,
          };

        case this.ROLES.AGENCY_USER:
          return {
            canView: true,
            filterType: "user",
            agencia: profile.agencia,
            userId: profile.id,
          };

        default:
          return { canView: false };
      }
    } catch (error) {
      console.error("Error getting data filters:", error);
      return { canView: false };
    }
  }

  /**
   * Validar acceso a una ruta específica
   */
  static async validateRouteAccess(route) {
    try {
      const role = await this.getCurrentUserRole();

      // Rutas solo para admin
      const adminOnlyRoutes = [
        "/admin/gestion-usuarios",
        "/admin/gestion-conexiones",
      ];

      if (adminOnlyRoutes.includes(route)) {
        return role === this.ROLES.ADMIN;
      }

      // Rutas para admin y agency_admin
      const adminAndAgencyAdminRoutes = ["/admin/confirmaciones"];

      if (adminAndAgencyAdminRoutes.includes(route)) {
        return role === this.ROLES.ADMIN || role === this.ROLES.AGENCY_ADMIN;
      }

      // Rutas públicas para usuarios autenticados
      const publicRoutes = ["/admin/disponibilidad", "/admin/solicitudes"];

      if (publicRoutes.includes(route)) {
        return true; // Cualquier usuario autenticado
      }

      return false;
    } catch (error) {
      console.error("Error validating route access:", error);
      return false;
    }
  }

  /**
   * Obtener opciones de menú según el rol
   */
  static async getMenuOptions() {
    try {
      const role = await this.getCurrentUserRole();

      const baseOptions = [
        {
          name: "Disponibilidad",
          path: "/admin/disponibilidad",
          icon: "FaPlane",
        },
        {
          name: "Solicitudes",
          path: "/admin/solicitudes",
          icon: "FaTicketAlt",
        },
      ];

      switch (role) {
        case this.ROLES.ADMIN:
          return [
            ...baseOptions,
            {
              name: "Confirmaciones",
              path: "/admin/confirmaciones",
              icon: "FaCheckCircle",
            },
            {
              name: "Usuarios",
              path: "/admin/gestion-usuarios",
              icon: "FaUsers",
            },
            {
              name: "Conexiones API",
              path: "/admin/gestion-conexiones",
              icon: "FaDatabase",
            },
          ];

        case this.ROLES.AGENCY_ADMIN:
          return [
            ...baseOptions,
            {
              name: "Confirmaciones",
              path: "/admin/confirmaciones",
              icon: "FaCheckCircle",
            },
          ];

        case this.ROLES.AGENCY_USER:
        default:
          return baseOptions;
      }
    } catch (error) {
      console.error("Error getting menu options:", error);
      return [];
    }
  }

  /**
   * Obtener descripción legible del rol
   */
  static getRoleDescription(role) {
    const descriptions = {
      [this.ROLES.ADMIN]: "Administrador del Sistema",
      [this.ROLES.AGENCY_ADMIN]: "Administrador de Agencia",
      [this.ROLES.AGENCY_USER]: "Usuario de Agencia",
    };

    return descriptions[role] || "Usuario";
  }

  /**
   * Obtener lista de todos los roles disponibles
   */
  static getAvailableRoles() {
    return [
      {
        value: this.ROLES.ADMIN,
        label: this.getRoleDescription(this.ROLES.ADMIN),
      },
      {
        value: this.ROLES.AGENCY_ADMIN,
        label: this.getRoleDescription(this.ROLES.AGENCY_ADMIN),
      },
      {
        value: this.ROLES.AGENCY_USER,
        label: this.getRoleDescription(this.ROLES.AGENCY_USER),
      },
    ];
  }
}

export default AuthorizationService;
