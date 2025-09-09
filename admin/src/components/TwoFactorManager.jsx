import { useState, useEffect } from "react";
import { FaShieldAlt, FaCheck, FaTimes, FaCog, FaKey, FaExclamationTriangle, FaTrash } from "react-icons/fa";
import TwoFactorService from "../services/twoFactorService";
import TwoFactorSetup from "./TwoFactorSetup";

/**
 * Componente para gestionar configuración 2FA del usuario
 */
export default function TwoFactorManager({ user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    loadTwoFactorStatus();
  }, [user]);

  /**
   * Cargar estado actual del 2FA
   */
  const loadTwoFactorStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const status = await TwoFactorService.get2FAStatus(user.id);
      setTwoFactorStatus(status);
    } catch (error) {
      console.error("Error loading 2FA status:", error);
      setError("Error al cargar el estado de 2FA");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar configuración completada
   */
  const handleSetupComplete = () => {
    setShowSetup(false);
    setSuccess("¡2FA configurado exitosamente!");
    loadTwoFactorStatus();
    setTimeout(() => setSuccess(""), 5000);
  };

  /**
   * Cancelar configuración
   */
  const handleSetupCancel = () => {
    setShowSetup(false);
  };

  /**
   * Iniciar proceso de desactivación
   */
  const handleStartDisable = () => {
    setShowDisableConfirm(true);
    setError("");
    setDisableCode("");
  };

  /**
   * Cancelar desactivación
   */
  const handleCancelDisable = () => {
    setShowDisableConfirm(false);
    setDisableCode("");
    setError("");
  };

  /**
   * Confirmar desactivación de 2FA
   */
  const handleConfirmDisable = async (e) => {
    e.preventDefault();

    if (!TwoFactorService.validateCodeFormat(disableCode)) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setDisableLoading(true);
    setError("");

    try {
      const result = await TwoFactorService.disable2FA(user.id, disableCode);
      
      if (result.success) {
        setShowDisableConfirm(false);
        setSuccess("2FA desactivado exitosamente");
        loadTwoFactorStatus();
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(result.error || "Error al desactivar 2FA");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      setError("Error inesperado al desactivar 2FA");
    } finally {
      setDisableLoading(false);
    }
  };

  /**
   * Renderizar estado de carga
   */
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  /**
   * Renderizar configuración de 2FA
   */
  if (showSetup) {
    return (
      <div className="bg-white rounded-lg shadow">
        <TwoFactorSetup
          onComplete={handleSetupComplete}
          onCancel={handleSetupCancel}
        />
      </div>
    );
  }

  /**
   * Renderizar modal de confirmación para desactivar
   */
  if (showDisableConfirm) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <FaExclamationTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Desactivar Autenticación de Doble Factor
              </h3>
              <p className="text-gray-600">
                Esta acción reducirá la seguridad de su cuenta
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-sm text-red-800">
              <p className="font-medium mb-2">⚠️ Advertencia de Seguridad:</p>
              <ul className="space-y-1 text-xs">
                <li>• Su cuenta será menos segura sin 2FA</li>
                <li>• Será más vulnerable a accesos no autorizados</li>
                <li>• Deberá configurar 2FA nuevamente si desea reactivarlo</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmDisable} className="space-y-4">
          <div>
            <label htmlFor="disableCode" className="block text-sm font-medium text-gray-700 mb-2">
              Código de verificación actual
            </label>
            <input
              id="disableCode"
              type="text"
              value={disableCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setDisableCode(value);
                setError("");
              }}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingrese el código actual de su aplicación autenticadora
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancelDisable}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disableLoading || disableCode.length !== 6}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {disableLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Desactivando...
                </div>
              ) : (
                "Desactivar 2FA"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
          <FaShieldAlt className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Autenticación de Doble Factor
          </h3>
          <p className="text-gray-600">
            Agregue una capa extra de seguridad a su cuenta
          </p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FaCheck className="text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${
              twoFactorStatus?.enabled ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <div>
              <p className="font-medium text-gray-900">
                Estado: {twoFactorStatus?.enabled ? 'Activado' : 'Desactivado'}
              </p>
              <p className="text-sm text-gray-600">
                {twoFactorStatus?.enabled 
                  ? 'Su cuenta está protegida con 2FA'
                  : 'Su cuenta no tiene protección 2FA'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {twoFactorStatus?.enabled ? (
              <FaCheck className="h-5 w-5 text-green-500" />
            ) : (
              <FaTimes className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {twoFactorStatus?.enabled && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaKey className="text-blue-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">
                  Información de 2FA
                </h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Configurado: {new Date(twoFactorStatus.createdAt).toLocaleDateString('es-ES')}</p>
                  <p>• Tipo: TOTP (Time-based One-Time Password)</p>
                  <p>• Códigos de backup disponibles: {twoFactorStatus.backupCodesCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200">
          {twoFactorStatus?.enabled ? (
            <div className="space-y-3">
              <button
                onClick={handleStartDisable}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <FaTrash />
                Desactivar 2FA
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                Necesitará un código de verificación para desactivar 2FA
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setShowSetup(true)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <FaCog />
                Configurar 2FA
              </button>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">🔐 Recomendado:</p>
                  <p className="text-xs">
                    Active 2FA para proteger su cuenta contra accesos no autorizados
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}