import { supabase } from "../supabaseClient";
import AuthorizationService from "./authorizationService";
import ApiClient from "./apiClient";

/**
 * Servicio para gestionar funcionalidades de seguridad avanzadas
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
   * @param {Object} attemptData - Datos del intento
   * @returns {Promise<Object>} Resultado del registro
   */
  static async logLoginAttempt({
    userId = null,
    email,
    ipAddress = null,
    userAgent = null,
    success,
    failureReason = null,
  }) {
    try {
      const { error } = await supabase.rpc("log_login_attempt", {
        p_user_id: userId,
        p_email: email,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_success: success,
        p_failure_reason: failureReason,
      });

      if (error) throw error;

      console.log(
        `📝 Login attempt logged: ${email} - ${success ? "SUCCESS" : "FAILED"}`
      );
      return { success: true };
    } catch (error) {
      console.error("Error logging login attempt:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar estado de bloqueo del usuario
   * @param {string} userId - ID del usuario
   * @param {string} email - Email del usuario
   * @returns {Promise<Object>} Estado de bloqueo
   */
  static async checkLockStatus(userId, email) {
    try {
      const { data, error } = await supabase.rpc(
        "check_and_update_lock_status",
        {
          p_user_id: userId,
          p_email: email,
        }
      );

      if (error) throw error;

      const lockInfo = data?.[0] || {};

      return {
        success: true,
        isLocked: lockInfo.is_locked || false,
        attemptsRemaining: lockInfo.attempts_remaining || 0,
        lockedUntil: lockInfo.locked_until || null,
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
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @param {Object} metadata - Metadatos de la conexión
   * @returns {Promise<Object>} Resultado del login
   */
  static async validateLogin(email, password, metadata = {}) {
    const { ipAddress, userAgent } = metadata;

    // Modo API backend local: delegar todo al backend
    if (ApiClient.isApiEnabled()) {
      try {
        const data = await ApiClient.post('/auth/login', { email, password });
        if (data.token) {
          return {
            success: true,
            user: {
              id: data.user?.id,
              email: data.user?.email,
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
        console.error('[API MODE] Error en login:', error);
        return {
          success: false,
          error: 'system_error',
          message: error.message || 'Error del sistema. Intente nuevamente.',
        };
      }
    }

    try {
      // 1. Verificar estado de bloqueo antes del intento
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .single();

      const userId = users?.id;

      if (userId) {
        const lockStatus = await this.checkLockStatus(userId, email);

        if (lockStatus.isLocked) {
          await this.logLoginAttempt({
            userId,
            email,
            ipAddress,
            userAgent,
            success: false,
            failureReason: "account_locked",
          });

          return {
            success: false,
            error: "account_locked",
            message: `Cuenta bloqueada. Intente nuevamente después de ${this.SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES} minutos.`,
            lockedUntil: lockStatus.lockedUntil,
          };
        }
      }

      // 2. Intentar login con Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        // Login fallido
        await this.logLoginAttempt({
          userId,
          email,
          ipAddress,
          userAgent,
          success: false,
          failureReason: authError.message,
        });

        // Verificar nuevamente el estado de bloqueo después del fallo
        if (userId) {
          const newLockStatus = await this.checkLockStatus(userId, email);

          return {
            success: false,
            error: "invalid_credentials",
            message: "Credenciales inválidas",
            attemptsRemaining: newLockStatus.attemptsRemaining,
            willBeLocked: newLockStatus.attemptsRemaining <= 0,
          };
        }

        return {
          success: false,
          error: "invalid_credentials",
          message: "Credenciales inválidas",
        };
      }

      // 3. Login exitoso
      const finalUserId = authData.user.id;

      await this.logLoginAttempt({
        userId: finalUserId,
        email,
        ipAddress,
        userAgent,
        success: true,
      });

      // Actualizar estadísticas de login
      await this.updateLoginStats(finalUserId);

      // Crear sesión para tracking de actividad
      await this.createUserSession(finalUserId, ipAddress, userAgent);

      return {
        success: true,
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      console.error("Error in validateLogin:", error);
      return {
        success: false,
        error: "system_error",
        message: "Error del sistema. Intente nuevamente.",
      };
    }
  }

  /**
   * Actualizar estadísticas de login exitoso
   * @param {string} userId - ID del usuario
   */
  static async updateLoginStats(userId) {
    try {
      // Primero obtener el valor actual
      const { data: currentData } = await supabase
        .from("user_security_status")
        .select("total_logins")
        .eq("user_id", userId)
        .single();

      const currentLogins = currentData?.total_logins || 0;

      const { error } = await supabase.from("user_security_status").upsert({
        user_id: userId,
        last_login: new Date().toISOString(),
        total_logins: currentLogins + 1,
        failed_attempts_count: 0, // Reset contador en login exitoso
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error updating login stats:", error);
    }
  }

  /**
   * Crear sesión de usuario para tracking
   * @param {string} userId - ID del usuario
   * @param {string} ipAddress - IP del usuario
   * @param {string} userAgent - User agent
   */
  static async createUserSession(userId, ipAddress, userAgent) {
    try {
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES
      );

      const { error } = await supabase.from("user_sessions").insert({
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

      if (error) throw error;

      // Guardar token en localStorage para tracking
      localStorage.setItem("security_session_token", sessionToken);

      return sessionToken;
    } catch (error) {
      console.error("Error creating user session:", error);
      return null;
    }
  }

  /**
   * Actualizar actividad del usuario
   */
  static async updateUserActivity() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const sessionToken = localStorage.getItem("security_session_token");

      await supabase.rpc("update_user_activity", {
        p_user_id: user.id,
        p_session_token: sessionToken,
      });
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  }

  /**
   * Verificar si la sesión está expirada
   * @returns {Promise<boolean>} True si está expirada
   */
  static async checkSessionExpiry() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return true;

      const sessionToken = localStorage.getItem("security_session_token");
      if (!sessionToken) return true;

      const { data, error } = await supabase
        .from("user_sessions")
        .select("expires_at, last_activity")
        .eq("session_token", sessionToken)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error || !data) return true;

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      const lastActivity = new Date(data.last_activity);

      // Verificar si la sesión expiró por tiempo total o por inactividad
      const isExpiredByTime = now > expiresAt;
      const isExpiredByInactivity =
        now - lastActivity >
        this.SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

      return isExpiredByTime || isExpiredByInactivity;
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
      const sessionToken = localStorage.getItem("security_session_token");

      if (sessionToken) {
        // Marcar sesión como inactiva
        await supabase
          .from("user_sessions")
          .update({ is_active: false })
          .eq("session_token", sessionToken);
      }

      // Logout de Supabase
      await supabase.auth.signOut();

      // Limpiar localStorage
      localStorage.removeItem("security_session_token");

      return { success: true };
    } catch (error) {
      console.error("Error during logout:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Desbloquear usuario (solo administradores)
   * @param {string} targetUserId - ID del usuario a desbloquear
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async unlockUser(targetUserId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      const { data: _data, error } = await supabase.rpc("unlock_user", {
        p_user_id: targetUserId,
        p_admin_id: user.id,
      });

      if (error) throw error;

      console.log(`🔓 Usuario desbloqueado: ${targetUserId}`);
      return { success: true };
    } catch (error) {
      console.error("Error unlocking user:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener usuarios bloqueados (para administradores)
   * @returns {Promise<Array>} Lista de usuarios bloqueados
   */
  static async getLockedUsers() {
    try {
      const userProfile = await AuthorizationService.getCurrentUserProfile();
      if (!userProfile || userProfile.role !== "admin") {
        throw new Error("Acceso denegado");
      }

      // Usar Edge Function con Service Role (bypassa RLS) y datos normalizados
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: { action: "listLockedUsers" },
        }
      );

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || "Error al obtener usuarios bloqueados",
          lockedUsers: [],
        };
      }

      return {
        success: true,
        lockedUsers: data.lockedUsers || [],
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
   * @returns {Promise<Object>} Estadísticas de seguridad
   */
  static async getSecurityStats() {
    try {
      const userProfile = await AuthorizationService.getCurrentUserProfile();
      if (!userProfile || userProfile.role !== "admin") {
        throw new Error("Acceso denegado");
      }

      const { data, error } = await supabase.rpc("get_security_stats");

      if (error) throw error;

      const stats = data?.[0] || {};

      return {
        success: true,
        stats: {
          totalUsers: stats.total_users || 0,
          lockedUsers: stats.locked_users || 0,
          activeSessions: stats.active_sessions || 0,
          failedAttemptsToday: stats.failed_attempts_today || 0,
          usersWith2FA: stats.users_with_2fa || 0,
          users2FA: stats.users_with_2fa || 0, // compatibilidad con UI
        },
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
   * Limpiar sesiones expiradas
   */
  static async cleanupExpiredSessions() {
    try {
      const { data, error } = await supabase.rpc("cleanup_expired_sessions");

      if (error) throw error;

      console.log(`🧹 Limpiadas ${data || 0} sesiones expiradas`);
      return { success: true, cleanedSessions: data || 0 };
    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generar token de sesión único
   * @returns {string} Token de sesión
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

    // Limpiar sesiones expiradas cada 5 minutos
    const cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.SECURITY_CONFIG.CLEANUP_INTERVAL_MINUTES * 60000);

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
      clearInterval(cleanupInterval);
    });

    console.log("🔐 Sistema de monitoreo de actividad iniciado");
  }

  /**
   * Obtener información de la IP del cliente
   * @returns {Promise<string>} IP del cliente
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
   * @returns {string} User agent
   */
  static getUserAgent() {
    return navigator.userAgent;
  }
}

export default SecurityService;
