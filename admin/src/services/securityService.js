import ApiClient from "./apiClient";

/**
 * Servicio para gestionar funcionalidades de seguridad avanzadas
 * Modo API: todas las operaciones de seguridad se delegan al backend.
 */
class SecurityService {
  /**
   * Configuración de seguridad
   */
  static SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_DURATION_MINUTES: 30,
    SESSION_TIMEOUT_MINUTES: 10,
    CLEANUP_INTERVAL_MINUTES: 5,
  };

  /**
   * Registrar intento de login
   * El backend ya registra esto automáticamente en /auth/login
   */
  static async logLoginAttempt({
    userId: _userId = null,
    email,
    ipAddress: _ipAddress = null,
    userAgent: _userAgent = null,
    success,
    failureReason = null,
  }) {
    // El backend ya registra intentos en authController.login()
    console.log(
      `📝 Login attempt: ${email} - ${success ? "SUCCESS" : "FAILED"}${failureReason ? ` (${failureReason})` : ""}`
    );
    return { success: true };
  }

  /**
   * Verificar estado de bloqueo del usuario
   * El backend maneja esto en authController.login()
   */
  static async checkLockStatus(userId, _email) {
    // El backend devuelve el estado de bloqueo en la respuesta del login
    try {
      const data = await ApiClient.get(`/users/${userId}/lock-status`);
      return {
        success: true,
        isLocked: data.isLocked || false,
        attemptsRemaining: data.attemptsRemaining || 3,
        lockedUntil: data.lockedUntil || null,
      };
    } catch (error) {
      console.error("Error checking lock status:", error);
      return {
        success: false,
        error: error.message,
        isLocked: false,
        attemptsRemaining: 3,
      };
    }
  }

  /**
   * Proceso completo de validación de login
   */
  static async validateLogin(email, password, _metadata = {}) {
    try {
      const data = await ApiClient.post('/auth/login', { email, password });
      if (data.token) {
        return {
          success: true,
          user: {
            id: data.user?.id,
            email: data.user?.email,
            nombre: data.user?.nombre,
            agencia: data.user?.agencia,
            role: data.user?.role,
            admin: data.user?.admin,
          },
          session: { access_token: data.token },
          _apiToken: data.token,
        };
      }
      return {
        success: false,
        error: 'invalid_credentials',
        message: data.error || 'Credenciales inválidas',
      };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: 'system_error',
        message: error.message || 'Error del sistema. Intente nuevamente.',
      };
    }
  }

  /**
   * Actualizar estadísticas de login exitoso
   * El backend actualiza esto automáticamente
   */
  static async updateLoginStats(userId) {
    console.log(`📊 Login stats updated for user: ${userId}`);
  }

  /**
   * Crear sesión de usuario para tracking
   * El backend ya crea la sesión en authController.login()
   */
  static async createUserSession(_userId, _ipAddress, _userAgent) {
    const sessionToken = this.generateSessionToken();
    // Guardar token en localStorage para tracking
    localStorage.setItem("security_session_token", sessionToken);
    return sessionToken;
  }

  /**
   * Actualizar actividad del usuario (tracking local)
   */
  static async updateUserActivity() {
    try {
      const sessionToken = localStorage.getItem("security_session_token");
      if (sessionToken) {
        localStorage.setItem("security_last_activity", Date.now().toString());
      }
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  }

  /**
   * Verificar si la sesión está expirada
   */
  static async checkSessionExpiry() {
    try {
      const token = ApiClient.getToken();
      if (!token) return true;

      const sessionToken = localStorage.getItem("security_session_token");
      if (!sessionToken) return true;

      const lastActivity = localStorage.getItem("security_last_activity");
      if (!lastActivity) return true;

      const now = Date.now();
      const elapsed = now - parseInt(lastActivity);
      const isExpiredByInactivity =
        elapsed > this.SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

      return isExpiredByInactivity;
    } catch (error) {
      console.error("Error checking session expiry:", error);
      return true;
    }
  }

  /**
   * Logout con limpieza de sesión
   */
  static async logout() {
    try {
      ApiClient.clearSession();
      localStorage.removeItem("security_session_token");
      localStorage.removeItem("security_last_activity");
      return { success: true };
    } catch (error) {
      console.error("Error during logout:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Desbloquear usuario (solo administradores)
   */
  static async unlockUser(targetUserId) {
    try {
      await ApiClient.post(`/users/${targetUserId}/unlock`);
      console.log(`🔓 Usuario desbloqueado: ${targetUserId}`);
      return { success: true };
    } catch (error) {
      console.error("Error unlocking user:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener usuarios bloqueados (para administradores)
   */
  static async getLockedUsers() {
    try {
      const data = await ApiClient.get('/users/locked');
      return {
        success: true,
        lockedUsers: data.users || [],
      };
    } catch (error) {
      console.error("Error fetching locked users:", error);
      return {
        success: false,
        error: error.message,
        lockedUsers: [],
      };
    }
  }

  /**
   * Obtener estadísticas de seguridad
   */
  static async getSecurityStats() {
    try {
      // Usar el endpoint de datos para consultar estadísticas
      const data = await ApiClient.get('/data?table=user_security_status&limit=1000');
      const users = Array.isArray(data) ? data : [];

      const stats = {
        totalUsers: users.length,
        lockedUsers: users.filter(u => u.is_locked).length,
        activeSessions: 0,
        failedAttemptsToday: 0,
        usersWith2FA: users.filter(u => u.two_factor_enabled).length,
        users2FA: users.filter(u => u.two_factor_enabled).length,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error fetching security stats:", error);
      return {
        success: false,
        error: error.message,
        stats: {},
      };
    }
  }

  /**
   * Limpiar sesiones expiradas (no-op en modo API)
   */
  static async cleanupExpiredSessions() {
    console.log("🧹 Cleanup de sesiones: delegado al backend");
    return { success: true, cleanedSessions: 0 };
  }

  /**
   * Generar token de sesión único
   */
  static generateSessionToken() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Inicializar monitoreo de actividad
   */
  static initActivityMonitoring() {
    // Actualizar actividad cada 30 segundos
    const activityInterval = setInterval(() => {
      this.updateUserActivity();
    }, 30000);

    // Verificar expiración de sesión cada minuto
    const sessionCheckInterval = setInterval(async () => {
      const isExpired = await this.checkSessionExpiry();
      if (isExpired) {
        console.log(
          "🔒 Sesión expirada por inactividad - cerrando sesión automáticamente"
        );
        await this.logout();
        window.location.href = "/login";
      }
    }, 60000);

    // Detectar actividad del usuario
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.updateUserActivity();
        },
        { passive: true }
      );
    });

    // Cleanup al cerrar página
    window.addEventListener("beforeunload", () => {
      clearInterval(activityInterval);
      clearInterval(sessionCheckInterval);
    });

    console.log("🔐 Sistema de monitoreo de actividad iniciado");
  }

  /**
   * Obtener información de la IP del cliente
   */
  static async getClientIP() {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn("No se pudo obtener IP del cliente:", error);
      return null;
    }
  }

  /**
   * Obtener user agent del navegador
   */
  static getUserAgent() {
    return navigator.userAgent;
  }
}

export default SecurityService;
