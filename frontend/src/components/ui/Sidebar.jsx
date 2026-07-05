import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Plane, ClipboardList, CheckCircle2, User, Settings, Users, Bell, Package, Building2, CreditCard, ChevronLeft, ChevronRight, LogOut, ChevronDown, Palette } from 'lucide-react';
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
];

// Admin-only items
const adminNavItems = [
  { label: 'Productos', path: '/products', icon: Package },
  { label: 'Agencias', path: '/agencias', icon: Building2 },
  { label: 'Usuarios', path: '/usuarios', icon: Users },
  { label: 'Reservas', path: '/reservas', icon: CreditCard },
  { label: 'Marca Blanca', path: '/marca-blanca', icon: Palette },
];

export default function Sidebar({ user = {}, onLogout = () => { }, dir = 'ltr' }) {
  const ctx = useSidebar();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = ctx ? ctx.collapsed : localCollapsed;
  const setCollapsed = ctx ? ctx.setCollapsed : setLocalCollapsed;
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = user?.role === 'admin';

  // Fetch unread notifications count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const count = await NotificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnread();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <TooltipProvider>
      <aside
        data-sidebar
        dir={dir}
        className={clsx(
          'relative h-screen shrink-0 border-r bg-slate-950 text-slate-100 transition-all duration-200 ease-in-out',
          collapsed ? 'w-20' : 'w-[320px] '
        )}
      >

        <div className="flex h-full flex-col justify-between px-4 py-6">
          <div className="space-y-6">
            <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className={clsx('rounded-md bg-slate-900 p-2 text-white', collapsed ? 'p-2' : 'p-3')}>
                <span className="sr-only">Gestión de cupos</span>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {!collapsed && (
                <div>
                  <h1 className="mt-1 text-2xl font-semibold text-white">Gestión de cupos</h1>
                  <p className="mt-1 text-xs text-slate-400">Control de reservas y confirmaciones.</p>
                </div>
              )}
            </div>

            <nav className="mt-2 flex flex-col gap-2">
              {navItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-3xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-white text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed ? 'justify-center px-2' : 'px-4'
                    )
                  }
                >
                  <Tooltip label={label}>
                    <Icon className="h-5 w-5" />
                  </Tooltip>
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}

              {/* Admin-only menu items */}
              {isAdmin && adminNavItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-3xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-white text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed ? 'justify-center px-2' : 'px-4'
                    )
                  }
                >
                  <Tooltip label={label}>
                    <Icon className="h-5 w-5" />
                  </Tooltip>
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Footer: user info and logout, profile menu opens above */}
          <div className="mt-6 px-2">
            <div className={clsx('relative flex w-full items-center', collapsed ? 'justify-center' : '')}>
              <div className={clsx('w-full', collapsed ? 'flex justify-center' : '')}>
                <div className="relative">
                  <div className={clsx('flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-100 shadow-sm', collapsed ? 'flex-col p-2' : '')}>
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-white">
                      <User className="h-5 w-5" />
                    </div>
                    {!collapsed ? (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-semibold">{user.nombre || user.email || 'Invitado'}</p>
                            <p className="text-xs text-slate-400">{user.agencia || 'Agencia no definida'}</p>
                          </div>
                          <div className="ml-auto">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button aria-label="Abrir opciones de perfil" className="inline-flex items-center rounded-full p-1 text-slate-300 hover:bg-slate-800 relative">
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="px-3 py-2">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white">{user.nombre || user.email || 'Invitado'}</span>
                                    <span className="text-xs text-slate-400">{user.agencia || 'Agencia no definida'}</span>
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
                                    {unreadCount > 0 && (
                                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                      </span>
                                    )}
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
                                <DropdownMenuItem onClick={onLogout} className="gap-2 text-red-400 hover:bg-red-950/50 hover:text-red-300 focus:bg-red-950/50 focus:text-red-300">
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
                            <button aria-label="Abrir opciones de perfil" className="inline-flex items-center rounded-full p-1 text-slate-300 hover:bg-slate-800">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="px-3 py-2">
                              <span className="text-sm font-semibold text-white">Invitado</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onLogout} className="gap-2 text-red-400 hover:bg-red-950/50 hover:text-red-300 focus:bg-red-950/50 focus:text-red-300">
                              <LogOut className="h-4 w-4" />
                              <span>Cerrar sesión</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {/* menu ahora usa DropdownMenu en el trigger */}
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </TooltipProvider>
  );
}