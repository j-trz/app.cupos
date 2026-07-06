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
    const endpoint = queryString ? `/reports/sales-by-agency?${queryString}` : '/reports/sales-by-agency';
    
    return await ApiClient.get(endpoint);
  }

  static async getReservationStatus(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/reservation-status?${queryString}` : '/reports/reservation-status';
    
    return await ApiClient.get(endpoint);
  }

  static async getHistoricalSales(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/reports/historical-sales?${queryString}` : '/reports/historical-sales';
    
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
    const endpoint = queryString ? `/reports/general?${queryString}` : '/reports/general';
    
    return await ApiClient.get(endpoint);
  }
}