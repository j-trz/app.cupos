import React, { createContext, useContext, useState, useEffect } from 'react'; // eslint-disable-line no-unused-vars
import AuthorizationService from '../services/authorizationService';
import ApiClient from '../services/apiClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Persistir perfil en localStorage para evitar pérdida de rol
  const persistProfile = (profileData) => {
    if (profileData) {
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      console.log('💾 Perfil persistido:', profileData.role);
    }
  };

  const getPersistedProfile = () => {
    try {
      const stored = localStorage.getItem('userProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📱 Perfil recuperado de localStorage:', parsed.role);
        return parsed;
      }
    } catch (error) {
      console.error('Error recovering persisted profile:', error);
    }
    return null;
  };

  const clearPersistedProfile = () => {
    localStorage.removeItem('userProfile');
    console.log('🧹 Perfil persistido limpiado');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MODO API BACKEND LOCAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Inicializar sesión en modo API local
   * Recupera el token JWT y el perfil guardados en localStorage
   */
  const initializeApiAuth = () => {
    const token = localStorage.getItem('api_token');
    if (!token) return false;

    ApiClient.setToken(token);

    const persisted = getPersistedProfile();
    if (persisted) {
      // Reconstruir objeto "user" mínimo compatible con el resto del contexto
      const minUser = {
        id: persisted.id,
        email: persisted.email,
      };
      setUser(minUser);
      setProfile(persisted);
      console.log('✅ [API MODE] Sesión restaurada desde localStorage:', persisted.role);
      return true;
    }
    return false;
  };

  /**
   * Login local a través de la API backend
   */
  const signInWithApi = async (email, password) => {
    const data = await ApiClient.post('/auth/login', { email, password });

    if (!data.token) throw new Error(data.error || 'Credenciales inválidas');

    // Guardar token
    ApiClient.setToken(data.token);
    localStorage.setItem('api_token', data.token);

    const userProfile = {
      id: data.user?.id,
      email: data.user?.email,
      role: data.user?.role || AuthorizationService.ROLES.AGENCY_USER,
      agency: data.user?.agency || null,
      nombre: data.user?.nombre || null,
      apellido: data.user?.apellido || null,
    };

    const minUser = { id: userProfile.id, email: userProfile.email };
    setUser(minUser);
    setProfile(userProfile);
    persistProfile(userProfile);
    console.log('✅ [API MODE] Login exitoso:', userProfile.role);
    return { user: minUser, profile: userProfile };
  };

  /**
   * Cierre de sesión en modo API local
   */
  const signOutApi = () => {
    ApiClient.clearToken();
    localStorage.removeItem('api_token');
    handleSignOut();
  };

  /**
   * Sincronizar estado del contexto después del login en modo API
   * Este método debe llamarse después de que SecurityLogin complete el login
   */
  const syncApiAuth = (userProfile) => {
    if (!userProfile) return;

    const minUser = { id: userProfile.id, email: userProfile.email };
    setUser(minUser);
    setProfile(userProfile);
    persistProfile(userProfile);
    console.log('✅ [API MODE] Contexto sincronizado:', userProfile.role);
  };

  // Inicializar sesión al montar
  useEffect(() => {
    initializeApiAuth();
    setIsLoading(false);
    setIsInitialized(true);
  }, []);

  /**
   * Manejar cierre de sesión
   */
  const handleSignOut = () => {
    setUser(null);
    setProfile(null);
    AuthorizationService.clearCache();
    clearPersistedProfile();
    console.log('🔒 Usuario desconectado y datos limpiados');
  };

  /**
   * Cerrar sesión manualmente
   */
  const signOut = async () => {
    try {
      signOutApi();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  /**
   * Actualizar perfil en el contexto
   */
  const updateProfile = (updates) => {
    if (profile) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      persistProfile(updatedProfile);

      if (user?.id) {
        AuthorizationService._profileCache.set(user.id, updatedProfile);
        AuthorizationService._cacheExpiry.set(
          user.id,
          Date.now() + AuthorizationService.CACHE_DURATION
        );
      }
    }
  };

  /**
   * Verificaciones de rol optimizadas (sin llamadas a BD)
   */
  const isAdmin = () => {
    return profile?.role === AuthorizationService.ROLES.ADMIN;
  };

  const isAgencyAdmin = () => {
    return profile?.role === AuthorizationService.ROLES.AGENCY_ADMIN;
  };

  const isAgencyUser = () => {
    return profile?.role === AuthorizationService.ROLES.AGENCY_USER;
  };

  const hasAdminAccess = () => {
    return isAdmin();
  };

  const hasAgencyAdminAccess = () => {
    return isAdmin() || isAgencyAdmin();
  };

  /**
   * Verificar acceso a rutas específicas
   */
  const canAccessRoute = (route) => {
    if (!profile) return false;

    const adminOnlyRoutes = [
      '/admin/gestion-usuarios',
      '/admin/seguridad',
      '/admin/crear-usuario'
    ];

    const agencyAdminRoutes = [
      '/admin/confirmaciones'
    ];

    if (adminOnlyRoutes.includes(route)) {
      return isAdmin();
    }

    if (agencyAdminRoutes.includes(route)) {
      return hasAgencyAdminAccess();
    }

    return true;
  };

  const value = {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    signOut,
    signInWithApi,   // Disponible para la pantalla de login
    syncApiAuth,     // Sincronizar contexto después del login
    updateProfile,
    // Verificaciones de rol optimizadas
    isAdmin,
    isAgencyAdmin,
    isAgencyUser,
    hasAdminAccess,
    hasAgencyAdminAccess,
    canAccessRoute,
    // Info útil
    userRole: profile?.role || AuthorizationService.ROLES.AGENCY_USER,
    userAgency: profile?.agency || null,
    userEmail: user?.email || null,
    // Flag de modo de autenticación
    isApiMode: true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;