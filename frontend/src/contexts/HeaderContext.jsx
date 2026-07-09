import React, { createContext, useContext, useState, useCallback } from 'react';

const HeaderContext = createContext();

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};

export const HeaderProvider = ({ children }) => {
  const [headerData, setHeaderState] = useState({
    title: '',
    description: '',
    icon: null,
    badge: null,
    action: null,
  });

  const setHeaderData = useCallback((data) => {
    setHeaderState((prev) => {
      // Evitar actualizaciones de estado si son idénticas
      if (
        prev.title === data.title &&
        prev.description === data.description &&
        prev.icon === data.icon &&
        prev.badge === data.badge &&
        prev.action === data.action
      ) {
        return prev;
      }
      return {
        title: data.title || '',
        description: data.description || '',
        icon: data.icon || null,
        badge: data.badge || null,
        action: data.action || null,
      };
    });
  }, []);

  const clearHeaderData = useCallback(() => {
    setHeaderState({
      title: '',
      description: '',
      icon: null,
      badge: null,
      action: null,
    });
  }, []);

  const value = {
    headerData,
    setHeaderData,
    clearHeaderData,
  };

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
};
