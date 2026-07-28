import ApiClient from './apiClient';

const buildParams = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  return params.toString();
};

export class LogService {
  /** Lista paginada de logs del sistema con filtros avanzados. */
  static async listLogs(filters = {}) {
    const qs = buildParams(filters);
    return await ApiClient.get(qs ? `/logs?${qs}` : '/logs');
  }

  /**
   * Descarga los logs filtrados como archivo JSON.
   * Devuelve un Blob que el caller puede usar para disparar la descarga.
   */
  static async exportLogsJSON(filters = {}) {
    const qs = buildParams(filters);
    const url = qs ? `/logs/export?${qs}` : '/logs/export';
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
    const token = localStorage.getItem('api_token');

    const response = await fetch(`${baseUrl}${url}`, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al exportar logs: ${response.status}`);
    }

    const blob = await response.blob();
    // Extraer nombre de archivo del header Content-Disposition
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : 'system_logs.json';

    return { blob, filename };
  }

  /**
   * Devuelve el estado del sistema: salud de la base de datos,
   * servicios, conteos y lista de holds activos / estancados.
   */
  static async getSystemStatus() {
    return await ApiClient.get('/system/status');
  }

  /**
   * Fuerza la liberación de un hold/bloqueo temporal estancado.
   * @param {number} reservationId - ID de la Reservation a liberar.
   */
  static async releaseHold(reservationId) {
    return await ApiClient.post(`/system/holds/${reservationId}/release`, {});
  }
}

export default LogService;
