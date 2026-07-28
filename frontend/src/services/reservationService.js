import ApiClient from './apiClient';

// El backend puede responder un array plano o {data:[...]}, y en algunos
// endpoints devuelve JSON null (200) cuando el query no matchea filas (un
// slice de Go sin inicializar serializa como null, no []). Esta función
// normaliza cualquiera de esos casos a un array, sin romper si `result` es
// null/undefined.
const toArray = (result) => {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
};

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
  servicio: producto.servicio || '',
  notas_externas: producto.notas_externas || '',
  notas_internas: producto.notas_internas || '',
  salida: producto.salida || '',
  regreso: producto.regreso || '',
  neto_1: producto.neto_1 || 0,
  inf_fare: producto.inf_fare || 0,
  chd_fare: producto.chd_fare || 0,
  op: producto.op || 0,
  carryon: !!producto.carryon,
  handbag: !!producto.handbag,
  checkedbag: !!producto.checkedbag,
});

const adaptRequest = (item) => ({
  id: item.id || item.ID || '',
  Pedido_ID: item.Pedido_ID || item.pedido_id || '',
  Agencia: item.Agencia || item.agencia || '',
  Contacto_Nombre: item.Contacto_Nombre || item.contacto_nombre || item.contacto?.nombre || '',
  Contacto_Email: item.Contacto_Email || item.contacto_email || item.contacto?.email || '',
  Vuelo_Destino: item.Vuelo_Destino || item.vuelo_destino || item.destino || item.product?.destino || '',
  Nombre_Pasajero: item.Nombre_Pasajero || item.nombre_pasajero || '',
  Apellido_Pasajero: item.Apellido_Pasajero || item.apellido_pasajero || '',
  Temporada: item.Temporada || item.temporada || item.product?.temporada || '',
  Vuelo_Salida: item.Vuelo_Salida || item.vuelo_salida || item.fecha_salida || item.product?.fecha_salida || '',
  Estado: item.Estado || item.estado || 'Solicitado',
  Bloqueo_Expira_At: item.Bloqueo_Expira_At || item.bloqueo_expira_at || '',
  Doc_Contable: item.Doc_Contable || item.doc_contable || '',
  Ruta: item.Ruta || item.ruta || item.vuelo_ruta || item.product?.ruta || '',
  Fecha_Registro: item.Fecha_Registro || item.fecha_registro || item.created_at || '',
  Vuelo_Codigo: item.Vuelo_Codigo || item.vuelo_codigo || item.product?.codigo_cupo || '',
  Vuelo_Compania: item.Vuelo_Compania || item.vuelo_compania || item.product?.compania || '',
  // El precio del pasajero principal (passengers[0].precio_venta) es la
  // fuente de verdad — es el campo que se corrige desde "Editar Pasajero" en
  // Nóminas/Reservas. item.Vuelo_Precio/vuelo_precio son una foto fija tomada
  // al momento de la reserva y nunca se actualizan después, así que usarlos
  // primero hacía que Confirmaciones mostrara un precio viejo aunque ya se
  // hubiera corregido el del pasajero.
  Vuelo_Precio: item.passengers?.[0]?.precio_venta || item.precio_venta || item.Vuelo_Precio || item.vuelo_precio || item.product?.precio || '',
  Usuario_Email: item.Usuario_Email || item.usuario_email || '',
  Pnr: item.Pnr || item.pnr || item.product?.pnr || '',
  Ficha: item.Ficha || item.ficha || item.ficha_venta || '',
  TipoProducto: item.product?.tipo_producto || item.tipo_producto || '',
  InfFare: item.product?.inf_fare ?? 0,
  ChdFare: item.product?.chd_fare ?? 0,
  CarryOn: !!item.product?.carryon,
  HandBag: !!item.product?.handbag,
  CheckedBag: !!item.product?.checkedbag,
});

class ReservationService {
  // Get all reservations
  static async listReservations(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = queryParams ? `/orders?${queryParams}` : '/orders';
      const result = await ApiClient.get(endpoint);
      return toArray(result);
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

  // Delete reservation (todo el pedido, incluye todos sus pasajeros)
  static async deleteReservation(id) {
    try {
      const result = await ApiClient.delete(`/orders/${id}`);
      return result;
    } catch (error) {
      console.error(`Error deleting reservation with id ${id}:`, error);
      throw error;
    }
  }

  // Elimina UN pasajero puntual del pedido, sin afectar al resto
  static async deletePassenger(reservationId, passengerId) {
    try {
      const result = await ApiClient.delete(`/orders/${reservationId}/passengers/${passengerId}`);
      return result;
    } catch (error) {
      console.error(`Error deleting passenger ${passengerId} from reservation ${reservationId}:`, error);
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
    const products = toArray(result);
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
    // "cedido" es la línea interna que deja una cesión de stock entre
    // agencias — no es una solicitud de pasajero, no debe listarse acá.
    // Las confirmadas tampoco: esas ya se ven en Confirmaciones, y acá solo
    // debe quedar lo que se solicitó y todavía no se confirmó.
    return {
      success: true,
      data: toArray(result)
        .filter(r => r.estado !== 'cedido' && r.estado !== 'confirmado' && r.estado !== 'confirmada')
        .map(adaptRequest),
    };
  }

  // Reservas en bloqueo_temporal de TODA la agencia (no solo las propias) —
  // el backend ya filtra por agencia y solo devuelve pedido/destino/vencimiento,
  // nunca datos del pasajero de otro usuario.
  static async getBlockedReservations() {
    const result = await ApiClient.get('/orders/blocked');
    return toArray(result).map((r) => ({
      id: r.id,
      Pedido_ID: r.pedido_id,
      Vuelo_Destino: r.vuelo_destino,
      Bloqueo_Expira_At: r.bloqueo_expira_at,
      Vuelo_Salida: r.vuelo_salida,
      Temporada: r.temporada,
    }));
  }

  static async getConfirmations() {
    const result = await ApiClient.get('/orders');
    const all = toArray(result);
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

  // Descuenta de inmediato N lugares de un producto ANTES de cargar datos de
  // pasajero, con un vencimiento corto (bloqueo_hold_minutos) — ver
  // CreateHold en order_handler.go. El resultado se pasa como hold_id a
  // submitReservation para convertir este mismo hold en la reserva real.
  static async createHold(productId, passengerCount) {
    const result = await ApiClient.post('/orders/hold', {
      product_id: productId,
      passenger_count: passengerCount,
    });
    return {
      id: result.id,
      pedidoId: result.pedido_id,
      expiresAt: result.bloqueo_expira_at,
      passengerCount: result.passenger_count,
    };
  }

  // Cancela un hold en curso y libera el stock al instante, sin esperar al
  // cron — se llama al cerrar el modal sin confirmar. Best-effort: si falla
  // (ya venció, o cualquier error de red) no debe romper el cierre del modal.
  static async releaseHold(holdId) {
    try {
      await ApiClient.delete(`/orders/hold/${holdId}`);
    } catch (error) {
      console.error(`Error releasing hold ${holdId}:`, error);
    }
  }

  // Get user blocked reservations pending doc_contable
  static async getMyBlockedReservations() {
    try {
      const result = await ApiClient.get('/orders/my-blocked');
      return toArray(result);
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

  // Aprobar o rechazar una solicitud de cancelación pendiente (solo admin)
  static async resolveCancellation(id, decision, notas) {
    try {
      const result = await ApiClient.put(`/orders/${id}/cancel-request/resolve`, { decision, notas });
      return result;
    } catch (error) {
      console.error(`Error resolving cancellation for ${id}:`, error);
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

  // Edita los datos propios de un pasajero (nombre, apellido, documento,
  // nacimiento, nacionalidad, tipo_pasajero, tarifas) — distinto de
  // updatePassengerTicket, que solo toca numero_ticket/estado/doc_contable.
  static async updatePassenger(reservationId, passengerId, data) {
    try {
      const result = await ApiClient.put(`/orders/${reservationId}/passengers/${passengerId}/full`, data);
      return result;
    } catch (error) {
      console.error(`Error updating passenger ${passengerId}:`, error);
      throw error;
    }
  }

  // Duplica un pasajero dentro del mismo pedido (ej. grupo familiar con datos
  // similares), ocupando 1 lugar más si hay disponibilidad.
  static async duplicatePassenger(reservationId, passengerId) {
    try {
      const result = await ApiClient.post(`/orders/${reservationId}/passengers/${passengerId}/duplicate`);
      return result;
    } catch (error) {
      console.error(`Error duplicating passenger ${passengerId}:`, error);
      throw error;
    }
  }

  // Agrega un pasajero nuevo (en blanco) a un pedido existente, ocupando 1
  // lugar más del producto si hay disponibilidad.
  static async addPassenger(reservationId, data) {
    try {
      const result = await ApiClient.post(`/orders/${reservationId}/passengers`, data);
      return result;
    } catch (error) {
      console.error(`Error adding passenger to reservation ${reservationId}:`, error);
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
