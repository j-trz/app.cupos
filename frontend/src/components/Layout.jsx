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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 truncate max-w-md">
              {getTitleByPath()}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>
        <main
          className="flex-1 overflow-y-auto bg-gray-50 p-6"
          style={{ minHeight: 'calc(100vh - 100px)' }}
        >
          <div className="text-gray-900 min-h-full max-w-7xl mx-auto">
            {children || <Outlet context={{ user }} />}
          </div>
        </main>
      </div>

      {/* Widget de Chat IA flotante */}
      <AIChatWidget />
    </div>
  );
}