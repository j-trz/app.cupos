import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit3, User, Check, X, Lock, Unlock, Shield } from 'lucide-react';
import UserService from '../services/userService';
import RoleService from '../services/roleService';
import Swal from 'sweetalert2';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/shadcn-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/shadcn-dialog';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/shadcn-select';

const emptyUser = {
  email: '',
  nombre: '',
  apellido: '',
  agencia: '',
  role: 'agency_user',
  telefono: '',
  role_ids: [],
};

export default function GestionUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formState, setFormState] = useState(emptyUser);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const items = await UserService.listUsers();
      setUsers(items);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron cargar los usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await RoleService.listRoles({ limit: 100 });
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setFormState(emptyUser);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setFormState({
      email: user.email,
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      agencia: user.agencia || '',
      role: user.role || 'agency_user',
      telefono: user.telefono || '',
      role_ids: user.roles?.map(r => r.id) || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: 'Eliminar usuario',
      text: `¿Eliminar usuario ${user.email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await UserService.deleteUser(user.id);
      Swal.fire('Eliminado', 'Usuario eliminado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo eliminar el usuario', 'error');
    }
  };

  const handleUnlock = async (user) => {
    try {
      await UserService.unlockUser(user.id);
      Swal.fire('Éxito', 'Cuenta de usuario desbloqueada', 'success');
      fetchUsers();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo desbloquear el usuario', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await UserService.updateUser(editUser.id, formState);
        Swal.fire('Actualizado', 'Usuario actualizado correctamente', 'success');
      } else {
        await UserService.createUser(formState);
        Swal.fire('Creado', 'Usuario creado correctamente', 'success');
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo guardar el usuario', 'error');
    }
  };

  const fields = useMemo(
    () => [
      { name: 'email', label: 'Email', required: true, type: 'email' },
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'apellido', label: 'Apellido' },
      { name: 'telefono', label: 'Teléfono', type: 'tel' },
      { name: 'agencia', label: 'Agencia' },
      { name: 'role', label: 'Rol', type: 'select' },
    ],
    []
  );

  const legacyRoles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'agency_admin', label: 'Admin de Agencia' },
    { value: 'agency_user', label: 'Usuario de Agencia' },
  ];

  const toggleRole = (roleId) => {
    setFormState(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios y sus permisos en el sistema.
          </p>
        </div>
        <Button onClick={openCreate} className="border">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'usuario' : 'usuarios'} registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.nombre} {user.apellido}</TableCell>
                    <TableCell>{user.agencia || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'agency_admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {user.role === 'admin' ? 'Admin' :
                            user.role === 'agency_admin' ? 'Admin Agencia' : 'Usuario'}
                        </span>
                        {user.roles && user.roles.length > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {user.roles.length} rol{user.roles.length !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.security_status?.is_locked ? (
                        <div className="flex items-center text-red-600">
                          <Lock className="h-4 w-4 mr-1" />
                          Bloqueado
                        </div>
                      ) : (
                        <div className="flex items-center text-green-600">
                          <Unlock className="h-4 w-4 mr-1" />
                          Activo
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {user.security_status?.is_locked && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlock(user)}
                            title="Desbloquear usuario"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(user)}
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
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label} {field.required && '*'}
                  </Label>
                  {field.type === 'select' ? (
                    <Select
                      value={formState[field.name]}
                      onValueChange={(value) => setFormState({ ...formState, [field.name]: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`Selecciona un ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {legacyRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            {/* Roles Granulares */}
            <div className="border-t pt-4 mt-4">
              <Label className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Roles Granulares
              </Label>
              <p className="text-xs text-slate-500 mb-3">
                Selecciona los roles adicionales que tendrá este usuario. Los roles definen permisos específicos en el sistema.
              </p>

              {loadingRoles ? (
                <div className="text-center py-4 text-slate-500">Cargando roles...</div>
              ) : roles.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  No hay roles disponibles. Crea roles en la sección de Roles.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${formState.role_ids.includes(role.id)
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-slate-50 border border-transparent'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={formState.role_ids.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="rounded text-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {role.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {role.code}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
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