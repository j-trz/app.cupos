import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit3, CheckCircle2, Send, Package, Check, X } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/shadcn-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/shadcn-dialog';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { ShadcnLabel as Label } from '../components/ui/shadcn-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/shadcn-select';

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

export default function GestionReservas() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReservation, setEditReservation] = useState(null);
  const [formState, setFormState] = useState(emptyReservation);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const items = await ReservationService.listReservations();
      setReservations(items);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron cargar las reservas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

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

  const handleDelete = async (reservation) => {
    const result = await Swal.fire({
      title: 'Eliminar reserva',
      text: `¿Eliminar reserva ${reservation.pedido_id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await ReservationService.deleteReservation(reservation.id);
      Swal.fire('Eliminado', 'Reserva eliminada correctamente', 'success');
      fetchReservations();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo eliminar la reserva', 'error');
    }
  };

  const handleConfirm = async (reservation) => {
    try {
      await ReservationService.confirmReservation(reservation.id);
      Swal.fire('Éxito', 'Reserva confirmada', 'success');
      fetchReservations();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo confirmar la reserva', 'error');
    }
  };

  const handleResendEmail = async (reservation) => {
    try {
      await ReservationService.resendReservationEmail(reservation.id);
      Swal.fire('Éxito', 'Email reenviado correctamente', 'success');
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo reenviar el email', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editReservation) {
        await ReservationService.updateReservation(editReservation.id, formState);
        Swal.fire('Actualizado', 'Reserva actualizada correctamente', 'success');
      } else {
        await ReservationService.createReservation(formState);
        Swal.fire('Creado', 'Reserva creada correctamente', 'success');
      }
      setDialogOpen(false);
      fetchReservations();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo guardar la reserva', 'error');
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

  const estados = [
    { value: 'bloqueo_temporal', label: 'Bloqueo Temporal' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'procesando', label: 'Procesando' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Reservas</h1>
          <p className="text-muted-foreground">
            Administra las reservas y su estado de confirmación.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Reserva
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Reservas</CardTitle>
          <CardDescription>
            {reservations.length} {reservations.length === 1 ? 'reserva' : 'reservas'} registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Vuelo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    Cargando reservas...
                  </TableCell>
                </TableRow>
              ) : reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    No se encontraron reservas.
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">{reservation.pedido_id}</TableCell>
                    <TableCell>{reservation.agencia}</TableCell>
                    <TableCell>{reservation.contacto_nombre}</TableCell>
                    <TableCell>{reservation.vuelo_codigo}</TableCell>
                    <TableCell>{reservation.vuelo_destino}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        reservation.estado === 'confirmado' ? 'bg-green-100 text-green-800' :
                        reservation.estado === 'procesando' ? 'bg-yellow-100 text-yellow-800' :
                        reservation.estado === 'completado' ? 'bg-blue-100 text-blue-800' :
                        reservation.estado === 'cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.estado === 'bloqueo_temporal' ? 'Bloqueo Temporal' :
                         reservation.estado === 'confirmado' ? 'Confirmado' :
                         reservation.estado === 'procesando' ? 'Procesando' :
                         reservation.estado === 'completado' ? 'Completado' : 'Cancelado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {reservation.estado && reservation.estado !== 'confirmado' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleConfirm(reservation)}
                            title="Confirmar reserva"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleResendEmail(reservation)}
                          title="Reenviar email"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(reservation)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(reservation)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editReservation ? 'Editar Reserva' : 'Nueva Reserva'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.name} className={field.name === 'vuelo_salida' || field.name === 'precio_venta' || field.name === 'neto_1' ? 'col-span-1' : 'col-span-2'}>
                  <Label htmlFor={field.name}>
                    {field.label} {field.required && '*'}
                  </Label>
                  {field.type === 'select' ? (
                    <Select 
                      value={formState[field.name] || ''} 
                      onValueChange={(value) => setFormState({ ...formState, [field.name]: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`Selecciona un ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map((estado) => (
                          <SelectItem key={estado.value} value={estado.value}>
                            {estado.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'date' ? (
                    <Input
                      id={field.name}
                      type="date"
                      name={field.name}
                      value={formState[field.name] ? formState[field.name].split('T')[0] : ''}
                      onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                      className="mt-1"
                      required={field.required}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type || 'text'}
                      name={field.name}
                      value={formState[field.name] ?? ''}
                      onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                      className="mt-1"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}