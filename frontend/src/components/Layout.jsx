import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useI18n } from '../contexts/I18nContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSidebar } from './ui/SidebarProvider.jsx';
import Sidebar from './ui/Sidebar.jsx';
import AIChatWidget from './AIChat/AIChatWidget.jsx';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { headerData } = useHeader();
  const sidebarCtx = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  // Determinar el título basado en la ruta actual
  const getTitleByPath = () => {
    const path = location.pathname;

    switch (path) {
      case '/':
      case '/dashboard':
        return t('dashboard');
      case '/usuarios':
        return t('users');
      case '/productos':
        return t('products');
      case '/reservas':
        return t('reservations');
      case '/agencias':
        return t('agencies');
      case '/temas':
        return t('whiteLabel');
      case '/roles':
        return t('roles');
      case '/permisos':
        return t('permissions');
      case '/correo':
        return t('emailConfig');
      case '/panel-control':
        return t('settings');
      case '/availability':
        return t('availability');
      case '/profile':
        return t('profile');
      case '/settings':
        return t('settings');
      case '/notificaciones':
        return t('notifications');
      case '/requests':
        return t('requests');
      case '/confirmations':
        return t('confirmations');
      case '/reportes':
        return 'Reportes Avanzados';
      case '/products':
        return t('products');
      case '/marca-blanca':
        return t('whiteLabel');
      case '/email-config':
        return t('emailConfig');
      case '/config-ia':
        return t('aiConfig');
      case '/test':
        return 'Página de Prueba';
      default:
        return t('dashboard'); // Valor por defecto
    }
  };

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 w-0 min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center space-x-3.5 min-w-0">
            {headerData.icon && (
              <div className="flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 shrink-0">
                <headerData.icon className="h-4.5 w-4.5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {headerData.title || getTitleByPath()}
                </h1>
                {headerData.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {headerData.badge}
                  </span>
                )}
              </div>
              {headerData.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl mt-0.5">
                  {headerData.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            {headerData.action && (
              <div className="flex items-center mr-2">
                {headerData.action}
              </div>
            )}
          </div>
        </header>
        <main
          className="flex-1 w-0 min-w-0 overflow-x-hidden overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6 animate-fade-in"
          style={{ minHeight: 'calc(100vh - 100px)' }}
        >
          <div className="text-zinc-900 dark:text-zinc-100 min-h-full max-w-[95%] mx-auto">
            {children || <Outlet context={{ user }} />}
          </div>
        </main>
      </div>

      {/* Widget de Chat IA flotante */}
      <AIChatWidget />
    </div>
  );
}
