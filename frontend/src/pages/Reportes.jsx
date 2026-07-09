import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useEvolutionRevenue, useSalesByAgency, useDestinationsDetail, useTopProducts, useRiskAlerts, useOccupancy } from '../hooks/useReports';
import { useAuth } from '../contexts/AuthContext';
import { Lock, BarChart3 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import ReportFilters from '../components/reports/ReportFilters';
import KPIsRow from '../components/reports/KPIsRow';
import EvolutionChart from '../components/reports/EvolutionChart';
import AgencyShareChart from '../components/reports/AgencyShareChart';
import TopDestinationsChart from '../components/reports/TopDestinationsChart';
import OccupancyHeatmap from '../components/reports/OccupancyHeatmap';
import RiskAlertsTable from '../components/reports/RiskAlertsTable';
import DestinationDetailTable from '../components/reports/DestinationDetailTable';
import ProductPerformanceTable from '../components/reports/ProductPerformanceTable';

const Reportes = () => {
  const [filters, setFilters] = useState({ dateRange: '6m', destino: 'all', aerolinea: 'all', temporada: 'all' });
  const { user } = useAuth();

  // Solo administradores totales y de agencia pueden acceder
  const isAdmin = user?.role === 'admin' || user?.role === 'agency_admin';

  if (!isAdmin) {
    return (
      <div className="container">
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

  const { data: evolution, isLoading: loadingEvol } = useEvolutionRevenue(filters);
  const { data: agencyShare, isLoading: loadingShare } = useSalesByAgency(filters);
  const { data: destinations, isLoading: loadingDest } = useDestinationsDetail(filters);
  const { data: topProducts, isLoading: loadingTop } = useTopProducts({ metric: 'rentabilidad', limit: 5 });
  const { data: riskAlerts, isLoading: loadingRisk } = useRiskAlerts();
  const { data: occupancy, isLoading: loadingOccupancy } = useOccupancy(filters);

  // Calcular KPIs del último período
  const latestStats = evolution?.[evolution.length - 1] || {};
  const prevStats = evolution?.[evolution.length - 2] || {};
  const stats = {
    ventas: latestStats.ventas || 0,
    rentabilidad: latestStats.rentabilidad || 0,
    riesgo: latestStats.riesgo || 0,
    ocupacion: latestStats.ocupacion || 0,
    ventasChange: prevStats.ventas ? ((latestStats.ventas - prevStats.ventas) / prevStats.ventas * 100) : 0,
    rentabilidadChange: prevStats.rentabilidad ? ((latestStats.rentabilidad - prevStats.rentabilidad) / prevStats.rentabilidad * 100) : 0,
    riesgoChange: prevStats.riesgo ? ((latestStats.riesgo - prevStats.riesgo) / prevStats.riesgo * 100) : 0,
    ocupacionChange: prevStats.ocupacion ? (latestStats.ocupacion - prevStats.ocupacion) : 0,
  };

  const handleExport = () => {
    // TODO: Implementar exportación CSV
    console.log('Exportar reportes con filtros:', filters);
  };

  // Extract unique destinations from data for filter dropdown
  const destinationsList = [...new Set((destinations || []).map(d => d.destino).filter(Boolean))];

  // Transform destinations data for product performance table
  const productPerformanceData = (destinations || []).map(d => ({
    ...d,
    rentabilidad_percent: d.venta_real > 0 ? (d.rentabilidad / d.venta_real) * 100 : 0,
    riesgo_percent: d.costo_real > 0 ? (d.riesgo / d.costo_real) * 100 : 0,
  }));

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <PageHeader
        title="Dashboard de Reportes"
        description="Análisis ejecutivo de ventas, rentabilidad y riesgo"
        icon={BarChart3}
      />

      {/* Filtros */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        destinations={destinationsList}
      />

      {/* KPIs Row */}
      <KPIsRow stats={stats} />

      {/* Row 2: Gráficos principales */}
      <div className="grid grid-cols-2 gap-4">
        <EvolutionChart data={evolution} loading={loadingEvol} />
        <AgencyShareChart data={agencyShare} loading={loadingShare} />
      </div>

      {/* Row 3: Análisis detallado */}
      <div className="grid grid-cols-3 gap-4">
        <TopDestinationsChart data={topProducts} loading={loadingTop} />
        <OccupancyHeatmap data={occupancy || destinations} loading={loadingOccupancy || loadingDest} />
        <RiskAlertsTable data={riskAlerts} loading={loadingRisk} />
      </div>

      {/* Row 4: Tabla de rendimiento por producto */}
      <ProductPerformanceTable data={productPerformanceData} loading={loadingDest} />

      {/* Row 5: Tabla detallada (colapsable) */}
      <DestinationDetailTable data={destinations} loading={loadingDest} />
    </div>
  );
};

export default Reportes;
