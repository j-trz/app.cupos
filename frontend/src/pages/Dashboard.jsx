import { useEffect, useState } from 'react';
import { BarChart3, Plane, Users, CreditCard, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import ProductService from '../services/productService';
import ReservationService from '../services/reservationService';
import AgencyService from '../services/agencyService';
import UserService from '../services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Badge } from '../components/ui/shadcn-badge';

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    reservations: 0,
    agencies: 0,
    users: 0,
    lowAvailability: 0,
    confirmedReservations: 0,
    pendingReservations: 0,
    todayReservations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, reservations, agencies, users] = await Promise.all([
          ProductService.getProducts(),
          ReservationService.listReservations(),
          AgencyService.listAgencies(),
          UserService.listUsers()
        ]);

        // Calculate low availability products (less than 5 units)
        const lowAvailability = products.filter(p => p.disponibilidad < 5).length;
        
        // Calculate reservation stats
        const confirmedReservations = reservations.filter(r => r.estado === 'confirmado').length;
        const pendingReservations = reservations.filter(r => r.estado === 'bloqueo_temporal' || r.estado === 'procesando').length;
        
        // Calculate today's reservations
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = reservations.filter(r => 
          new Date(r.vuelo_salida).toISOString().split('T')[0] === today
        ).length;

        setStats({
          products: products.length,
          reservations: reservations.length,
          agencies: agencies.length,
          users: users.length,
          lowAvailability,
          confirmedReservations,
          pendingReservations,
          todayReservations
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: "Productos",
      value: stats.products,
      icon: <BarChart3 className="h-6 w-6" />,
      color: "bg-blue-100 text-blue-600",
      description: "Total de productos registrados"
    },
    {
      title: "Reservas",
      value: stats.reservations,
      icon: <CreditCard className="h-6 w-6" />,
      color: "bg-green-100 text-green-600",
      description: "Total de reservas realizadas"
    },
    {
      title: "Agencias",
      value: stats.agencies,
      icon: <Plane className="h-6 w-6" />,
      color: "bg-purple-100 text-purple-600",
      description: "Total de agencias registradas"
    },
    {
      title: "Usuarios",
      value: stats.users,
      icon: <Users className="h-6 w-6" />,
      color: "bg-orange-100 text-orange-600",
      description: "Total de usuarios activos"
    },
    {
      title: "Disponibilidad Baja",
      value: stats.lowAvailability,
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "bg-red-100 text-red-600",
      description: "Productos con baja disponibilidad"
    },
    {
      title: "Reservas Hoy",
      value: stats.todayReservations,
      icon: <Calendar className="h-6 w-6" />,
      color: "bg-indigo-100 text-indigo-600",
      description: "Reservas para hoy"
    }
  ];

  const reservationStatus = [
    { status: 'Confirmado', count: stats.confirmedReservations, color: 'bg-green-500', percentage: Math.round((stats.confirmedReservations / Math.max(stats.reservations, 1)) * 100) },
    { status: 'Pendiente', count: stats.pendingReservations, color: 'bg-yellow-500', percentage: Math.round((stats.pendingReservations / Math.max(stats.reservations, 1)) * 100) },
    { status: 'Otros', count: stats.reservations - stats.confirmedReservations - stats.pendingReservations, color: 'bg-gray-500', percentage: Math.round(((stats.reservations - stats.confirmedReservations - stats.pendingReservations) / Math.max(stats.reservations, 1)) * 100) }
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Cargando estadísticas del sistema...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visión general del sistema y métricas clave
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-full ${stat.color}`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Reservas</CardTitle>
            <CardDescription>Desglose del estado actual de las reservas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reservationStatus.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.status}</span>
                    <span className="text-sm font-medium">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas del Sistema</CardTitle>
            <CardDescription>Alertas y notificaciones importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.lowAvailability > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800">Productos con baja disponibilidad</h4>
                    <p className="text-sm text-red-600">{stats.lowAvailability} productos tienen menos de 5 unidades disponibles</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-800">Todo en orden</h4>
                    <p className="text-sm text-green-600">No hay productos con baja disponibilidad</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800">Reservas para hoy</h4>
                  <p className="text-sm text-blue-600">{stats.todayReservations} reservas están programadas para hoy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Actividades</CardTitle>
          <CardDescription>Acciones recientes en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nuevo producto agregado</p>
                <p className="text-xs text-muted-foreground">Hace 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CreditCard className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Reserva confirmada</p>
                <p className="text-xs text-muted-foreground">Hace 4 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nuevo usuario registrado</p>
                <p className="text-xs text-muted-foreground">Hace 6 horas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}