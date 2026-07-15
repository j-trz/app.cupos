import Login from './components/Login.jsx';
import { HiOutlineFunnel, HiMiniXMark, HiOutlineLockOpen , HiOutlineLockClosed   } from "react-icons/hi2";
import { Tooltip } from 'react-tooltip';
import React, { useState, useEffect } from 'react';
import { supabase, ensureSessionFresh } from './utils/supabaseClient';
import Layout from './components/Layout.jsx';
import FiltersPanel from './components/FiltersPanel.jsx';
import DashboardChart from './components/DashboardChart.jsx';
import DataTable from './components/DataTable.jsx';
import DepartureTable from './components/DepartureTable.jsx';
import TabsCharts from './components/TabsCharts.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import PeriodSelector from './components/PeriodSelector.jsx';
import { getFields, getAdditionalChartData, getEvolucionPasajeros, getEvolucionAgencias, getDetalleDestinos, getPorSalida } from './utils/apiClient.js';



function App() {
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
  const [cuposTomadosPorCompania, setCuposTomadosPorCompania] = useState(emptyChart);
  const [agenciaVendidos, setAgenciaVendidos] = useState(emptyChart);
  const [agenciaEvolucion, setAgenciaEvolucion] = useState(emptyChart);
  const [temporadasValidas, setTemporadasValidas] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosAnclados, setFiltrosAnclados] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Cargando datos...');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [evolucionGranularidad, setEvolucionGranularidad] = useState('mes');
  const [agenciaEvolucionGranularidad, setAgenciaEvolucionGranularidad] = useState('mes');

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
<<<<<<< HEAD

=======
  
>>>>>>> main
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        // El token se renovó automáticamente
        setToken(session?.access_token || null);
        localStorage.setItem('token', session?.access_token || '');
        localStorage.setItem('refresh_token', session?.refresh_token || '');
        console.log('Token refrescado automáticamente');
      }
      if (event === 'SIGNED_OUT') {
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        sessionStorage.clear();
        // Evitar recarga que provoca flicker al volver al login
      }
      if (event === 'SIGNED_IN') {
        setToken(session?.access_token || null);
        localStorage.setItem('token', session?.access_token || '');
        localStorage.setItem('refresh_token', session?.refresh_token || '');
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh silencioso del token (sin modal)
  useEffect(() => {
    if (!token) return;

    const CHECK_INTERVAL_MS = 60 * 1000; // cada 60s
    let interval;

    const tick = async () => {
      try {
        const session = await ensureSessionFresh();
        if (!session) {
          // Intentar hidratar sesión desde localStorage sin desloguear
          const at = localStorage.getItem('token');
          const rt = localStorage.getItem('refresh_token');
          if (at && rt) {
            try {
              await supabase.auth.setSession({ access_token: at, refresh_token: rt });
            } catch {
              // ignorar error de hidratación, se reintentará en el siguiente ciclo
            }
          }
          return;
        }
        if (session.access_token !== token) {
          setToken(session.access_token);
          localStorage.setItem('token', session.access_token);
        }
      } catch {
        // silencioso, sin modal
      }
    };

    // refresco inmediato y por intervalo
    tick();
    interval = setInterval(tick, CHECK_INTERVAL_MS);

    // refresco al volver al foco/visible
    const onFocus = () => { tick(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token]);

  // Recargar solo evolución cuando cambia la granularidad
  useEffect(() => {
    async function reloadEvolucion() {
      if (!userId) return;
      try {
        const filtrosRequest = buildFiltersRequest(filters);
<<<<<<< HEAD

=======
        
>>>>>>> main
        const evolucionPasajeros = await getEvolucionPasajeros({ userId, filters: filtrosRequest, granularidad: evolucionGranularidad });
        setChartData(evolucionPasajeros || { labels: [], datasets: [] });
      } catch (err) {
        console.error('Error recargando evolución:', err);
      }
    }
    reloadEvolucion();
  }, [evolucionGranularidad, userId]);

  // Recargar solo evolución por agencia cuando cambia su granularidad
  useEffect(() => {
    async function reloadEvolucionAgencia() {
      if (!userId) return;
      try {
        const filtrosRequest = buildFiltersRequest(filters);
        const evolucionAgencias = await getEvolucionAgencias({
          userId,
          filters: filtrosRequest,
          granularidad: agenciaEvolucionGranularidad
        });
        setAgenciaEvolucion(evolucionAgencias || { labels: [], datasets: [] });
      } catch (err) {
        console.error('Error recargando evolución de agencias:', err);
      }
    }
    reloadEvolucionAgencia();
  }, [agenciaEvolucionGranularidad, userId]);


  useEffect(() => {
    // El backend no expone temporadas directamente, así que inicializa vacío o usa getFields si es necesario
    setTemporadasValidas([]);
  }, []);

  useEffect(() => {
    async function loadFields() {
      try {
        // Extraer userId del token de Supabase si está disponible
        let userId = null;
        const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
        if (session && session.user && session.user.id) {
          userId = session.user.id;
        }
        // Si no hay userId, intenta decodificarlo del token manualmente
        if (!userId && token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.sub || payload.user_id || null;
          } catch {
            userId = null;
          }
        }
        // Guardar userId en estado para pasarlo a componentes hijos
        setUserId(userId);
        const data = await getFields(userId);
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
        let campos = data.fields.filter(f => !exclude.includes(f.field));
        if (!campos.find(f => f.field === 'Tipo de operación')) {
          campos = [
            ...campos,
            { field: 'Tipo de operación', values: ['CHARTERS', 'DESTINO ARG', 'CUPOS'] }
          ];
        }
        setFields(campos);
      } catch (error) {
        console.error('Error cargando campos:', error);
      } finally {
        setIsInitialLoading(false);
      }
    }
    if (token) {
      loadFields();
    } else {
      setIsInitialLoading(false);
    }
  }, [token]);

  const handleFilterChange = (field, value) => {
    // Si es multiselección y se deselecciona todo, dejar como array vacío
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
      setIsLoading(true);
      setLoadingMessage('🚀 Procesando filtros y obteniendo datos...');
<<<<<<< HEAD

      const filtrosRequest = buildFiltersRequest(filters);

=======
      
      const filtrosRequest = buildFiltersRequest(filters);
      
>>>>>>> main
      // Enviar arrays tal cual en filters; el backend soporta arrays o cadenas separadas por coma/semicolon.
      // No incluir 'comparar' en los requests para evitar que el backend lo tome como un filtro inválido.

      // Extraer userId del token
      let userId = null;
      const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
      if (session?.user?.id) userId = session.user.id;
      if (!userId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.user_id || null;
        } catch { userId = null; }
      }

      // Log completo del request que se envía a backend
      const requestBodyPreview = {
        userId,
        filters: filtrosRequest
      };
      console.log('🔍 Debug FE -> BE detalle-destinos REQUEST:', JSON.stringify(requestBodyPreview, null, 2));

      setLoadingMessage('📊 Cargando datos principales en paralelo...');
<<<<<<< HEAD

=======
      
>>>>>>> main
      // Peticiones paralelas (incluye por-salida)
      const [evolucionPasajeros, detalleDestinos, porSalida] = await Promise.all([
        getEvolucionPasajeros({ userId, filters: filtrosRequest, granularidad: evolucionGranularidad }),
        getDetalleDestinos({ userId, filters: filtrosRequest }),
        getPorSalida({ userId, filters: filtrosRequest })
      ]);

      console.log('🔍 Debug BE -> FE RESP evolucionPasajeros:', evolucionPasajeros);
      console.log('🔍 Debug BE -> FE RESP detalleDestinos (rows):', detalleDestinos?.data?.length);
      console.log('🔍 Debug BE -> FE RESP porSalida (rows):', porSalida?.data?.length);

      // Validación defensiva detalleDestinos
      if (!detalleDestinos || !Array.isArray(detalleDestinos.data)) {
        console.warn('⚠️ detalleDestinos inválido, abortando carga de tabla.');
        setTableColumns([]);
        setTableData([]);
      } else {
        setChartData(evolucionPasajeros || { labels: [], datasets: [] });
        // Quitar columna "Proveedor" en tabla agregada (datos sumados)
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
      // Validación defensiva porSalida
      if (!porSalida || !Array.isArray(porSalida.data)) {
        console.warn('⚠️ porSalida inválido, abortando carga de tabla por salida.');
        setPorSalidaColumns([]);
        setPorSalidaData([]);
      } else {
        setPorSalidaColumns(Array.isArray(porSalida.columns) ? porSalida.columns : []);
        setPorSalidaData(porSalida.data);

        // Calcular las 5 salidas futuras más próximas y guardarlas en urgentSalidas (Set)
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

      // Señal visual si llegó data pero la tabla quedara vacía
      if (detalleDestinos?.data?.length > 0 && detalleDestinos?.columns?.length > 0) {
        console.log('✅ Tabla alimentada con filas:', detalleDestinos.data.length);
      } else {
        console.warn('🟡 Backend devolvió columnas pero 0 filas. Verificar filtros en FE.');
      }

      // Procesar datos para gráficos por destino (comparativo por Temporada si corresponde)
      const rowsDet = (detalleDestinos?.data || []);
      const uniqueDestinos = Array.from(new Set(rowsDet.map(d => d.Destino || 'Sin destino')));
      const uniqueTemporadas = Array.from(new Set(rowsDet.map(d => d.Temporada || 'Sin temporada')));
<<<<<<< HEAD

=======
      
>>>>>>> main
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
        // Fallback a dataset único si hay una sola temporada
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
<<<<<<< HEAD

=======
      
>>>>>>> main
      setDestinosVendidos(buildComparativoDestino('Lugares vendidos', 'Vendidos'));
      setDestinosDisponibles(buildComparativoDestino('Cupos tomados', 'Cupos tomados'));
      setDestinosCancelados(buildComparativoDestino('Lugares cancelados', 'Cancelados'));
      setDestinosRentabilidad(buildComparativoDestino('Rentabilidad', 'Rentabilidad'));
      setDestinosCosto(buildComparativoDestino('Costo', 'Costo'));
      setDestinosVenta(buildComparativoDestino('Venta', 'Venta'));
      setCuposTomadosPorDestino(buildComparativoDestino('Cupos tomados', 'Cupos tomados'));

      setLoadingMessage('📈 Cargando gráficos adicionales en paralelo...');
<<<<<<< HEAD

=======
      
>>>>>>> main
      const additionalData = await getAdditionalChartData({
        userId,
        filters: filtrosRequest,
        granularidadAgencias: agenciaEvolucionGranularidad
      });
      console.log('🔍 Debug BE -> FE RESP additionalData:', additionalData);

      if (additionalData.destinosCompania) {
        const dc = additionalData.destinosCompania;
        const isComparativo = (obj) => obj && Array.isArray(obj.seasons) && obj.seasons.length > 1 && Array.isArray(obj.datasets);
<<<<<<< HEAD

=======
        
>>>>>>> main
        // Vendidos
        setCompaniaVendidos(
          isComparativo(dc.vendidosPorCompaniaComparativo)
            ? { labels: dc.vendidosPorCompaniaComparativo.labels, datasets: dc.vendidosPorCompaniaComparativo.datasets }
            : { labels: dc.vendidosPorCompania.labels, datasets: [{ label: 'Vendidos', data: dc.vendidosPorCompania.values }] }
        );
        // Disponibles (Cupos tomados)
        setCompaniaDisponibles(
          isComparativo(dc.disponiblesPorCompaniaComparativo)
            ? { labels: dc.disponiblesPorCompaniaComparativo.labels, datasets: dc.disponiblesPorCompaniaComparativo.datasets }
            : { labels: dc.disponiblesPorCompania.labels, datasets: [{ label: 'Cupos tomados', data: dc.disponiblesPorCompania.values }] }
        );
        // Cancelados
        setCompaniaCancelados(
          isComparativo(dc.canceladosPorCompaniaComparativo)
            ? { labels: dc.canceladosPorCompaniaComparativo.labels, datasets: dc.canceladosPorCompaniaComparativo.datasets }
            : { labels: dc.canceladosPorCompania.labels, datasets: [{ label: 'Cancelados', data: dc.canceladosPorCompania.values }] }
        );
        // Rentabilidad
        setCompaniaRentabilidad(
          isComparativo(dc.rentabilidadPorCompaniaComparativo)
            ? { labels: dc.rentabilidadPorCompaniaComparativo.labels, datasets: dc.rentabilidadPorCompaniaComparativo.datasets }
            : { labels: dc.rentabilidadPorCompania.labels, datasets: [{ label: 'Rentabilidad', data: dc.rentabilidadPorCompania.values }] }
        );
        // Costo
        setCompaniaCosto(
          isComparativo(dc.costoPorCompaniaComparativo)
            ? { labels: dc.costoPorCompaniaComparativo.labels, datasets: dc.costoPorCompaniaComparativo.datasets }
            : { labels: dc.costoPorCompania.labels, datasets: [{ label: 'Costo', data: dc.costoPorCompania.values }] }
        );
        // Venta
        setCompaniaVenta(
          isComparativo(dc.ventaPorCompaniaComparativo)
            ? { labels: dc.ventaPorCompaniaComparativo.labels, datasets: dc.ventaPorCompaniaComparativo.datasets }
            : { labels: dc.ventaPorCompania.labels, datasets: [{ label: 'Venta', data: dc.ventaPorCompania.values }] }
        );
        // Cupos tomados para mini-kpi por compañía
        setCuposTomadosPorCompania(
          isComparativo(dc.disponiblesPorCompaniaComparativo)
            ? { labels: dc.disponiblesPorCompaniaComparativo.labels, datasets: dc.disponiblesPorCompaniaComparativo.datasets }
            : { labels: dc.disponiblesPorCompania.labels, datasets: [{ label: 'Cupos tomados', data: dc.disponiblesPorCompania.values }] }
        );
      }

      if (additionalData.agencias) {
        const agencias = additionalData.agencias;
        setAgenciaVendidos({
          labels: agencias.labels,
          datasets: [
            { label: 'Ventas', data: agencias.values },
            { label: 'Share (%)', data: agencias.share, yAxisID: 'y2', type: 'line', borderColor: '#cc6200', backgroundColor: 'rgba(204,98,0,0.2)' }
          ]
        });
      }

      if (additionalData.evolucionAgencias) {
        const evolucionAgencias = additionalData.evolucionAgencias;
        setAgenciaEvolucion({
          labels: evolucionAgencias.labels,
          datasets: evolucionAgencias.datasets
        });
      }

      setLoadingMessage('✅ ¡Datos cargados con optimizaciones de caché!');
<<<<<<< HEAD

      if (additionalData.errors?.length) {
        console.warn('Algunos gráficos no se pudieron cargar:', additionalData.errors);
      }

=======
      
      if (additionalData.errors?.length) {
        console.warn('Algunos gráficos no se pudieron cargar:', additionalData.errors);
      }
      
>>>>>>> main
      setTimeout(() => {
        setIsLoading(false);
        setIsFilterLoading(false);
      }, 500);
    } catch (error) {
      console.error('❌ Error en handleUpdate:', error);
      setIsLoading(false);
      setIsFilterLoading(false);
      alert('Error al actualizar los datos: ' + (error.message || 'Error desconocido'));
    }
  };

  // Define handleLogout to clear session and reload or redirect
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    sessionStorage.clear();
    window.location.reload();
  };

  const handleFilesUploaded = async () => {
    await handleUpdate();
  };

  if (!token) {
    return <Login onLogin={(t) => {
      setToken(t);
      localStorage.setItem('token', t);
    }} />;
  }

  if (isInitialLoading) {
    return (
      <LoadingSpinner
        message="Inicializando aplicación..."
        fullScreen={true}
      />
    );
  }

  return (
    <Layout filtrosAnclados={filtrosAnclados} onLogout={handleLogout} onFilesUploaded={handleFilesUploaded}>
<<<<<<< HEAD

=======
      
>>>>>>> main

      {/* Loader pantalla completa */}
      {isLoading && (
        <LoadingSpinner
          message={loadingMessage}
          fullScreen={true}
        />
      )}

      {/* Botón flotante para mostrar filtros si no están anclados */}
      {!filtrosAnclados && !mostrarFiltros && (
        <button
          className="fixed top-16 left-4 z-50 mb-6 bg-[#2563eb] hover:bg-[#304D85] text-white rounded-full shadow-lg p-3 flex items-center justify-center transition-all duration-200"
          style={{ boxShadow: '0 4px 24px 0 #2563eb44' }}
          onClick={() => setMostrarFiltros(true)}
          title="Mostrar filtros"
        >
          <HiOutlineFunnel size={20} />
        </button>
      )}

      {/* Panel de filtros moderno */}
      {(mostrarFiltros || filtrosAnclados) && (
        <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-40 transition-transform duration-300 ${filtrosAnclados ? 'translate-x-0' : (mostrarFiltros ? 'translate-x-0' : '-translate-x-full')}`}
             style={{ boxShadow: '0 4px 32px 0 #2563eb33' }}>
          <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <HiOutlineFunnel size={20} className="text-[#2563eb]" />
              <span className="text-lg font-bold text-[#304D85]">Filtros</span>
            </div>
            <div className="flex gap-1 items-center">
              <button
                className={`rounded-full p-1.5 transition ${filtrosAnclados ? 'bg-[#2563eb] text-white' : 'bg-gray-200 text-[#304D85]'}`}
                onClick={() => setFiltrosAnclados(!filtrosAnclados)}
                data-tooltip-id="tt-anclar"
                data-tooltip-content={filtrosAnclados ? 'Desanclar filtros' : 'Anclar filtros'}
                style={{ position: 'relative' }}
              >
                {filtrosAnclados ? <HiOutlineLockOpen size={16} /> : <HiOutlineLockClosed size={16} />}
                <Tooltip
                  id="tt-anclar"
                  place="top"
                  style={{
                    background: 'linear-gradient(135deg, #23272f 60%, #434a54 100%)',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                    padding: '6px 10px',
                    border: 'none',
                    zIndex: 2147483647,
                    pointerEvents: 'auto'
                  }}
                  wrapperStyle={{ zIndex: 2147483647 }}
                />
              </button>
              {!filtrosAnclados && (
                <button
                  className="rounded-full p-1.5 bg-gray-200 text-[#304D85] transition"
                  onClick={() => setMostrarFiltros(false)}
                  data-tooltip-id="tt-cerrar"
                  data-tooltip-content="Cerrar filtros"
                  style={{ position: 'relative' }}
                >
                  <HiMiniXMark size={16} />
                  <Tooltip
                    id="tt-cerrar"
                    place="top"
                    style={{
                      background: 'linear-gradient(135deg, #23272f 60%, #434a54 100%)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                      padding: '6px 10px',
                      border: 'none',
                      zIndex: 2147483647,
                      pointerEvents: 'auto'
                    }}
                    wrapperStyle={{ zIndex: 2147483647 }}
                  />
                </button>
              )}
            </div>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100vh-60px)]">
            <FiltersPanel
              fields={fields}
              filters={filters}
              onFilterChange={handleFilterChange}
              onApplyFilters={handleUpdate}
              temporadasValidas={temporadasValidas}
            />
          </div>
        </div>
      )}

  <div className={`dashboard-print-area transition-all duration-300${filtrosAnclados ? ' pl-80' : ''}`}>
        <TabsCharts
          principalPanel={
            <div className="flex flex-row w-full mb-4 gap-3 items-start">
              <div className="w-3/4">
                <DataTable
                  columns={tableColumns}
                  data={tableData}
                  rentabilidadData={destinosRentabilidad}
                  costoData={destinosCosto}
                  ventaData={destinosVenta}
                  isLoading={isFilterLoading}
                  title="Tabla agregada (Destino + Temporada)"
                  userId={userId}
                />
              </div>
              <div className="w-1/4">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Evolución de venta</span>
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
            <div className="flex flex-col w-full mb-4 gap-3">
              <DepartureTable
                columns={porSalidaColumns}
                data={porSalidaData}
                isLoading={isFilterLoading}
                enableSorting={true}
                title="Por salida (cupos individuales)"
                userId={userId}
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
            { chartData: cuposTomadosPorCompania, chartType: 'bar', title: 'Cupos tomados por compañía' },
          ]}
          agenciaPanel={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4 items-start">
              <div className="lg:col-span-4">
                <DashboardChart
                  chartData={{
                    labels: agenciaVendidos.labels,
                    datasets: [
                      {
                        label: 'Share',
                        data: agenciaVendidos.datasets?.[1]?.data || [],
                        backgroundColor: ['#2563eb', '#e11d48']
                      }
                    ]
                  }}
                  chartType="doughnut"
                  title="Share de ventas por agencia (%)"
                  isLoading={isFilterLoading}
                />
              </div>

              <div className="lg:col-span-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Evolución de ventas por agencia</span>
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
          agenciaCharts={[
            { chartData: { labels: agenciaVendidos.labels, datasets: [ { label: 'Share', data: agenciaVendidos.datasets?.[1]?.data || [], backgroundColor: ['#2563eb', '#e11d48'] } ] }, chartType: 'doughnut', title: 'Share de ventas por agencia (%)' },
            { chartData: agenciaEvolucion, chartType: 'line', title: 'Evolución de ventas por agencia' },
          ]}
          isLoading={isFilterLoading}
        />
      </div>


    </Layout>
  );
}

export default App;