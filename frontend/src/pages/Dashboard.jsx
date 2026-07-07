import { useState, useEffect } from 'react';
import { BarChart3, Plane, CreditCard, Calendar, CheckCircle, RefreshCw } from 'lucide-react';
import { useGeneralReport, useUserMetrics } from '../hooks/useReports';
import { useAuth } from '../contexts/AuthContext';
import ReservationService from '../services/reservationService';
import DashboardCharts from '../components/DashboardCharts';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'agency_admin';

  const filters = { dateRange: 'month', agency: undefined };
  const { data: reports, isLoading: isLoadingReports } = useGeneralReport(filters);
  const { data: userMetrics, isLoading: isLoadingUserMetrics } = useUserMetrics();

  const dashboardLoading = isAdmin ? isLoadingReports : isLoadingUserMetrics;

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const items = await ReservationService.listReservations();
      setReservations(items);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const getEstadoVariant = (estado) => {
    if (estado === 'confirmada') return 'success';
    if (estado === 'bloqueo_temporal' || estado === 'pendiente') return 'warning';
    if (estado === 'cancelada') return 'danger';
    return 'default';
  };

  const getEstadoLabel = (estado) => {
    const map = {
      bloqueo_temporal: 'Bloqueo Temporal',
      confirmada: 'Confirmada',
      pendiente: 'Pendiente',
      cancelada: 'Cancelada',
    };
    return map[estado] || estado;
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Últimas reservas para mostrar en el dashboard
  const recentReservations = reservations.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={isAdmin
          ? 'Vista general del sistema y métricas clave.'
          : 'Resumen de tus reservas, ventas y actividad reciente.'
        }
        icon={BarChart3}
        action={
          <Button
            size="sm"
            onClick={fetchReservations}
            disabled={loading}
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* Tarjetas de métricas */}
      {dashboardLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-2 h-9 w-9" />
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                  <div className="h-5 w-12 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isAdmin ? (
        // Métricas para administradores
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Calendar}
            label="Total Reservas"
            value={reports?.totalReservations || 0}
            description="Reservas en el sistema"
          />
          <StatCard
            icon={CreditCard}
            label="Ventas Totales"
            value={formatCurrency(reports?.totalSales || 0)}
            description="Ventas confirmadas"
          />
          <StatCard
            icon={CheckCircle}
            label="Usuarios Activos"
            value={reports?.activeUsers || 0}
            description="Últimos 30 días"
          />
          <StatCard
            icon={Plane}
            label="Disponibilidad Promedio"
            value={`${reports?.avgAvailability || 0}%`}
            description="Cupos disponibles"
          />
        </div>
      ) : (
        // Métricas personales para usuarios no admin
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Calendar}
            label="Mis Reservas"
            value={userMetrics?.totalReservations || 0}
            description="Total de reservas creadas"
          />
          <StatCard
            icon={CreditCard}
            label="Mis Ventas"
            value={formatCurrency(userMetrics?.totalSales || 0)}
            description="Ventas confirmadas"
          />
          <StatCard
            icon={CheckCircle}
            label="Reservas Confirmadas"
            value={userMetrics?.confirmedReservations || 0}
            description="Confirmadas"
          />
          <StatCard
            icon={Plane}
            label="Pendientes"
            value={userMetrics?.pendingReservations || 0}
            description="En espera de confirmación"
          />
        </div>
      )}

      {/* Tabla de últimas reservas (solo para no admin) */}
      {!isAdmin && (
        <Card>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Últimas Reservas</h2>
              <p className="text-sm text-slate-500">Tus reservas más recientes.</p>
            </div>
          </div>

          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">ID Pedido</TableHead>
                <TableHead className="text-center">Destino</TableHead>
                <TableHead className="text-center">Pasajero</TableHead>
                <TableHead className="text-center">Salida</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Venta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={6}>
                    Cargando reservas...
                  </TableCell>
                </TableRow>
              ) : recentReservations.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={6}>
                    No hay reservas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                recentReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="text-center font-medium">{reservation.pedido_id}</TableCell>
                    <TableCell className="text-center">{reservation.vuelo_destino || '—'}</TableCell>
                    <TableCell className="text-center">
                      {reservation.nombre_pasajero} {reservation.apellido_pasajero}
                    </TableCell>
                    <TableCell className="text-center">{formatDate(reservation.vuelo_salida)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getEstadoVariant(reservation.estado)}>
                        {getEstadoLabel(reservation.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatCurrency(reservation.precio_venta)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </TableComponent>
        </Card>
      )}

      {/* Gráficos solo para administradores */}
      {isAdmin && (
        <DashboardCharts
          reports={reports}
          dateRange={filters.dateRange}
          agencyFilter={filters.agency}
          onDateRangeChange={() => { }}
          onAgencyFilterChange={() => { }}
        />
      )}
    </div>
  );
};

export default Dashboard;
