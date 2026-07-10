import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';

const COLORS = ['#0f172a', '#2563eb', '#16a34a', '#f59e0b', '#dc2626'];

const EmptyState = ({ isLoading, message }) => (
  <div className="flex h-full items-center justify-center text-xs text-slate-400">
    {isLoading ? 'Cargando...' : message}
  </div>
);

const DashboardCharts = ({ destinoVentas, evolucionPasajeros, reservationStatus, isLoading = false }) => {
  const ventasPorDestino = (destinoVentas?.labels || []).map((label, i) => ({
    destino: label,
    venta: destinoVentas?.data?.[i] || 0,
  }));

  const evolucion = (evolucionPasajeros?.labels || []).map((label, i) => ({
    periodo: label,
    pasajeros: evolucionPasajeros?.data?.[i] || 0,
  }));

  const estados = Array.isArray(reservationStatus) ? reservationStatus : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-slate-500" />
        <h3 className="text-lg font-semibold text-slate-900">Gráficos y Estadísticas</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ventas por Destino</CardTitle>
            <CardDescription className="text-xs">Top destinos de tu agencia</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            {ventasPorDestino.length === 0 ? (
              <EmptyState isLoading={isLoading} message="Sin ventas registradas" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasPorDestino}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="destino" fontSize={10} stroke="#64748b" />
                  <YAxis fontSize={10} stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="venta" fill="#0f172a" name="Ventas (USD)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estados de Reserva</CardTitle>
            <CardDescription className="text-xs">Distribución de tu agencia</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] flex items-center justify-center">
            {estados.length === 0 ? (
              <EmptyState isLoading={isLoading} message="Sin reservas registradas" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estados}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {estados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolución de Pasajeros</CardTitle>
            <CardDescription className="text-xs">Tendencia mensual de tu agencia</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            {evolucion.length === 0 ? (
              <EmptyState isLoading={isLoading} message="Sin datos históricos" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="periodo" fontSize={10} stroke="#64748b" />
                  <YAxis fontSize={10} stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="pasajeros" fill="#2563eb" name="Pasajeros" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCharts;
