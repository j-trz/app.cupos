import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './ui/Sidebar.jsx';
import AIChatWidget from './AIChat/AIChatWidget.jsx';
import { useSSE } from '../hooks/useSSE';
import Swal from 'sweetalert2';

export default function Layout() {
  const { user, signOut } = useAuth();
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
      title: title || 'Notificación',
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
    let title = 'Actualización de Reserva';

    if (type === 'reservation_created') {
      icon = 'success';
      title = 'Nueva Reserva Creada';
    } else if (type === 'reservation_confirmed') {
      icon = 'success';
      title = 'Reserva Confirmada';
    } else if (type === 'reservation_expired') {
      icon = 'warning';
      title = 'Reserva Expirada';
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      text: message || `Reserva #${reservationId}`,
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
      title: type === 'product_low_availability' ? 'Baja Disponibilidad' : 'Producto Actualizado',
      text: message || `Producto ${productCode}`,
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet context={{ user }} />
      </main>

      {/* Widget de Chat IA flotante */}
      <AIChatWidget />

      {/* Indicador de conexión SSE */}
      {user && (
        <div className={`fixed bottom-4 right-4 w-3 h-3 rounded-full transition-colors ${isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} title={isConnected ? 'Conectado a notificaciones en tiempo real' : 'Desconectado de notificaciones'} />
      )}
    </div>
  );
}
