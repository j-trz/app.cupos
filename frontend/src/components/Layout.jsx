import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useI18n } from '../contexts/I18nContext.jsx';
import Sidebar from './ui/Sidebar.jsx';
import AIChatWidget from './AIChat/AIChatWidget.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { useSSE } from '../hooks/useSSE';
import Swal from 'sweetalert2';

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

  // Callbacks para notificaciones SSE
  const handleNotification = (data) => {
    const { title, message, type, priority } = data;

    // Mostrar toast de notificación
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type === 'alert' ? 'warning' : type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
      title: title || t('info'),
      text: message,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
  };

  const handleReservationUpdate = (data) => {
    const { type, reservationId, message } = data;

    let icon = 'info';
    let title = t('reservations');

    if (type === 'reservation_created') {
      icon = 'success';
      title = t('reservations') + ' ' + t('created').toLowerCase(); // Assuming 'created' is in translations
    } else if (type === 'reservation_confirmed') {
      icon = 'success';
      title = t('reservations') + ' ' + t('confirmed').toLowerCase(); // Assuming 'confirmed' is in translations
    } else if (type === 'reservation_expired') {
      icon = 'warning';
      title = t('reservations') + ' ' + t('expired').toLowerCase(); // Assuming 'expired' is in translations
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      text: message || `${t('reservations')} #${reservationId}`,
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true
    });
  };

  const handleProductUpdate = (data) => {
    const { type, productCode, message } = data;

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type === 'product_low_availability' ? 'warning' : 'info',
      title: type === 'product_low_availability' ? t('low_availability') : t('product_updated'), // Assuming these are in translations
      text: message || `${t('product')} ${productCode}`,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true
    });
  };

  // Conectar al servicio SSE
  const { isConnected } = useSSE({
    enabled: !!user,
    onNotification: handleNotification,
    onReservationUpdate: handleReservationUpdate,
    onProductUpdate: handleProductUpdate,
    onError: (error) => {
      console.error('SSE Error:', error);
    }
  });


  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex justify-between items-center p-6 border-b border-gray-200 bg-white z-10">
          <h1 className="text-2xl font-bold text-gray-800">
            {getTitleByPath()}
          </h1>
          <div className="flex space-x-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>
        <main
          className="flex-1 overflow-y-auto bg-gray-50 p-6"
          style={{ minHeight: 'calc(100vh - 100px)' }}
        >
          <div className="text-gray-900 min-h-full">
            {children || <Outlet context={{ user }} />}
          </div>
        </main>
      </div>

      {/* Widget de Chat IA flotante */}
      <AIChatWidget />

      {/* Indicador de conexión SSE */}
      {user && (
        <div className={`fixed bottom-4 right-4 w-3 h-3 rounded-full transition-colors ${isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} title={isConnected ? t('connected_to_real_time_notifications') : t('disconnected_from_notifications')} />
      )}
    </div>
  );
}