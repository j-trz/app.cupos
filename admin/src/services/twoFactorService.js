import { supabase } from "../supabaseClient";
import ApiClient from "./apiClient";

/**
 * Servicio para gestionar autenticación de doble factor (2FA)
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
   * @returns {Promise<Object>} Estado de 2FA del usuario
   */
  static async check2FAStatus() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      // Obtener factores MFA del usuario
      const { data: factors, error } = await supabase.auth.mfa.listFactors();

      if (error) throw error;

      const totpFactor = factors?.totp?.find(
        (factor) => factor.status === "verified"
      );

      // Obtener información adicional de la base de datos
      const { data: securityStatus, error: dbError } = await supabase
        .from("user_security_status")
        .select("two_factor_enabled, backup_codes")
        .eq("user_id", user.id)
        .single();

      if (dbError && dbError.code !== "PGRST116") {
        // Ignorar "no rows" error
        console.warn("Error fetching security status:", dbError);
      }

      return {
        success: true,
        enabled: !!totpFactor,
        factorId: totpFactor?.id || null,
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
   * @returns {Promise<Object>} Datos para configurar 2FA
   */
  static async setup2FA() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      // Verificar factores existentes primero
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();

      // Buscar factor existente no verificado
      const unverifiedFactor = existingFactors?.totp?.find(
        (factor) => factor.status === "unverified"
      );

      if (unverifiedFactor) {
        console.log("🔄 Usando factor 2FA existente no verificado");
        return {
          success: true,
          factorId: unverifiedFactor.id,
          qrCodeURI: unverifiedFactor.totp.uri,
          secret: unverifiedFactor.totp.secret,
        };
      }

      // Buscar factor verificado (para reconfiguración)
      const verifiedFactor = existingFactors?.totp?.find(
        (factor) => factor.status === "verified"
      );

      if (verifiedFactor) {
        console.log(
          "🔄 Factor 2FA ya verificado encontrado - no se puede eliminar, creando con nombre único"
        );
        // No intentar eliminar factor verificado ya que causa error 422
        // En su lugar, crear factor con nombre único
      }

      // Crear nuevo factor TOTP con nombre único para evitar conflictos
      const timestamp = Date.now();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: this.CONFIG.ISSUER,
        friendlyName: `${this.CONFIG.APP_NAME} - ${user.email} (${timestamp})`,
      });

      if (error) {
        // Si hay error de factor duplicado, intentar limpiar factores huérfanos
        if (error.message.includes("already exists")) {
          console.warn(
            "🔄 Factor duplicado detectado, limpiando factores huérfanos"
          );
          await this.cleanupOrphanedFactors();

          // Reintentar después de limpieza con nombre único
          const retryTimestamp = Date.now();
          const { data: retryData, error: retryError } =
            await supabase.auth.mfa.enroll({
              factorType: "totp",
              issuer: this.CONFIG.ISSUER,
              friendlyName: `${this.CONFIG.APP_NAME} - ${user.email} (${retryTimestamp})`,
            });

          if (retryError) throw retryError;

          return {
            success: true,
            factorId: retryData.id,
            qrCodeURI: retryData.totp.uri,
            secret: retryData.totp.secret,
          };
        }
        throw error;
      }

      return {
        success: true,
        factorId: data.id,
        qrCodeURI: data.totp.uri,
        secret: data.totp.secret,
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
   * @param {string} factorId - ID del factor MFA
   * @param {string} code - Código ingresado por el usuario
   * @returns {Promise<Object>} Resultado de la verificación
   */
  static async verify2FASetup(factorId, code) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      // Verificar código para completar configuración
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: code.replace(/\s/g, ""), // Remover espacios
      });

      if (error) throw error;

      // Generar códigos de backup
      const backupCodes = this.generateBackupCodes();

      // Actualizar estado en base de datos
      await this.updateSecurityStatus(user.id, {
        two_factor_enabled: true,
        two_factor_secret: factorId, // Guardar factorId para referencia
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
   * @param {string} factorId - ID del factor MFA
   * @param {string} code - Código ingresado por el usuario
   * @returns {Promise<Object>} Resultado de la verificación
   */
  static async verify2FALogin(factorId, code) {
    try {
      // Crear challenge para el factor
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: factorId,
        });

      if (challengeError) throw challengeError;

      // Verificar código
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: code.replace(/\s/g, ""),
      });

      if (error) throw error;

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
   * @param {string} userId - ID del usuario
   * @param {string} backupCode - Código de backup
   * @returns {Promise<Object>} Resultado de la verificación
   */
  static async verifyBackupCode(userId, backupCode) {
    try {
      if (!userId) throw new Error("ID de usuario requerido");

      // Obtener códigos de backup del usuario
      const { data: securityStatus, error } = await supabase
        .from("user_security_status")
        .select("backup_codes")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

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
      await supabase
        .from("user_security_status")
        .update({
          backup_codes: remainingCodes,
          last_backup_code_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

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
   * @param {string} factorId - ID del factor a deshabilitar
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async disable2FA(factorId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      // Deshabilitar factor en Supabase Auth
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorId,
      });

      if (error) throw error;

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
   * @returns {Promise<Object>} Nuevos códigos de backup
   */
  static async regenerateBackupCodes() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
   * @returns {Promise<Object>} Lista de factores MFA
   */
  static async getMFAFactors() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) throw error;

      return {
        success: true,
        factors: data,
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
   * @returns {Array<string>} Lista de códigos de backup
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
   * @returns {string} Código aleatorio
   */
  static generateRandomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      if (i === 4) result += "-"; // Separador en el medio
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Actualizar estado de seguridad en base de datos
   * @param {string} userId - ID del usuario
   * @param {Object} updates - Actualizaciones a realizar
   */
  static async updateSecurityStatus(userId, updates) {
    try {
      const { error } = await supabase.from("user_security_status").upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error updating security status:", error);
      throw error;
    }
  }

  /**
   * Formatear mensajes de error
   * @param {string} error - Mensaje de error original
   * @returns {string} Mensaje de error formateado
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
   * @param {string} uri - URI para el QR code
   * @returns {Promise<string>} Data URL del QR code
   */
  static async generateQRCodeDataURL(uri) {
    try {
      // Si tienes la librería qrcode instalada:
      // const QRCode = await import('qrcode');
      // return await QRCode.toDataURL(uri);

      // Alternativa usando servicio online (para desarrollo):
      const encodedURI = encodeURIComponent(uri);
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedURI}`;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  }

  /**
   * Validar formato de código 2FA
   * @param {string} code - Código a validar
   * @returns {boolean} True si el formato es válido
   */
  static validateCodeFormat(code) {
    const cleanCode = code.replace(/\s/g, "");
    return /^\d{6}$/.test(cleanCode);
  }

  /**
   * Validar formato de código de backup
   * @param {string} code - Código de backup a validar
   * @returns {boolean} True si el formato es válido
   */
  static validateBackupCodeFormat(code) {
    const cleanCode = code.replace(/\s|-/g, "");
    return /^[A-Z0-9]{8}$/i.test(cleanCode);
  }

  /**
   * Obtener estado 2FA de un usuario específico
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estado de 2FA del usuario
   */
  static async get2FAStatus(userId) {
    try {
      if (ApiClient.isApiEnabled()) {
        console.log("🌐 Obteniendo estado 2FA desde API backend...");

        // Obtener información de la base de datos
        const filters = JSON.stringify({ user_id: userId });
        const result = await ApiClient.get(
          `/data?table=user_security_status&filters=${encodeURIComponent(
            filters
          )}`
        );

        // El backend devuelve un array directamente
        const securityStatus = Array.isArray(result)
          ? result[0]
          : result?.data || {};

        // Simular la respuesta de Supabase Auth
        // NOTA: el backend API no expone factores MFA reales todavía;
        // si se necesita esto en el futuro, agregar la llamada correspondiente aquí.
        const factors = { totp: [] };

        const verifiedTotpFactor = factors.totp.find(
          (factor) => factor.status === "verified"
        );
        const unverifiedTotpFactor = factors.totp.find(
          (factor) => factor.status === "unverified"
        );

        const dbEnabled = securityStatus?.two_factor_enabled || false;
        const authEnabled = !!verifiedTotpFactor;

        let actualEnabled = authEnabled && dbEnabled;
        let factorId = verifiedTotpFactor?.id || null;

        // Si hay un factor no verificado, considerar que necesita completar configuración
        if (unverifiedTotpFactor && !verifiedTotpFactor) {
          console.log(
            "🔄 Factor no verificado encontrado, requiere completar configuración"
          );
          actualEnabled = false;
          factorId = null;
        }

        // Si la DB dice que está habilitado pero no hay factor activo, deshabilitar en DB
        if (dbEnabled && !authEnabled) {
          console.warn("🔄 Sincronizando estado 2FA: deshabilitando en DB");
          await this.updateSecurityStatus(userId, {
            two_factor_enabled: false,
            two_factor_secret: null,
            backup_codes: [],
          });
          actualEnabled = false;
          factorId = null;
        }

        return {
          enabled: actualEnabled,
          createdAt: securityStatus?.created_at || null,
          backupCodesCount: securityStatus?.backup_codes?.length || 0,
          factorId: factorId,
          hasUnverifiedFactor: !!unverifiedTotpFactor,
        };
      } else {
        // Modo Supabase
        const { data: factors } = await supabase.auth.mfa.listFactors();

        const verifiedTotpFactor = factors?.totp?.find(
          (factor) => factor.status === "verified"
        );
        const unverifiedTotpFactor = factors?.totp?.find(
          (factor) => factor.status === "unverified"
        );

        // Obtener información de la base de datos
        const { data: securityStatus, error } = await supabase
          .from("user_security_status")
          .select(
            "two_factor_enabled, backup_codes, created_at, two_factor_secret"
          )
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error getting 2FA status:", error);
          return {
            enabled: false,
            createdAt: null,
            backupCodesCount: 0,
            factorId: null,
            hasUnverifiedFactor: false,
          };
        }

        const dbEnabled = securityStatus?.two_factor_enabled || false;
        const authEnabled = !!verifiedTotpFactor;

        let actualEnabled = authEnabled && dbEnabled;
        let factorId = verifiedTotpFactor?.id || null;

        // Si hay un factor no verificado, considerar que necesita completar configuración
        if (unverifiedTotpFactor && !verifiedTotpFactor) {
          console.log(
            "🔄 Factor no verificado encontrado, requiere completar configuración"
          );
          actualEnabled = false;
          factorId = null;
        }

        // Si la DB dice que está habilitado pero no hay factor activo, deshabilitar en DB
        if (dbEnabled && !authEnabled) {
          console.warn("🔄 Sincronizando estado 2FA: deshabilitando en DB");
          await this.updateSecurityStatus(userId, {
            two_factor_enabled: false,
            two_factor_secret: null,
            backup_codes: [],
          });
          actualEnabled = false;
          factorId = null;
        }

        return {
          enabled: actualEnabled,
          createdAt: securityStatus?.created_at || null,
          backupCodesCount: securityStatus?.backup_codes?.length || 0,
          factorId: factorId,
          hasUnverifiedFactor: !!unverifiedTotpFactor,
        };
      }
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
   * @returns {Promise<Object>} Lista de usuarios con 2FA
   */
  static async getAllUsers2FA() {
    try {
      // Intento con Edge Function (Service Role)
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: { action: "listUsers2FA" },
        }
      );

      let users = [];
      if (error) {
        console.error("Error invoking listUsers2FA:", error);
      } else if (data?.success && Array.isArray(data.users)) {
        users = data.users;
      }

      // Fallback: si la lista viene vacía, intentar consulta directa (RLS debería permitir admin)
      if (!users.length) {
        const { data: securityData, error: securityError } = await supabase
          .from("user_security_status")
          .select(
            `
            user_id,
            two_factor_enabled,
            backup_codes,
            created_at
          `
          )
          .eq("two_factor_enabled", true);

        if (
          !securityError &&
          Array.isArray(securityData) &&
          securityData.length
        ) {
          const userIds = securityData.map((item) => item.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, email, full_name, nombre, agency, agencia, role")
            .in("id", userIds);

          users = securityData.map((securityItem) => {
            const rawProfile =
              profilesData?.find((p) => p.id === securityItem.user_id) ||
              null;
            const profile = rawProfile
              ? {
                  ...rawProfile,
                  full_name:
                    rawProfile.full_name ||
                    rawProfile.nombre ||
                    (rawProfile.email
                      ? rawProfile.email.split("@")[0]
                      : "N/A"),
                  agency: rawProfile.agency || rawProfile.agencia || null,
                }
              : {
                  id: securityItem.user_id,
                  email: null,
                  full_name: "N/A",
                  agency: null,
                };
            return {
              ...securityItem,
              profiles: profile,
              backup_codes_count: securityItem.backup_codes?.length || 0,
            };
          });
        }
      }

      return { success: true, users };
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
   * @param {string} userId - ID del usuario al que resetear 2FA
   * @returns {Promise<Object>} Resultado de la operación
   */
  static async admin_reset2FA(userId) {
    try {
      // Verificar que el usuario actual es administrador
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        return {
          success: false,
          error: "Usuario no autenticado",
        };
      }

      // Verificar rol de administrador
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (!profile || profile.role !== "admin") {
        return {
          success: false,
          error: "Solo administradores pueden resetear 2FA",
        };
      }

      // Resetear estado de 2FA en la base de datos
      const { error: resetError } = await supabase
        .from("user_security_status")
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: [],
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (resetError) {
        console.error("Error resetting 2FA status:", resetError);
        return {
          success: false,
          error: "Error al resetear estado 2FA",
        };
      }

      // Intentar obtener y deshabilitar factores MFA de Supabase
      // Nota: Esto requiere permisos especiales y puede necesitar ajustes según la configuración
      try {
        // Esta función puede requerir privilegios adicionales
        const { error: unenrollError } =
          await supabase.auth.admin.updateUserById(
            userId,
            { factors: [] } // Esto puede variar según la versión de Supabase
          );

        if (unenrollError) {
          console.warn(
            "Warning: Could not unenroll MFA factors:",
            unenrollError
          );
          // No fallar la operación por esto, ya que el estado en BD ya se actualizó
        }
      } catch (adminError) {
        console.warn("Warning: Admin operation failed:", adminError);
        // Continuar, ya que el reset en BD fue exitoso
      }

      // Registrar la acción administrativa (opcional)
      try {
        await supabase.from("admin_actions").insert({
          admin_user_id: currentUser.id,
          target_user_id: userId,
          action_type: "reset_2fa",
          details: "Reset 2FA from admin panel",
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.warn("Warning: Could not log admin action:", logError);
        // No fallar por esto
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
   * Limpiar factores huérfanos (sin verificar o duplicados)
   * @returns {Promise<void>}
   */
  static async cleanupOrphanedFactors() {
    try {
      console.log("🧹 Limpiando factores 2FA huérfanos...");

      const { data: factors } = await supabase.auth.mfa.listFactors();

      if (!factors?.totp) return;

      // Deshabilitar todos los factores no verificados o duplicados
      for (const factor of factors.totp) {
        if (factor.status === "unverified") {
          console.log(`🗑️ Eliminando factor no verificado: ${factor.id}`);
          try {
            await supabase.auth.mfa.unenroll({
              factorId: factor.id,
            });
          } catch (unenrollError) {
            console.warn(
              `Warning: No se pudo eliminar factor ${factor.id}:`,
              unenrollError
            );
          }
        }
      }

      console.log("✅ Limpieza de factores completada");
    } catch (error) {
      console.warn("Warning: Error durante limpieza de factores:", error);
    }
  }
}

export default TwoFactorService;