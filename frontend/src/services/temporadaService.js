import ApiClient from './apiClient';

export class TemporadaService {
  static async listTemporadas() {
    return await ApiClient.get('/temporadas');
  }

  static async createTemporada(data) {
    return await ApiClient.post('/temporadas', data);
  }

  static async updateTemporada(id, data) {
    return await ApiClient.put(`/temporadas/${id}`, data);
  }

  static async deleteTemporada(id) {
    return await ApiClient.delete(`/temporadas/${id}`);
  }
}

export default TemporadaService;
