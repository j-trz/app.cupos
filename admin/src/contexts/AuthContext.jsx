import React, { createContext, useContext, useState, useEffect } from 'react'; // eslint-disable-line no-unused-vars
import { supabase } from '../supabaseClient';
import AuthorizationService from '../services/authorizationService';

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

  // Inicializar sesión al montar
  useEffect(() => {
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
          // En refresh de token, mantener datos y verificar perfil si es necesario
          setUser(session.user);
          
          // Si no tenemos perfil o solo tenemos el perfil por defecto, intentar recargar
          if (!profile || profile.role === AuthorizationService.ROLES.AGENCY_USER) {
            const persisted = getPersistedProfile();
            if (persisted) {
              setProfile(persisted);
              console.log('🔄 Perfil restaurado desde localStorage después de token refresh');
            } else {
              // Intentar obtener perfil real
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
   * Inicializar autenticación
   */
  const initializeAuth = async () => {
    try {
      console.log('🔄 Inicializando autenticación...');
      setIsLoading(true);
      
      // Verificar sesión actual
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
   * Manejar inicio de sesión exitoso
   */
  const handleSignIn = async (authUser, fromInitialize = false) => {
    try {
      console.log(`🔄 handleSignIn iniciado (fromInitialize: ${fromInitialize})`);
      
      if (!fromInitialize) {
        setIsLoading(true);
      }
      
      setUser(authUser);
      console.log('👤 Usuario establecido:', authUser.email);
      
      // Primero intentar usar perfil persistido si existe
      const persistedProfile = getPersistedProfile();
      if (persistedProfile && persistedProfile.id === authUser.id) {
        setProfile(persistedProfile);
        console.log('✅ Perfil cargado desde localStorage:', persistedProfile.role);
        
        // Verificar en background si hay actualizaciones
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
        
        return; // Salir temprano, ya tenemos el perfil
      }
      
      // Si no hay perfil persistido, crear uno temporal de agency_user
      const defaultProfile = {
        id: authUser.id,
        email: authUser.email,
        role: AuthorizationService.ROLES.AGENCY_USER,
        agency: null
      };
      
      setProfile(defaultProfile);
      console.log('⏳ Perfil temporal establecido, obteniendo perfil real...');
      
      // Intentar obtener perfil real con timeout más largo
      try {
        const profilePromise = AuthorizationService.getCurrentUserProfile();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 8000) // Aumentado a 8 segundos
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
      
      // Intentar usar perfil persistido como fallback
      const persistedProfile = getPersistedProfile();
      if (persistedProfile && persistedProfile.id === authUser.id) {
        setProfile(persistedProfile);
        console.log('🔧 Perfil de emergencia desde localStorage:', persistedProfile.role);
      } else {
        // Último recurso: perfil temporal
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
      
      // Actualizar cache
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

    // Rutas públicas para usuarios autenticados
    return true;
  };

  const value = {
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    signOut,
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
    userEmail: user?.email || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;