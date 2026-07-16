import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import UserForm from '../components/UserForm';
import { Search, Plus, Edit, Trash2, RefreshCw, Users, UserCheck, XCircle, CheckCircle, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

const GestionUsuarios = () => {
  const { can } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();
  const { data: usersData, isLoading, isError, refetch } = useUsers({ search: searchTerm });
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const users = usersData?.data || [];

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Usuarios actualizados correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await createUserMutation.mutateAsync(userData);
      toast({ title: 'Éxito', description: 'Usuario creado correctamente' });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Error al crear el usuario', variant: 'destructive' });
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      await updateUserMutation.mutateAsync({ id: editingUser.id, userData });
      toast({ title: 'Éxito', description: 'Usuario actualizado correctamente' });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Error al actualizar el usuario', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: '¿Estás seguro de que deseas eliminar este usuario?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteUserMutation.mutateAsync(userId);
      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Usuario eliminado correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al eliminar el usuario' });
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setSelectedPermissions(user.permissions || []);
    setSelectedRole(user.role_id || null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setSelectedPermissions([]);
    setSelectedRole(null);
  };

  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const activeCount = users.filter(u => u.activo).length;
  const inactiveCount = users.length - activeCount;

  if (!can('USERS_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gestión de Usuarios" description="Administra los usuarios del sistema" icon={Users} />
        <Card>
          <div className="p-10 text-center text-red-600">Error al cargar los usuarios</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administra los usuarios del sistema"
        icon={Users}
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
            <Button size="sm" onClick={() => { resetForm(); setIsModalOpen(true); }} title="Nuevo usuario">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Usuario
            </Button>
          </div>
        }
      />

      <StatsHero
        stats={[
          {
            icon: Users,
            label: 'Total usuarios',
            value: users.length,
            description: 'Cantidad total de usuarios registrados.',
            color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
          },
          {
            icon: CheckCircle,
            label: 'Activos',
            value: activeCount,
            description: 'Usuarios con estado activo.',
            color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
          },
          {
            icon: XCircle,
            label: 'Inactivos',
            value: inactiveCount,
            description: 'Usuarios con estado inactivo.',
            color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
          },
        ]}
      />

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lista de Usuarios</h2>
              <p className="text-sm text-slate-500">Gestioná los usuarios y sus permisos.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Nombre</TableHead>
              <TableHead className="text-center">Email</TableHead>
              <TableHead className="text-center">Rol</TableHead>
              <TableHead className="text-center">Agencia</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={6}>
                  Cargando usuarios...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={6}>
                  {searchTerm ? 'No se encontraron usuarios con la búsqueda.' : 'No hay usuarios registrados.'}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-center font-medium">
                    {user.nombre} {user.apellido}
                  </TableCell>
                  <TableCell className="text-center">{user.email}</TableCell>
                  <TableCell className="text-center">
                    {user.role_name || user.role}
                    {user.role_name && (
                      <span className="block text-xs text-slate-400">{user.role}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{user.agencia || '—'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.activo ? 'success' : 'danger'}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} title="Editar usuario">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} title="Eliminar usuario" className="text-red-600 hover:text-red-700">
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

      {/* Modal de Crear/Editar Usuario */}
      <Modal
        title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        size="xl"
      >
        <UserForm
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          onCancel={() => { setIsModalOpen(false); resetForm(); }}
          defaultValues={editingUser || {}}
          isEditing={!!editingUser}
          permissions={permissions?.data || []}
          selectedPermissions={selectedPermissions}
          onPermissionToggle={togglePermission}
          roles={roles?.data || []}
          selectedRole={selectedRole}
          onRoleSelect={handleRoleSelect}
        />
      </Modal>
    </div>
  );
};

export default GestionUsuarios;
