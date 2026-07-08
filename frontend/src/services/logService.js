import ApiClient from './apiClient';

export class LogService {
  static async listLogs(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/logs?${queryString}` : '/logs';

    return await ApiClient.get(endpoint);
  }
}

export default LogService;
