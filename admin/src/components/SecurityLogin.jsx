import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLock, FaShieldAlt, FaClock, FaExclamationTriangle } from "react-icons/fa"; // eslint-disable-line no-unused-vars
import SecurityService from "../services/securityService";
import TwoFactorService from "../services/twoFactorService";
import TwoFactorSetup from "./TwoFactorSetup"; // eslint-disable-line no-unused-vars
import TwoFactorVerify from "./TwoFactorVerify"; // eslint-disable-line no-unused-vars

/**
 * Componente de login con funcionalidades de seguridad avanzadas
 * Incluye integración completa con 2FA obligatorio
 */
export default function SecurityLogin({ onLoginSuccess, fullPage = true }) {
  // Estados del formulario
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Estados de seguridad
  const [securityInfo, setSecurityInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  
  // Estados de 2FA
  const [loginStep, setLoginStep] = useState("login"); // login, setup2fa, verify2fa
  const [pendingUser, setPendingUser] = useState(null);
  const [force2FASetup, setForce2FASetup] = useState(false);
  
  const navigate = useNavigate();

  // Countdown para desbloqueo automático
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * Manejar cambios en el formulario
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores al escribir
    if (error) setError("");
  };

  /**
   * Formatear tiempo restante de bloqueo
   */
  const formatTimeRemaining = (lockedUntil) => {
    if (!lockedUntil) return "";
    
    const now = new Date();
    const unlockTime = new Date(lockedUntil);
    const diffMs = unlockTime - now;
    
    if (diffMs <= 0) return "0 minutos";
    
    const minutes = Math.ceil(diffMs / (1000 * 60));
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  };

  /**
   * Iniciar countdown para desbloqueo
   */
  const startCountdown = (lockedUntil) => {
    if (!lockedUntil) return;
    
    const now = new Date();
    const unlockTime = new Date(lockedUntil);
    const diffSeconds = Math.ceil((unlockTime - now) / 1000);
    
    if (diffSeconds > 0) {
      setCountdown(diffSeconds);
    }
  };

  /**
   * Manejar envío del formulario de login
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSecurityInfo(null);

    try {
      // Obtener metadata de la conexión
      const metadata = {
        ipAddress: await SecurityService.getClientIP(),
        userAgent: SecurityService.getUserAgent(),
      };

      // Validar login con sistema de seguridad
      const result = await SecurityService.validateLogin(
        formData.email,
        formData.password,
        metadata
      );

      if (result.success) {
        // Login exitoso - verificar estado 2FA
        console.log("✅ Login exitoso - verificando 2FA");
        
        const user = result.user;
        setPendingUser(user);
        
        // Verificar si el usuario tiene 2FA configurado
        const twoFactorStatus = await TwoFactorService.get2FAStatus(user.id);
        
        console.log("🔍 Estado 2FA completo:", twoFactorStatus);
        
        if (twoFactorStatus.enabled && twoFactorStatus.factorId) {
          // Usuario tiene 2FA válido - solicitar verificación
          console.log("🔐 Usuario con 2FA válido - solicitando verificación", twoFactorStatus.factorId);
          // Guardar el factorId correcto en el estado del usuario
          setPendingUser({
            ...user,
            currentFactorId: twoFactorStatus.factorId
          });
          setLoginStep("verify2fa");
        } else if (twoFactorStatus.hasUnverifiedFactor) {
          // Usuario tiene factor no verificado - completar configuración
          console.log("🔄 Usuario con factor no verificado - completando configuración");
          setForce2FASetup(true);
          setLoginStep("setup2fa");
        } else {
          // Usuario NO tiene 2FA - forzar configuración
          console.log("🔒 Usuario sin 2FA - forzando configuración");
          setForce2FASetup(true);
          setLoginStep("setup2fa");
        }
      } else {
        // Manejar diferentes tipos de errores
        handleLoginError(result);
      }
    } catch (error) {
      console.error("Error during login:", error);
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar errores de login
   */
  const handleLoginError = (result) => {
    switch (result.error) {
      case "account_locked":
        setError(result.message);
        setSecurityInfo({
          type: "locked",
          lockedUntil: result.lockedUntil,
        });
        startCountdown(result.lockedUntil);
        break;
        
      case "invalid_credentials":
        setError(result.message);
        if (result.attemptsRemaining !== undefined) {
          setSecurityInfo({
            type: "attempts",
            attemptsRemaining: result.attemptsRemaining,
            willBeLocked: result.willBeLocked,
          });
        }
        break;
        
      default:
        setError(result.message || "Error desconocido");
    }
  };

  /**
   * Manejar configuración 2FA completada
   */
  const handle2FASetupComplete = async () => {
    console.log("✅ 2FA configurado exitosamente");
    
    try {
      // Obtener el estado 2FA actualizado después de la configuración
      const updatedStatus = await TwoFactorService.get2FAStatus(pendingUser.id);
      console.log("🔄 Estado 2FA actualizado:", updatedStatus);
      
      if (updatedStatus.enabled && updatedStatus.factorId) {
        // Actualizar el usuario con el factorId correcto
        setPendingUser({
          ...pendingUser,
          currentFactorId: updatedStatus.factorId
        });
        
        console.log("✅ Usuario actualizado con factorId:", updatedStatus.factorId);
        
        // Ahora solicitar verificación inmediata
        setLoginStep("verify2fa");
        setForce2FASetup(false);
      } else {
        console.error("❌ Error: 2FA configurado pero sin factorId válido");
        setError("Error en la configuración 2FA. Intente nuevamente.");
        setLoginStep("login");
      }
    } catch (error) {
      console.error("Error obteniendo estado 2FA actualizado:", error);
      setError("Error al verificar configuración 2FA");
      setLoginStep("login");
    }
  };

  /**
   * Manejar verificación 2FA exitosa
   */
  const handle2FAVerifySuccess = async () => {
    console.log("✅ 2FA verificado exitosamente");
    
    // Completar login
    await completeLogin();
  };

  /**
   * Completar proceso de login
   */
  const completeLogin = async () => {
    try {
      // Crear sesión de seguridad
      await SecurityService.createUserSession(pendingUser.id);
      
      // Inicializar monitoreo de actividad
      SecurityService.initActivityMonitoring();
      
      // Callback para la aplicación padre
      if (onLoginSuccess) {
        onLoginSuccess({
          user: pendingUser,
          requires2FA: false, // Ya verificado
        });
      } else {
        // Navegación por defecto
        navigate("/dashboard", { replace: true });
      }
      
    } catch (error) {
      console.error("Error completing login:", error);
      setError("Error al completar el login");
    }
  };

  /**
   * Cancelar proceso de 2FA y volver al login
   */
  const handleCancel2FA = () => {
    setLoginStep("login");
    setPendingUser(null);
    setForce2FASetup(false);
    setError("");
  };

  /**
   * Renderizar información de seguridad
   */
  const renderSecurityInfo = () => {
    if (!securityInfo) return null;

    if (securityInfo.type === "locked") {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <FaLock className="text-red-500 text-xl" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800">Cuenta Bloqueada</h4>
              <p className="text-red-700 text-sm">
                Su cuenta ha sido bloqueada temporalmente por seguridad.
              </p>
              {securityInfo.lockedUntil && (
                <p className="text-red-600 text-sm mt-1">
                  <FaClock className="inline mr-1" />
                  Tiempo restante: {formatTimeRemaining(securityInfo.lockedUntil)}
                  {countdown > 0 && (
                    <span className="ml-2 font-mono">
                      ({Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (securityInfo.type === "attempts") {
      const isWarning = securityInfo.attemptsRemaining <= 1;
      const bgColor = isWarning ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200";
      const textColor = isWarning ? "text-orange-800" : "text-yellow-800";
      const iconColor = isWarning ? "text-orange-500" : "text-yellow-500";

      return (
        <div className={`${bgColor} border rounded-lg p-4 mb-4`}>
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className={`${iconColor} text-xl`} />
            <div className="flex-1">
              <h4 className={`font-semibold ${textColor}`}>
                {isWarning ? "¡Advertencia!" : "Credenciales Incorrectas"}
              </h4>
              <p className={`${textColor} text-sm`}>
                Intentos restantes: <strong>{securityInfo.attemptsRemaining}</strong>
              </p>
              {securityInfo.willBeLocked && (
                <p className="text-red-600 text-sm mt-1 font-medium">
                  Su cuenta será bloqueada por 30 minutos si falla el próximo intento.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /**
   * Renderizar paso de configuración 2FA
   */
  if (loginStep === "setup2fa") {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {force2FASetup && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <FaShieldAlt className="text-yellow-600 text-xl" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Configuración 2FA Obligatoria</h4>
                  <p className="text-yellow-700 text-sm">
                    Por seguridad, debe configurar autenticación de doble factor antes de continuar.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <TwoFactorSetup
            onComplete={handle2FASetupComplete}
            onCancel={force2FASetup ? null : handleCancel2FA} // No permitir cancelar si es obligatorio
          />
        </div>
      </div>
    );
  }

  /**
   * Renderizar paso de verificación 2FA
   */
  if (loginStep === "verify2fa" && pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <TwoFactorVerify
          user={pendingUser}
          onSuccess={handle2FAVerifySuccess}
          onCancel={handleCancel2FA}
        />
      </div>
    );
  }

  /**
   * Renderizar formulario de login principal
   */
  const formCard = (
    <div className="w-full max-w-lg">
      <form className="space-y-7 md:space-y-8 bg-white p-8 md:p-10 rounded-2xl" onSubmit={handleSubmit}>
        {/* Información de seguridad */}
        {renderSecurityInfo()}

        {/* Error general */}
        {error && !securityInfo && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading || (securityInfo?.type === "locked")}
              className="appearance-none relative block w-full px-4 py-3.5 border border-gray-300 rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent focus:z-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="ejemplo@empresa.com"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading || (securityInfo?.type === "locked")}
                className="appearance-none relative block w-full px-4 py-3.5 pr-12 border border-gray-300 rounded-xl placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent focus:z-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Su contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || (securityInfo?.type === "locked")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Botón de login */}
        <div>
          <button
            type="submit"
            disabled={loading || (securityInfo?.type === "locked")}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-[#2c4b8b] hover:bg-[#1a2952] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c4b8b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Verificando...</span>
              </div>
            ) : securityInfo?.type === "locked" ? (
              <div className="flex items-center gap-2">
                <FaLock className="h-5 w-5" />
                <span>Cuenta Bloqueada</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FaShieldAlt className="h-5 w-5" />
                <span>Iniciar Sesión</span>
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (!fullPage) {
    return formCard;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      {formCard}
    </div>
  );
}