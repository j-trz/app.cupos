import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children, ...props }) {
  const [collapsed, setCollapsed] = useState(false);
  // mobileOpen: separado de "collapsed" (que es el toggle mini-sidebar de
  // escritorio) — controla si el drawer deslizante está abierto en pantallas
  // angostas (por debajo de md), donde el sidebar no se renderiza en flujo.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }} {...props}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  return context;
}