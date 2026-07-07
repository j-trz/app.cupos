import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useEvolutionPassengers, useSalesByAgency, useDestinationsDetail } from '../hooks/useReports';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Skeleton } from '../components/ui/Skeleton';
import { Download, Filter, Lock } from 'lucide-react';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Reportes = () => {
  const [filters, setFilters] = useState({});
  const { user } = useAuth();

  // Solo administradores totales y de agencia pueden acceder
  const isAdmin = user?.role === 'admin' || user?.role === 'agency_admin';

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta sección es solo para administradores. Contacte a su administrador si necesita acceder a reportes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: evolution, isLoading: loadingEvol } = useEvolutionPassengers(filters);
  const { data: agencyShare, isLoading: loadingShare } = useSalesByAgency(filters);
  const { data: destinations, isLoading: loadingDest } = useDestinationsDetail(filters);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Avanzados</h1>
          <p className="text-muted-foreground">Análisis detallado de ventas, rentabilidad y share.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Evolución de Pasajeros */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Evolución de Pasajeros (Ventas Reales)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingEvol ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#8884d8" name="Pasajeros" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Share por Agencia */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Share por Agencia</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex justify-center items-center">
            {loadingShare ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agencyShare}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ agencia, percent }) => `${agencia} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="venta"
                    nameKey="agencia"
                  >
                    {agencyShare?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Detalle por Destino */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Rendimiento por Destino y Temporada</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDest ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-3">Destino</th>
                      <th className="px-4 py-3">Temporada</th>
                      <th className="px-4 py-3 text-right">Venta Real</th>
                      <th className="px-4 py-3 text-right">Costo Real</th>
                      <th className="px-4 py-3 text-right">Rentabilidad</th>
                      <th className="px-4 py-3 text-right text-red-600">Riesgo (Disp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {destinations?.map((dest, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{dest.destino}</td>
                        <td className="px-4 py-3">{dest.temporada}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(dest.venta_real)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(dest.costo_real)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(dest.rentabilidad)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatCurrency(dest.riesgo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reportes;
