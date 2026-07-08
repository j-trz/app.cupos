import ApiClient from './apiClient';

const adaptProduct = (producto) => ({
  id: producto.id,
  codigo_cupo: producto.codigo_cupo,
  destino: producto.destino,
  compania: producto.compania,
  disponibilidad: Number(producto.disponibilidad || 0),
  fecha_salida: producto.fecha_salida || producto.salida || '',
  fecha_regreso: producto.fecha_regreso || producto.regreso || '',
  precio: producto.precio || '',
  ruta: producto.ruta || '',
  tipo_producto: producto.tipo_producto || '',
  temporada: producto.temporada || '',
  pnr: producto.pnr || '',
  ficha: producto.ficha || '',
  salida: producto.salida || '',
  regreso: producto.regreso || '',
  neto_1: producto.neto_1 || 0,
  inf_fare: producto.inf_fare || 0,
  chd_fare: producto.chd_fare || 0,
  op: producto.op || 0,
});

const adaptRequest = (item) => ({
  id: item.id || item.ID || '',
  Pedido_ID: item.Pedido_ID || item.pedido_id || '',
  Agencia: item.Agencia || item.agencia || '',
  Contacto_Nombre: item.Contacto_Nombre || item.contacto_nombre || item.contacto?.nombre || '',
  Contacto_Email: item.Contacto_Email || item.contacto_email || item.contacto?.email || '',
  Vuelo_Destino: item.Vuelo_Destino || item.vuelo_destino || item.destino || '',
  Nombre_Pasajero: item.Nombre_Pasajero || item.nombre_pasajero || '',
  Apellido_Pasajero: item.Apellido_Pasajero || item.apellido_pasajero || '',
  Temporada: item.Temporada || item.temporada || '',
  Vuelo_Salida: item.Vuelo_Salida || item.vuelo_salida || item.fecha_salida || '',
  Estado: item.Estado || item.estado || 'Solicitado',
  Doc_Contable: item.Doc_Contable || item.doc_contable || '',
  Ruta: item.Ruta || item.ruta || '',
  Fecha_Registro: item.Fecha_Registro || item.fecha_registro || item.created_at || '',
  Vuelo_Codigo: item.Vuelo_Codigo || item.vuelo_codigo || '',
  Vuelo_Compania: item.Vuelo_Compania || item.vuelo_compania || '',
  Vuelo_Precio: item.Vuelo_Precio || item.vuelo_precio || '',
  Usuario_Email: item.Usuario_Email || item.usuario_email || '',
  Pnr: item.Pnr || item.pnr || '',
  Ficha: item.Ficha || item.ficha || '',
});

class ReservationService {
  // Get all reservations
  static async listReservations(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/orders?${queryParams}` : '/orders';
      const result = await ApiClient.get(endpoint);
      return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  }

  // Get reservation by ID
  static async getReservationById(id) {
    try {
      const result = await ApiClient.get(`/orders/${id}`);
      return result;
    } catch (error) {
      console.error(`Error fetching reservation with id ${id}:`, error);
      throw error;
    }
  }

  // Create new reservation
  static async createReservation(payload) {
    try {
      const result = await ApiClient.post('/orders', payload);
      return result;
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  // Update reservation
  static async updateReservation(id, payload) {
    try {
      const result = await ApiClient.put(`/orders/${id}`, payload);
      return result;
    } catch (error) {
      console.error(`Error updating reservation with id ${id}:`, error);
      throw error;
    }
  }

  // Confirm reservation
  static async confirmReservation(id) {
    try {
      const result = await ApiClient.post(`/orders/${id}/confirm`);
      return result;
    } catch (error) {
      console.error(`Error confirming reservation with id ${id}:`, error);
      throw error;
    }
  }

  // Delete reservation
  static async deleteReservation(id) {
    try {
      const result = await ApiClient.delete(`/orders/${id}`);
      return result;
    } catch (error) {
      console.error(`Error deleting reservation with id ${id}:`, error);
      throw error;
    }
  }

  // Resend reservation email
  static async resendReservationEmail(id) {
    try {
      const result = await ApiClient.post(`/orders/${id}/resend-email`);
      return result;
    } catch (error) {
      console.error(`Error resending email for reservation with id ${id}:`, error);
      throw error;
    }
  }

  static async getAvailability() {
    const result = await ApiClient.get('/products');
    const products = Array.isArray(result)
      ? result
      : Array.isArray(result.data)
      ? result.data
      : [];
    return {
      success: true,
      data: products.map(adaptProduct),
    };
  }

  static formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  static async getRequests() {
    const result = await ApiClient.get('/orders');
    return {
      success: true,
      data: Array.isArray(result) ? result.map(adaptRequest) : Array.isArray(result.data) ? result.data.map(adaptRequest) : [],
    };
  }

  static async getConfirmations() {
    const result = await ApiClient.get('/orders');
    const all = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    const confirmed = all.filter(r => r.estado === 'confirmado' || r.estado === 'confirmada');
    return {
      success: true,
      data: confirmed.map(adaptRequest),
    };
  }

  static async submitReservation(payload) {
    const result = await ApiClient.post('/orders', payload);
    return {
      success: true,
      reservation: result,
      referenceId: result.pedido_id || result.pedidoId || payload.pedidoId,
    };
  }

  // Get user blocked reservations pending doc_contable
  static async getMyBlockedReservations() {
    try {
      const result = await ApiClient.get('/orders/my-blocked');
      return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      console.error('Error fetching blocked reservations:', error);
      throw error;
    }
  }

  // Request cancellation of a reservation
  static async requestCancellation(id) {
    try {
      const result = await ApiClient.put(`/orders/${id}/cancel-request`);
      return result;
    } catch (error) {
      console.error(`Error requesting cancellation for ${id}:`, error);
      throw error;
    }
  }

  // Add document to blocked reservation
  static async addDocContable(id, docData) {
    try {
      const result = await ApiClient.put(`/orders/${id}/doc-contable`, docData);
      return result;
    } catch (error) {
      console.error(`Error adding doc_contable to reservation ${id}:`, error);
      throw error;
    }
  }

  // Actualiza el ticket de un pasajero individual (numero_ticket/estado/doc_contable)
  static async updatePassengerTicket(reservationId, passengerId, data) {
    try {
      const result = await ApiClient.put(`/orders/${reservationId}/passengers/${passengerId}`, data);
      return result;
    } catch (error) {
      console.error(`Error updating passenger ${passengerId} ticket:`, error);
      throw error;
    }
  }

  static generatePedidoId() {
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `PED-${year}-${randomPart}`;
  }

  static validateAvailability(vuelo, pasajeros) {
    if (!vuelo || typeof vuelo.disponibilidad === 'undefined') {
      throw new Error('Información de disponibilidad no válida');
    }

    const disponibilidad = Number(vuelo.disponibilidad || 0);
    const cantidadPasajeros = Array.isArray(pasajeros) ? pasajeros.length : 0;

    if (disponibilidad <= 0) {
      throw new Error('No hay cupos disponibles para este vuelo');
    }
    if (cantidadPasajeros > disponibilidad) {
      throw new Error(`Solo hay ${disponibilidad} cupos disponibles, pero se solicitan ${cantidadPasajeros} pasajeros`);
    }

    return true;
  }
}

export default ReservationService;
