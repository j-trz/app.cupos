import api from './apiClient';

export const ticketService = {
  getTickets: (params = {}) => api.get('/tickets', { params }),
  getTicketById: (id) => api.get(`/tickets/${id}`),
  voidTicket: (id, motivoVoid, restoreStock) =>
    api.post(`/tickets/${id}/void`, { motivo_void: motivoVoid, restore_stock: !!restoreStock }),
  syncTicketAtlas: (id) => api.post(`/tickets/${id}/sync-atlas`),
};
