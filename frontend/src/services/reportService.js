import ApiClient from './apiClient';

export class ReportService {
  // Endpoints Originales GET
  static async getSalesByAgency(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/agency-share?${queryString}` : '/reports/agency-share';
    
    return await ApiClient.get(endpoint);
  }

  static async getEvolutionPassengers(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/evolution?${queryString}` : '/reports/evolution';
    
    return await ApiClient.get(endpoint);
  }

  static async getDestinationsDetail(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/destinations-detail?${queryString}` : '/reports/destinations-detail';
    
    return await ApiClient.get(endpoint);
  }

  static async getGeneralReport(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/stats?${queryString}` : '/reports/stats';
    
    return await ApiClient.get(endpoint);
  }

  static async getUserMetrics() {
    return await ApiClient.get('/reports/user-metrics');
  }

  static async getEvolutionRevenue(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/evolution-revenue?${queryString}` : '/reports/evolution-revenue';
    return await ApiClient.get(endpoint);
  }

  static async getOccupancy(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/occupancy?${queryString}` : '/reports/occupancy';
    return await ApiClient.get(endpoint);
  }

  static async getTopProducts(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/top-products?${queryString}` : '/reports/top-products';
    return await ApiClient.get(endpoint);
  }

  static async getRiskAlerts() {
    return await ApiClient.get('/reports/risk-alerts');
  }

  static async getCancellations(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/cancellations?${queryString}` : '/reports/cancellations';
    return await ApiClient.get(endpoint);
  }

  // NUEVOS ENDPOINTS POST - Procedentes de backend-report (Compatibilidad con el dashboard cockpit)
  static async getFields() {
    return await ApiClient.get('/reports/fields');
  }

  static async getGroupsReport() {
    return await ApiClient.get('/reports/grupos');
  }

  static async getDashboardData(filters = {}) {
    return await ApiClient.post('/reports/dashboard-data', { filters });
  }

  static async getEvolucionAgencias(filters = {}, granularidad = 'mes') {
    return await ApiClient.post('/reports/evolucion-agencias', { filters, granularidad });
  }

  static async getAgenciasData(filters = {}) {
    return await ApiClient.post('/reports/agencias-data', { filters });
  }

  static async getDetalleDestinosPost(filters = {}) {
    return await ApiClient.post('/reports/detalle-destinos', { filters });
  }

  static async getEvolucionPasajerosPost(filters = {}, granularidad = 'mes') {
    return await ApiClient.post('/reports/evolucion-pasajeros', { filters, granularidad });
  }

  static async getEvolucionPorCupo(codigoCupo, filters = {}) {
    return await ApiClient.post('/reports/evolucion-por-cupo', { codigoCupo, filters });
  }

  static async getSharePorCupo(codigoCupo, filters = {}) {
    return await ApiClient.post('/reports/share-por-cupo', { codigoCupo, filters });
  }

  static async getDestinosCompania(filters = {}) {
    return await ApiClient.post('/reports/destinos-compania', { filters });
  }

  static async getPorSalida(filters = {}) {
    return await ApiClient.post('/reports/por-salida', { filters });
  }
}

export default ReportService;