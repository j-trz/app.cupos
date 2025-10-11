import { useState, useEffect } from "react";
import { FaUnlock, FaShieldAlt, FaUsers, FaExclamationTriangle, FaClock, FaEye, FaKey, FaTrash, FaCheck } from "react-icons/fa";
import { LuRefreshCw } from "react-icons/lu";

import SecurityService from "../services/securityService";
import TwoFactorService from "../services/twoFactorService";
import AuthorizationService from "../services/authorizationService";

/**
 * Panel de administración de seguridad
 */
export default function SecurityAdminPanel() {
  const [lockedUsers, setLockedUsers] = useState([]);
  const [users2FA, setUsers2FA] = useState([]);
  const [securityStats, setSecurityStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("locked"); // locked, 2fa

  useEffect(() => {
    checkAdminAccess();
    loadData();
  }, []);

  /**
   * Verificar acceso de administrador
   */
  const checkAdminAccess = async () => {
    const userProfile = await AuthorizationService.getCurrentUserProfile();
    if (!userProfile || userProfile.role !== "admin") {
      setError("Acceso denegado. Solo administradores pueden acceder a este panel.");
      return false;
    }
    return true;
  };

  /**
   * Cargar datos del panel
   */
  const loadData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const hasAccess = await checkAdminAccess();
      if (!hasAccess) return;

      // Cargar usuarios bloqueados, usuarios 2FA y estadísticas en paralelo
      const [lockedUsersResult, users2FAResult, statsResult] = await Promise.all([
        SecurityService.getLockedUsers(),
        TwoFactorService.getAllUsers2FA(),
        SecurityService.getSecurityStats(),
      ]);

      if (lockedUsersResult.success) {
        setLockedUsers(lockedUsersResult.lockedUsers);
      } else {
        console.error("Error loading locked users:", lockedUsersResult.error);
      }

      if (users2FAResult.success) {
        setUsers2FA(users2FAResult.users);
      } else {
        console.error("Error loading 2FA users:", users2FAResult.error);
      }

      if (statsResult.success) {
        setSecurityStats(statsResult.stats);
      } else {
        console.error("Error loading security stats:", statsResult.error);
      }
    } catch (error) {
      console.error("Error loading security data:", error);
      setError("Error al cargar datos de seguridad");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desbloquear usuario
   */
  const handleUnlockUser = async (userId, userEmail) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    setError("");
    setSuccess("");

    try {
      const result = await SecurityService.unlockUser(userId);
      
      if (result.success) {
        setSuccess(`Usuario ${userEmail} desbloqueado exitosamente`);
        
        // Actualizar lista eliminando el usuario desbloqueado
        setLockedUsers(prev => prev.filter(user => user.user_id !== userId));
        
        // Actualizar estadísticas
        setSecurityStats(prev => ({
          ...prev,
          lockedUsers: Math.max(0, prev.lockedUsers - 1),
        }));

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Error al desbloquear usuario");
      }
    } catch (error) {
      console.error("Error unlocking user:", error);
      setError("Error inesperado al desbloquear usuario");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  /**
   * Reset 2FA de usuario
   */
  const handleReset2FA = async (userId, userEmail) => {
    if (!confirm(`¿Está seguro de que desea resetear el 2FA para ${userEmail}? El usuario deberá configurarlo nuevamente.`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [`2fa_${userId}`]: true }));
    setError("");
    setSuccess("");

    try {
      const result = await TwoFactorService.admin_reset2FA(userId);
      
      if (result.success) {
        setSuccess(`2FA reseteado exitosamente para ${userEmail}`);
        
        // Recargar datos
        loadData();

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "Error al resetear 2FA");
      }
    } catch (error) {
      console.error("Error resetting 2FA:", error);
      setError("Error inesperado al resetear 2FA");
    } finally {
      setActionLoading(prev => ({ ...prev, [`2fa_${userId}`]: false }));
    }
  };

  /**
   * Formatear fecha
   */
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  /**
   * Calcular tiempo restante de bloqueo
   */
  const getTimeRemaining = (lockedAt) => {
    if (!lockedAt) return "N/A";
    
    const lockTime = new Date(lockedAt);
    const unlockTime = new Date(lockTime.getTime() + (30 * 60 * 1000)); // 30 minutos
    const now = new Date();
    
    if (now >= unlockTime) {
      return "Desbloqueado automáticamente";
    }
    
    const remainingMs = unlockTime - now;
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    return `${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error && !securityStats.totalUsers) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <FaExclamationTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error de Acceso</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaShieldAlt className="text-[#2c4b8b]" />
            Panel de Seguridad
          </h1>
          <p className="text-gray-600">Gestión de usuarios bloqueados, 2FA y estadísticas de seguridad</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-[#2c4b8b] text-white px-4 py-2 rounded-lg hover:bg-[#1a2952] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <LuRefreshCw  className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FaUnlock className="text-green-500" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{securityStats.totalUsers || 0}</p>
            </div>
            <FaUsers className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Bloqueados</p>
              <p className="text-2xl font-bold text-red-600">{securityStats.lockedUsers || 0}</p>
            </div>
            <FaExclamationTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sesiones Activas</p>
              <p className="text-2xl font-bold text-green-600">{securityStats.activeSessions || 0}</p>
            </div>
            <FaEye className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios con 2FA</p>
              <p className="text-2xl font-bold text-purple-600">{securityStats.users2FA || users2FA.length}</p>
            </div>
            <FaKey className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("locked")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "locked"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <FaExclamationTriangle />
                Usuarios Bloqueados ({lockedUsers.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("2fa")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "2fa"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <FaKey />
                Gestión 2FA ({users2FA.length})
              </div>
            </button>
          </nav>
        </div>

        {/* Contenido de pestañas */}
        {activeTab === "locked" && (
          <>

            {lockedUsers.length === 0 ? (
              <div className="p-8 text-center">
                <FaShieldAlt className="mx-auto h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios bloqueados</h3>
                <p className="text-gray-600">Todos los usuarios tienen acceso normal al sistema.</p>
              </div>
            ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intentos Fallidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bloqueado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiempo Restante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Razón
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lockedUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.profiles?.full_name || user.profiles?.nombre || (user.profiles?.email ? user.profiles.email.split("@")[0] : "Sin nombre")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.profiles?.email || "Sin email"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.profiles?.agency || user.profiles?.agencia || "Sin agencia"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {user.failed_attempts_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(user.locked_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <FaClock className="text-orange-500" />
                        {getTimeRemaining(user.locked_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.locked_reason || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleUnlockUser(user.user_id, user.profiles.email)}
                        disabled={actionLoading[user.user_id]}
                        className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading[user.user_id] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Desbloqueando...</span>
                          </>
                        ) : (
                          <>
                            <FaUnlock />
                            <span>Desbloquear</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            )}
          </>
        )}

        {/* Tab de gestión 2FA */}
        {activeTab === "2fa" && (
          <>
            {users2FA.length === 0 ? (
              <div className="p-8 text-center">
                <FaKey className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios con 2FA configurado</h3>
                <p className="text-gray-600">Ningún usuario tiene autenticación de doble factor activada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agencia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Configurado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Códigos Backup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users2FA.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.profiles?.full_name || user.profiles?.nombre || (user.profiles?.email ? user.profiles.email.split("@")[0] : "Sin nombre")}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.profiles?.email || "Sin email"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.profiles?.agency || user.profiles?.agencia || "Sin agencia"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.backup_codes_count || 0} disponibles
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaCheck className="mr-1" />
                            Activo
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleReset2FA(user.user_id, user.profiles?.email)}
                            disabled={actionLoading[`2fa_${user.user_id}`]}
                            className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading[`2fa_${user.user_id}`] ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Reseteando...</span>
                              </>
                            ) : (
                              <>
                                <FaTrash />
                                <span>Reset 2FA</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}