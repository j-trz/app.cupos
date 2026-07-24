import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Plane, ClipboardList, CheckCircle2, BarChart3, User, Settings, Users, Bell, Package, Luggage, Building2, CreditCard, ChevronLeft, ChevronRight, LogOut, ChevronDown, Palette, Mail, Bot, Shield, Key, Menu, X, Sparkles, ScrollText, BookOpen } from 'lucide-react';
import { ShadcnButton as Button } from './shadcn-button';
import clsx from 'clsx';
import Swal from 'sweetalert2';
import { useSidebar } from './SidebarProvider.jsx';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './shadcn-tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './shadcn-dropdown-menu';
import NotificationService from '../../services/notificationService.js';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext.jsx';
import { visibleDocsSections } from '../../lib/docsSections.js';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Disponibilidad', path: '/availability', icon: Plane },
  { label: 'Solicitudes', path: '/requests', icon: ClipboardList },
  { label: 'Confirmaciones', path: '/confirmations', icon: CheckCircle2 },
  { label: 'Asistente IA', path: '/asistente', icon: Bot },
];

// Admin-only items — cada uno declara el permiso MODULO_ACCION que lo
// habilita (ver GET /users/me/permissions), para que un rol personalizado
// pueda ver, por ejemplo, "Reportes" sin heredar automáticamente el resto.
const adminNavItems = [
  { label: 'Productos', path: '/productos', icon: Package, permission: 'PRODUCTS_VIEW' },
  { label: 'Grupos', path: '/grupos', icon: Luggage, permission: 'GROUPS_VIEW' },
  { label: 'Agencias', path: '/agencias', icon: Building2, permission: 'AGENCIES_VIEW' },
  { label: 'Reservas', path: '/reservas', icon: CreditCard, permission: 'RESERVATIONS_VIEW' },
  { label: 'Nóminas', path: '/nominas', icon: Users, permission: 'RESERVATIONS_VIEW' },
  { label: 'Reportes', path: '/reportes', icon: BarChart3, permission: 'REPORTS_VIEW' },
  { label: 'Logs del sitio', path: '/logs', icon: ScrollText, permission: 'LOGS_VIEW' },
];

// Settings items (grouped under Ajustes)
const settingsItems = [
  { label: 'Ajustes generales', path: '/settings', icon: Settings, permission: 'SETTINGS_VIEW' },
  { label: 'Diseño', path: '/marca-blanca', icon: Palette, permission: 'WHITE_LABEL_VIEW' },
  { label: 'Configuración de Email', path: '/email-config', icon: Mail, permission: 'EMAIL_VIEW' },
  { label: 'Notificaciones', path: '/notification-config', icon: Bell, permission: 'NOTIFICATION_TEMPLATES_VIEW' },
  { label: 'Configuración de IA', path: '/config-ia', icon: Bot, permission: 'AI_VIEW' },
];

// User management items (grouped under Usuarios)
const userManagementItems = [
  { label: 'Gestión de usuarios', path: '/usuarios', icon: Users, permission: 'USERS_VIEW' },
  { label: 'Roles', path: '/roles', icon: Shield, permission: 'ROLES_VIEW' },
  { label: 'Permisos', path: '/permisos', icon: Key, permission: 'PERMISSIONS_VIEW' },
];

export default function Sidebar({ user = {}, onLogout = () => { }, dir = 'ltr' }) {
  const ctx = useSidebar();
  const { config } = useWhiteLabel();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = ctx ? ctx.collapsed : localCollapsed;
  const setCollapsed = ctx ? ctx.setCollapsed : setLocalCollapsed;
  const mobileOpen = ctx ? ctx.mobileOpen : false;
  const setMobileOpen = ctx ? ctx.setMobileOpen : () => {};
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const previousUnreadRef = useRef(null);

  const isAdmin = user?.role === 'admin';
  // can(): admin siempre ve todo; el resto según los permisos resueltos por
  // el backend en GET /users/me/permissions (guardados en user.permissions
  // por AuthContext).
  const can = (code) => {
    if (!code) return true;
    if (isAdmin) return true;
    return Array.isArray(user?.permissions) && user.permissions.includes(code);
  };
  const visibleAdminNavItems = adminNavItems.filter((item) => can(item.permission));
  const visibleSettingsItems = settingsItems.filter((item) => can(item.permission));
  const visibleUserManagementItems = userManagementItems.filter((item) => can(item.permission));

  // Secciones de Documentación (grouped bajo Documentación) — una ruta propia
  // por sección en vez de un acordeón largo dentro del main. Filtradas por
  // rol para no linkear a documentación de funciones que el usuario no
  // puede usar (ver docsSections.js).
  const docsItems = useMemo(
    () => visibleDocsSections(user?.role).map((s) => ({ label: s.label, path: `/documentacion/${s.key}`, icon: s.icon })),
    [user?.role]
  );

  // El ancho puede venir del white-label como número/string sin unidad (ej.
  // guardado como "240" en vez de "240px") — CSS descarta silenciosamente un
  // width sin unidad válida y el <aside> vuelve a dimensionarse por contenido,
  // pudiendo quedar más ancho de lo esperado y cortar el main. Se normaliza
  // acá para no depender de que el dato ya venga con "px".
  const toCssLength = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    return /^\d+(\.\d+)?$/.test(String(value)) ? `${value}px` : String(value);
  };
  const sidebarWidth = toCssLength(config?.sidebar?.width, '240px');
  const sidebarCollapsedWidth = toCssLength(config?.sidebar?.collapsed_width, '64px');

  // White-label sidebar colors (match WhiteLabelContext.jsx property names)
  const sbBg = config?.sidebar?.bg_color || '#0f172a';
  const sbText = config?.sidebar?.text_color || '#f8fafc';
  const sbActiveBg = config?.sidebar?.active_bg || config?.colors?.primary || '#3b82f6';
  const sbActiveText = config?.sidebar?.active_text || '#ffffff';
  const sbHoverBg = config?.sidebar?.hover_bg || '#1e293b';
  const sbHoverText = config?.sidebar?.hover_text || '#ffffff';
  const logoUrl = config?.identity?.logoUrl || '';
  const agencyName = config?.identity?.agency_name || 'Gestión de Cupos';

  // Polling de notificaciones no leídas cada 20s (reemplaza al SSE, que no
  // funciona en el backend serverless). Si el contador sube desde la última
  // lectura, se avisa con un toast liviano.
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const result = await NotificationService.getUnreadCount();
        if (!mounted) return;
        const count = result || 0;
        if (previousUnreadRef.current !== null && count > previousUnreadRef.current) {
          const newOnes = count - previousUnreadRef.current;
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: newOnes === 1 ? 'Tenés 1 notificación nueva' : `Tenés ${newOnes} notificaciones nuevas`,
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            didOpen: (el) => el.addEventListener('click', () => navigate('/notificaciones')),
          });
        }
        previousUnreadRef.current = count;
        setUnreadCount(count);
      } catch {
        // silencioso
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => { mounted = false; clearInterval(interval); };
  }, [navigate]);

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

  // Helper para estilos de items del sidebar
  const itemStyle = (active) => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      textDecoration: 'none',
      color: active ? '#fff' : sbText,
      backgroundColor: active ? sbActiveBg : 'transparent',
    };
    if (!active) {
      base._hover = { backgroundColor: sbHoverBg, color: '#fff' };
    }
    return base;
  };

  return (
    <TooltipProvider>
      {/* Backdrop del drawer móvil — solo existe por debajo de md, donde el
          <aside> pasa a fixed/off-canvas en vez de ocupar espacio en el flujo. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        data-sidebar
        dir={dir}
        style={{
          backgroundColor: sbBg,
          color: sbText,
          width: collapsed ? sidebarCollapsedWidth : sidebarWidth,
          minWidth: collapsed ? sidebarCollapsedWidth : sidebarWidth,
          maxWidth: collapsed ? sidebarCollapsedWidth : sidebarWidth,
        }}
        className={clsx(
          'h-screen shrink-0 border-r border-white/10 transition-all duration-300 ease-in-out',
          'fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Botón de cerrar del drawer móvil (arriba a la derecha, solo <md) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full md:hidden"
          style={{ color: sbText }}
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex h-full flex-col justify-between">
          {/* flex-1 + min-h-0 es lo que permite que este bloque se achique y
              scrollee en vez de desbordar el <aside> — sin min-h-0, un hijo
              flex nunca se encoge por debajo de la altura natural de su
              contenido, así que al abrir "Ajustes"/"Usuarios" el contenido
              nuevo quedaba fuera de pantalla y sin forma de llegar a él. */}
          <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll space-y-2">
            {/* Header del sidebar con logo, nombre de plataforma y agencia - Estilo Vercel */}
            <div className={clsx('px-3 py-3', collapsed ? 'flex justify-center' : '')}>
              <div className={clsx('flex items-center gap-2', collapsed ? '' : 'mb-3')}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className={clsx('shrink-0 object-contain', collapsed ? 'h-8 w-8' : 'h-9 w-9')} />
                ) : (
                  <div className={clsx(
                    'flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shrink-0',
                    collapsed ? 'h-8 w-8' : 'h-9 w-9'
                  )}>
                    <Sparkles className={clsx(collapsed ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                  </div>
                )}
                {!collapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-xl font-medium truncate leading-tight" style={{ color: sbText }}>
                      {agencyName}
                    </span>
                    <p className="text-[12px] truncate" style={{ color: sbText }}>
                      {user.agencia || 'Tu Agencia'}
                    </p>
                  </div>
                )}
              </div>
              {/* Botón para colapsar sidebar */}
              {!collapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsed(true)}
                      className="absolute -right-3 top-[30%] z-10 h-6 w-6 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                      aria-label="Colapsar sidebar"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Colapsar menú</TooltipContent>
                </Tooltip>
              )}
              {collapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsed(false)}
                      className="absolute -right-3 top-[30%] z-10 h-6 w-6 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                      aria-label="Expandir sidebar"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expandir menú</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Separador sutil */}
            {!collapsed && (
              <div className="mx-3 border-t border-zinc-200 dark:border-zinc-800" />
            )}



            <nav
              className="flex flex-col gap-0.5 px-2"
              onClick={(e) => {
                // Cierra el drawer móvil al navegar — cualquier click en un
                // NavLink de acá adentro burbujea hasta este handler (los
                // toggles de submenú no navegan, así que no hace nada raro).
                if (e.target.closest('a[href]')) setMobileOpen(false);
              }}
            >
              {/* Main navigation items */}
              {navItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => {
                    const active = isActive || location.pathname.startsWith(path + '/');
                    return clsx(
                      'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-2 py-2' : ''
                    );
                  }}
                  style={({ isActive }) => {
                    const active = isActive || location.pathname.startsWith(path + '/');
                    return {
                      color: active ? '#fff' : sbText,
                      backgroundColor: active ? sbActiveBg : 'transparent',
                    };
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                    if (!isActive) {
                      el.style.backgroundColor = sbHoverBg;
                      el.style.color = sbHoverText;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                    if (!isActive) {
                      el.style.backgroundColor = 'transparent';
                      el.style.color = sbText;
                    }
                  }}
                >
                  {({ isActive }) => {
                    const active = isActive || location.pathname.startsWith(path + '/');
                    return (
                      <>
                        <Icon className={clsx(collapsed ? 'h-4 w-4' : 'h-4 w-4')} style={{ color: active ? '#fff' : sbText }} />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {!collapsed && active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
                        )}
                      </>
                    );
                  }}
                </NavLink>
              ))}

              {/* Documentación submenu — una sección por ruta, en vez de un
                  acordeón largo dentro del main */}
              <div className="mt-0.5">
                <button
                  onClick={() => toggleSubmenu('docs')}
                  className={clsx(
                    'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    collapsed ? 'justify-center px-2 py-2' : ''
                  )}
                  style={{
                    color: isSubmenuActive(docsItems) ? '#fff' : sbText,
                    backgroundColor: isSubmenuActive(docsItems) ? sbActiveBg : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmenuActive(docsItems)) {
                      e.currentTarget.style.backgroundColor = sbHoverBg;
                      e.currentTarget.style.color = sbHoverText;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmenuActive(docsItems)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = sbText;
                    }
                  }}
                >
                  <BookOpen className="h-4 w-4" style={{ color: isSubmenuActive(docsItems) ? '#fff' : sbText }} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">Documentación</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openSubmenus.docs ? 'rotate-180' : ''}`} style={{ color: isSubmenuActive(docsItems) ? '#fff' : sbText }} />
                    </>
                  )}
                </button>
                {!collapsed && openSubmenus.docs && (
                  <div className="mt-1 ml-2 space-y-0.5 pl-2" style={{ borderLeftColor: `${sbText}20` }}>
                    {docsItems.map(({ label, path, icon: Icon }) => (
                      <NavLink
                        key={path}
                        to={path}
                        className={() => 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200'}
                        style={({ isActive }) => {
                          const active = isActive || location.pathname.startsWith(path + '/');
                          return {
                            color: active ? '#fff' : sbText,
                            backgroundColor: active ? sbActiveBg : 'transparent',
                          };
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget;
                          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                          if (!isActive) {
                            el.style.backgroundColor = sbHoverBg;
                            el.style.color = sbHoverText;
                          }
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget;
                          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                          if (!isActive) {
                            el.style.backgroundColor = 'transparent';
                            el.style.color = sbText;
                          }
                        }}
                      >
                        {({ isActive }) => {
                          const active = isActive || location.pathname.startsWith(path + '/');
                          return (
                            <>
                              <Icon className="h-4 w-4" style={{ color: active ? '#fff' : sbText }} />
                              <span className="truncate">{label}</span>
                              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />}
                            </>
                          );
                        }}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin-only menu items */}
              {visibleAdminNavItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="my-2 px-3">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${sbText}60` }}>Administración</p>
                    </div>
                  )}
                  {visibleAdminNavItems.map(({ label, path, icon: Icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) => {
                        const active = isActive || location.pathname.startsWith(path + '/');
                        return clsx(
                          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                          collapsed ? 'justify-center px-2 py-2' : ''
                        );
                      }}
                      style={({ isActive }) => {
                        const active = isActive || location.pathname.startsWith(path + '/');
                        return {
                          color: active ? '#fff' : sbText,
                          backgroundColor: active ? sbActiveBg : 'transparent',
                        };
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                        if (!isActive) {
                          el.style.backgroundColor = sbHoverBg;
                          el.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                        if (!isActive) {
                          el.style.backgroundColor = 'transparent';
                          el.style.color = sbText;
                        }
                      }}
                    >
                      {({ isActive }) => {
                        const active = isActive || location.pathname.startsWith(path + '/');
                        return (
                          <>
                            <Icon className={clsx(collapsed ? 'h-4 w-4' : 'h-4 w-4')} style={{ color: active ? '#fff' : sbText }} />
                            {!collapsed && <span className="truncate">{label}</span>}
                            {!collapsed && active && (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
                            )}
                          </>
                        );
                      }}
                    </NavLink>
                  ))}
                </>
              )}

              {/* Separadores para submenús */}
              {(visibleSettingsItems.length > 0 || visibleUserManagementItems.length > 0) && !collapsed && (
                <>
                  <div className="my-2 px-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: `${sbText}60` }}>Gestión</p>
                  </div>
                </>
              )}

              {/* Settings submenu */}
              {visibleSettingsItems.length > 0 && (
                <div className="mt-0.5">
                  <button
                    onClick={() => toggleSubmenu('settings')}
                    className={clsx(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-2 py-2' : ''
                    )}
                    style={{
                      color: isSubmenuActive(visibleSettingsItems) ? '#fff' : sbText,
                      backgroundColor: isSubmenuActive(visibleSettingsItems) ? sbActiveBg : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmenuActive(visibleSettingsItems)) {
                        e.currentTarget.style.backgroundColor = sbHoverBg;
                        e.currentTarget.style.color = sbHoverText;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmenuActive(visibleSettingsItems)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = sbText;
                      }
                    }}
                  >
                    <Settings className="h-4 w-4" style={{ color: isSubmenuActive(visibleSettingsItems) ? '#fff' : sbText }} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">Ajustes</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openSubmenus.settings ? 'rotate-180' : ''}`} style={{ color: isSubmenuActive(visibleSettingsItems) ? '#fff' : sbText }} />
                      </>
                    )}
                  </button>
                  {!collapsed && openSubmenus.settings && (
                    <div className="mt-1 ml-2 space-y-0.5 pl-2" style={{ borderLeftColor: `${sbText}20` }}>
                      {visibleSettingsItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            )
                          }
                          style={({ isActive }) => {
                            const active = isActive || location.pathname.startsWith(path + '/');
                            return {
                              color: active ? '#fff' : sbText,
                              backgroundColor: active ? sbActiveBg : 'transparent',
                            };
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget;
                            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                            if (!isActive) {
                              el.style.backgroundColor = sbHoverBg;
                              el.style.color = sbHoverText;
                            }
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget;
                            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                            if (!isActive) {
                              el.style.backgroundColor = 'transparent';
                              el.style.color = sbText;
                            }
                          }}
                        >
                          {({ isActive }) => {
                            const active = isActive || location.pathname.startsWith(path + '/');
                            return (
                              <>
                                <Icon className="h-4 w-4" style={{ color: active ? '#fff' : sbText }} />
                                <span className="truncate">{label}</span>
                                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />}
                              </>
                            );
                          }}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User management submenu */}
              {visibleUserManagementItems.length > 0 && (
                <div className="mt-0.5">
                  <button
                    onClick={() => toggleSubmenu('userManagement')}
                    className={clsx(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-2 py-2' : ''
                    )}
                    style={{
                      color: isSubmenuActive(visibleUserManagementItems) ? '#fff' : sbText,
                      backgroundColor: isSubmenuActive(visibleUserManagementItems) ? sbActiveBg : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmenuActive(visibleUserManagementItems)) {
                        e.currentTarget.style.backgroundColor = sbHoverBg;
                        e.currentTarget.style.color = sbHoverText;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmenuActive(visibleUserManagementItems)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = sbText;
                      }
                    }}
                  >
                    <Users className="h-4 w-4" style={{ color: isSubmenuActive(visibleUserManagementItems) ? '#fff' : sbText }} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">Usuarios</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openSubmenus.userManagement ? 'rotate-180' : ''}`} style={{ color: isSubmenuActive(visibleUserManagementItems) ? '#fff' : sbText }} />
                      </>
                    )}
                  </button>
                  {!collapsed && openSubmenus.userManagement && (
                    <div className="mt-1 ml-2 space-y-0.5 pl-2" style={{ borderLeftColor: `${sbText}20` }}>
                      {visibleUserManagementItems.map(({ label, path, icon: Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            )
                          }
                          style={({ isActive }) => {
                            const active = isActive || location.pathname.startsWith(path + '/');
                            return {
                              color: active ? '#fff' : sbText,
                              backgroundColor: active ? sbActiveBg : 'transparent',
                            };
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget;
                            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                            if (!isActive) {
                              el.style.backgroundColor = sbHoverBg;
                              el.style.color = sbHoverText;
                            }
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget;
                            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
                            if (!isActive) {
                              el.style.backgroundColor = 'transparent';
                              el.style.color = sbText;
                            }
                          }}
                        >
                          {({ isActive }) => {
                            const active = isActive || location.pathname.startsWith(path + '/');
                            return (
                              <>
                                <Icon className="h-4 w-4" style={{ color: active ? '#fff' : sbText }} />
                                <span className="truncate">{label}</span>
                                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />}
                              </>
                            );
                          }}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Footer: user info and logout - Estilo Vercel con white-label */}
          <div className={clsx('px-2 pb-4', collapsed ? 'flex justify-center' : '')}>
            <div
              className="relative flex w-full items-center rounded-lg transition-all duration-200"
              style={{
                padding: collapsed ? '0' : '0.5rem',
                justifyContent: collapsed ? 'center' : undefined,
                border: collapsed ? 'none' : `1px solid ${sbText}20`,
                // Colapsado: sin tinte de fondo — con padding/border en 0 el
                // tinte quedaba como un halo rectangular pegado al avatar
                // circular, en vez de leerse como una "card" (que sí funciona
                // bien expandido, donde ocupa toda la fila).
                backgroundColor: collapsed ? 'transparent' : `${sbText}10`,
              }}
            >
              <div
                className="relative h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  background: `linear-gradient(to bottom right, ${sbActiveBg}, ${sbHoverBg})`,
                  color: sbActiveText,
                }}
              >
                {(user.nombre || user.email || 'I')[0]?.toUpperCase()}
                {unreadCount > 0 && (
                  // El anillo tiene que matchear el fondo real del sidebar
                  // (dinámico por white-label) para que se vea como un
                  // recorte prolijo, no un halo blanco fijo que no combina.
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"
                    style={{ boxShadow: `0 0 0 2px ${sbBg}` }}
                  />
                )}
              </div>
              {!collapsed ? (
                <div className="flex-1 min-w-0 ml-2">
                  <p className="text-sm font-medium truncate" style={{ color: sbText }}>
                    {user.nombre || user.email || 'Invitado'}
                  </p>
                  <p className="text-xs truncate" style={{ color: `${sbText}99` }}>
                    {user.role === 'admin' ? 'Administrador' : user.agencia || 'Agencia'}
                  </p>
                </div>
              ) : null}
              {!collapsed && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Abrir opciones de perfil"
                          className="ml-auto inline-flex items-center rounded-md p-1.5 transition-colors"
                          style={{ color: sbText }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = sbHoverBg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">Opciones de perfil</TooltipContent>
                  </Tooltip>
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
                        <div className="relative">
                          <Bell className="h-4 w-4 text-zinc-500" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white dark:ring-zinc-900" />
                          )}
                        </div>
                        <span>Notificaciones</span>
                        {unreadCount > 0 && (
                          <span className="ml-auto text-xs font-semibold text-red-500">{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
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