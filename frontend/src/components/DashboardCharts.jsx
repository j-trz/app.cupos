import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ChevronDown, ChevronUp, CalendarIcon, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DashboardCharts = ({ reports, dateRange, agencyFilter, onDateRangeChange, onAgencyFilterChange }) => {
  const [showFilters, setShowFilters] = useState(false);
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
    <div className="space-y-4">
      {/* Header con toggle de filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-900">Gráficos y Estadísticas</h3>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all"
        >
          {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>
      </div>

      {/* Filtros colapsables */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-slate-400" />
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger className="w-[160px] bg-white">
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

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <Select value={agencyFilter} onValueChange={onAgencyFilterChange}>
              <SelectTrigger className="w-[160px] bg-white">
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
        </div>
      )}

      {/* Gráficos en grid de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ventas por agencia - Gráfico de barras */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ventas por Agencia</CardTitle>
            <CardDescription className="text-xs">Distribución por agencia</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByAgency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agency" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="sales" fill="#8884d8" name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de estados de reserva - Gráfico de dona */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estados de Reserva</CardTitle>
            <CardDescription className="text-xs">Distribución de estados</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reservationStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reservationStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolución histórica de ventas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolución de Ventas</CardTitle>
            <CardDescription className="text-xs">Tendencia mensual</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalSales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="sales" fill="#82ca9d" name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCharts;