import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { Lock, BarChart3, Info, DollarSign, TrendingUp, Wallet, AlertTriangle, Filter } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Tooltip } from 'react-tooltip';

// Importar los nuevos componentes del cockpit ejecutivo
import FiltersPanel from '../components/reports/FiltersPanel';
import DashboardChart from '../components/reports/DashboardChart';
import DataTable from '../components/reports/DataTable';
import DepartureTable from '../components/reports/DepartureTable';
import TabsCharts from '../components/reports/TabsCharts';
import PeriodSelector from '../components/reports/PeriodSelector';
import KpiPanel from '../components/reports/KpiPanel';

import { ReportService } from '../services/reportService.js';

// Paleta genérica por agencia — cualquier cantidad de agencias reales, ya no
// un esquema fijo de 2 competidores (Jetmar/Tienda).
const AGENCY_PALETTE = ['#2563eb', '#e11d48', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

const Reportes = () => {
  const { user, can } = useAuth();
  const isAdmin = can('REPORTS_VIEW');

  // Todos los estados del cockpit ejecutivo
  const [fields, setFields] = useState([]);
  const [filters, setFilters] = useState({ 'Tipo de operación': '' });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const emptyChart = { labels: [], datasets: [] };
  const [destinosVendidos, setDestinosVendidos] = useState(emptyChart);
  const [destinosDisponibles, setDestinosDisponibles] = useState(emptyChart);
  const [destinosCancelados, setDestinosCancelados] = useState(emptyChart);
  const [destinosRentabilidad, setDestinosRentabilidad] = useState(emptyChart);
  const [destinosCosto, setDestinosCosto] = useState(emptyChart);
  const [destinosVenta, setDestinosVenta] = useState(emptyChart);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [porSalidaColumns, setPorSalidaColumns] = useState([]);
  const [porSalidaData, setPorSalidaData] = useState([]);
  const [urgentSalidas, setUrgentSalidas] = useState(new Set());
  const [companiaVendidos, setCompaniaVendidos] = useState(emptyChart);
  const [companiaDisponibles, setCompaniaDisponibles] = useState(emptyChart);
  const [companiaCancelados, setCompaniaCancelados] = useState(emptyChart);
  const [companiaRentabilidad, setCompaniaRentabilidad] = useState(emptyChart);
  const [companiaCosto, setCompaniaCosto] = useState(emptyChart);
  const [companiaVenta, setCompaniaVenta] = useState(emptyChart);
  const [cuposTomadosPorDestino, setCuposTomadosPorDestino] = useState(emptyChart);
  const [agenciaVendidos, setAgenciaVendidos] = useState(emptyChart);
  const [agenciaEvolucion, setAgenciaEvolucion] = useState(emptyChart);
  const [temporadasValidas, setTemporadasValidas] = useState([]);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [evolucionGranularidad, setEvolucionGranularidad] = useState('mes');
  const [agenciaEvolucionGranularidad, setAgenciaEvolucionGranularidad] = useState('mes');

  // KPIs del panel superior
  const [kpis, setKpis] = useState([
    { label: 'Ventas Totales (USD)', value: '$0', icon: DollarSign },
    { label: 'Rentabilidad (USD)', value: '$0', icon: TrendingUp },
    { label: 'Costo (USD)', value: '$0', icon: Wallet },
    { label: 'Riesgo (USD)', value: '$0', icon: AlertTriangle },
  ]);

  const buildFiltersRequest = (baseFilters) => {
    let filtrosRequest = { ...(baseFilters || {}) };
    const normalizeMulti = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && /[,;]/.test(val)) {
        return Array.from(new Set(val.split(/[,;]+/).map(v => v.trim()).filter(v => v)));
      }
      return val;
    };

    ['Temporada', 'Destino', 'Proveedor', 'Compañia'].forEach(k => {
      if (filtrosRequest[k]) filtrosRequest[k] = normalizeMulti(filtrosRequest[k]);
    });
    if (filtrosRequest['Aerolinea']) {
      filtrosRequest['Compañia'] = filtrosRequest['Aerolinea'];
      delete filtrosRequest['Aerolinea'];
    }
    if (filtrosRequest['Proveedor'] && !filtrosRequest['Compañia']) {
      filtrosRequest['Compañia'] = filtrosRequest['Proveedor'];
    }
    if (filtrosRequest['Tipo de operación']) {
      if (!filtrosRequest['Tipo producto']) {
        filtrosRequest['Tipo producto'] = filtrosRequest['Tipo de operación'];
      }
      delete filtrosRequest['Tipo de operación'];
    }
    return filtrosRequest;
  };

  // Cargar campos de filtros dinámicos al montar
  useEffect(() => {
    async function loadFields() {
      try {
        const data = await ReportService.getFields();
        const exclude = [
          'INFO EXTRA', 'REGION', 'TASAS', 'TARIFA', 'Código de Reserva', 'Liberados', 'Gestiona',
          'SEÑA: Fecha', 'SEÑA:  Información', 'Cancelación sin Gastos', 'Responsable del Grupo',
          'Info de Liberados', 'Fecha limite Saldo', 'Fecha emisión de grupo', 'Nomina', 'Status BOL',
          'EMITIDO?', 'Utilidad OPERATIVA', 'Visible Jetmar', 'Visible Tienda', 'Visible Buemes',
          'Visible Diegal', 'Link para reservar', 'Cancelado con pasajeros', 'Visible Hiperviajes',
          'CI', 'Fecha Nac', 'Pasaporte', 'Celular', 'Hotel', 'Traslados', 'Operador del Hotel',
          'Solicitar', 'RefPaquete', 'Observaciones', 'Agrupar por', 'Valor a sumar',
          'FechaViajeCalculada', 'Mail del Pasajero', 'uno por familia', 'Pedir MAIL del PAX',
          'Pedir datos completos', 'Vencimiento CI', 'Vencimiento Pasaporte', 'Status BACK',
          'Status Seña', 'Status Solución', 'afectado', 'Ajuste NETO Vendedor', 'ficha', 'cedidos',
          'Regreso', 'Salida'
        ];
        let campos = (data.fields || []).filter(f => !exclude.includes(f.field));
        if (!campos.find(f => f.field === 'Tipo de operación')) {
          campos = [
            ...campos,
            { field: 'Tipo de operación', values: ['CHARTERS', 'DESTINO ARG', 'CUPOS'] }
          ];
        }
        setFields(campos);
      } catch (error) {
        console.error('Error cargando campos:', error);
      }
    }
    loadFields();
  }, []);

  // Recargar evolución de pasajeros cuando cambia granularidad
  useEffect(() => {
    async function reloadEvolucion() {
      try {
        const filtrosRequest = buildFiltersRequest(filters);
        const evolucionPasajeros = await ReportService.getEvolucionPasajerosPost(filtrosRequest, evolucionGranularidad);
        setChartData(evolucionPasajeros || { labels: [], datasets: [] });
      } catch (err) {
        console.error('Error recargando evolución:', err);
      }
    }
    reloadEvolucion();
  }, [evolucionGranularidad]);

  // Recargar evolución de agencias cuando cambia su granularidad
  useEffect(() => {
    async function reloadEvolucionAgencia() {
      try {
        const filtrosRequest = buildFiltersRequest(filters);
        const evolucionAgencias = await ReportService.getEvolucionAgencias(filtrosRequest, agenciaEvolucionGranularidad);
        setAgenciaEvolucion(evolucionAgencias || { labels: [], datasets: [] });
      } catch (err) {
        console.error('Error recargando evolución de agencias:', err);
      }
    }
    reloadEvolucionAgencia();
  }, [agenciaEvolucionGranularidad]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      if (['Temporada', 'Destino', 'Proveedor'].includes(field)) {
        return { ...prev, [field]: Array.isArray(value) ? value : value ? [value] : [] };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleUpdate = async () => {
    try {
      setIsFilterLoading(true);

      const filtrosRequest = buildFiltersRequest(filters);

      const [evolucionPasajeros, detalleDestinos, porSalida] = await Promise.all([
        ReportService.getEvolucionPasajerosPost(filtrosRequest, evolucionGranularidad),
        ReportService.getDetalleDestinosPost(filtrosRequest),
        ReportService.getPorSalida(filtrosRequest)
      ]);

      if (!detalleDestinos || !Array.isArray(detalleDestinos.data)) {
        setTableColumns([]);
        setTableData([]);
      } else {
        setChartData(evolucionPasajeros || { labels: [], datasets: [] });
        const colsRaw = Array.isArray(detalleDestinos.columns) ? detalleDestinos.columns : [];
        const cols = colsRaw.filter(c => c !== 'Proveedor');
        const dataRows = Array.isArray(detalleDestinos.data)
          ? detalleDestinos.data.map(r => {
              if (r && typeof r === 'object') {
                const { Proveedor, ...rest } = r;
                return rest;
              }
              return r;
            })
          : [];
        setTableColumns(cols);
        setTableData(dataRows);
      }

      if (!porSalida || !Array.isArray(porSalida.data)) {
        setPorSalidaColumns([]);
        setPorSalidaData([]);
      } else {
        setPorSalidaColumns(Array.isArray(porSalida.columns) ? porSalida.columns : []);
        setPorSalidaData(porSalida.data);

        try {
          const today = new Date();
          const proximas = (porSalida.data || [])
            .map(r => r['Salida'])
            .filter(s => s && typeof s === 'string')
            .map(s => {
              const d = new Date(`${s}T00:00:00`);
              return !isNaN(d) && d >= today ? { salida: s, time: d.getTime() } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.time - b.time)
            .slice(0, 5)
            .map(o => o.salida);
          setUrgentSalidas(new Set(proximas));
        } catch {
          setUrgentSalidas(new Set());
        }
      }

      // Procesar datos para gráficos por destino
      const rowsDet = (detalleDestinos?.data || []);
      const uniqueDestinos = Array.from(new Set(rowsDet.map(d => d.Destino || 'Sin destino')));
      const uniqueTemporadas = Array.from(new Set(rowsDet.map(d => d.Temporada || 'Sin temporada')));

      const buildComparativoDestino = (key, labelDefault) => {
        if (uniqueTemporadas.length > 1) {
          return {
            labels: uniqueDestinos,
            datasets: uniqueTemporadas.map(temp => ({
              label: temp,
              data: uniqueDestinos.map(dest => rowsDet
                .filter(r => (r.Destino || 'Sin destino') === dest && (r.Temporada || 'Sin temporada') === temp)
                .reduce((sum, r) => sum + (parseFloat(r[key]) || 0), 0)
              )
            }))
          };
        }
        return {
          labels: uniqueDestinos,
          datasets: [{
            label: labelDefault,
            data: uniqueDestinos.map(dest => rowsDet
              .filter(r => (r.Destino || 'Sin destino') === dest)
              .reduce((sum, r) => sum + (parseFloat(r[key]) || 0), 0)
            )
          }]
        };
      };

      setDestinosVendidos(buildComparativoDestino('Lugares vendidos', 'Vendidos'));
      setDestinosDisponibles(buildComparativoDestino('Cupos tomados', 'Cupos tomados'));
      setDestinosCancelados(buildComparativoDestino('Lugares cancelados', 'Cancelados'));
      setDestinosRentabilidad(buildComparativoDestino('Rentabilidad', 'Rentabilidad'));
      setDestinosCosto(buildComparativoDestino('Costo', 'Costo'));
      setDestinosVenta(buildComparativoDestino('Venta', 'Venta'));
      setCuposTomadosPorDestino(buildComparativoDestino('Cupos tomados', 'Cupos tomados'));

      // Calcular KPIs financieros totales basados en detalleDestinos
      const totalVentas = rowsDet.reduce((sum, r) => sum + (parseFloat(r['Venta']) || 0), 0);
      const totalRentabilidad = rowsDet.reduce((sum, r) => sum + (parseFloat(r['Rentabilidad']) || 0), 0);
      const totalCosto = rowsDet.reduce((sum, r) => sum + (parseFloat(r['Costo']) || 0), 0);
      const totalRiesgo = rowsDet.reduce((sum, r) => sum + (parseFloat(r['Riesgo']) || 0), 0);

      setKpis([
        { label: 'Ventas Totales (USD)', value: `$${Math.round(totalVentas).toLocaleString()}`, icon: DollarSign },
        { label: 'Rentabilidad (USD)', value: `$${Math.round(totalRentabilidad).toLocaleString()}`, icon: TrendingUp },
        { label: 'Costo de lo Vendido (USD)', value: `$${Math.round(totalCosto).toLocaleString()}`, icon: Wallet },
        { label: 'Riesgo Económico (USD)', value: `$${Math.round(totalRiesgo).toLocaleString()}`, icon: AlertTriangle },
      ]);

      const [agencias, evolucionAgencias, destinosCompania] = await Promise.all([
        ReportService.getAgenciasData(filtrosRequest).catch(() => null),
        ReportService.getEvolucionAgencias(filtrosRequest, agenciaEvolucionGranularidad).catch(() => null),
        ReportService.getDestinosCompania(filtrosRequest).catch(() => null)
      ]);

      if (destinosCompania) {
        const isComparativo = (obj) => obj && Array.isArray(obj.seasons) && obj.seasons.length > 1 && Array.isArray(obj.datasets);

        setCompaniaVendidos(
          isComparativo(destinosCompania.vendidosPorCompaniaComparativo)
            ? { labels: destinosCompania.vendidosPorCompaniaComparativo.labels, datasets: destinosCompania.vendidosPorCompaniaComparativo.datasets }
            : { labels: destinosCompania.vendidosPorCompania?.labels, datasets: [{ label: 'Vendidos', data: destinosCompania.vendidosPorCompania?.values }] }
        );
        setCompaniaDisponibles(
          isComparativo(destinosCompania.disponiblesPorCompaniaComparativo)
            ? { labels: destinosCompania.disponiblesPorCompaniaComparativo.labels, datasets: destinosCompania.disponiblesPorCompaniaComparativo.datasets }
            : { labels: destinosCompania.disponiblesPorCompania?.labels, datasets: [{ label: 'Cupos tomados', data: destinosCompania.disponiblesPorCompania?.values }] }
        );
        setCompaniaCancelados(
          isComparativo(destinosCompania.canceladosPorCompaniaComparativo)
            ? { labels: destinosCompania.canceladosPorCompaniaComparativo.labels, datasets: destinosCompania.canceladosPorCompaniaComparativo.datasets }
            : { labels: destinosCompania.canceladosPorCompania?.labels, datasets: [{ label: 'Cancelados', data: destinosCompania.canceladosPorCompania?.values }] }
        );
        setCompaniaRentabilidad(
          isComparativo(destinosCompania.rentabilidadPorCompaniaComparativo)
            ? { labels: destinosCompania.rentabilidadPorCompaniaComparativo.labels, datasets: destinosCompania.rentabilidadPorCompaniaComparativo.datasets }
            : { labels: destinosCompania.rentabilidadPorCompania?.labels, datasets: [{ label: 'Rentabilidad', data: destinosCompania.rentabilidadPorCompania?.values }] }
        );
        setCompaniaCosto(
          isComparativo(destinosCompania.costoPorCompaniaComparativo)
            ? { labels: destinosCompania.costoPorCompaniaComparativo.labels, datasets: destinosCompania.costoPorCompaniaComparativo.datasets }
            : { labels: destinosCompania.costoPorCompania?.labels, datasets: [{ label: 'Costo', data: destinosCompania.costoPorCompania?.values }] }
        );
        setCompaniaVenta(
          isComparativo(destinosCompania.ventaPorCompaniaComparativo)
            ? { labels: destinosCompania.ventaPorCompaniaComparativo.labels, datasets: destinosCompania.ventaPorCompaniaComparativo.datasets }
            : { labels: destinosCompania.ventaPorCompania?.labels, datasets: [{ label: 'Venta', data: destinosCompania.ventaPorCompania?.values }] }
        );
      }

      if (agencias) {
        setAgenciaVendidos({
          labels: agencias.labels,
          datasets: [
            { label: 'Ventas', data: agencias.values },
            { label: 'Share (%)', data: agencias.share, yAxisID: 'y2', type: 'line', borderColor: '#cc6200', backgroundColor: 'rgba(204,98,0,0.2)' }
          ]
        });
      }

      if (evolucionAgencias) {
        setAgenciaEvolucion({
          labels: evolucionAgencias.labels,
          datasets: evolucionAgencias.datasets
        });
      }

      setIsFilterLoading(false);
    } catch (error) {
      console.error('Error en handleUpdate:', error);
      setIsFilterLoading(false);
    }
  };

  // Cargar datos por defecto al montar
  useEffect(() => {
    handleUpdate();
  }, []);

  // El guard de acceso va DESPUÉS de todos los hooks (nunca antes): can()
  // depende de permisos que cargan async en AuthContext, así que isAdmin
  // puede pasar de false a true entre renders — si el guard cortara antes de
  // declarar los hooks de abajo, React los llamaría 0 veces en el primer
  // render y luego 20+ de golpe al habilitarse, violando las reglas de
  // hooks y corrompiendo el estado (esto rompió la pantalla en producción).
  if (!isAdmin) {
    return (
      <div className="container p-4">
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

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard de Reportes"
        description="Análisis ejecutivo de ventas, rentabilidad, ocupación y riesgo comercial en tiempo real"
        icon={BarChart3}
      />

      {/* Filtros — siempre visibles, en grilla */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-500">Ajustá los filtros y aplicá para actualizar todo el dashboard.</p>
          </div>
        </div>
        <FiltersPanel
          fields={fields}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleUpdate}
          temporadasValidas={temporadasValidas}
          showAgencyFilter={user?.role === 'admin'}
        />
      </Card>

      {/* KPIs Row */}
      <KpiPanel kpis={kpis} />

      {/* Contenido principal del dashboard */}
      <div>
        <TabsCharts
          principalPanel={
            <div className="flex flex-col lg:flex-row w-full gap-4 items-start">
              <div className="w-full lg:w-3/4">
                <DataTable
                  columns={tableColumns}
                  data={tableData}
                  rentabilidadData={destinosRentabilidad}
                  costoData={destinosCosto}
                  ventaData={destinosVenta}
                  isLoading={isFilterLoading}
                  title="Tabla agregada (Destino + Temporada)"
                />
              </div>
              <div className="w-full lg:w-1/4">
                <div className="flex flex-col h-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                      Evolución de pasajeros
                      <Info size={14} className="text-slate-400 cursor-help" data-tooltip-id="pax-evol-info" data-tooltip-content="Suma de NRO (ventas válidas y bebés de regreso < 2 años) agrupados por período." />
                      <Tooltip id="pax-evol-info" place="top" />
                    </span>
                    <PeriodSelector
                      value={evolucionGranularidad}
                      onChange={setEvolucionGranularidad}
                      disabled={isFilterLoading}
                    />
                  </div>
                  <DashboardChart
                    chartData={chartData || {labels: [], datasets: []}}
                    chartType="line"
                    title=""
                    isLoading={isFilterLoading}
                  />
                </div>
              </div>
            </div>
          }
          salidaPanel={
            <div className="flex flex-col w-full">
              <DepartureTable
                columns={porSalidaColumns}
                data={porSalidaData}
                isLoading={isFilterLoading}
                enableSorting={true}
                title="Por salida (cupos individuales)"
                urgentSortFirst={true}
                urgentRule={(row) => urgentSalidas.has(row['Salida'])}
              />
            </div>
          }
          destinoCharts={[
            { chartData: destinosVendidos, chartType: 'bar', title: 'Lugares vendidos por destino' },
            { chartData: destinosDisponibles, chartType: 'bar', title: 'Lugares disponibles por destino' },
            { chartData: destinosCancelados, chartType: 'bar', title: 'Lugares cancelados por destino' },
            { chartData: destinosRentabilidad, chartType: 'bar', title: 'Rentabilidad por destino' },
            { chartData: destinosCosto, chartType: 'bar', title: 'Costo por destino' },
            { chartData: destinosVenta, chartType: 'bar', title: 'Venta por destino' },
            { chartData: cuposTomadosPorDestino, chartType: 'bar', title: 'Cupos tomados por destino' },
          ]}
          companiaCharts={[
            { chartData: companiaVendidos, chartType: 'bar', title: 'Lugares vendidos por compañía' },
            { chartData: companiaDisponibles, chartType: 'bar', title: 'Lugares disponibles por compañía' },
            { chartData: companiaCancelados, chartType: 'bar', title: 'Lugares cancelados por compañía' },
            { chartData: companiaRentabilidad, chartType: 'bar', title: 'Rentabilidad por compañía' },
            { chartData: companiaCosto, chartType: 'bar', title: 'Costo por compañía' },
            { chartData: companiaVenta, chartType: 'bar', title: 'Venta por compañía' },
          ]}
          agenciaPanel={
            <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-start rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="lg:col-span-4 flex flex-col items-center">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Share de ventas por agencia (%)</h4>
                <div style={{ height: 260, width: '100%' }}>
                  <DashboardChart
                    chartData={{
                      labels: agenciaVendidos.labels,
                      datasets: [
                        {
                          label: 'Share',
                          data: agenciaVendidos.datasets?.[0]?.data || [],
                          backgroundColor: (agenciaVendidos.labels || []).map((_, i) => AGENCY_PALETTE[i % AGENCY_PALETTE.length])
                        }
                      ]
                    }}
                    chartType="doughnut"
                    title=""
                    isLoading={isFilterLoading}
                  />
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-slate-900">Evolución de ventas por agencia</span>
                  <PeriodSelector
                    value={agenciaEvolucionGranularidad}
                    onChange={setAgenciaEvolucionGranularidad}
                    disabled={isFilterLoading}
                  />
                </div>
                <DashboardChart
                  chartData={agenciaEvolucion}
                  chartType="line"
                  title=""
                  isLoading={isFilterLoading}
                />
              </div>
            </div>
          }
          isLoading={isFilterLoading}
        />
      </div>
    </div>
  );
};

export default Reportes;