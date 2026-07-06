import { useEffect, useMemo, useState } from 'react';
import { Calendar, BarChart3, CheckCircle, Plus, Edit3, Trash2, RefreshCw, Send, X, CheckCircle2 } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const emptyReservation = {
  pedido_id: '',
  agencia: '',
  contacto_nombre: '',
  contacto_email: '',
  contacto_telefono: '',
  vuelo_codigo: '',
  vuelo_destino: '',
  vuelo_compania: '',
  vuelo_salida: '',
  nombre_pasajero: '',
  apellido_pasajero: '',
  documento_pasajero: '',
  estado: 'bloqueo_temporal',
  precio_venta: '',
  neto_1: '',
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getEstadoVariant = (estado) => {
  if (estado === 'confirmado') return 'success';
  if (estado === 'procesando') return 'warning';
  if (estado === 'completado') return 'default';
  if (estado === 'cancelado') return 'danger';
  return 'default';
};

const getEstadoLabel = (estado) => {
  const map = {
    bloqueo_temporal: 'Bloqueo Temporal',
    confirmado: 'Confirmado',
    procesando: 'Procesando',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };
  return map[estado] || estado;
};

export default function GestionReservas() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReservation, setEditReservation] = useState(null);
  const [formState, setFormState] = useState(emptyReservation);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todas');

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const items = await ReservationService.listReservations();
      setReservations(items);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudieron cargar las reservas' });
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchReservations();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Reservas actualizadas correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const estados = useMemo(() => {
    const set = new Set();
    reservations.forEach((r) => {
      if (r.estado) set.add(r.estado);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    let result = reservations;
    if (estadoFilter !== 'Todas') {
      result = result.filter((r) => r.estado === estadoFilter);
    }
    if (searchTerm) {
      result = result.filter((r) =>
        r.pedido_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contacto_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vuelo_destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.agencia?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [reservations, estadoFilter, searchTerm]);

  const openCreate = () => {
    setEditReservation(null);
    setFormState(emptyReservation);
    setDialogOpen(true);
  };

  const openEdit = (reservation) => {
    setEditReservation(reservation);
    setFormState({ ...reservation });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditReservation(null);
    setFormState(emptyReservation);
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (reservation) => {
    const result = await Swal.fire({
      title: '¿Eliminar reserva?',
      text: `¿Eliminar reserva ${reservation.pedido_id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });
    if (!result.isConfirmed) return;
    try {
      await ReservationService.deleteReservation(reservation.id);
      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Reserva eliminada correctamente', timer: 1500, showConfirmButton: false });
      fetchReservations();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar la reserva' });
    }
  };

  const handleConfirm = async (reservation) => {
    try {
      await ReservationService.confirmReservation(reservation.id);
      Swal.fire({ icon: 'success', title: 'Éxito', text: 'Reserva confirmada', timer: 1500, showConfirmButton: false });
      fetchReservations();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo confirmar la reserva' });
    }
  };

  const handleResendEmail = async (reservation) => {
    try {
      await ReservationService.resendReservationEmail(reservation.id);
      Swal.fire({ icon: 'success', title: 'Éxito', text: 'Email reenviado correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo reenviar el email' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editReservation) {
        await ReservationService.updateReservation(editReservation.id, formState);
        Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Reserva actualizada correctamente', timer: 1500, showConfirmButton: false });
      } else {
        await ReservationService.createReservation(formState);
        Swal.fire({ icon: 'success', title: 'Creado', text: 'Reserva creada correctamente', timer: 1500, showConfirmButton: false });
      }
      closeDialog();
      fetchReservations();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar la reserva' });
    }
  };

  const fields = useMemo(
    () => [
      { name: 'pedido_id', label: 'ID Pedido', required: true },
      { name: 'agencia', label: 'Agencia', required: true },
      { name: 'contacto_nombre', label: 'Contacto', required: true },
      { name: 'contacto_email', label: 'Email Contacto', type: 'email', required: true },
      { name: 'contacto_telefono', label: 'Teléfono Contacto', type: 'tel' },
      { name: 'vuelo_codigo', label: 'Código Vuelo', required: true },
      { name: 'vuelo_destino', label: 'Destino', required: true },
      { name: 'vuelo_compania', label: 'Compañía', required: true },
      { name: 'vuelo_salida', label: 'Fecha Salida', type: 'date', required: true },
      { name: 'nombre_pasajero', label: 'Nombre Pasajero', required: true },
      { name: 'apellido_pasajero', label: 'Apellido Pasajero', required: true },
      { name: 'documento_pasajero', label: 'Documento Pasajero', required: true },
      { name: 'estado', label: 'Estado', type: 'select' },
      { name: 'precio_venta', label: 'Precio Venta', type: 'number', required: true },
      { name: 'neto_1', label: 'Neto', type: 'number', required: true },
    ],
    []
  );

  const estadoOptions = [
    { value: 'bloqueo_temporal', label: 'Bloqueo Temporal' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'procesando', label: 'Procesando' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Reservas"
        description="Administra las reservas y su estado de confirmación."
        icon={Calendar}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              title="Refrescar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={openCreate} title="Nueva reserva">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Reserva
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BarChart3}
          label="Total reservas"
          value={filteredReservations.length}
          description={estadoFilter !== 'Todas' ? `Filtrado: ${getEstadoLabel(estadoFilter)}` : 'Cantidad total de reservas.'}
        />
        <StatCard
          icon={CheckCircle}
          label="Confirmadas"
          value={filteredReservations.filter((r) => r.estado === 'confirmado').length}
          description="Reservas confirmadas."
        />
        <StatCard
          icon={Calendar}
          label="Pendientes"
          value={filteredReservations.filter((r) => r.estado === 'bloqueo_temporal' || r.estado === 'procesando').length}
          description="Reservas en proceso."
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lista de Reservas</h2>
              <p className="text-sm text-slate-500">Gestioná las reservas y sus estados.</p>
            </div>
          </div>

          {/* Buscador */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por pedido, contacto, destino o agencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Filtros de estado */}
          {estados.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estado:</span>
              {estados.map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setEstadoFilter(est)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${estadoFilter === est
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                >
                  {est !== 'Todas' && getEstadoLabel(est)}
                  {est === 'Todas' && 'Todas'}
                </button>
              ))}
            </div>
          )}
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">ID Pedido</TableHead>
              <TableHead className="text-center">Agencia</TableHead>
              <TableHead className="text-center">Contacto</TableHead>
              <TableHead className="text-center">Vuelo</TableHead>
              <TableHead className="text-center">Destino</TableHead>
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={8}>
                  Cargando reservas...
                </TableCell>
              </TableRow>
            ) : filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={8}>
                  {searchTerm || estadoFilter !== 'Todas'
                    ? 'No se encontraron reservas con los filtros aplicados.'
                    : 'No hay reservas registradas.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="text-center font-medium">{reservation.pedido_id}</TableCell>
                  <TableCell className="text-center">{reservation.agencia || '—'}</TableCell>
                  <TableCell className="text-center">{reservation.contacto_nombre || '—'}</TableCell>
                  <TableCell className="text-center">{reservation.vuelo_codigo || '—'}</TableCell>
                  <TableCell className="text-center">{reservation.vuelo_destino || '—'}</TableCell>
                  <TableCell className="text-center">{formatDate(reservation.vuelo_salida)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getEstadoVariant(reservation.estado)}>
                      {getEstadoLabel(reservation.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {reservation.estado && reservation.estado !== 'confirmado' && (
                        <Button variant="ghost" size="sm" onClick={() => handleConfirm(reservation)} title="Confirmar reserva">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleResendEmail(reservation)} title="Reenviar email">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(reservation)} title="Editar reserva">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(reservation)} title="Eliminar reserva" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      {/* Modal de Crear/Editar Reserva */}
      <Modal title={editReservation ? 'Editar Reserva' : 'Nueva Reserva'} open={dialogOpen} onClose={closeDialog}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'col-span-2' : 'col-span-1'}>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formState[field.name] || ''}
                    onChange={(e) => handleFormChange(field.name, e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
                  >
                    {estadoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={formState[field.name] ? (field.type === 'date' ? String(formState[field.name]).split('T')[0] : formState[field.name]) : ''}
                    onChange={(e) => handleFormChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={closeDialog}>
              <X className="h-4 w-4 mr-1" />Cancelar
            </Button>
            <Button type="submit">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
