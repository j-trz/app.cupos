import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';
import { Button } from './ui/Button';
import { CalendarIcon } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DashboardCharts = ({ reports, dateRange, agencyFilter, onDateRangeChange, onAgencyFilterChange }) => {
  // Datos simulados si no hay informes reales
  const salesByAgency = reports?.salesByAgency || [
    { agency: 'Agencia A', sales: 4000 },
    { agency: 'Agencia B', sales: 3000 },
    { agency: 'Agencia C', sales: 2000 },
    { agency: 'Agencia D', sales: 2780 },
    { agency: 'Agencia E', sales: 1890 },
  ];

  const reservationStatus = reports?.reservationStatus || [
    { name: 'Confirmadas', value: 75 },
    { name: 'Pendientes', value: 15 },
    { name: 'Canceladas', value: 10 },
  ];

  const historicalSales = reports?.historicalSales || [
    { date: 'Ene', sales: 4000 },
    { date: 'Feb', sales: 3000 },
    { date: 'Mar', sales: 2000 },
    { date: 'Abr', sales: 2780 },
    { date: 'May', sales: 1890 },
    { date: 'Jun', sales: 2390 },
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4" />
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rango de fechas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Select value={agencyFilter} onValueChange={onAgencyFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por agencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las agencias</SelectItem>
            <SelectItem value="agency_a">Agencia A</SelectItem>
            <SelectItem value="agency_b">Agencia B</SelectItem>
            <SelectItem value="agency_c">Agencia C</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por agencia - Gráfico de barras */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Agencia</CardTitle>
            <CardDescription>Distribución de ventas por agencia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByAgency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agency" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de estados de reserva - Gráfico de dona */}
        <Card>
          <CardHeader>
            <CardTitle>Estados de Reserva</CardTitle>
            <CardDescription>Distribución de estados de las reservas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reservationStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reservationStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evolución histórica de ventas - Gráfico de líneas */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Histórica de Ventas</CardTitle>
          <CardDescription>Tendencia de ventas a lo largo del tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={historicalSales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#82ca9d" name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;