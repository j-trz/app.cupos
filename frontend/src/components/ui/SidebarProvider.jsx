import React, { createContext, useContext, useEffect, useState } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children, defaultCollapsed = false, dir = 'ltr' }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    function onKey(e) {
      const key = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'b') {
        e.preventDefault();
        setCollapsed((s) => !s);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSidebar = () => setCollapsed((s) => !s);

  const value = {
    collapsed,
    setCollapsed,
    toggleSidebar,
    isMobile,
    dir,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  try {
    return useContext(SidebarContext);
  } catch (e) {
    return null;
  }
}

export default SidebarProvider;
