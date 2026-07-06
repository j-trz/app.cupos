import ApiClient from './apiClient';

/**
 * Servicio para exportación de datos en múltiples formatos
 * CSV, Excel y PDF
 */
class ExportService {
  /**
   * Exporta datos en formato CSV
   * @param {string} entityType - Tipo de entidad (reservations, products, users, agencies)
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<void>} Descarga el archivo CSV
   */
  static async exportCSV(entityType, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/export/csv/${entityType}${params ? '?' + params : ''}`;
    await this._downloadFile(url, `${entityType}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Exporta datos en formato Excel (CSV compatible con Excel)
   * @param {string} entityType - Tipo de entidad
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<void>} Descarga el archivo Excel
   */
  static async exportExcel(entityType, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/export/excel/${entityType}${params ? '?' + params : ''}`;
    await this._downloadFile(url, `${entityType}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Exporta datos en formato PDF (HTML para imprimir)
   * @param {string} entityType - Tipo de entidad
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<void>} Abre el PDF en nueva ventana
   */
  static async exportPDF(entityType, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/export/pdf/${entityType}${params ? '?' + params : ''}`;
    
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    
    // Abrir en nueva ventana para PDF
    const fullUrl = `${baseUrl}${url}`;
    const pdfWindow = window.open('', '_blank');
    
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
          <head><title>Cargando...</title></head>
          <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:Arial;">
            <div style="text-align:center;">
              <h2>Generando PDF...</h2>
              <p>Por favor espere mientras se genera el documento.</p>
            </div>
          </body>
        </html>
      `);
      
      try {
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }
        
        const html = await response.text();
        pdfWindow.document.open();
        pdfWindow.document.write(html);
        pdfWindow.document.close();
        pdfWindow.document.title = `Reporte ${entityType}`;
      } catch (error) {
        pdfWindow.document.close();
        alert('Error al generar PDF: ' + error.message);
      }
    }
  }

  /**
   * Obtiene estadísticas de exportación
   * @returns {Promise<Object>} Estadísticas de registros
   */
  static async getStats() {
    return ApiClient.get('/export/stats');
  }

  /**
   * Método interno para descargar archivos
   * @private
   */
  static async _downloadFile(url, filename) {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const fullUrl = `${baseUrl}${url}`;

    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

export default ExportService;
