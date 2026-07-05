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
