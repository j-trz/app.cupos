import api from './apiClient';

export const ticketService = {
  getTickets: (params = {}) => api.get('/tickets', { params }),
  getTicketById: (id) => api.get(`/tickets/${id}`),
  voidTicket: (id, motivoVoid) =>
    api.post(`/tickets/${id}/void`, { motivo_void: motivoVoid }),
  syncTicketAtlas: (id) => api.post(`/tickets/${id}/sync-atlas`),
};
