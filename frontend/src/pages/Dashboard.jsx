import { useState } from 'react';
import { Plane, CreditCard, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useGeneralReport, useUserMetrics } from '../hooks/useReports';
import { useAuth } from '../contexts/AuthContext';
import DashboardCharts from '../components/DashboardCharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton';

const Dashboard = () => {
  const [dateRange, setDateRange] = useState('month');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const { user } = useAuth();

  const filters = {
    dateRange,
    agency: agencyFilter !== 'all' ? agencyFilter : undefined
  };

  const { data: reports, isLoading, isError } = useGeneralReport(filters);
  const { data: userMetrics, isLoading: isLoadingUserMetrics } = useUserMetrics();

  // Determinar si es administrador
  const isAdmin = user?.role === 'admin' || user?.role === 'agency_admin';

  // Usar métricas personales para no admins, métricas generales para admins
  const dashboardData = isAdmin ? reports : userMetrics;
  const dashboardLoading = isAdmin ? isLoading : isLoadingUserMetrics;

  if (isError) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Error al cargar los datos del dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'Vista general del sistema y métricas clave'
            : 'Resumen de tus reservas y ventas'}
        </p>
      </div>

      {dashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-24" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isAdmin ? (
            // Métricas para administradores
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.totalReservations || 0}</div>
                  <p className="text-xs text-muted-foreground">+20.1% desde el mes pasado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${dashboardData?.totalSales || 0}</div>
                  <p className="text-xs text-muted-foreground">+18.2% desde el mes pasado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.activeUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">+12.5% desde el mes pasado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disponibilidad Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.avgAvailability || 0}%</div>
                  <p className="text-xs text-muted-foreground">+3.2% desde el mes pasado</p>
                </CardContent>
              </Card>
            </>
          ) : (
            // Métricas personales para usuarios no admin
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mis Reservas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.totalReservations || 0}</div>
                  <p className="text-xs text-muted-foreground">Total de reservas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mis Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${dashboardData?.totalSales || 0}</div>
                  <p className="text-xs text-muted-foreground">Ventas confirmadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservas Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.pendingReservations || 0}</div>
                  <p className="text-xs text-muted-foreground">En espera de confirmación</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservas Confirmadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.confirmedReservations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    Confirmadas
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <DashboardCharts
        reports={reports}
        dateRange={dateRange}
        agencyFilter={agencyFilter}
        onDateRangeChange={setDateRange}
        onAgencyFilterChange={setAgencyFilter}
      />
    </div>
  );
};

export default Dashboard;