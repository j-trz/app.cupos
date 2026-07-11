import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Plane, CreditCard, Calendar, CheckCircle, RefreshCw,
  Clock, AlertCircle, Bell, FileText, ChevronRight, TrendingUp,
  User, MapPin, ArrowRight, Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeneralReport, useUserMetrics } from '../hooks/useReports';
import { useAuth } from '../contexts/AuthContext';
import ReservationService from '../services/reservationService';
import NotificationService from '../services/notificationService';
import { ReportService } from '../services/reportService.js';
import DashboardCharts from '../components/DashboardCharts';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import { formatDateOnly } from '../lib/dateOnly.js';

/* ─── Helpers ─────────────────────────────────────────────── */
const formatDate = formatDateOnly;

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(value || 0);

const getEstadoVariant = (estado) => {
  if (estado === 'confirmada' || estado === 'confirmado') return 'success';
  if (estado === 'bloqueo_temporal') return 'warning';
  if (estado === 'cancelada') return 'danger';
  return 'default';
};

const getEstadoLabel = (estado) => ({
  bloqueo_temporal: 'Bloqueo temporal',
  confirmada: 'Confirmada',
  confirmado: 'Confirmado',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
}[estado] || estado);

const greetingFor = (name) => {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${greeting}${name ? `, ${name.split(' ')[0]}` : ''}`;
};

const todayLabel = () =>
  new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

const NOTIF_ICON = { info: Bell, success: CheckCircle, warning: AlertCircle, error: AlertCircle };
const NOTIF_COLOR = {
  info: 'text-blue-500', success: 'text-emerald-500',
  warning: 'text-amber-500', error: 'text-red-500',
};

/* ─── Sub-componentes ────────────────────────────────────── */

function WelcomeBanner({ user, totalReservas, bloqueadas }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-8 py-7 text-white shadow-lg">
      {/* decoración */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />

      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-bold ring-2 ring-white/20">
            {initials(user?.nombre || user?.email)}
          </div>
          <div>
            <p className="text-sm font-medium text-white/60">{todayLabel()}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
              {greetingFor(user?.nombre)}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Tenés <span className="font-semibold text-white">{totalReservas}</span> reservas
              {bloqueadas > 0 && (
                <> · <span className="font-semibold text-amber-300">{bloqueadas} con doc. pendiente</span></>
              )}
            </p>
          </div>
        </div>

        {/* indicador rápido */}
        {bloqueadas > 0 && (
          <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-amber-400/20 px-4 py-2.5 ring-1 ring-amber-400/30">
            <AlertCircle className="h-4 w-4 text-amber-300" />
            <span className="text-sm font-medium text-amber-200">
              {bloqueadas} reserva{bloqueadas > 1 ? 's' : ''} requieren acción
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockedReservationsWidget({ reservations, onGoToRequests }) {
  const blocked = reservations.filter((r) => r.estado === 'bloqueo_temporal');
  if (blocked.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <div className="flex items-center justify-between border-b border-amber-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-amber-900">Acción requerida</h2>
            <p className="text-xs text-amber-700">
              {blocked.length} reserva{blocked.length > 1 ? 's' : ''} esperando documento contable
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onGoToRequests}
          className="text-amber-700 border-amber-300 hover:bg-amber-100 text-xs"
        >
          Ver solicitudes <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="divide-y divide-amber-100">
        {blocked.slice(0, 3).map((r) => (
          <div key={r.id} className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-amber-200">
                <Plane className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {r.vuelo_destino || r.destino || '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {r.pedido_id} · {r.nombre_pasajero} {r.apellido_pasajero}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <span className="text-xs text-slate-400">{formatDate(r.vuelo_salida)}</span>
              <Button
                size="sm"
                onClick={onGoToRequests}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white border-0"
              >
                <FileText className="h-3 w-3 mr-1" />
                Agregar doc
              </Button>
            </div>
          </div>
        ))}
        {blocked.length > 3 && (
          <div className="px-6 py-3 text-center">
            <button
              onClick={onGoToRequests}
              className="text-xs text-amber-700 hover:text-amber-900 font-medium"
            >
              Ver {blocked.length - 3} más en Solicitudes →
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function RecentReservationsWidget({ reservations, loading }) {
  const recent = reservations.slice(0, 6);
  return (
    <Card className="flex flex-col h-full">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Últimas reservas</h2>
        <p className="text-xs text-slate-500 mt-0.5">Tus {recent.length} reservas más recientes</p>
      </div>
      <div className="flex-1 divide-y divide-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-400">
            Cargando...
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Calendar className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">Sin reservas aún</p>
          </div>
        ) : (
          recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {r.vuelo_destino || '—'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {r.pedido_id} · {formatDate(r.vuelo_salida)}
                </p>
              </div>
              <Badge variant={getEstadoVariant(r.estado)} className="shrink-0 text-xs">
                {getEstadoLabel(r.estado)}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function NotificationsWidget({ notifications, loading, onOpen, onNotificationClick }) {
  const recent = notifications.slice(0, 5);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return (
    <Card className="flex flex-col h-full">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center justify-between border-b border-slate-200 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Notificaciones</h2>
          <p className="text-xs text-slate-500 mt-0.5">Últimas novedades</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </button>
      <div className="flex-1 divide-y divide-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-400">
            Cargando...
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">Sin notificaciones</p>
          </div>
        ) : (
          recent.map((n) => {
            const Icon = NOTIF_ICON[n.type] || Bell;
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => onNotificationClick(n)}
                className={`flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
              >
                <div className={`mt-0.5 shrink-0 ${NOTIF_COLOR[n.type] || 'text-slate-400'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
                {!n.is_read && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })
        )}
      </div>
      {notifications.length > 5 && (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Ver todas las notificaciones →
          </button>
        </div>
      )}
    </Card>
  );
}

/* ─── Dashboard principal ────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'agency_admin';

  const { data: reports, isLoading: isLoadingReports } = useGeneralReport({});
  const { data: userMetrics, isLoading: isLoadingUserMetrics } = useUserMetrics();

  const [destinoVentas, setDestinoVentas] = useState({ labels: [], data: [] });
  const [evolucionPasajeros, setEvolucionPasajeros] = useState({ labels: [], data: [] });
  const [loadingCharts, setLoadingCharts] = useState(false);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const items = await ReservationService.listReservations();
      setReservations(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gráficos del panel admin: mismos datos que Reportes.jsx (destino/evolución
  // de pasajeros), pero acotados exclusivamente a la agencia del usuario que
  // ve el Dashboard — a diferencia de Reportes.jsx, acá nunca se agregan
  // todas las agencias.
  const fetchDashboardCharts = useCallback(async () => {
    setLoadingCharts(true);
    try {
      const filtrosAgencia = user?.agencia ? { Agencia: user.agencia } : {};
      const [detalle, evolucion] = await Promise.all([
        ReportService.getDetalleDestinosPost(filtrosAgencia),
        ReportService.getEvolucionPasajerosPost(filtrosAgencia, 'mes'),
      ]);

      const rows = Array.isArray(detalle?.data) ? detalle.data : [];
      const ventaPorDestino = new Map();
      rows.forEach((row) => {
        const destino = row?.Destino || 'Sin destino';
        const venta = parseFloat(row?.Venta) || 0;
        ventaPorDestino.set(destino, (ventaPorDestino.get(destino) || 0) + venta);
      });
      const topDestinos = Array.from(ventaPorDestino.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      setDestinoVentas({
        labels: topDestinos.map(([destino]) => destino),
        data: topDestinos.map(([, venta]) => Math.round(venta)),
      });

      setEvolucionPasajeros({
        labels: Array.isArray(evolucion?.labels) ? evolucion.labels : [],
        data: Array.isArray(evolucion?.values) ? evolucion.values : [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCharts(false);
    }
  }, [user?.agencia]);

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const items = await NotificationService.getUserNotifications({ limit: 5 });
      setNotifications(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    if (!isAdmin) fetchNotifications();
    if (isAdmin) fetchDashboardCharts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchReservations(),
      !isAdmin && fetchNotifications(),
      isAdmin && fetchDashboardCharts(),
    ].filter(Boolean));
    setRefreshing(false);
  };

  const handleOpenNotifications = () => navigate('/notificaciones');

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      try {
        await NotificationService.markAsRead(notification.id);
      } catch (err) {
        console.error(err);
      }
    }
    navigate('/notificaciones');
  };

  /* ── métricas derivadas ── */
  const confirmed = reservations.filter((r) => r.estado === 'confirmada' || r.estado === 'confirmado').length;
  const blocked = reservations.filter((r) => r.estado === 'bloqueo_temporal').length;
  const pending = reservations.filter((r) => r.estado === 'pendiente').length;

  // Reservas exclusivamente de la propia agencia del usuario (para el panel
  // admin) — `listReservations` puede traer todo el sistema si el rol es
  // admin puro, así que se filtra en el cliente para no mezclar agencias.
  const ownAgencyReservations = user?.agencia
    ? reservations.filter((r) => (r.agencia || '').toLowerCase() === user.agencia.toLowerCase())
    : reservations;
  const reservationStatus = [
    { name: 'Confirmadas', value: ownAgencyReservations.filter((r) => r.estado === 'confirmada' || r.estado === 'confirmado').length },
    { name: 'Pendientes', value: ownAgencyReservations.filter((r) => r.estado === 'bloqueo_temporal' || r.estado === 'procesando').length },
    { name: 'Canceladas', value: ownAgencyReservations.filter((r) => r.estado === 'cancelada' || r.estado === 'cancelado').length },
  ].filter((s) => s.value > 0);

  /* ── vista admin ── */
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Vista general del sistema y métricas clave."
          icon={BarChart3}
          action={
            <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          }
        />
        {isLoadingReports ? (
          <div className="grid gap-4 grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <StatsHero
            stats={[
              { icon: Calendar, label: 'Total Reservas', value: reports?.totalReservations || 0, description: 'Reservas en el sistema', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
              { icon: CreditCard, label: 'Ventas Totales', value: formatCurrency(reports?.totalSales || 0), description: 'Ventas confirmadas', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
              { icon: CheckCircle, label: 'Usuarios Activos', value: reports?.activeUsers || 0, description: 'Últimos 30 días', color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
              { icon: Plane, label: 'Disponibilidad Promedio', value: `${reports?.avgAvailability || 0}%`, description: 'Cupos disponibles', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
            ]}
          />
        )}
        <DashboardCharts
          destinoVentas={destinoVentas}
          evolucionPasajeros={evolucionPasajeros}
          reservationStatus={reservationStatus}
          isLoading={loadingCharts}
        />
      </div>
    );
  }

  /* ── vista usuario ── */
  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Resumen de tus reservas y novedades."
        icon={Home}
        action={
          <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={refreshing} title="Actualizar">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* Banner de bienvenida */}
      <WelcomeBanner
        user={user}
        totalReservas={reservations.length}
        bloqueadas={blocked}
      />

      {/* Stat cards */}
      {isLoadingUserMetrics ? (
        <div className="grid gap-4 grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <StatsHero
          stats={[
            {
              icon: Calendar,
              label: 'Mis reservas',
              value: reservations.length || userMetrics?.totalReservations || 0,
              description: 'Total creadas',
              color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
            },
            {
              icon: CheckCircle,
              label: 'Confirmadas',
              value: confirmed || userMetrics?.confirmedReservations || 0,
              description: 'Reservas confirmadas',
              color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
            },
            {
              icon: Clock,
              label: 'Bloqueos temporales',
              value: blocked || userMetrics?.pendingReservations || 0,
              description: 'Pendientes de doc. contable',
              color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
            },
            {
              icon: TrendingUp,
              label: 'Mis ventas',
              value: formatCurrency(userMetrics?.totalSales || 0),
              description: 'Ventas confirmadas',
              color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
            },
          ]}
        />
      )}

      {/* Widget de bloqueos urgentes */}
      <BlockedReservationsWidget
        reservations={reservations}
        onGoToRequests={() => navigate('/solicitudes')}
      />

      {/* Columnas: últimas reservas + notificaciones */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RecentReservationsWidget reservations={reservations} loading={loading} />
        <NotificationsWidget
          notifications={notifications}
          loading={loadingNotifs}
          onOpen={handleOpenNotifications}
          onNotificationClick={handleNotificationClick}
        />
      </div>
    </div>
  );
};

export default Dashboard;
