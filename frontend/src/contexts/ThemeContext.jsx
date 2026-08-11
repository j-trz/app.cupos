import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// La app fuerza modo claro siempre — no sigue la preferencia de sistema/
// navegador. El modo oscuro (basado en prefers-color-scheme + clase "dark")
// dejaba texto blanco sobre fondos que no habían migrado a dark, así que se
// retiró en vez de mantenerlo a medio terminar. `theme` queda fijo en
// 'light' y toggleTheme/setTheme son no-ops — se mantiene la forma del
// contexto para no tocar cada consumidor de useTheme().
export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const value = {
    theme: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
