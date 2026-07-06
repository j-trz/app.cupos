import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ApiClient from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      let sessionUser = ApiClient.getSessionUser();
      
      // En modo desarrollo, si no hay usuario de sesión, crear uno de prueba
      if (!sessionUser && process.env.NODE_ENV === 'development') {
        const testUser = {
          id: 1,
          email: 'admin@example.com',
          nombre: 'Admin',
          apellido: 'User',
          rol: 'Administrador',
          activo: true,
          permissions: ['read', 'write', 'delete', 'manage_users', 'manage_products', 'manage_reservations']
        };
        ApiClient.setSessionUser(testUser);
        sessionUser = testUser;
        console.log("Created test user for development");
      }
      
      setUser(sessionUser);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const signIn = (userData) => {
    ApiClient.setSessionUser(userData);
    setUser(userData);
  };

  const signOut = () => {
    ApiClient.clearSession();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signOut,
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