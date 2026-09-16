// Reservation.Estado (bloqueo_temporal/confirmada/cancelada/expirada/...) y
// Reservation.EstadoInterno (Pendiente/Seña/Pagado/Emitido) son campos
// independientes en el backend — un pedido emitido sigue teniendo
// Estado='confirmada' para siempre, porque ese enum no tiene un valor
// "emitida". El badge visible tiene que priorizar EstadoInterno cuando está
// en "Emitido", si no el usuario nunca ve reflejada la emisión.
export const getEstadoVariant = (estado, estadoInterno) => {
  if (estadoInterno === 'Emitido') return 'info';
  if (estado === 'confirmado' || estado === 'confirmada') return 'success';
  if (estado === 'procesando') return 'warning';
  if (estado === 'bloqueo_temporal') return 'warning';
  if (estado === 'cancelado' || estado === 'cancelada' || estado === 'solicitud_cancelacion') return 'danger';
  if (estado === 'expirada') return 'danger';
  if (estado === 'cedido') return 'outline';
  return 'default';
};

export const getEstadoLabel = (estado, estadoInterno) => {
  if (estadoInterno === 'Emitido') return 'Emitido';
  return ({
    bloqueo_temporal: 'Bloqueo Temporal',
    confirmado: 'Confirmado',
    confirmada: 'Confirmado',
    procesando: 'Procesando',
    completado: 'Completado',
    cancelado: 'Cancelado',
    cancelada: 'Cancelado',
    solicitud_cancelacion: 'Sol. Cancelación',
    expirada: 'Expirada',
    cedido: 'Cedido a otra agencia',
  }[estado] || estado || '—');
};
