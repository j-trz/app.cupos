import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function DashboardChart({ chartData, chartType = 'bar', title, isLoading = false }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    // No crear el gráfico si está en loading o si no hay referencia al canvas
    if (isLoading || !chartRef.current) return;
    
    // Registrar el plugin para doughnut y bar (necesario para mostrar etiquetas en barras redondeadas)
    if ((chartType === 'doughnut' || chartType === 'bar') && !Chart.registry.plugins.get('datalabels')) {
      Chart.register(ChartDataLabels);
    }
    
    // Verificar nuevamente que el canvas existe antes de obtener el contexto
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    // Filtrar los datos 0 y sus labels correspondientes
    const safeChartData = chartData || { labels: [], datasets: [] };
    let labels = Array.isArray(safeChartData.labels) ? safeChartData.labels : [];
    let datasets = [];
    // Paleta especial para Jetmar y Tienda
    const pastelPalette = ['#2563eb', '#e11d48'];
    if (Array.isArray(safeChartData.datasets) && safeChartData.datasets.length > 0) {
      const palette = [
        '#2563eb', '#38bdf8', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#818cf8'
      ];
      // --- CORRECCIÓN: para evolución (línea), NO filtrar ceros ni labels ---
      if (chartType === 'line') {
        datasets = safeChartData.datasets.map((ds, idx) => {
          let color = palette[idx % palette.length];
          if (ds.label && ds.label.toLowerCase().includes('jetmar')) {
            color = '#2563eb';
          } else if (ds.label && ds.label.toLowerCase().includes('tienda')) {
            color = '#e11d48';
          }
          return {
            label: ds.label,
            data: ds.data,
            fill: false,
            borderColor: color,
            backgroundColor: color + '55',
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 3,
          };
        });
        // labels se mantienen igual
      } else {
        // Filtrar cada dataset y sus labels (para bar y doughnut)
        const filteredDatasets = safeChartData.datasets.map((ds, idx) => {
          const filtered = ds.data
            .map((value, i) => ({ value, label: labels[i] }))
            .filter(item => item.value !== 0);
          const filteredData = filtered.map(item => item.value);
          const filteredLabels = filtered.map(item => item.label);
          if (chartType === 'bar') {
            return {
              label: ds.label,
              data: filteredData,
              backgroundColor: palette[idx % palette.length] + 'cc',
              borderRadius: 8,
              borderSkipped: false,
              _labels: filteredLabels,
            };
          } else {
            // Para doughnut, usar colores Jetmar y Tienda si corresponde
            return {
              label: ds.label,
              data: filteredData,
              backgroundColor: pastelPalette.slice(0, filteredData.length),
              _labels: filteredLabels,
            };
          }
        });
        // Ajustar labels si todos los datasets tienen los mismos labels filtrados
        if (filteredDatasets.length > 0 && filteredDatasets.every(ds => JSON.stringify(ds._labels) === JSON.stringify(filteredDatasets[0]._labels))) {
          labels = filteredDatasets[0]._labels;
        }
        datasets = filteredDatasets.map(ds => {
          const { _labels, ...rest } = ds;
          return rest;
        });
      }
    } else {
      // Lógica original para un solo dataset
      const filtered = (safeChartData.values || []).map((value, i) => ({ value, label: (safeChartData.labels || [])[i] })).filter(item => item.value !== 0);
      const filteredData = filtered.map(item => item.value);
      const filteredLabels = filtered.map(item => item.label);
      const legendLabel = safeChartData.label || title || 'Reporte';
      if (chartType === 'line') {
        datasets = [
          {
            label: legendLabel,
            data: filteredData,
            fill: false,
            borderColor: 'rgba(59,130,246,1)',
            backgroundColor: 'rgba(59,130,246,0.2)',
            pointBackgroundColor: 'rgba(59,130,246,1)',
            pointBorderColor: '#fff',
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 3,
          },
        ];
      } else if (chartType === 'doughnut') {
        datasets = [
          {
            label: legendLabel,
            data: filteredData,
            backgroundColor: pastelPalette.slice(0, filteredData.length),
          },
        ];
      } else {
        datasets = [
          {
            label: legendLabel,
            data: filteredData,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderRadius: 8,
            borderSkipped: false,
          },
        ];
      }
      labels = filteredLabels;
    }
    // Forzar Montserrat como tipografía global para Chart.js
    if (Chart.defaults && Chart.defaults.font) {
      Chart.defaults.font.family = 'Montserrat, sans-serif';
    }
    // --- LOG DE DEPURACIÓN: mostrar labels y datasets antes de renderizar el gráfico de evolución ---
    chartInstanceRef.current = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: chartType === 'doughnut'
            ? { display: true, position: 'bottom', labels: { font: { size: 12 }, color: '#222', padding: 10 } }
            : { display: true, position: 'top', labels: { font: { size: 12 }, padding: 10 } },
          title: { display: false },
          datalabels: chartType === 'doughnut' ? {
            anchor: 'center',
            align: 'center',
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderRadius: 4,
            color: '#222',
            font: { weight: 'bold', size: 12 },
            formatter: (value, ctx) => {
              const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percent = total ? Math.round((value / total) * 100) : 0;
              return percent > 0 ? percent + '%' : '';
            },
            display: true,
            clip: false,
            padding: 4,
          } : chartType === 'bar' ? {
            display: true,
            color: '#111827',
            anchor: 'end',           // colocar en el extremo superior de la barra
            align: 'center',         // centrar horizontalmente respecto a la barra
            offset: 18,              // aumentar separación entre etiqueta y barra
            backgroundColor: 'rgba(255,255,255,0.98)', // caja de fondo para legibilidad
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 8,         // más redondeado (redondeado completo)
            clip: false,
            formatter: (value) => String(Math.round(Number(value) || 0)),
            font: { weight: 600, size: 8 }, // reducir tamaño de fuente
            padding: 3               // padding compacto pero suficiente
          } : false,
        },
        radius: chartType === 'doughnut' ? '90%' : undefined,
        scales: chartType === 'bar' || chartType === 'line' ? {
          x: { grid: { color: '#e0e7ef' }, ticks: { color: '#2563eb', font: { size: 9 }, maxRotation: 45, minRotation: 0 } },
          y: { grid: { color: '#e0e7ef' }, ticks: { color: '#2563eb', font: { size: 9 } } },
        } : {},
      },
    });
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartType, chartData, title, isLoading]);

  // Considerar válido si hay labels y (values OR datasets)
  const safeChartData = chartData || { labels: [], datasets: [] };
  const hasLabels = Array.isArray(safeChartData.labels) && safeChartData.labels.length > 0;
  const hasValues = Array.isArray(safeChartData.values) && safeChartData.values.length > 0;
  const hasDatasets = Array.isArray(safeChartData.datasets) && safeChartData.datasets.length > 0;
  const hasData = hasLabels && (hasValues || hasDatasets);
  
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-4 mb-4 border border-[#304D85] relative">
        {title && <h3 className="text-sm font-bold text-[#304D85] mb-3 opacity-30">{title}</h3>}
        <div className="relative" style={{ height: chartType === 'doughnut' ? '300px' : '280px' }}>
          {/* Contenido de fondo */}
          <div className="absolute inset-0 bg-gray-50 opacity-20 rounded"></div>
          {/* Loading overlay con z-index menor */}
          <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
            <LoadingSpinner message="Generando gráfico..." compact={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4 mb-4 border border-[#304D85]">
      {title && <h3 className="text-sm font-bold text-[#304D85] mb-3">{title}</h3>}
      <div className="flex items-center justify-center" style={{ height: chartType === 'doughnut' ? '300px' : '280px' }}>
        {/* Solo renderizar el canvas cuando NO está en loading */}
        {!isLoading && <canvas ref={chartRef}></canvas>}
        {!hasData && !isLoading && (
          <div className="flex items-center justify-center text-[#009CDD] h-[150px]">
            <span className="text-sm"></span>
          </div>
        )}
      </div>
    </div>
  );
}