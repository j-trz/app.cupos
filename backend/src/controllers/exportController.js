import {
  toCSV,
  getReservationsForExport,
  getProductsForExport,
  getUsersForExport,
  getAgenciesForExport,
  formatExportData
} from '../services/exportService.js';

/**
 * Controlador para exportación de datos en múltiples formatos
 * Soporta CSV, Excel (XLSX) y PDF
 */

/**
 * Exporta datos en formato CSV
 * GET /api/export/csv/:entityType
 */
export const exportCSV = async (req, res) => {
  try {
    const { entityType } = req.params;
    const filters = req.query;

    // Obtener datos según el tipo de entidad
    let data;
    switch (entityType) {
      case 'reservations':
        data = await getReservationsForExport(filters);
        break;
      case 'products':
        data = await getProductsForExport(filters);
        break;
      case 'users':
        data = await getUsersForExport(filters);
        break;
      case 'agencies':
        data = await getAgenciesForExport();
        break;
      default:
        return res.status(400).json({ error: `Tipo de entidad no soportado: ${entityType}` });
    }

    // Formatear datos
    const { columns, rows } = formatExportData(entityType, data);

    // Generar CSV
    const csv = toCSV(rows, { columns });

    // Configurar headers para descarga
    const filename = `${entityType}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Enviar CSV
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      error: 'Error al exportar datos',
      details: error.message 
    });
  }
};

/**
 * Exporta datos en formato Excel (XLSX)
 * GET /api/export/excel/:entityType
 * Nota: Requiere librería externa como exceljs o xlsx
 * Por ahora devuelve CSV con extensión .xls para compatibilidad básica
 */
export const exportExcel = async (req, res) => {
  try {
    const { entityType } = req.params;
    const filters = req.query;

    // Obtener datos según el tipo de entidad
    let data;
    switch (entityType) {
      case 'reservations':
        data = await getReservationsForExport(filters);
        break;
      case 'products':
        data = await getProductsForExport(filters);
        break;
      case 'users':
        data = await getUsersForExport(filters);
        break;
      case 'agencies':
        data = await getAgenciesForExport();
        break;
      default:
        return res.status(400).json({ error: `Tipo de entidad no soportado: ${entityType}` });
    }

    // Formatear datos
    const { columns, rows } = formatExportData(entityType, data);

    // Generar CSV (compatible con Excel)
    const csv = toCSV(rows, { columns, includeBOM: true });

    // Configurar headers para descarga como Excel
    const filename = `${entityType}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Enviar CSV (Excel puede abrir archivos CSV con BOM UTF-8)
    res.send(csv);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ 
      error: 'Error al exportar datos',
      details: error.message 
    });
  }
};

/**
 * Exporta datos en formato PDF
 * GET /api/export/pdf/:entityType
 * Nota: Requiere librería externa como pdfkit o puppeteer
 * Por ahora devuelve HTML formateado para impresión
 */
export const exportPDF = async (req, res) => {
  try {
    const { entityType } = req.params;
    const filters = req.query;

    // Obtener datos según el tipo de entidad
    let data;
    switch (entityType) {
      case 'reservations':
        data = await getReservationsForExport(filters);
        break;
      case 'products':
        data = await getProductsForExport(filters);
        break;
      case 'users':
        data = await getUsersForExport(filters);
        break;
      case 'agencies':
        data = await getAgenciesForExport();
        break;
      default:
        return res.status(400).json({ error: `Tipo de entidad no soportado: ${entityType}` });
    }

    // Formatear datos
    const { columns, rows } = formatExportData(entityType, data);

    // Generar HTML para PDF (se puede imprimir como PDF desde el navegador)
    const html = generatePDFHTML(entityType, columns, rows);

    // Configurar headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');

    // Enviar HTML
    res.send(html);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ 
      error: 'Error al exportar datos',
      details: error.message 
    });
  }
};

/**
 * Genera HTML formateado para impresión como PDF
 * @param {string} entityType - Tipo de entidad
 * @param {string[]} columns - Columnas de la tabla
 * @param {Array} rows - Filas de datos
 * @returns {string} HTML string
 */
function generatePDFHTML(entityType, columns, rows) {
  const title = {
    reservations: 'Reporte de Reservas',
    products: 'Reporte de Productos',
    users: 'Reporte de Usuarios',
    agencies: 'Reporte de Agencias'
  }[entityType] || 'Reporte de Datos';

  const headersHTML = columns.map(col => `<th>${col}</th>`).join('');
  
  const rowsHTML = rows.map(row => {
    const cells = columns.map(col => {
      const value = row[col];
      return `<td>${value !== null && value !== undefined ? value : ''}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 1.5cm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    .header h1 {
      margin: 0;
      color: #1e40af;
      font-size: 18px;
    }
    .header .date {
      color: #666;
      font-size: 11px;
      margin-top: 5px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 4px;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #3b82f6;
    }
    .stat-label {
      font-size: 10px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 9px;
    }
    th {
      background: #3b82f6;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #2563eb;
    }
    td {
      padding: 5px 4px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    tr:hover {
      background: #eff6ff;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="date">Generado el: ${new Date().toLocaleString('es-AR')}</div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${rows.length}</div>
      <div class="stat-label">Total Registros</div>
    </div>
    <div class="stat">
      <div class="stat-value">${columns.length}</div>
      <div class="stat-label">Columnas</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>${headersHTML}</tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <div class="footer">
    <p>Sistema de Gestión de Cupos - ${new Date().getFullYear()}</p>
    <p class="no-print">Presione Ctrl+P para imprimir o guardar como PDF</p>
  </div>

  <script>
    // Auto-imprimir al cargar (opcional)
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `.trim();
}

/**
 * Obtiene estadísticas de exportación
 * GET /api/export/stats
 */
export const getExportStats = async (req, res) => {
  try {
    const [reservationsCount, productsCount, usersCount, agenciesCount] = await Promise.all([
      query('SELECT COUNT(*) FROM reservations'),
      query('SELECT COUNT(*) FROM products'),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM agencies')
    ]);

    res.json({
      reservations: parseInt(reservationsCount.rows[0].count),
      products: parseInt(productsCount.rows[0].count),
      users: parseInt(usersCount.rows[0].count),
      agencies: parseInt(agenciesCount.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting export stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
};

export default {
  exportCSV,
  exportExcel,
  exportPDF,
  getExportStats
};
