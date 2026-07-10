import React, { useState, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import { Tooltip } from 'react-tooltip';
import { Line } from 'react-chartjs-2';
import DashboardChart from './DashboardChart.jsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';
import { getEvolucionPorCupo, getSharePorCupo } from '../utils/apiClient.js';

const drawLabelPlugin = {
  id: 'drawLabelPlugin',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    // Si el plugin oficial 'datalabels' está registrado y está activo para este chart,
    // evitamos dibujar nuestras etiquetas custom para no duplicar.
    const dlPluginRegistered = typeof ChartJS !== 'undefined' && ChartJS.registry && ChartJS.registry.plugins && ChartJS.registry.plugins.get('datalabels');
    const dlActiveInOptions = chart.options && chart.options.plugins && chart.options.plugins.datalabels && chart.options.plugins.datalabels.display !== false;
    if (dlPluginRegistered && dlActiveInOptions) return;

    chart.data.datasets.forEach((dataset, dsIdx) => {
      const meta = chart.getDatasetMeta(dsIdx);
      if (!meta || !meta.data) return;
      meta.data.forEach((point, index) => {
        const value = dataset.data[index];
        if (value == null) return;
        const x = point.x;
        const y = point.y;
        const text = String(value);
        const padding = 6; // espacio interno
        const fontSize = 12; // tamaño de fuente
        const gap = 6;
        const edgePadding = 2;

        ctx.save();
        ctx.font = `${fontSize}px Inter, Arial, sans-serif`;
        const textWidth = ctx.measureText(text).width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = fontSize + padding;

        let boxX = x - boxWidth / 2;

        // Regla principal: si está cerca del techo del chart, pintar abajo.
        const minY = chartArea.top + edgePadding;
        const maxY = chartArea.bottom - boxHeight - edgePadding;
        const nearTop = y <= chartArea.top + boxHeight + gap + edgePadding;
        let boxY = nearTop ? (y + gap) : (y - boxHeight - gap);

        // Fallback: si abajo no entra (puntos muy bajos), intentar arriba.
        if (boxY > maxY) {
          boxY = y - boxHeight - gap;
        }

        // Clamp final para evitar recortes laterales/verticales.
        const minX = chartArea.left + edgePadding;
        const maxX = chartArea.right - boxWidth - edgePadding;
        boxX = Math.max(minX, Math.min(boxX, maxX));
        boxY = Math.max(minY, Math.min(boxY, maxY));

        // Fondo blanco semitransparente y borde gris tenue
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        // Rounded rect
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxHeight, r);
        ctx.arcTo(boxX + boxWidth, boxY + boxHeight, boxX, boxY + boxHeight, r);
        ctx.arcTo(boxX, boxY + boxHeight, boxX, boxY, r);
        ctx.arcTo(boxX, boxY, boxX + boxWidth, boxY, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Texto centrado dentro del globo.
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2);
        ctx.restore();
      });
    });
  }
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, ChartTooltip, ChartLegend, drawLabelPlugin);

/**
 * DepartureTable
 * Tabla especializada para "Por salida" (cupos individuales):
 * - Destacados urgentes (top 5 más próximos vía urgentRule externa)
 * - Columna "Urgente" insertada después de "Salida"
 * - Formato de fecha dd/mm/aaaa
 * - Columnas calculadas: % de venta, Lugares disponibles (si falta), Riesgo
 * - Sorting genérico + orden específico para fecha
 */
export default function DepartureTable({
  columns,
  data,
  isLoading = false,
  enableSorting = true,
  title = 'Por salida',
  urgentRule = null,
  urgentSortFirst = false,
  userId = null
}) {
  const extraCols = ['% de venta', 'Riesgo', '% Rentabilidad'];
  // Remover columna redundante "Nombre" (es el mismo dato que destino)
  let allColumns = [...columns].filter(c => String(c).toLowerCase() !== 'nombre');

  function insertAfter(ref, col) {
    if (!allColumns.includes(col)) {
      const idx = allColumns.indexOf(ref);
      if (idx !== -1) {
        allColumns = [...allColumns.slice(0, idx + 1), col, ...allColumns.slice(idx + 1)];
      } else {
        allColumns.push(col);
      }
    }
  }

  // Inyección de columnas calculadas
  insertAfter('Lugares vendidos', 'Lugares disponibles');
  insertAfter('Lugares disponibles', '% de venta');
  insertAfter('Venta', 'Venta total');
  insertAfter('Venta total', 'Riesgo');
  insertAfter('Riesgo', '% Rentabilidad');

  const dataWithExtras = data.map(row => {
    const newRow = { ...row };
    const vendidos = parseInt(newRow['Lugares vendidos'] || 0) || 0;
    const tomados = parseInt(newRow['Cupos tomados'] || 0) || 0;
    const cancelados = parseInt(newRow['Lugares cancelados'] || 0) || 0;

    // Extraer claves si existen en row, aunque no estén en columns
    // Buscar variantes sin espacios y con minúsculas
    if (newRow['NETO 1'] === undefined && row['NETO 1'] !== undefined) newRow['NETO 1'] = row['NETO 1'];
    if (newRow['Neto Vendedor'] === undefined && row['Neto Vendedor'] !== undefined) newRow['Neto Vendedor'] = row['Neto Vendedor'];
    if (newRow['OP'] === undefined && row['OP'] !== undefined) newRow['OP'] = row['OP'];
    // Buscar variantes posibles
    if (newRow['NETO 1'] === undefined && row['Neto1'] !== undefined) newRow['NETO 1'] = row['Neto1'];
    if (newRow['Neto Vendedor'] === undefined && row['NetoVendedor'] !== undefined) newRow['Neto Vendedor'] = row['NetoVendedor'];
    if (newRow['OP'] === undefined && row['Op'] !== undefined) newRow['OP'] = row['Op'];
    // Si sigue sin existir, buscar en minúsculas
    if (newRow['NETO 1'] === undefined && row['neto 1'] !== undefined) newRow['NETO 1'] = row['neto 1'];
    if (newRow['Neto Vendedor'] === undefined && row['neto vendedor'] !== undefined) newRow['Neto Vendedor'] = row['neto vendedor'];
    if (newRow['OP'] === undefined && row['op'] !== undefined) newRow['OP'] = row['op'];

    // Lugares disponibles: si ya viene del backend, preservarlo tal cual (ya fue sumado correctamente)
    // Solo calcular si falta
    if (newRow['Lugares disponibles'] === undefined) {
      newRow['Lugares disponibles'] = tomados - vendidos - cancelados;
    }
    // Guardar valor original de disponibles para preservarlo en totales
    if (newRow['_disponibles_original'] === undefined) {
      newRow['_disponibles_original'] = newRow['Lugares disponibles'];
    }

    // % de venta - usar el valor original sin recalcular
    newRow['% de venta'] = tomados > 0 ? (vendidos / tomados) * 100 : 0;

    // Helper para parsear montos con posible formato ($, espacios, comas)
    const parseM = v => {
      if (typeof v === 'number') return v;
      if (!v) return 0;
      let s = String(v).replace(/[$\s]/g, '');
      // Detectar formato 1.000,00 vs 1,000.00
      if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.'); // Es 1.234,56
        else s = s.replace(/,/g, ''); // Es 1,234.56
      } else if (s.indexOf(',') > -1) {
        s = s.replace(',', '.'); // Asumimos coma como decimal
      }
      return parseFloat(s) || 0;
    };

    // Determinar valores unitarios usando el parser robusto
    const opUnit = parseM(newRow['OP']) || parseM(newRow['OP unitario']) || parseM(newRow['OP unit']) || 0;
    const ventaUnitField = parseM(newRow['Neto Vendedor']) || parseM(newRow['Venta unit']) || parseM(newRow['Venta unitario']);
    let ventaUnit = 0;
    if (ventaUnitField !== 0) {
      ventaUnit = ventaUnitField;
    } else if (parseM(newRow['Venta']) !== 0 && vendidos > 0) {
      // Si 'Venta' viene como total
      ventaUnit = parseM(newRow['Venta']) / vendidos;
    }

    // NETO1
    const costoTotalField = parseM(newRow['Costo total']);
    const neto1Raw = parseM(newRow['NETO 1']) || parseM(newRow['Neto 1']) || parseM(newRow['neto 1']);
    const neto1Unit = (costoTotalField !== 0 && tomados > 0)
      ? (costoTotalField / tomados)
      : neto1Raw;

    // Totales por fila
    const ventaTotal = ventaUnit * vendidos;
    const costoTotal = neto1Unit * vendidos;

    // Rentabilidad: Prioridad OP -> Campo Rentabilidad -> Venta - Costo
    let rentabilidad = opUnit * vendidos;

    // Si no pudimos calcular por OP (ej. OP undefined), intentamos leer el campo Rentabilidad directo
    if (rentabilidad === 0) {
      rentabilidad = parseM(newRow['Rentabilidad']);
    }

    const costoField = parseM(newRow['Costo']);
    const costoFinal = costoField !== 0 ? costoField : costoTotal;

    // Si sigue siendo 0 y tenemos Venta y Costo/Total, calculamos por diferencia
    if (rentabilidad === 0 && ventaTotal !== 0) {
      // Si costoFinal es 0, intentamos no asumir 100% rentabilidad a menos que estemos seguros
      // Pero si Venta existe y Costo es 0, tal vez sea 100% ganancia (raro en turismo, pero posible en fees)
      // Asumimos diferencia simple
      rentabilidad = ventaTotal - costoFinal;
    }

    // Asignaciones
    newRow['Venta total'] = ventaTotal;
    newRow['Costo total'] = costoTotal;
    newRow['Rentabilidad'] = rentabilidad;
    newRow['Costo'] = costoFinal;
    if (!newRow['Venta'] || parseM(newRow['Venta']) === 0) {
      newRow['Venta'] = ventaUnit;
    }

    // Si el backend ya envía Riesgo, respetarlo. Fallback local: disponibles * NETO 1 unitario.
    if (newRow['Riesgo'] === undefined || newRow['Riesgo'] === null) {
      const disponiblesNum = parseFloat(newRow['Lugares disponibles']) || 0;
      newRow['Riesgo'] = disponiblesNum * neto1Unit;
    }

    // % Rentabilidad = (Rentabilidad / Venta) * 100
    // Usamos los totales calculados de la fila (Rentabilidad y Venta total)
    let rentabilidadPorc = 0;
    if (ventaTotal !== 0) {
      rentabilidadPorc = (rentabilidad / ventaTotal) * 100;
    }
    newRow["% Rentabilidad"] = rentabilidadPorc;

    // Asegurar columnas extras con valor por defecto
    extraCols.forEach(col => {
      if (newRow[col] === undefined || newRow[col] === null) newRow[col] = 0;
    });

    return newRow;
  });

  const [sortConfig, setSortConfig] = useState(null);

  function parseFecha(val) {
    if (!val) return NaN;
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val + 'T00:00:00').getTime();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        const [d, m, y] = val.split('/');
        return new Date(`${y}-${m}-${d}T00:00:00`).getTime();
      }
    }
    const d = new Date(val);
    if (!isNaN(d)) return d.getTime();
    return NaN;
  }

  function formatFechaDMY(val) {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(val);
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    const parts = String(val).split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      if (parts[2].length === 4) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
    return String(val);
  }

  function getBarColor(percent) {
    if (percent <= 50) {
      const r = 239 + (250 - 239) * (percent / 50);
      const g = 68 + (204 - 68) * (percent / 50);
      const b = 68 + (21 - 68) * (percent / 50);
      return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    }
    const r = 250 + (34 - 250) * ((percent - 50) / 50);
    const g = 204 + (197 - 204) * ((percent - 50) / 50);
    const b = 21 + (94 - 21) * ((percent - 50) / 50);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  const sortedData = useMemo(() => {
    const arr = [...dataWithExtras];
    arr.sort((a, b) => {
      // Urgentes primero (solo si tienen Lugares disponibles > 0)
      if (urgentSortFirst && typeof urgentRule === 'function') {
        const availA = parseInt(a['Lugares disponibles'] || 0) || 0;
        const availB = parseInt(b['Lugares disponibles'] || 0) || 0;
        const isUrgA = !!urgentRule(a) && availA > 0;
        const isUrgB = !!urgentRule(b) && availB > 0;
        const ua = isUrgA ? 0 : 1;
        const ub = isUrgB ? 0 : 1;
        if (ua !== ub) return ua - ub;
        if (ua === 0) {
          // Ambos urgentes: ordenar por fecha asc
          const da = parseFecha(a['Salida']);
          const db = parseFecha(b['Salida']);
          if (!isNaN(da) && !isNaN(db) && da !== db) return da - db;
        }
      }
      if (!enableSorting || !sortConfig) return 0;
      const { key, direction } = sortConfig;

      if (key === 'Salida') {
        const da = parseFecha(a['Salida']);
        const db = parseFecha(b['Salida']);
        if (!isNaN(da) && !isNaN(db) && da !== db) {
          return direction === 'asc' ? (da - db) : (db - da);
        }
        const cmpS = String(a['Salida'] || '').localeCompare(String(b['Salida'] || ''), 'es', { sensitivity: 'base', numeric: true });
        return direction === 'asc' ? cmpS : -cmpS;
      }

      const av = a[key];
      const bv = b[key];
      const isNum = typeof av === 'number' || typeof bv === 'number' || (!isNaN(parseFloat(av)) && !isNaN(parseFloat(bv)));
      let cmp = 0;
      if (isNum) {
        cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0);
      } else {
        cmp = String(av || '').localeCompare(String(bv || ''), 'es', { sensitivity: 'base', numeric: true });
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [dataWithExtras, sortConfig, enableSorting, urgentSortFirst, urgentRule]);

  const totalRow = {};
  allColumns.forEach((col, idx) => {
    if (idx === 0) totalRow[col] = 'Totales';
    else if (['Cupos tomados', 'Lugares vendidos', 'Lugares disponibles', 'Lugares cancelados', 'Rentabilidad', 'Costo', 'Venta', 'Costo total', 'Venta total'].includes(col)) {
      // Para "Lugares disponibles", usar el valor original preservado en _disponibles_original
      if (col === 'Lugares disponibles') {
        totalRow[col] = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row['_disponibles_original']) || 0), 0);
      } else {
        totalRow[col] = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row[col]) || 0), 0);
      }
    } else if (col === '% de venta') {
      const totalTomados = dataWithExtras.reduce((acc, row) => acc + (parseInt(row['Cupos tomados']) || 0), 0);
      const totalVendidos = dataWithExtras.reduce((acc, row) => acc + (parseInt(row['Lugares vendidos']) || 0), 0);
      totalRow[col] = totalTomados > 0 ? (totalVendidos / totalTomados) * 100 : 0;
    } else if (col === 'Riesgo') {
      totalRow[col] = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row['Riesgo']) || 0), 0);
    } else if (col === '% Rentabilidad') {
      // Promedio ponderado por venta
      const totalVenta = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row['Venta']) || 0), 0);
      const totalRentabilidad = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row['Rentabilidad']) || 0), 0);
      totalRow[col] = totalVenta > 0 ? (totalRentabilidad / totalVenta) * 100 : 0;
    } else totalRow[col] = '';
  });

  const onSort = col => {
    if (!enableSorting) return;
    setSortConfig(prev => {
      if (!prev || prev.key !== col) return { key: col, direction: 'asc' };
      if (prev.direction === 'asc') return { key: col, direction: 'desc' };
      return null;
    });
  };

  const sortIndicator = col => {
    if (!sortConfig || sortConfig.key !== col) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  // Estado para selección y datos evolutivos + share por cupo
  const [selectedCodigo, setSelectedCodigo] = useState(null);
  const [evolData, setEvolData] = useState({ labels: [], values: [] });
  const [chartLoading, setChartLoading] = useState(false);
  const [shareData, setShareData] = useState({ labels: [], values: [], share: [] });
  const [shareLoading, setShareLoading] = useState(false);

  // Si se pasa userId en props, usarlo; esto permite consultar la serie global al montar
  // (userId ya viene del prop destructurado en la firma)

  async function handleRowClick(row) {
    const codigo = (row['Código'] || row['Codigo de Cupo'] || row['Codigo'] || row['Código de Cupo'] || '').toString().trim();
    setSelectedCodigo(codigo || null);
    // Si no hay codigo o no hay userId disponible, limpiar y salir
    const userIdFinal = userId || (row && row.userId) || null;
    if (!codigo || !userIdFinal) {
      setEvolData({ labels: [], values: [] });
      setShareData({ labels: [], values: [], share: [] });
      return;
    }
    setChartLoading(true);
    setShareLoading(true);
    try {
      const [jsonEvol, jsonShare] = await Promise.all([
        getEvolucionPorCupo({ userId: userIdFinal, codigoCupo: codigo }),
        getSharePorCupo({ userId: userIdFinal, codigoCupo: codigo })
      ]);
      setEvolData({
        labels: Array.isArray(jsonEvol.labels) ? jsonEvol.labels : [],
        values: Array.isArray(jsonEvol.values) ? jsonEvol.values : []
      });
      setShareData({
        labels: Array.isArray(jsonShare.labels) ? jsonShare.labels : (jsonShare && jsonShare.labels) || ['Jetmar', 'Tienda Viajes'],
        values: Array.isArray(jsonShare.values) ? jsonShare.values : (jsonShare && jsonShare.values) || [],
        share: Array.isArray(jsonShare.share) ? jsonShare.share : (jsonShare && jsonShare.share) || []
      });
    } catch (e) {
      console.error('Error fetching evolucion/share por cupo', e);
      setEvolData({ labels: [], values: [] });
      setShareData({ labels: [], values: [], share: [] });
    } finally {
      setChartLoading(false);
      setShareLoading(false);
    }
  }

  // Auto-cargar la serie global al montar si se dispone de userId
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) return;
      setChartLoading(true);
      setShareLoading(true);
      try {
        const [jsonEvol, jsonShare] = await Promise.all([
          getEvolucionPorCupo({ userId }),
          getSharePorCupo({ userId })
        ]);
        if (!mounted) return;
        setEvolData({
          labels: Array.isArray(jsonEvol.labels) ? jsonEvol.labels : [],
          values: Array.isArray(jsonEvol.values) ? jsonEvol.values : []
        });
        setShareData({
          labels: Array.isArray(jsonShare.labels) ? jsonShare.labels : (jsonShare && jsonShare.labels) || ['Jetmar', 'Tienda Viajes'],
          values: Array.isArray(jsonShare.values) ? jsonShare.values : (jsonShare && jsonShare.values) || [],
          share: Array.isArray(jsonShare.share) ? jsonShare.share : (jsonShare && jsonShare.share) || []
        });
      } catch (e) {
        console.error('Error fetching evolucion/share por cupo (global):', e);
        if (mounted) {
          setEvolData({ labels: [], values: [] });
          setShareData({ labels: [], values: [], share: [] });
        }
      } finally {
        if (mounted) {
          setChartLoading(false);
          setShareLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-text-[#304D85] overflow-x-auto w-full relative">
        <h3 className="text-lg font-bold text-[#304D85] mb-3 opacity-30">{title}</h3>
        <div className="relative min-h-64">
          <div className="absolute inset-0 bg-gray-50 opacity-20 rounded" />
          <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
            <LoadingSpinner message="Procesando datos de salidas..." compact={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 mb-4 overflow-x-auto w-full">
      <div className="w-full">
        <h3 className="text-lg font-bold text-[#304D85] mb-3">{title}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                {allColumns.map((col, idx) => {
                  let tooltip = '';
                  if (col === 'Lugares disponibles') tooltip = 'Cupos tomados - Vendidos - Cancelados';
                  if (col === '% de venta') tooltip = 'Ocupación = Vendidos / Tomados';
                  if (col === 'Riesgo') tooltip = 'Riesgo = Lugares disponibles x NETO 1';
                  if (col === '% Rentabilidad') tooltip = 'Rentabilidad porcentual: (Rentabilidad / Venta) x 100';
                  const sortable = enableSorting && col !== '_comparativo';
                  return (
                    <th
                      key={col + '-' + idx}
                      className={`py-1.5 px-2 font-semibold text-[#304D85] text-center border-b border-blue-100 text-xs ${sortable ? 'cursor-pointer select-none hover:bg-blue-50' : ''}`}
                      data-tooltip-id={tooltip ? `tt-${col}` : undefined}
                      data-tooltip-content={tooltip || undefined}
                      onClick={() => sortable && onSort(col)}
                    >
                      {col === '_comparativo' ? 'Comparativo' : (
                        col === 'Cupos tomados' ? <span>Cupos<br />tomados</span> :
                          col === 'Lugares vendidos' ? <span>Lugares<br />vendidos</span> :
                            col === 'Lugares disponibles' ? <span>Lugares<br />disponibles</span> :
                              col === 'Lugares cancelados' ? <span>Lugares<br />cancelados</span> :
                                col === 'Costo total' ? <span>Costo total</span> :
                                  col === 'Venta total' ? <span>Venta total</span> :
                                    col === '% de venta' ? <span>% Venta</span> :
                                      col === '% Rentabilidad' ? <span>% Utilidad</span> :
                                        col === 'Rentabilidad' ? <span>Rentabilidad</span> :
                                          col === 'Costo' ? <span>Costo</span> :
                                            col === 'Venta' ? <span>Venta</span> :
                                              col === 'Riesgo' ? <span>Riesgo</span> :
                                                col === 'Urgente' ? <span>Urgente</span> :
                                                  col
                      )}{sortIndicator(col)}
                      {tooltip && (
                        <Tooltip
                          id={`tt-${col}`}
                          place="top"
                          style={{
                            background: 'linear-gradient(135deg, #23272f 60%, #434a54 100%)',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                            padding: '6px 10px',
                            zIndex: 9999
                          }}
                          className="tooltip-custom"
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => {
                const urgent = typeof urgentRule === 'function' ? (!!urgentRule(row) && (parseInt(row['Lugares disponibles']) || 0) > 0) : false;
                const trBase = row._comparativo ? 'hover:bg-blue-50 border-t-2 border-blue-200' : 'hover:bg-blue-50';
                const trClass = urgent ? `${trBase} bg-red-50` : trBase;
                return (
                  <tr
                    key={idx}
                    className={trClass}
                    onClick={() => handleRowClick(row)}
                    style={{ cursor: 'pointer' }}
                  >
                    {allColumns.map((col, cidx) => (
                      <td
                        key={col + '-' + cidx}
                        className={col === '_comparativo'
                          ? 'py-1 px-2 border-b border-blue-50 text-[#304D85] text-center font-bold bg-blue-50 text-xs'
                          : 'py-1 px-2 border-b border-blue-50 text-[#304D85] text-center text-xs'}
                      >
                        {col === '_comparativo'
                          ? row[col]
                          : col === 'Salida'
                            ? formatFechaDMY(row[col])
                            : ['Rentabilidad', 'Costo', 'Costo total', 'Venta', 'Venta total', 'Riesgo'].includes(col)
                              ? `$${isNaN(Number(row[col])) ? '0' : String(Math.round(Number(row[col]) || 0))}`
                              : (col === '% de venta')
                                ? (
                                  <div className="flex items-center justify-center">
                                    <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden mr-1">
                                      <div
                                        className="h-3 rounded-full"
                                        style={{
                                          width: `${Math.min(100, Math.max(0, row[col]))}%`,
                                          background: getBarColor(row[col]),
                                          transition: 'width 0.3s, background 0.3s'
                                        }}
                                      />
                                    </div>
                                    <span
                                      className="text-[10px] font-semibold"
                                      style={{ color: getBarColor(row[col]) }}
                                    >
                                      {isNaN(row[col]) ? '0%' : row[col].toFixed(0) + '%'}
                                    </span>
                                  </div>
                                )
                                : (col === '% Rentabilidad')
                                  ? (
                                    <span className="text-[10px] font-semibold">{isNaN(row[col]) ? '0%' : row[col].toFixed(2) + '%'}</span>
                                  )
                                  : row[col]}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="bg-blue-100 font-bold">
                {allColumns.map((col, cidx) => (
                  <td
                    key={col + '-total-' + cidx}
                    className="py-1 px-2 border-b border-blue-200 text-[#304D85] text-center text-xs"
                  >
                    {['Rentabilidad', 'Costo', 'Costo total', 'Venta', 'Venta total', 'Riesgo'].includes(col)
                      ? `$${isNaN(Number(totalRow[col])) ? '0' : String(Math.round(Number(totalRow[col]) || 0))}`
                      : (col === '% de venta')
                        ? (
                          <div className="flex items-center justify-center">
                            <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden mr-1">
                              <div
                                className="h-3 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, totalRow[col]))}%`,
                                  background: getBarColor(totalRow[col]),
                                  transition: 'width 0.3s, background 0.3s'
                                }}
                              />
                            </div>
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: getBarColor(totalRow[col]) }}
                            >
                              {typeof totalRow[col] === 'number' && !isNaN(totalRow[col]) ? totalRow[col].toFixed(0) : '0'}%
                            </span>
                          </div>
                        )
                        : (col === '% Rentabilidad')
                          ? (
                            <span className="text-[10px] font-semibold">{typeof totalRow[col] === 'number' && !isNaN(totalRow[col]) ? totalRow[col].toFixed(2) : '0'}%</span>
                          )
                          : totalRow[col]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-12 pt-4 border-t border-blue-50">
          <h4 className="text-sm font-semibold text-[#304D85] mb-2">Evolución ventas {selectedCodigo ? `- ${selectedCodigo}` : '(global)'}</h4>
          {chartLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner message="Cargando evolución..." compact={true} />
            </div>
          ) : (
            <>
              {Array.isArray(evolData.labels) && evolData.labels.length > 0 ? (
                <div className="text-xs">
                  <div className="mb-2">
                    <div className="flex flex-row gap-3 items-stretch">
                      <div style={{ height: 260, flex: 1, minWidth: 0 }}>
                        {(() => {
                          const chartData = {
                            labels: evolData.labels,
                            datasets: [
                              {
                                label: 'Ventas',
                                data: evolData.values,
                                borderColor: '#2563eb',
                                backgroundColor: 'rgba(37,99,235,0.08)',
                                tension: 0.25,
                                pointRadius: 3,
                                pointHoverRadius: 5,
                                fill: true
                              }
                            ]
                          };
                          const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                              padding: {
                                top: 30,
                                bottom: 10,
                                left: 10,
                                right: 10
                              }
                            },
                            plugins: {
                              legend: { display: false },
                              tooltip: { mode: 'index', intersect: false },
                              datalabels: { display: false }
                            },
                            scales: {
                              x: {
                                ticks: { color: '#000000', font: { size: 10 } }
                              },
                              y: {
                                beginAtZero: true,
                                ticks: { color: '#000000', font: { size: 10 } }
                              }
                            }
                          };
                          return (
                            <div style={{ height: '100%', width: '100%' }}>
                              <Line data={chartData} options={options} style={{ height: '100%', width: '100%' }} />
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ width: 300, minWidth: 220, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shareLoading ? (
                          <div className="flex items-center justify-center h-[260px]">
                            <LoadingSpinner compact={true} message="Cargando share..." />
                          </div>
                        ) : Array.isArray(shareData.labels) && shareData.labels.length > 0 ? (
                          (() => {
                            const shareChart = {
                              labels: shareData.labels,
                              datasets: [
                                { label: 'Share', data: shareData.values || [], backgroundColor: ['#2563eb', '#e11d48'] }
                              ]
                            };
                            return (
                              <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DashboardChart
                                  chartData={shareChart}
                                  chartType="doughnut"
                                  title="Share Tienda + Jetmar"
                                  isLoading={false}
                                  style={{ height: '100%', width: '100%' }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-xs text-gray-500 py-6">No hay datos de share</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 py-6">Selecciona un renglón con un Código para ver la evolución, o asegúrate de enviar userId en las props.</div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}