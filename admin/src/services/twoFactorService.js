import ApiClient from "./apiClient";
import dataApiService from "./dataApiService";

/**
 * Servicio para gestionar autenticación de doble factor (2FA)
 * Las operaciones MFA se delegan al backend.
 */
class TwoFactorService {
  /**
   * Configuración 2FA
   */
  static CONFIG = {
    APP_NAME: import.meta.env.VITE_APP_NAME || "Sistema de Gestión de Cupos",
    ISSUER: import.meta.env.VITE_APP_ISSUER || "Jetmar cupos",
    BACKUP_CODES_COUNT: 8,
  };

  /**
   * Verificar si el usuario tiene 2FA habilitado
   */
  static async check2FAStatus() {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener estado de seguridad desde la base de datos vía API
      const filters = JSON.stringify({ user_id: user.id });
      const result = await ApiClient.get(
        `/data?table=user_security_status&filters=${encodeURIComponent(filters)}`
      );

      const securityStatus = Array.isArray(result) ? result[0] : null;

      return {
        success: true,
        enabled: securityStatus?.two_factor_enabled || false,
        factorId: securityStatus?.two_factor_secret || null,
        hasBackupCodes: securityStatus?.backup_codes?.length > 0,
        backupCodesCount: securityStatus?.backup_codes?.length || 0,
      };
    } catch (error) {
      console.error("Error checking 2FA status:", error);
      return {
        success: false,
        enabled: false,
        error: error.message,
      };
    }
  }

  /**
   * Iniciar proceso de configuración de 2FA
   * Delega al backend para generar el secreto TOTP
   */
  static async setup2FA() {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Llamar al backend para iniciar configuración 2FA
      const data = await ApiClient.post('/auth/2fa/setup', {});
      return {
        success: true,
        factorId: data.factorId,
        qrCodeURI: data.qrCodeURI,
        secret: data.secret,
      };
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verificar código 2FA durante la configuración
   */
  static async verify2FASetup(factorId, code) {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      const data = await ApiClient.post('/auth/2fa/verify-setup', {
        factorId,
        code: code.replace(/\s/g, ""),
      });

      // Generar códigos de backup
      const backupCodes = this.generateBackupCodes();

      // Actualizar estado en base de datos
      await this.updateSecurityStatus(user.id, {
        two_factor_enabled: true,
        two_factor_secret: factorId,
        backup_codes: backupCodes,
      });

      return {
        success: true,
        session: data.session,
        backupCodes: backupCodes,
      };
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      return {
        success: false,
        error: this.formatError(error.message),
      };
    }
  }

  /**
   * Verificar código 2FA durante el login
   */
  static async verify2FALogin(factorId, code) {
    try {
      const data = await ApiClient.post('/auth/2fa/verify', {
        factorId,
        code: code.replace(/\s/g, ""),
      });

      return {
        success: true,
        session: data.session,
        user: data.user,
      };
    } catch (error) {
      console.error("Error verifying 2FA login:", error);
      return {
        success: false,
        error: this.formatError(error.message),
      };
    }
  }

  /**
   * Verificar código de backup
   */
  static async verifyBackupCode(userId, backupCode) {
    try {
      if (!userId) throw new Error("ID de usuario requerido");

      // Obtener códigos de backup del usuario vía API
      const filters = JSON.stringify({ user_id: userId });
      const result = await ApiClient.get(
        `/data?table=user_security_status&filters=${encodeURIComponent(filters)}`
      );
      const securityStatus = Array.isArray(result) ? result[0] : null;

      if (!securityStatus) throw new Error("Estado de seguridad no encontrado");

      const backupCodes = securityStatus.backup_codes || [];
      const normalizedCode = backupCode.replace(/\s|-/g, "").toLowerCase();

      // Verificar si el código existe
      const validCode = backupCodes.find(
        (code) => code.replace(/\s|-/g, "").toLowerCase() === normalizedCode
      );

      if (!validCode) {
        throw new Error("Código de backup inválido");
      }

      // Remover código usado de la lista
      const remainingCodes = backupCodes.filter((code) => code !== validCode);

      // Actualizar códigos en base de datos
      await this.updateSecurityStatus(userId, {
        backup_codes: remainingCodes,
        last_backup_code_used_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Código de backup válido",
        remainingCodes: remainingCodes.length,
      };
    } catch (error) {
      console.error("Error verifying backup code:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Deshabilitar 2FA
   */
  static async disable2FA(factorId) {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Deshabilitar en el backend
      await ApiClient.post('/auth/2fa/disable', { factorId });

      // Actualizar estado en base de datos
      await this.updateSecurityStatus(user.id, {
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: [],
      });

      return {
        success: true,
        message: "2FA deshabilitado correctamente",
      };
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Regenerar códigos de backup
   */
  static async regenerateBackupCodes() {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Generar nuevos códigos
      const newBackupCodes = this.generateBackupCodes();

      // Actualizar en base de datos
      await this.updateSecurityStatus(user.id, {
        backup_codes: newBackupCodes,
      });

      return {
        success: true,
        backupCodes: newBackupCodes,
      };
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtener factores MFA del usuario
   */
  static async getMFAFactors() {
    try {
      // En modo API, consultar el backend
      const data = await ApiClient.get('/auth/2fa/factors');
      return {
        success: true,
        factors: data.factors || { totp: [], phone: [] },
      };
    } catch (error) {
      console.error("Error getting MFA factors:", error);
      return {
        success: false,
        factors: { totp: [], phone: [] },
        error: error.message,
      };
    }
  }

  /**
   * Generar códigos de backup
   */
  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.CONFIG.BACKUP_CODES_COUNT; i++) {
      const code = this.generateRandomCode();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generar código aleatorio
   */
  static generateRandomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      if (i === 4) result += "-";
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Actualizar estado de seguridad en base de datos
   */
  static async updateSecurityStatus(userId, updates) {
    try {
      // Verificar si ya existe registro
      const filters = JSON.stringify({ user_id: userId });
      const existing = await ApiClient.get(
        `/data?table=user_security_status&filters=${encodeURIComponent(filters)}`
      );
      const existingRecord = Array.isArray(existing) ? existing[0] : null;

      if (existingRecord) {
        await dataApiService.updateData('user_security_status', existingRecord.id, {
          ...updates,
          updated_at: new Date().toISOString(),
        });
      } else {
        await dataApiService.insertData('user_security_status', {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error updating security status:", error);
      throw error;
    }
  }

  /**
   * Formatear mensajes de error
   */
  static formatError(error) {
    const errorMappings = {
      "Invalid code":
        "Código incorrecto. Verifique su aplicación autenticadora.",
      "Code expired": "Código expirado. Genere uno nuevo en su aplicación.",
      "Factor not found": "Configuración 2FA no encontrada.",
      "Too many attempts": "Demasiados intentos. Espere antes de reintentar.",
      "Challenge expired": "Sesión expirada. Inicie sesión nuevamente.",
      "Factor already verified": "Factor ya verificado.",
      "Factor enrollment failed":
        "Error en la configuración. Intente nuevamente.",
    };

    return errorMappings[error] || `Error 2FA: ${error}`;
  }

  /**
   * Generar QR Code como Data URL
   */
  static async generateQRCodeDataURL(uri) {
    try {
      const encodedURI = encodeURIComponent(uri);
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedURI}`;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  }

  /**
   * Validar formato de código 2FA
   */
  static validateCodeFormat(code) {
    const cleanCode = code.replace(/\s/g, "");
    return /^\d{6}$/.test(cleanCode);
  }

  /**
   * Validar formato de código de backup
   */
  static validateBackupCodeFormat(code) {
    const cleanCode = code.replace(/\s|-/g, "");
    return /^[A-Z0-9]{8}$/i.test(cleanCode);
  }

  /**
   * Obtener estado 2FA de un usuario específico
   */
  static async get2FAStatus(userId) {
    try {
      console.log("🌐 Obteniendo estado 2FA desde API backend...");

      const filters = JSON.stringify({ user_id: userId });
      const result = await ApiClient.get(
        `/data?table=user_security_status&filters=${encodeURIComponent(filters)}`
      );

      const securityStatus = Array.isArray(result) ? result[0] : null;

      return {
        enabled: securityStatus?.two_factor_enabled || false,
        createdAt: securityStatus?.created_at || null,
        backupCodesCount: securityStatus?.backup_codes?.length || 0,
        factorId: securityStatus?.two_factor_secret || null,
        hasUnverifiedFactor: false,
      };
    } catch (error) {
      console.error("Error in get2FAStatus:", error);
      return {
        enabled: false,
        createdAt: null,
        backupCodesCount: 0,
        factorId: null,
        hasUnverifiedFactor: false,
      };
    }
  }

  /**
   * Obtener todos los usuarios con 2FA configurado (Admin)
   */
  static async getAllUsers2FA() {
    try {
      const data = await ApiClient.get('/users/2fa');
      return { success: true, users: data.users || [] };
    } catch (error) {
      console.error("Error in getAllUsers2FA:", error);
      return {
        success: false,
        error: "Error inesperado al obtener usuarios con 2FA",
      };
    }
  }

  /**
   * Reset 2FA de un usuario (Solo administradores)
   */
  static async admin_reset2FA(userId) {
    try {
      const currentUser = ApiClient.getSessionUser();
      if (!currentUser) {
        return {
          success: false,
          error: "Usuario no autenticado",
        };
      }

      // Resetear estado de 2FA en la base de datos
      const filters = JSON.stringify({ user_id: userId });
      const existing = await ApiClient.get(
        `/data?table=user_security_status&filters=${encodeURIComponent(filters)}`
      );
      const existingRecord = Array.isArray(existing) ? existing[0] : null;

      if (existingRecord) {
        await dataApiService.updateData('user_security_status', existingRecord.id, {
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: [],
          updated_at: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: "2FA reseteado exitosamente",
      };
    } catch (error) {
      console.error("Error in admin_reset2FA:", error);
      return {
        success: false,
        error: "Error inesperado al resetear 2FA",
      };
    }
  }

  /**
   * Limpiar factores huérfanos (no-op en modo API, el backend lo maneja)
   */
  static async cleanupOrphanedFactors() {
    console.log("🧹 Limpieza de factores 2FA delegada al backend");
    try {
      await ApiClient.post('/auth/2fa/cleanup', {});
    } catch (error) {
      console.warn("Warning: Error durante limpieza de factores:", error);
    }
  }
}

export default TwoFactorService;