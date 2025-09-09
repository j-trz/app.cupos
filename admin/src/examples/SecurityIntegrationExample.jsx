import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import SecurityService from "../services/securityService";
import TwoFactorService from "../services/twoFactorService";
import SecurityLogin from "../components/SecurityLogin";
import SecurityAdminPanel from "../components/SecurityAdminPanel";
import TwoFactorSetup from "../components/TwoFactorSetup";
import TwoFactorVerify from "../components/TwoFactorVerify";
import TwoFactorManager from "../components/TwoFactorManager";

// Configuración de Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

/**
 * Ejemplo completo de integración del sistema de seguridad
 * 
 * Este componente demuestra cómo integrar todos los elementos
 * del sistema de seguridad en una aplicación real:
 * 
 * - Login con validaciones de seguridad
 * - Gestión de 2FA completa
 * - Panel administrativo
 * - Auto-logout por inactividad
 * - Monitoreo de sesiones
 */
export default function SecurityIntegrationExample() {
  // Estados principales
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("login"); // login, dashboard, admin, profile
  
  // Estados de autenticación
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  
  // Estados de configuración
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Inicializar aplicación
   */
  const initializeApp = async () => {
    try {
      // Verificar sesión existente
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Verificar si la sesión sigue siendo válida
        const sessionValid = await SecurityService.checkSessionExpiry();
        
        if (sessionValid) {
          setUser(session.user);
          setCurrentView("dashboard");
          
          // Inicializar monitoreo de actividad
          SecurityService.initializeActivityMonitoring();
        } else {
          // Sesión expirada, logout
          await handleLogout();
        }
      }
    } catch (error) {
      console.error("Error initializing app:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar login exitoso
   */
  const handleLoginSuccess = async (loginResult) => {
    try {
      const { user: loggedUser, requires2FA } = loginResult;
      
      if (requires2FA) {
        // Usuario necesita verificar 2FA
        setRequiresTwoFactor(true);
        setPendingUser(loggedUser);
      } else {
        // Login completo
        await completeLogin(loggedUser);
      }
    } catch (error) {
      console.error("Error handling login success:", error);
    }
  };

  /**
   * Manejar verificación 2FA exitosa
   */
  const handle2FASuccess = async (verificationResult) => {
    try {
      await completeLogin(pendingUser);
      setRequiresTwoFactor(false);
      setPendingUser(null);
    } catch (error) {
      console.error("Error handling 2FA success:", error);
    }
  };

  /**
   * Completar proceso de login
   */
  const completeLogin = async (loggedUser) => {
    try {
      // Establecer usuario
      setUser(loggedUser);
      
      // Crear sesión de seguridad
      await SecurityService.createUserSession(loggedUser.id);
      
      // Inicializar monitoreo de actividad
      SecurityService.initializeActivityMonitoring();
      
      // Configurar auto-logout
      SecurityService.setupAutoLogout(handleAutoLogout);
      
      // Ir al dashboard
      setCurrentView("dashboard");
      
    } catch (error) {
      console.error("Error completing login:", error);
    }
  };

  /**
   * Manejar auto-logout por inactividad
   */
  const handleAutoLogout = async () => {
    try {
      // Mostrar notificación al usuario
      alert("Su sesión ha expirado por inactividad. Será redirigido al login.");
      
      await handleLogout();
    } catch (error) {
      console.error("Error handling auto-logout:", error);
    }
  };

  /**
   * Manejar logout manual
   */
  const handleLogout = async () => {
    try {
      // Limpiar sesión de seguridad
      if (user) {
        await SecurityService.clearUserSession(user.id);
      }
      
      // Limpiar monitoreo de actividad
      SecurityService.clearActivityMonitoring();
      
      // Logout de Supabase
      await supabase.auth.signOut();
      
      // Resetear estados
      setUser(null);
      setCurrentView("login");
      setRequiresTwoFactor(false);
      setPendingUser(null);
      
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  /**
   * Cancelar proceso de 2FA
   */
  const handleCancel2FA = () => {
    setRequiresTwoFactor(false);
    setPendingUser(null);
  };

  /**
   * Completar configuración de 2FA
   */
  const handle2FASetupComplete = () => {
    setShowTwoFactorSetup(false);
    // Recargar estado del usuario si es necesario
  };

  /**
   * Verificar si el usuario es administrador
   */
  const isAdmin = () => {
    return user?.user_metadata?.role === "admin" || 
           user?.app_metadata?.role === "admin";
  };

  /**
   * Renderizar pantalla de carga
   */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  /**
   * Renderizar verificación 2FA
   */
  if (requiresTwoFactor && pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <TwoFactorVerify
          user={pendingUser}
          onSuccess={handle2FASuccess}
          onCancel={handleCancel2FA}
        />
      </div>
    );
  }

  /**
   * Renderizar configuración 2FA
   */
  if (showTwoFactorSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <TwoFactorSetup
          onComplete={handle2FASetupComplete}
          onCancel={() => setShowTwoFactorSetup(false)}
        />
      </div>
    );
  }

  /**
   * Renderizar login
   */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <SecurityLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  /**
   * Renderizar aplicación principal
   */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de navegación */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">
                Form Cupos Admin
              </h1>
              
              <nav className="flex space-x-4">
                <button
                  onClick={() => setCurrentView("dashboard")}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === "dashboard"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Dashboard
                </button>
                
                <button
                  onClick={() => setCurrentView("profile")}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === "profile"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Perfil
                </button>
                
                {isAdmin() && (
                  <button
                    onClick={() => setCurrentView("admin")}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentView === "admin"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Administración
                  </button>
                )}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === "dashboard" && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard Principal
              </h2>
              <p className="text-gray-600">
                Bienvenido al sistema de gestión de cupos. Su sesión está protegida con 
                nuestro sistema de seguridad avanzado.
              </p>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900">Seguridad Activa</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Su cuenta está protegida con autenticación segura
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900">Sesión Monitoreada</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Auto-logout configurado por inactividad
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900">2FA Disponible</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Configure autenticación de doble factor
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === "profile" && (
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Perfil de Usuario
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Último login
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(user.last_sign_in_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Componente de gestión 2FA */}
              <TwoFactorManager user={user} />
            </div>
          </div>
        )}

        {currentView === "admin" && isAdmin() && (
          <div className="px-4 py-6 sm:px-0">
            <SecurityAdminPanel />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Ejemplo de uso en App.js:
 * 
 * import SecurityIntegrationExample from './examples/SecurityIntegrationExample';
 * 
 * function App() {
 *   return <SecurityIntegrationExample />;
 * }
 */