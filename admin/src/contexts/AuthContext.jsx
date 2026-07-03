import React, { createContext, useContext, useState, useEffect } from 'react'; // eslint-disable-line no-unused-vars
import { supabase } from '../supabaseClient';
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
  // MODO API BACKEND LOCAL (VITE_API_URL configurado)
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

  // ─────────────────────────────────────────────────────────────────────────────
  // MODO SUPABASE (por defecto cuando no hay VITE_API_URL)
  // ─────────────────────────────────────────────────────────────────────────────

  // Inicializar sesión al montar
  useEffect(() => {
    if (ApiClient.isApiEnabled()) {
      // Modo API local
      initializeApiAuth();
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    // Modo Supabase
    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          await handleSignIn(session.user, false);
        } else if (event === 'SIGNED_OUT') {
          handleSignOut();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);

          if (!profile || profile.role === AuthorizationService.ROLES.AGENCY_USER) {
            const persisted = getPersistedProfile();
            if (persisted) {
              setProfile(persisted);
              console.log('🔄 Perfil restaurado desde localStorage después de token refresh');
            } else {
              try {
                const userProfile = await AuthorizationService.getCurrentUserProfile();
                if (userProfile && userProfile.id) {
                  setProfile(userProfile);
                  persistProfile(userProfile);
                  console.log('🔄 Perfil recargado después de token refresh:', userProfile.role);
                }
              } catch (error) {
                console.warn('⚠️ No se pudo recargar perfil después de token refresh:', error);
              }
            }
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Inicializar autenticación (modo Supabase)
   */
  const initializeAuth = async () => {
    try {
      console.log('🔄 Inicializando autenticación...');
      setIsLoading(true);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Error getting session:', error);
        handleSignOut();
        return;
      }

      if (session?.user) {
        console.log('✅ Sesión encontrada, cargando perfil...');
        await handleSignIn(session.user, true);
      } else {
        console.log('ℹ️ No hay sesión activa');
        handleSignOut();
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      handleSignOut();
    } finally {
      console.log('✅ Inicialización completada');
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  /**
   * Manejar inicio de sesión exitoso (modo Supabase)
   */
  const handleSignIn = async (authUser, fromInitialize = false) => {
    try {
      console.log(`🔄 handleSignIn iniciado (fromInitialize: ${fromInitialize})`);

      if (!fromInitialize) {
        setIsLoading(true);
      }

      setUser(authUser);
      console.log('👤 Usuario establecido:', authUser.email);

      const persistedProfile = getPersistedProfile();
      if (persistedProfile && persistedProfile.id === authUser.id) {
        setProfile(persistedProfile);
        console.log('✅ Perfil cargado desde localStorage:', persistedProfile.role);

        AuthorizationService.getCurrentUserProfile()
          .then(realProfile => {
            if (realProfile && realProfile.id && realProfile.role !== persistedProfile.role) {
              setProfile(realProfile);
              persistProfile(realProfile);
              console.log('🔄 Perfil actualizado en background:', realProfile.role);
            }
          })
          .catch(error => {
            console.warn('⚠️ Error verificando perfil en background:', error);
          });

        return;
      }

      const defaultProfile = {
        id: authUser.id,
        email: authUser.email,
        role: AuthorizationService.ROLES.AGENCY_USER,
        agency: null
      };

      setProfile(defaultProfile);
      console.log('⏳ Perfil temporal establecido, obteniendo perfil real...');

      try {
        const profilePromise = AuthorizationService.getCurrentUserProfile();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );

        const userProfile = await Promise.race([profilePromise, timeoutPromise]);

        if (userProfile && userProfile.id) {
          setProfile(userProfile);
          persistProfile(userProfile);
          console.log('✅ Perfil real cargado y persistido:', {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            agency: userProfile.agency
          });
        } else {
          console.warn('⚠️ Perfil de BD vacío - manteniendo perfil temporal');
        }
      } catch (profileError) {
        console.warn('⚠️ Error/timeout obteniendo perfil de BD:', profileError.message);
        console.log('✅ Continuando con perfil temporal');
      }

    } catch (error) {
      console.error('❌ Error crítico en handleSignIn:', error);

      const persistedProfile = getPersistedProfile();
      if (persistedProfile && persistedProfile.id === authUser.id) {
        setProfile(persistedProfile);
        console.log('🔧 Perfil de emergencia desde localStorage:', persistedProfile.role);
      } else {
        const fallbackProfile = {
          id: authUser.id,
          email: authUser.email,
          role: AuthorizationService.ROLES.AGENCY_USER,
          agency: null
        };
        setProfile(fallbackProfile);
        console.log('🔧 Perfil de emergencia temporal establecido:', fallbackProfile);
      }
    } finally {
      if (!fromInitialize) {
        console.log('✅ handleSignIn completado, deteniendo loading');
        setIsLoading(false);
      }
    }
  };

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
      if (ApiClient.isApiEnabled()) {
        signOutApi();
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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

      if (user?.id && !ApiClient.isApiEnabled()) {
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
      '/admin/gestion-conexiones',
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
    signInWithApi,   // Disponible para la pantalla de login cuando VITE_API_URL está activo
    syncApiAuth,     // Sincronizar contexto después del login en modo API
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
    isApiMode: ApiClient.isApiEnabled(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;