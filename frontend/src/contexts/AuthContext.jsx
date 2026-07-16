import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ApiClient from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionUser = ApiClient.getSessionUser();
    setUser(sessionUser);
    setIsLoading(false);
    if (sessionUser) {
      refreshPermissions(sessionUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trae los códigos de permiso resueltos para el usuario (GET
  // /users/me/permissions, ver rbac_handler.go) y los guarda junto al user en
  // sesión — así el resto de la app puede filtrar UI con can()/canModule()
  // sin repetir la lógica de roles/permisos en cada componente.
  const refreshPermissions = async (baseUser) => {
    try {
      const result = await ApiClient.get('/users/me/permissions');
      const permissions = result?.data || [];
      const updated = { ...baseUser, permissions };
      ApiClient.setSessionUser(updated);
      setUser(updated);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
    }
  };

  const signIn = (userData) => {
    ApiClient.setSessionUser(userData);
    setUser(userData);
    refreshPermissions(userData);
  };

  const signOut = () => {
    ApiClient.clearSession();
    setUser(null);
  };

  // can(code): ¿el usuario tiene el permiso MODULO_ACCION dado? admin
  // siempre true (mismo bypass que el backend). canModule es el azúcar para
  // no armar el string a mano en cada call site.
  const can = (code) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(code);
  };

  const canModule = (module, action) => can(`${module}_${action}`.toUpperCase());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signOut,
      can,
      canModule,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}