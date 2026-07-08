import ApiClient from './apiClient';

export class ReportService {
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
}

export default ReportService;
