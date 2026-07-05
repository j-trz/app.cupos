import { useEffect, useState } from 'react';
import { Bell, CheckCircle, Eye, EyeOff, Trash2, Plus, Send } from 'lucide-react';
import NotificationService from '../services/notificationService';
import Swal from 'sweetalert2';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/shadcn-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/shadcn-dialog';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';
import { ShadcnTextarea as Textarea } from '../components/ui/shadcn-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/shadcn-select';
import { Badge } from '../components/ui/shadcn-badge';

const emptyNotification = {
  type: 'system_update',
  title: '',
  message: '',
  icon: '📢',
  color: 'blue',
  priority: 'medium',
  target_role: null,
};

export default function Notificaciones() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editNotification, setEditNotification] = useState(null);
  const [formState, setFormState] = useState(emptyNotification);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const items = await NotificationService.getUserNotifications({ limit: 50 });
      setNotifications(items);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron cargar las notificaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const openCreate = () => {
    setEditNotification(null);
    setFormState(emptyNotification);
    setDialogOpen(true);
  };

  const openEdit = (notification) => {
    setEditNotification(notification);
    setFormState({ ...notification });
    setDialogOpen(true);
  };

  const handleMarkAsRead = async (notification) => {
    try {
      await NotificationService.markAsRead(notification.id);
      Swal.fire('Éxito', 'Notificación marcada como leída', 'success');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo marcar como leída', 'error');
    }
  };

  const handleHide = async (notification) => {
    try {
      await NotificationService.hideNotification(notification.id);
      Swal.fire('Éxito', 'Notificación oculta', 'success');
      fetchNotifications();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo ocultar la notificación', 'error');
    }
  };

  const handleDelete = async (notification) => {
    const result = await Swal.fire({
      title: 'Eliminar notificación',
      text: '¿Está seguro de eliminar esta notificación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      // Assuming there's a delete endpoint for notifications
      // This would need to be implemented in the backend
      Swal.fire('Funcionalidad', 'La eliminación de notificaciones está pendiente de implementar en el backend', 'info');
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo eliminar la notificación', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      Swal.fire('Éxito', 'Todas las notificaciones marcadas como leídas', 'success');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron marcar todas como leídas', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editNotification) {
        // Update notification - this would need backend implementation
        Swal.fire('Funcionalidad', 'La actualización de notificaciones está pendiente de implementar en el backend', 'info');
      } else {
        await NotificationService.createNotification(formState);
        Swal.fire('Creado', 'Notificación creada correctamente', 'success');
      }
      setDialogOpen(false);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo guardar la notificación', 'error');
    }
  };

  const notificationTypes = [
    { value: 'new_request', label: 'Nueva Solicitud' },
    { value: 'request_confirmed', label: 'Solicitud Confirmada' },
    { value: 'new_product', label: 'Nuevo Producto' },
    { value: 'low_availability', label: 'Baja Disponibilidad' },
    { value: 'system_update', label: 'Actualización del Sistema' },
  ];

  const priorities = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
  ];

  const targetRoles = [
    { value: 'admin', label: 'Administradores' },
    { value: 'agency_admin', label: 'Admin de Agencia' },
    { value: 'agency_user', label: 'Usuarios de Agencia' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground">
            Gestiona tus notificaciones y alertas del sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Notificación
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Total de Notificaciones</CardTitle>
            <CardDescription>{notifications.length} notificaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>No Leídas</CardTitle>
            <CardDescription>Notificaciones pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{unreadCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Notificaciones</CardTitle>
          <CardDescription>
            {notifications.length} {notifications.length === 1 ? 'notificación' : 'notificaciones'} registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    Cargando notificaciones...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    No se encontraron notificaciones.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id} className={!notification.is_read ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <Badge variant="outline">
                        {notification.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{notification.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                    <TableCell>
                      <Badge variant={notification.priority === 'high' ? 'destructive' : notification.priority === 'medium' ? 'default' : 'secondary'}>
                        {notification.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {notification.is_read ? (
                        <div className="flex items-center text-green-600">
                          <Eye className="h-4 w-4 mr-1" />
                          Leída
                        </div>
                      ) : (
                        <div className="flex items-center text-orange-600">
                          <EyeOff className="h-4 w-4 mr-1" />
                          Sin leer
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!notification.is_read && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleMarkAsRead(notification)}
                            title="Marcar como leída"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleHide(notification)}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(notification)}
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
            <DialogTitle>{editNotification ? 'Editar Notificación' : 'Crear Notificación'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select 
                  value={formState.type} 
                  onValueChange={(value) => setFormState({ ...formState, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Prioridad *</Label>
                <Select 
                  value={formState.priority} 
                  onValueChange={(value) => setFormState({ ...formState, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="target_role">Rol Destino</Label>
                <Select 
                  value={formState.target_role || ''} 
                  onValueChange={(value) => setFormState({ ...formState, target_role: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los usuarios</SelectItem>
                    {targetRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="icon">Icono</Label>
                <Input
                  id="icon"
                  type="text"
                  value={formState.icon}
                  onChange={(e) => setFormState({ ...formState, icon: e.target.value })}
                  placeholder="Ej: 📢"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="message">Mensaje *</Label>
                <Textarea
                  id="message"
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  required
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                {editNotification ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}