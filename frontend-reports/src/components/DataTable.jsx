import React, { useState, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import { Tooltip } from 'react-tooltip';
import DashboardChart from './DashboardChart.jsx';
import { getAgenciasData } from '../utils/apiClient.js';

/**
 * DataTable con:
 * - Columnas calculadas (% de venta, Lugares disponibles, Riesgo, etc.)
 * - Totales
 * - Sorting opcional (enableSorting)
 */
export default function DataTable({ columns, data, rentabilidadData, costoData, ventaData, isLoading = false, enableSorting = true, title = 'Tabla de datos', urgentRule = null, urgentSortFirst = false, userId = null }) {
  const extraCols = ["Rentabilidad", "Costo", "Costo total", "Venta", "Venta total", "% de venta", "Riesgo", "% Rentabilidad"];
  let allColumns = [...columns];

  // Inyecciones de columnas (orden establecido)
  function insertAfter(ref, col) {
    if (!allColumns.includes(col)) {
      const idx = allColumns.indexOf(ref);
      if (idx !== -1) allColumns = [...allColumns.slice(0, idx + 1), col, ...allColumns.slice(idx + 1)];
      else allColumns.push(col);
    }
  }
  insertAfter("Lugares vendidos", "Lugares disponibles");
  insertAfter("Lugares disponibles", "% de venta");
  insertAfter("Venta", "Venta total");
  insertAfter("Venta total", "Riesgo");
  insertAfter("Riesgo", "% Rentabilidad");
  if (allColumns.includes("Salida")) insertAfter("Salida", "Urgente");
  ["Rentabilidad", "Costo", "Venta"].forEach(c => { if (!allColumns.includes(c)) allColumns.push(c); });

  const normalizeKey = v => (v === undefined || v === null) ? '' : v.toString().trim().toUpperCase();
  const buildMapFromChart = (chart) => {
    if (!chart || !Array.isArray(chart.labels)) return {};
    // Prioridad: chart.values si existe, sino datasets[0].data
    const series = Array.isArray(chart.values)
      ? chart.values
      : (Array.isArray(chart.datasets?.[0]?.data) ? chart.datasets[0].data : null);
    if (!series) return {};
    return Object.fromEntries(chart.labels.map((l, i) => [normalizeKey(l), series[i]]));
  };
  const rentMap = buildMapFromChart(rentabilidadData);
  const costoMap = buildMapFromChart(costoData);
  const ventaMap = buildMapFromChart(ventaData);

  const dataWithExtras = data.map(row => {
    const newRow = { ...row };
    const destinoNorm = normalizeKey(row["Destino"]);
    newRow["Rentabilidad"] = rentMap[destinoNorm] !== undefined ? rentMap[destinoNorm] : (newRow["Rentabilidad"] || 0);
    newRow["Costo"] = costoMap[destinoNorm] !== undefined ? costoMap[destinoNorm] : (newRow["Costo"] || 0);
    newRow["Venta"] = ventaMap[destinoNorm] !== undefined ? ventaMap[destinoNorm] : (newRow["Venta"] || 0);

    const vendidos = parseInt(newRow["Lugares vendidos"] || 0);
    const tomados = parseInt(newRow["Cupos tomados"] || 0);
    const cancelados = parseInt(newRow["Lugares cancelados"] || 0);
    // Tomamos en cuenta cancelados: el denominador efectivo es (tomados - cancelados)
    const effectiveTomados = Math.max(0, tomados - cancelados);
    newRow["% de venta"] = effectiveTomados > 0 ? (vendidos / effectiveTomados) * 100 : 0;

    // IMPORTANTE: Si ya viene "Lugares disponibles" del backend (ya sido calculado), no recalcular.
    // Si no viene, usar como fallback la suma original.
    if (newRow["Lugares disponibles"] === undefined || newRow["Lugares disponibles"] === null) {
      newRow["Lugares disponibles"] = tomados - vendidos - cancelados;
    }
    // Guardar valor original de disponibles para los totales (esto preserva el Excel)
    if (newRow["_disponibles_original"] === undefined) {
      newRow["_disponibles_original"] = newRow["Lugares disponibles"];
    }
    
    if (newRow["Costo total"] === undefined || newRow["Costo total"] === null) newRow["Costo total"] = 0;

    // Si el backend ya envía Riesgo, respetarlo. Fallback local: disponibles * NETO 1 unitario.
    if (newRow["Riesgo"] === undefined || newRow["Riesgo"] === null) {
      const tomadosNum = parseFloat(newRow["Cupos tomados"]) || 0;
      const costoTotalNum = parseFloat(newRow["Costo total"]) || 0;
      const neto1Unit = tomadosNum > 0 ? (costoTotalNum / tomadosNum) : 0;
      const disponiblesNum = parseFloat(newRow["Lugares disponibles"]) || 0;
      newRow["Riesgo"] = disponiblesNum * neto1Unit;
    }

    // % Rentabilidad = (Rentabilidad / Venta) * 100
    // Usamos los valores ya calculados/inyectados en newRow para consistencia con los totales
    const rentabilidadVal = parseFloat(newRow["Rentabilidad"]) || 0;
    const ventaVal = parseFloat(newRow["Venta"]) || 0;

    let rentabilidadPorc = 0;
    if (ventaVal !== 0) {
      rentabilidadPorc = (rentabilidadVal / ventaVal) * 100;
    }
    newRow["% Rentabilidad"] = rentabilidadPorc;

    // Columna calculada "Urgente" para la tabla Por salida (si existe columna Salida)
    if (allColumns.includes("Salida")) {
      const urgent = typeof urgentRule === 'function' ? !!urgentRule(row) : false;
      newRow["Urgente"] = urgent ? 'Sí' : 'No';
    }

    extraCols.forEach(col => { if (newRow[col] === undefined) newRow[col] = 0; });
    return newRow;
  });

  const [sortConfig, setSortConfig] = useState(null);

  // Estado para panel de share por destino
  const [selectedDestino, setSelectedDestino] = useState(null);
  const [shareData, setShareData] = useState({ labels: [], values: [] });
  const [shareLoading, setShareLoading] = useState(false);

  const sortedData = useMemo(() => {
    const arr = [...dataWithExtras];
    arr.sort((a, b) => {
      // Urgentes primero (si se pide)
      if (urgentSortFirst && typeof urgentRule === 'function') {
        const ua = urgentRule(a) ? 0 : 1;
        const ub = urgentRule(b) ? 0 : 1;
        if (ua !== ub) return ua - ub;
        if (ua === 0) {
          // Ambos urgentes: ordenar por fecha de salida (más próxima primero)
          const da = new Date(a['Salida'] ? `${a['Salida']}T00:00:00` : 0);
          const db = new Date(b['Salida'] ? `${b['Salida']}T00:00:00` : 0);
          if (!isNaN(da) && !isNaN(db) && da.getTime() !== db.getTime()) {
            return da - db;
          }
        }
      }
      if (!enableSorting || !sortConfig) return 0;
      const { key, direction } = sortConfig;

      // Orden específico por fecha para la columna "Salida"
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
    if (idx === 0) totalRow[col] = "Totales";
    else if (["Cupos tomados", "Lugares vendidos", "Lugares disponibles", "Lugares cancelados", "Rentabilidad", "Costo", "Venta", "Costo total", "Venta total"].includes(col)) {
      // Para "Lugares disponibles", usar el valor original preservado en _disponibles_original
      if (col === "Lugares disponibles") {
        totalRow[col] = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row["_disponibles_original"]) || 0), 0);
      } else {
        totalRow[col] = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row[col]) || 0), 0);
      }
    } else if (col === "% de venta") {
      const totalTomados = dataWithExtras.reduce((acc, row) => acc + (parseInt(row["Cupos tomados"]) || 0), 0);
      const totalCancelados = dataWithExtras.reduce((acc, row) => acc + (parseInt(row["Lugares cancelados"]) || 0), 0);
      const totalVendidos = dataWithExtras.reduce((acc, row) => acc + (parseInt(row["Lugares vendidos"]) || 0), 0);
      const effectiveTotal = Math.max(0, totalTomados - totalCancelados);
      totalRow[col] = effectiveTotal > 0 ? (totalVendidos / effectiveTotal) * 100 : 0;
    } else if (col === "Riesgo") {
      totalRow[col] = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row["Riesgo"]) || 0), 0);
    } else if (col === "% Rentabilidad") {
      // Promedio ponderado por venta
      const totalVenta = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row["Venta"]) || 0), 0);
      const totalRentabilidad = dataWithExtras.reduce((acc, row) => acc + (parseFloat(row["Rentabilidad"]) || 0), 0);
      totalRow[col] = totalVenta > 0 ? (totalRentabilidad / totalVenta) * 100 : 0;
    } else totalRow[col] = "";
  });

  // Manejo de click en fila: obtener solo el share por destino (sin evolución)
  async function handleRowClick(row) {
    try {
      const destino = (row["Destino"] || row["Destino final"] || row["nombre"] || row["Nombre"] || '').toString().trim();
      setSelectedDestino(destino || null);

      if (!destino) {
        setShareData({ labels: [], values: [] });
        return;
      }

      setShareLoading(true);

      // Obtener sólo el share por destino
      const shareRes = await getAgenciasData({ userId, filters: { Destino: destino } }).catch(e => ({ __error: e }));

      if (!shareRes || shareRes.__error) {
        setShareData({ labels: [], values: [] });
      } else {
        // Normalizar la respuesta para cubrir formatos distintos del backend
        let labels = Array.isArray(shareRes.labels) ? shareRes.labels : [];
        let values = Array.isArray(shareRes.values) ? shareRes.values : [];

        if ((!labels || labels.length === 0) && Array.isArray(values) && values.length === 2) {
          labels = ['Jetmar', 'Tienda Viajes'];
        }

        if ((!values || values.length === 0)) {
          if (Array.isArray(shareRes.share) && shareRes.share.length > 0) {
            values = Array.isArray(shareRes.values) && shareRes.values.length === shareRes.share.length
              ? shareRes.values
              : shareRes.share;
          } else {
            const sum = arr => Array.isArray(arr) ? arr.reduce((s, v) => s + (Number(v) || 0), 0) : 0;
            const vJet = sum(shareRes.valuesJetmar || shareRes.jetmar || []);
            const vTienda = sum(shareRes.valuesTienda || shareRes.tienda || []);
            if (vJet !== 0 || vTienda !== 0) {
              values = [vJet, vTienda];
              if (!labels || labels.length === 0) labels = ['Jetmar', 'Tienda Viajes'];
            }
          }
        }

        labels = Array.isArray(labels) ? labels : [];
        values = Array.isArray(values) ? values : [];

        setShareData({ labels, values });
      }
    } catch (err) {
      console.error('Error loading share por destino', err);
      setShareData({ labels: [], values: [] });
    } finally {
      setShareLoading(false);
    }
  }

  function getBarColor(percent) {
    if (percent <= 50) {
      const r = 239 + (250 - 239) * (percent / 50);
      const g = 68 + (204 - 68) * (percent / 50);
      const b = 68 + (21 - 68) * (percent / 50);
      return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    } else {
      const r = 250 + (34 - 250) * ((percent - 50) / 50);
      const g = 204 + (197 - 204) * ((percent - 50) / 50);
      const b = 21 + (94 - 21) * ((percent - 50) / 50);
      return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    }
  }

  // Formatea fechas a dd/mm/aaaa para la columna "Salida"
  function formatFechaDMY(val) {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      return `${d}/${m}/${y}`;
    }
    const dDate = new Date(val);
    if (!isNaN(dDate)) {
      const dd = String(dDate.getDate()).padStart(2, '0');
      const mm = String(dDate.getMonth() + 1).padStart(2, '0');
      const yyyy = dDate.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    const parts = String(val).split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      if (parts[2].length === 4) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
    return String(val);
  }

  // Parser de fecha seguro para ordenar por "Salida"
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


  const onSort = (col) => {
    if (!enableSorting) return;
    setSortConfig(prev => {
      if (!prev || prev.key !== col) return { key: col, direction: 'asc' };
      if (prev.direction === 'asc') return { key: col, direction: 'desc' };
      return null; // tercera pulsación limpia sort
    });
  };

  const sortIndicator = (col) => {
    if (!sortConfig || sortConfig.key !== col) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 overflow-x-auto w-full relative">
        <h3 className="text-lg font-bold text-[#304D85] mb-3 opacity-30">{title}</h3>
        <div className="relative min-h-64">
          <div className="absolute inset-0 bg-gray-50 opacity-20 rounded"></div>
          <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
            <LoadingSpinner message="Procesando datos de tabla..." compact={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 mb-4  h-full w-full">
      <h3 className="text-lg font-bold text-[#304D85] mb-3">{title}</h3>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr>
            {allColumns.map((col, idx) => {
              let tooltip = '';
              if (col === 'Rentabilidad') tooltip = 'Ganancia total: (OP unitario) x Lugares vendidos';
              if (col === 'Costo') tooltip = 'Costo total de los lugares vendidos: (NETO 1) x Lugares vendidos';
              if (col === 'Costo total') tooltip = 'Costo de todos los cupos tomados: (Cupos tomados) x NETO 1';
              if (col === 'Venta') tooltip = 'Venta total de los lugares vendidos: (Neto Vendedor) x Lugares vendidos';
              if (col === 'Venta total') tooltip = 'Venta de todos los cupos tomados: (Cupos tomados) x Neto Vendedor';
              if (col === '% de venta') tooltip = 'Ocupación: Vendidos / Tomados';
              if (col === 'Riesgo') tooltip = 'Riesgo = Lugares disponibles x NETO 1';
              if (col === '% Rentabilidad') tooltip = 'Rentabilidad porcentual: (Rentabilidad / Venta) x 100';
              if (col === 'Lugares disponibles') tooltip = 'Cupos tomados - Vendidos - Cancelados';
              if (col === 'Lugares cancelados') tooltip = 'Cupos cancelados';
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
            const urgent = typeof urgentRule === 'function' ? !!urgentRule(row) : false;
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
                  <td key={col + '-' + cidx} className={col === '_comparativo' ? 'py-1 px-2 border-b border-blue-50 text-[#304D85] text-center font-bold bg-blue-50 text-xs' : 'py-1 px-2 border-b border-blue-50 text-[#304D85] text-center text-xs'}>
                    {col === '_comparativo'
                      ? row[col]
                      : (col === 'Salida')
                        ? formatFechaDMY(row[col])
                        : (["Rentabilidad", "Costo", "Costo total", "Venta", "Venta total", "Riesgo"].includes(col))
                          ? `$${isNaN(Number(row[col])) ? '0.00' : Number(row[col]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : (col === "% de venta")
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
                                  ></div>
                                </div>
                                <span className="text-[10px] font-semibold" style={{ color: getBarColor(row[col]) }}>{row[col].toFixed(0)}%</span>
                              </div>
                            )
                            : (col === "% Rentabilidad")
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
              <td key={col + '-total-' + cidx} className="py-1 px-2 border-b border-blue-200 text-[#304D85] text-center text-xs">
                {(["Rentabilidad", "Costo", "Costo total", "Venta", "Venta total", "Riesgo"].includes(col))
                  ? `$${isNaN(Number(totalRow[col])) ? '0.00' : Number(totalRow[col]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : (col === "% de venta")
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
                          ></div>
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: getBarColor(totalRow[col]) }}>{typeof totalRow[col] === 'number' && !isNaN(totalRow[col]) ? totalRow[col].toFixed(0) : '0'}%</span>
                      </div>
                    )
                    : (col === "% Rentabilidad")
                      ? (
                        <span className="text-[10px] font-semibold">{typeof totalRow[col] === 'number' && !isNaN(totalRow[col]) ? totalRow[col].toFixed(2) : '0'}%</span>
                      )
                      : totalRow[col]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Panel de share por destino (solo share, sin evolución) */}
      <div className="mt-12 pt-4 border-t border-blue-50 w-full">
        <h4 className="text-sm font-semibold text-[#304D85] mb-2">Share por destino {selectedDestino ? `- ${selectedDestino}` : '(selecciona un destino)'}</h4>

        {shareLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner message="Cargando share..." compact={true} />
          </div>
        ) : (
          <>
            {Array.isArray(shareData.labels) && shareData.labels.length > 0 ? (
              <div className="flex items-center justify-center py-6">
                {(() => {
                  const shareChart = {
                    labels: shareData.labels,
                    datasets: [
                      { label: 'Share', data: shareData.values || [], backgroundColor: ['#2563eb', '#e11d48'] }
                    ]
                  };
                  return (
                    <div style={{ height: 260, width: 300, minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DashboardChart
                        chartData={shareChart}
                        chartType="doughnut"
                        title="Share Jetmar vs Tienda"
                        isLoading={false}
                      />
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-xs text-gray-500 py-6">Selecciona un renglón con un destino para ver el share.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
