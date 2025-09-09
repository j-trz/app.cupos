import { useState } from "react";
import { FaShieldAlt, FaKey, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import TwoFactorService from "../services/twoFactorService";

/**
 * Componente para verificar 2FA durante el login
 */
export default function TwoFactorVerify({ 
  user, 
  onSuccess, 
  onCancel, 
  onUseBackupCode 
}) {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBackupCodeInput, setShowBackupCodeInput] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  /**
   * Verificar código TOTP
   */
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!TwoFactorService.validateCodeFormat(verificationCode)) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Obtener el factorId correcto del usuario
      const factorId = user.currentFactorId;
      console.log("🔍 Verificando con factorId:", factorId);
      console.log("🔍 Usuario completo:", user);
      
      if (!factorId) {
        console.error("❌ No se encontró factorId en el usuario");
        setError("Error: Configuración 2FA no encontrada");
        return;
      }

      const result = await TwoFactorService.verify2FALogin(
        factorId,
        verificationCode
      );

      if (result.success) {
        onSuccess(result);
      } else {
        setError(result.error || "Código incorrecto");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      setError("Error al verificar código");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verificar código de backup
   */
  const handleVerifyBackupCode = async (e) => {
    e.preventDefault();
    
    if (!backupCode.trim()) {
      setError("Ingrese un código de backup válido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await TwoFactorService.verifyBackupCode(
        user.id,
        backupCode.trim()
      );

      if (result.success) {
        onSuccess(result);
      } else {
        setError(result.error || "Código de backup incorrecto o ya utilizado");
      }
    } catch (error) {
      console.error("Error verifying backup code:", error);
      setError("Error al verificar código de backup");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cambiar a modo código de backup
   */
  const switchToBackupCode = () => {
    setShowBackupCodeInput(true);
    setError("");
    setVerificationCode("");
  };

  /**
   * Volver a código TOTP
   */
  const switchToTOTP = () => {
    setShowBackupCodeInput(false);
    setError("");
    setBackupCode("");
  };

  /**
   * Renderizar formulario de código TOTP
   */
  const renderTOTPForm = () => (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Código de verificación
        </label>
        <input
          id="code"
          type="text"
          value={verificationCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setVerificationCode(value);
            setError("");
          }}
          placeholder="000000"
          className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={6}
          autoComplete="off"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          Ingrese el código de 6 dígitos de su aplicación autenticadora
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading || verificationCode.length !== 6}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Verificando...
            </div>
          ) : (
            "Verificar Código"
          )}
        </button>

        <button
          type="button"
          onClick={switchToBackupCode}
          className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Usar código de backup
        </button>
      </div>
    </form>
  );

  /**
   * Renderizar formulario de código de backup
   */
  const renderBackupCodeForm = () => (
    <form onSubmit={handleVerifyBackupCode} className="space-y-4">
      <div>
        <label htmlFor="backupCode" className="block text-sm font-medium text-gray-700 mb-2">
          Código de backup
        </label>
        <input
          id="backupCode"
          type="text"
          value={backupCode}
          onChange={(e) => {
            setBackupCode(e.target.value);
            setError("");
          }}
          placeholder="Ingrese su código de backup"
          className="w-full px-4 py-3 text-center font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="off"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          Use uno de los códigos de backup que guardó durante la configuración inicial
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading || !backupCode.trim()}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Verificando...
            </div>
          ) : (
            "Usar Código de Backup"
          )}
        </button>

        <button
          type="button"
          onClick={switchToTOTP}
          className="w-full px-4 py-2 text-sm text-green-600 hover:text-green-800 transition-colors flex items-center justify-center gap-2"
        >
          <FaArrowLeft />
          Volver a código TOTP
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          {showBackupCodeInput ? (
            <FaKey className="h-8 w-8 text-blue-600" />
          ) : (
            <FaShieldAlt className="h-8 w-8 text-blue-600" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {showBackupCodeInput ? "Código de Backup" : "Verificación 2FA"}
        </h2>
        <p className="text-gray-600">
          {showBackupCodeInput 
            ? "Use uno de sus códigos de backup guardados"
            : "Se requiere autenticación de doble factor para continuar"
          }
        </p>
        
        {/* Usuario info */}
        <div className="mt-3 text-sm text-gray-500">
          Iniciando sesión como: <span className="font-medium">{user.email}</span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Form content */}
      {showBackupCodeInput ? renderBackupCodeForm() : renderTOTPForm()}

      {/* Cancel button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancelar e iniciar sesión con otra cuenta
        </button>
      </div>

      {/* Info section */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          ¿Problemas para acceder?
        </h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Asegúrese de que la hora de su dispositivo esté sincronizada</p>
          <p>• El código cambia cada 30 segundos</p>
          <p>• Use códigos de backup si no tiene acceso a su aplicación</p>
          <p>• Contacte al administrador si perdió acceso completamente</p>
        </div>
      </div>
    </div>
  );
}