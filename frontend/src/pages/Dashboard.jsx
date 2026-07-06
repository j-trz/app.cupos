import { useEffect, useState } from 'react';
import { BarChart3, Plane, Users, CreditCard, Calendar, TrendingUp, AlertTriangle, CheckCircle, Package, Building2, Clock, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import ProductService from '../services/productService';
import ReservationService from '../services/reservationService';
import AgencyService from '../services/agencyService';
import UserService from '../services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Badge } from '../components/ui/shadcn-badge';

// Componente de gráfico de barras CSS
function BarChart({ data, height = 200 }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end justify-between gap-2 h-[200px] px-2">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1 gap-2">
          <div className="relative w-full flex justify-center">
            <div
              className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
              style={{
                height: `${(item.value / maxValue) * 160}px`,
                minHeight: item.value > 0 ? '8px' : '0px'
              }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700">
                {item.value}
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-500 text-center truncate w-full">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Componente de gráfico circular CSS (Donut)
function DonutChart({ data, size = 160 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulativePercentage = 0;

  const gradients = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const startAngle = (cumulativePercentage / 100) * 360;
    cumulativePercentage += percentage;
    const endAngle = (cumulativePercentage / 100) * 360;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        {gradients.map((item, index) => {
          const radius = 40;
          const circumference = 2 * Math.PI * radius;
          const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -((item.startAngle / 360) * circumference);

          return (
            <circle
              key={index}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="16"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{total}</span>
        <span className="text-xs text-slate-500">Total</span>
      </div>
    </div>
  );
}

// Componente de Sparkline (mini gráfico de tendencia)
function Sparkline({ data, color = '#3b82f6', height = 40 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    reservations: 0,
    agencies: 0,
    users: 0,
    lowAvailability: 0,
    confirmedReservations: 0,
    pendingReservations: 0,
    todayReservations: 0,
    expiredReservations: 0,
    totalAvailability: 0
  });
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, reservationsData, agencies, users] = await Promise.all([
          ProductService.getProducts(),
          ReservationService.listReservations(),
          AgencyService.listAgencies(),
          UserService.listUsers()
        ]);

        setProducts(productsData);
        setReservations(reservationsData);

        // Calculate low availability products (less than 5 units)
        const lowAvailability = productsData.filter(p => p.disponibilidad < 5).length;

        // Calculate total availability
        const totalAvailability = productsData.reduce((sum, p) => sum + (p.disponibilidad || 0), 0);

        // Calculate reservation stats
        const confirmedReservations = reservationsData.filter(r => r.estado === 'confirmado').length;
        const pendingReservations = reservationsData.filter(r => r.estado === 'bloqueo_temporal' || r.estado === 'procesando').length;
        const expiredReservations = reservationsData.filter(r => r.estado === 'expirado' || r.estado === 'cancelado').length;

        // Calculate today's reservations
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = reservationsData.filter(r =>
          new Date(r.vuelo_salida).toISOString().split('T')[0] === today
        ).length;

        setStats({
          products: productsData.length,
          reservations: reservationsData.length,
          agencies: agencies.length,
          users: users.length,
          lowAvailability,
          confirmedReservations,
          pendingReservations,
          todayReservations,
          expiredReservations,
          totalAvailability
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Datos para gráfico de reservas por estado
  const reservationStatusData = [
    { label: 'Confirmadas', value: stats.confirmedReservations, color: '#10b981' },
    { label: 'Pendientes', value: stats.pendingReservations, color: '#f59e0b' },
    { label: 'Expiradas', value: stats.expiredReservations, color: '#6b7280' }
  ].filter(d => d.value > 0);

  // Datos para gráfico de productos por disponibilidad
  const availabilityData = [
    { label: 'Alta (>20)', value: products.filter(p => p.disponibilidad > 20).length, color: '#10b981' },
    { label: 'Media (10-20)', value: products.filter(p => p.disponibilidad >= 10 && p.disponibilidad <= 20).length, color: '#3b82f6' },
    { label: 'Baja (5-10)', value: products.filter(p => p.disponibilidad >= 5 && p.disponibilidad < 10).length, color: '#f59e0b' },
    { label: 'Crítica (<5)', value: products.filter(p => p.disponibilidad < 5).length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Datos para gráfico de reservas últimos 7 días
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const count = reservations.filter(r =>
      new Date(r.created_at).toISOString().split('T')[0] === dateStr
    ).length;
    return {
      label: date.toLocaleDateString('es', { weekday: 'short' }),
      value: count
    };
  });

  // Simulación de tendencia (en producción vendría del backend)
  const trendData = [12, 19, 15, 25, 22, 30, 28];
  const trendPercentage = Math.round(((trendData[6] - trendData[0]) / trendData[0]) * 100);

  const statCards = [
    {
      title: "Productos",
      value: stats.products,
      icon: <Package className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-600",
      description: "Total de productos",
      trend: "+12%",
      trendUp: true
    },
    {
      title: "Reservas",
      value: stats.reservations,
      icon: <CreditCard className="h-5 w-5" />,
      color: "bg-green-100 text-green-600",
      description: "Total de reservas",
      trend: "+8%",
      trendUp: true
    },
    {
      title: "Agencias",
      value: stats.agencies,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-600",
      description: "Total de agencias",
      trend: "+2",
      trendUp: true
    },
    {
      title: "Usuarios",
      value: stats.users,
      icon: <Users className="h-5 w-5" />,
      color: "bg-orange-100 text-orange-600",
      description: "Total de usuarios",
      trend: "+5%",
      trendUp: true
    },
    {
      title: "Disponibilidad Total",
      value: stats.totalAvailability,
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-cyan-100 text-cyan-600",
      description: "Cupos disponibles",
      trend: "-3%",
      trendUp: false
    },
    {
      title: "Reservas Hoy",
      value: stats.todayReservations,
      icon: <Calendar className="h-5 w-5" />,
      color: "bg-indigo-100 text-indigo-600",
      description: "Programadas para hoy",
      trend: "+15%",
      trendUp: true
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visión general del sistema y métricas clave
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          <span>Actualizado: {new Date().toLocaleString('es', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <div className={`flex items-center gap-1 text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservas últimos 7 días */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reservas Últimos 7 Días</CardTitle>
                <CardDescription>Tendencia de reservas recientes</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{trendPercentage}%</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart data={last7DaysData} />
          </CardContent>
        </Card>

        {/* Estado de Reservas */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Reservas</CardTitle>
            <CardDescription>Desglose por estado</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {reservationStatusData.length > 0 ? (
              <>
                <DonutChart data={reservationStatusData} />
                <div className="mt-4 w-full space-y-2">
                  {reservationStatusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-slate-600">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No hay reservas registradas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disponibilidad de Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Disponibilidad de Productos</CardTitle>
            <CardDescription>Distribución por nivel de stock</CardDescription>
          </CardHeader>
          <CardContent>
            {availabilityData.length > 0 ? (
              <div className="space-y-4">
                {availabilityData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value} productos</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.value / stats.products) * 100}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No hay productos registrados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas del Sistema</CardTitle>
            <CardDescription>Notificaciones y avisos importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.lowAvailability > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800">Productos con baja disponibilidad</h4>
                    <p className="text-sm text-red-600">{stats.lowAvailability} productos tienen menos de 5 unidades disponibles</p>
                  </div>
                  <Badge variant="destructive">Atención</Badge>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800">Todo en orden</h4>
                    <p className="text-sm text-green-600">No hay productos con baja disponibilidad</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-800">Reservas para hoy</h4>
                  <p className="text-sm text-blue-600">{stats.todayReservations} reservas están programadas para hoy</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-purple-800">Tendencia de reservas</h4>
                  <p className="text-sm text-purple-600">
                    {trendPercentage > 0 ? `Aumento del ${trendPercentage}% en los últimos 7 días` : `Disminución del ${Math.abs(trendPercentage)}% en los últimos 7 días`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos con baja disponibilidad */}
      {stats.lowAvailability > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Productos con Baja Disponibilidad
            </CardTitle>
            <CardDescription>Productos que requieren atención inmediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products
                .filter(p => p.disponibilidad < 5)
                .sort((a, b) => a.disponibilidad - b.disponibilidad)
                .slice(0, 6)
                .map((product, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Package className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{product.nombre}</p>
                      <p className="text-sm text-red-600">{product.disponibilidad} unidades disponibles</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
