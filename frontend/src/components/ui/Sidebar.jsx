import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Plane, ClipboardList, CheckCircle2, BarChart3, User, Settings, Users, Bell, Package, Building2, CreditCard, ChevronLeft, ChevronRight, LogOut, ChevronDown, Palette, Mail, Bot, Shield, Key, Menu, X } from 'lucide-react';
import { ShadcnButton as Button } from './shadcn-button';
import clsx from 'clsx';
import { useSidebar } from './SidebarProvider.jsx';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './shadcn-tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './shadcn-dropdown-menu';
import NotificationService from '../../services/notificationService.js';

const navItems = [
  { label: 'Inicio', path: '/dashboard', icon: Home },
  { label: 'Disponibilidad', path: '/availability', icon: Plane },
  { label: 'Solicitudes', path: '/requests', icon: ClipboardList },
  { label: 'Confirmaciones', path: '/confirmations', icon: CheckCircle2 },
  { label: 'Reportes', path: '/reportes', icon: BarChart3 },
];

// Admin-only items
const adminNavItems = [
  { label: 'Productos', path: '/products', icon: Package },
  { label: 'Agencias', path: '/agencias', icon: Building2 },
  { label: 'Usuarios', path: '/usuarios', icon: Users },
  { label: 'Reservas', path: '/reservas', icon: CreditCard },
];

// Settings items (grouped under Settings)
const settingsItems = [
  { label: 'Marca Blanca', path: '/marca-blanca', icon: Palette },
  { label: 'Configuración de Email', path: '/email-config', icon: Mail },
  { label: 'Configuración de IA', path: '/config-ia', icon: Bot },
];

// User management items (grouped under Usuarios)
const userManagementItems = [
  { label: 'Roles', path: '/roles', icon: Shield },
  { label: 'Permisos', path: '/permisos', icon: Key },
];

export default function Sidebar({ user = {}, onLogout = () => { }, dir = 'ltr' }) {
  const ctx = useSidebar();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = ctx ? ctx.collapsed : localCollapsed;
  const setCollapsed = ctx ? ctx.setCollapsed : setLocalCollapsed;
  const [openSubmenus, setOpenSubmenus] = useState({});
  const location = useLocation();

  const isAdmin = user?.role === 'admin';

  // Toggle submenu visibility
  const toggleSubmenu = (submenu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [submenu]: !prev[submenu]
    }));
  };

  // Check if current path belongs to a submenu
  const isSubmenuActive = (items) => {
    return items.some(item => location.pathname.startsWith(item.path));
  };

  // Get active state for a specific item
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <TooltipProvider>
      <aside
        data-sidebar
        dir={dir}
        className={clsx(
          'relative h-screen shrink-0 border-r bg-slate-950 text-slate-100 transition-all duration-200 ease-in-out',
          collapsed ? 'w-20' : 'w-80' // Cambiado de w-[320px] a w-80 (320px) para mejor consistencia
        )}
      >

        <div className="flex h-full flex-col justify-between px-4 py-6">
          <div className="space-y-6">
            {/* Header del sidebar con logo y nombre */}
            <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className={clsx('rounded-md bg-slate-900 p-2 text-white', collapsed ? 'p-2' : 'p-3')}>
                <span className="sr-only">Gestión de Cupos</span>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <h1 className="text-lg font-semibold text-white">Gestión de Cupos</h1>
                  <p className="text-xs text-slate-400">{user.agencia || 'Tu Agencia'}</p>
                </div>
              )}
            </div>

            {/* Separador opcional */}
            {!collapsed && (
              <div className="border-t border-slate-800 my-2"></div>
            )}

            <nav className="flex flex-col gap-1">

              {/* Main navigation items */}
              {navItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-white text-slate-950 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'
                    )
                  }
                >
                  <Icon className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}

              {/* Admin-only menu items */}
              {isAdmin && adminNavItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-white text-slate-950 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'
                    )
                  }
                >
                  <Icon className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}

              {/* Separador antes de los grupos */}
              {isAdmin && !collapsed && (
                <div className="border-t border-slate-800 my-2 mx-2"></div>
              )}

              {/* Settings submenu */}
              {isAdmin && (
                <div className="mt-1">
                  <button
                    onClick={() => toggleSubmenu('settings')}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isSubmenuActive(settingsItems) 
                        ? 'bg-white text-slate-950 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'
                    )}
                  >
                    <Settings className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                    {!collapsed && <span className="flex-1 text-left truncate">Ajustes</span>}
                    {!collapsed && (
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSubmenus.settings ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!collapsed && openSubmenus.settings && (
                    <div className="ml-6 mt-1 space-y-1 pl-2 border-l border-slate-700">
                      {settingsItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                              isActive 
                                ? 'bg-slate-800 text-white' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            )
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User management submenu */}
              {isAdmin && (
                <div className="mt-1">
                  <button
                    onClick={() => toggleSubmenu('userManagement')}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isSubmenuActive(userManagementItems) 
                        ? 'bg-white text-slate-950 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'
                    )}
                  >
                    <Users className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                    {!collapsed && <span className="flex-1 text-left truncate">Usuarios</span>}
                    {!collapsed && (
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSubmenus.userManagement ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!collapsed && openSubmenus.userManagement && (
                    <div className="ml-6 mt-1 space-y-1 pl-2 border-l border-slate-700">
                      {userManagementItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                              isActive 
                                ? 'bg-slate-800 text-white' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            )
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Footer: user info and logout */}
          <div className="px-2">
            <div className={clsx('relative flex w-full items-center', collapsed ? 'justify-center' : '')}>
              <div className={clsx('w-full', collapsed ? 'flex justify-center' : '')}>
                <div className="relative">
                  <div className={clsx('flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 shadow-sm', collapsed ? 'flex-col p-2' : 'p-3')}>
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-white">
                      <User className="h-4 w-4" />
                    </div>
                    {!collapsed ? (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.nombre || user.email || 'Invitado'}</p>
                            <p className="text-xs text-slate-400 truncate">{user.agencia || 'Agencia no definida'}</p>
                          </div>
                          <div className="ml-auto">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button 
                                  aria-label="Abrir opciones de perfil" 
                                  className="inline-flex items-center rounded-full p-1 text-slate-300 hover:bg-slate-800 relative"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="px-3 py-2">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white truncate">{user.nombre || user.email || 'Invitado'}</span>
                                    <span className="text-xs text-slate-400 truncate">{user.agencia || 'Agencia no definida'}</span>
                                  </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="gap-2">
                                  <a href="/profile">
                                    <User className="h-4 w-4" />
                                    <span>Perfil</span>
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="gap-2">
                                  <a href="/settings">
                                    <Settings className="h-4 w-4" />
                                    <span>Ajustes</span>
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="gap-2">
                                  <a href="/notificaciones">
                                    <Bell className="h-4 w-4" />
                                    <span>Notificaciones</span>
                                  </a>
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem asChild className="gap-2">
                                    <a href="/usuarios">
                                      <Users className="h-4 w-4" />
                                      <span>Usuarios</span>
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={onLogout} 
                                  className="gap-2 text-red-400 hover:bg-red-950/50 hover:text-red-300 focus:bg-red-950/50 focus:text-red-300"
                                >
                                  <LogOut className="h-4 w-4" />
                                  <span>Cerrar sesión</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              aria-label="Abrir opciones de perfil" 
                              className="inline-flex items-center rounded-full p-1 text-slate-300 hover:bg-slate-800"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="px-3 py-2">
                              <span className="text-sm font-semibold text-white">Invitado</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={onLogout} 
                              className="gap-2 text-red-400 hover:bg-red-950/50 hover:text-red-300 focus:bg-red-950/50 focus:text-red-300"
                            >
                              <LogOut className="h-4 w-4" />
                              <span>Cerrar sesión</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </TooltipProvider>
  );
}