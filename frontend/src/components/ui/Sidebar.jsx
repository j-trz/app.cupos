import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Plane, ClipboardList, CheckCircle2, BarChart3, User, Settings, Users, Bell, Package, Building2, CreditCard, ChevronLeft, ChevronRight, LogOut, ChevronDown, Palette, Mail, Bot, Shield, Key, Menu, X, Sparkles } from 'lucide-react';
import { ShadcnButton as Button } from './shadcn-button';
import clsx from 'clsx';
import { useSidebar } from './SidebarProvider.jsx';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './shadcn-tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './shadcn-dropdown-menu';
import NotificationService from '../../services/notificationService.js';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Disponibilidad', path: '/availability', icon: Plane },
  { label: 'Solicitudes', path: '/requests', icon: ClipboardList },
  { label: 'Confirmaciones', path: '/confirmations', icon: CheckCircle2 },
  { label: 'Reportes', path: '/reportes', icon: BarChart3 },
];

// Admin-only items
const adminNavItems = [
  { label: 'Productos', path: '/products', icon: Package },
  { label: 'Agencias', path: '/agencias', icon: Building2 },
  { label: 'Reservas', path: '/reservas', icon: CreditCard },
];

// Settings items (grouped under Ajustes)
const settingsItems = [
  { label: 'Diseño', path: '/marca-blanca', icon: Palette },
  { label: 'Configuración de Email', path: '/email-config', icon: Mail },
  { label: 'Configuración de IA', path: '/config-ia', icon: Bot },
];

// User management items (grouped under Usuarios)
const userManagementItems = [
  { label: 'Gestión de usuarios', path: '/usuarios', icon: Users },
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
          'relative h-screen shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-72'
        )}
      >
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-2">
            {/* Header del sidebar con logo, nombre de plataforma y agencia - Estilo Vercel */}
            <div className={clsx('px-3 py-3', collapsed ? 'flex justify-center' : '')}>
              <div className={clsx('flex items-center gap-2', collapsed ? '' : 'mb-3')}>
                <div className={clsx(
                  'flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shrink-0',
                  collapsed ? 'h-8 w-8' : 'h-9 w-9'
                )}>
                  <Sparkles className={clsx(collapsed ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                </div>
                {!collapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xl font-medium text-zinc-700 dark:text-zinc-300 truncate leading-tight">
                      Gestión de Cupos
                    </span>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">
                      {user.agencia || 'Tu Agencia'}
                    </p>
                  </div>
                )}
              </div>
              {/* Botón para colapsar sidebar */}
              {!collapsed && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="absolute -right-3 top-[30%] h-6 w-6 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Colapsar sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {collapsed && (
                <button
                  onClick={() => setCollapsed(false)}
                  className="absolute -right-3 top-[30%] h-6 w-6 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Expandir sidebar"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Separador sutil */}
            {!collapsed && (
              <div className="mx-3 border-t border-zinc-200 dark:border-zinc-800" />
            )}



            <nav className="flex flex-col gap-0.5 px-2">
              {/* Main navigation items */}
              {navItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                      collapsed ? 'justify-center px-2 py-2' : ''
                    )
                  }
                >
                  <Icon className={clsx(collapsed ? 'h-4 w-4' : 'h-4 w-4', isActive && 'text-zinc-900 dark:text-zinc-100')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  )}
                </NavLink>
              ))}

              {/* Admin-only menu items */}
              {isAdmin && (
                <>
                  {!collapsed && (
                    <div className="my-2 px-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Administración</p>
                    </div>
                  )}
                  {adminNavItems.map(({ label, path, icon: Icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) =>
                        clsx(
                          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                          collapsed ? 'justify-center px-2 py-2' : ''
                        )
                      }
                    >
                      <Icon className={clsx(collapsed ? 'h-4 w-4' : 'h-4 w-4', isActive && 'text-zinc-900 dark:text-zinc-100')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {!collapsed && isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                      )}
                    </NavLink>
                  ))}
                </>
              )}

              {/* Separadores para submenús */}
              {isAdmin && !collapsed && (
                <>
                  <div className="my-2 px-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Gestión</p>
                  </div>
                </>
              )}

              {/* Settings submenu */}
              {isAdmin && (
                <div className="mt-0.5">
                  <button
                    onClick={() => toggleSubmenu('settings')}
                    className={clsx(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      isSubmenuActive(settingsItems)
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                      collapsed ? 'justify-center px-2 py-2' : ''
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">Ajustes</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openSubmenus.settings ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  {!collapsed && openSubmenus.settings && (
                    <div className="mt-1 ml-2 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                      {settingsItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                              isActive
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                            )
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{label}</span>
                          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User management submenu */}
              {isAdmin && (
                <div className="mt-0.5">
                  <button
                    onClick={() => toggleSubmenu('userManagement')}
                    className={clsx(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      isSubmenuActive(userManagementItems)
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
                      collapsed ? 'justify-center px-2 py-2' : ''
                    )}
                  >
                    <Users className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">Usuarios</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openSubmenus.userManagement ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  {!collapsed && openSubmenus.userManagement && (
                    <div className="mt-1 ml-2 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                      {userManagementItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                              isActive
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                            )
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{label}</span>
                          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Footer: user info and logout - Estilo Vercel */}
          <div className={clsx('px-2 pb-4', collapsed ? 'flex justify-center' : '')}>
            <div className={clsx(
              'relative flex w-full items-center rounded-lg  transition-all duration-200',
              collapsed
                ? 'justify-center'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-300/30 dark:bg-zinc-900/30 p-2 hover:border-zinc-300 dark:hover:border-zinc-700'
            )}>
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white text-xs font-semibold">
                {(user.nombre || user.email || 'I')[0]?.toUpperCase()}
              </div>
              {!collapsed ? (
                <div className="flex-1 min-w-0 ml-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {user.nombre || user.email || 'Invitado'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {user.role === 'admin' ? 'Administrador' : user.agencia || 'Agencia'}
                  </p>
                </div>
              ) : null}
              {!collapsed && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Abrir opciones de perfil"
                      className="ml-auto inline-flex items-center rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg">
                    <DropdownMenuLabel className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.nombre || user.email || 'Invitado'}
                        </span>
                        <span className="text-xs text-zinc-500 truncate">
                          {user.agencia || 'Agencia no definida'}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                      <a href="/profile" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span>Perfil</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                      <a href="/settings" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Settings className="h-4 w-4 text-zinc-500" />
                        <span>Ajustes</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                      <a href="/notificaciones" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Bell className="h-4 w-4 text-zinc-500" />
                        <span>Notificaciones</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onLogout}
                      className="gap-2 cursor-pointer text-red-600 hover:bg-red-30 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

        </div>
      </aside>
    </TooltipProvider>
  );
}