import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useI18n } from '../contexts/I18nContext.jsx';
import Sidebar from './ui/Sidebar.jsx';
import AIChatWidget from './AIChat/AIChatWidget.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSelector from './LanguageSelector.jsx';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
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
      case '/logs':
        return 'Logs del sitio';
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
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header estilo Vercel - Minimalista y elegante */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {getTitleByPath()}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>

        {/* Main content con scroll suave */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ minHeight: 'calc(100vh - 100px)' }}
        >
          <div className={
            location.pathname === '/reportes'
              ? 'min-h-full w-full px-4 py-4'
              : 'min-h-full w-full max-w-[1800px] mx-auto px-6 py-6'
          }>
            {children || <Outlet context={{ user }} />}
          </div>
        </main>
      </div>

      {/* Widget de Chat IA flotante */}
      <AIChatWidget />
    </div>
  );
}