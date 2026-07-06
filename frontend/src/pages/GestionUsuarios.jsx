import React, { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { usePermissions } from '../hooks/usePermissions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { SkeletonTable } from '../components/SkeletonTable';
import { EmptyState } from '../components/EmptyState';
import UserForm from '../components/UserForm';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const GestionUsuarios = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  const { toast } = useToast();
  const { data: users, isLoading, isError } = useUsers({ search: searchTerm });
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const handleCreateUser = async (userData) => {
    try {
      await createUserMutation.mutateAsync(userData);
      toast({
        title: 'Éxito',
        description: 'Usuario creado correctamente',
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      await updateUserMutation.mutateAsync({ id: editingUser.id, userData });
      toast({
        title: 'Éxito',
        description: 'Usuario actualizado correctamente',
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await deleteUserMutation.mutateAsync(userId);
        toast({
          title: 'Éxito',
          description: 'Usuario eliminado correctamente',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Error al eliminar el usuario',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setSelectedPermissions(user.permissions || []);
    setSelectedRole(user.roleId || user.rol);
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
    // Aquí podrías cargar automáticamente los permisos del rol predefinido
  };

  if (isError) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Error al cargar los usuarios</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </DialogTitle>
            </DialogHeader>
            <UserForm
              onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
              onCancel={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              defaultValues={editingUser || {}}
              isEditing={!!editingUser}
              permissions={permissions?.data || []}
              selectedPermissions={selectedPermissions}
              onPermissionToggle={togglePermission}
              roles={roles?.data || []}
              selectedRole={selectedRole}
              onRoleSelect={handleRoleSelect}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Tabla de usuarios */}
      {isLoading ? (
        <SkeletonTable columns={6} rows={5} />
      ) : users?.data && users.data.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rol</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Agencia</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/10">
                      <td className="p-4 align-middle">
                        {user.nombre} {user.apellido}
                      </td>
                      <td className="p-4 align-middle">{user.email}</td>
                      <td className="p-4 align-middle">{user.rol}</td>
                      <td className="p-4 align-middle">{user.agencia || '-'}</td>
                      <td className="p-4 align-middle">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No hay usuarios"
          description="No se encontraron usuarios en el sistema"
          icon="👥"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer usuario
            </Button>
          }
        />
      )}
    </div>
  );
};

export default GestionUsuarios;