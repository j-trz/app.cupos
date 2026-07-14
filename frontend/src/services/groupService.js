import ApiClient from './apiClient';

export class GroupService {
  static async listGroups(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/groups?${queryString}` : '/groups';

    return await ApiClient.get(endpoint);
  }

  static async getGroupById(id) {
    return await ApiClient.get(`/groups/${id}`);
  }

  // Creación admin desde cero. groupData puede traer `opciones: [{itinerario, notas}, ...]`
  // para ofrecerle al usuario más de una opción de una — si no, crea una sola fila.
  static async createGroup(groupData) {
    return await ApiClient.post('/groups', groupData);
  }

  static async updateGroup(id, groupData) {
    return await ApiClient.put(`/groups/${id}`, groupData);
  }

  static async deleteGroup(id) {
    return await ApiClient.delete(`/groups/${id}`);
  }

  // Flujo de usuario: solicitar un vuelo a medida con una o más opciones de itinerario.
  static async requestGroup({ cantidad_lugares, notas_vendedor, opciones }) {
    return await ApiClient.post('/groups/request', { cantidad_lugares, notas_vendedor, opciones });
  }

  static async acceptGroupQuote(id) {
    return await ApiClient.post(`/groups/${id}/accept`);
  }

  static async confirmGroup(id) {
    return await ApiClient.post(`/groups/${id}/confirm`);
  }

  // Acción explícita del admin para enviarle al usuario la cotización cargada
  // (requiere condiciones + neto/precio + vencimiento_cotizacion completos).
  static async sendGroupQuote(id) {
    return await ApiClient.post(`/groups/${id}/send-quote`);
  }

  static async requestGroupCancellation(id) {
    return await ApiClient.post(`/groups/${id}/request-cancellation`);
  }

  static async resolveGroupCancellation(id, decision, notas = '') {
    return await ApiClient.post(`/groups/${id}/resolve-cancellation`, { decision, notas });
  }
}

export default GroupService;
