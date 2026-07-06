import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useI18n } from '../contexts/I18nContext.jsx';
import Sidebar from './ui/Sidebar.jsx';
import AIChatWidget from './AIChat/AIChatWidget.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { useSSE } from '../hooks/useSSE';
import Swal from 'sweetalert2';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();

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
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {t('dashboard')}
          </h1>
          <div className="flex space-x-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
        <Outlet context={{ user }} />
      </main>

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