import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, updateUserSchema } from '../schemas';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/Select';
import { Checkbox } from './ui/Checkbox';
import PermissionSelector from './PermissionSelector';
import { useAgencies } from '../hooks/useAgencies';

const UserForm = ({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues = {},
  isEditing = false,
  permissions = [],
  selectedPermissions = [],
  onPermissionToggle = () => { },
  roles = [],
  selectedRole = null,
  onRoleSelect = () => { }
}) => {
  const schema = isEditing ? updateUserSchema : userSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: defaultValues.email || '',
      nombre: defaultValues.nombre || '',
      apellido: defaultValues.apellido || '',
      rol: defaultValues.role || '',
      agencia: defaultValues.agencia || '',
      activo: defaultValues.activo ?? true,
      password: ''
    }
  });

  const watchedActive = watch('activo');
  const watchedRole = watch('rol');
  const watchedAgencia = watch('agencia');
  const { data: agencies = [] } = useAgencies();

  const roleLabels = {
    admin: 'Administrador',
    agency_admin: 'Admin de Agencia',
    user: 'Usuario',
  };

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      permissions: selectedPermissions,
      role: selectedRole || data.rol
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          readOnly={isEditing}
          className={isEditing ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="apellido">Apellido *</Label>
          <Input id="apellido" {...register('apellido')} />
          {errors.apellido && <p className="text-xs text-red-500">{errors.apellido.message}</p>}
        </div>
      </div>

      {!isEditing && (
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña *</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="rol">Rol *</Label>
          <Select value={watchedRole} onValueChange={(value) => setValue('rol', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar rol">
                {watchedRole ? roleLabels[watchedRole] || watchedRole : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="agency_admin">Admin de Agencia</SelectItem>
              <SelectItem value="user">Usuario</SelectItem>
            </SelectContent>
          </Select>
          {errors.rol && <p className="text-xs text-red-500">{errors.rol.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="agencia">Agencia</Label>
          <Select value={watchedAgencia} onValueChange={(value) => setValue('agencia', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar agencia">
                {agencies.find((a) => a.code === watchedAgencia)?.name || watchedAgencia || null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.code}>{agency.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2 py-1">
        <Checkbox
          id="activo"
          checked={watchedActive}
          onCheckedChange={(checked) => setValue('activo', checked)}
        />
        <Label htmlFor="activo">Usuario Activo</Label>
      </div>

      <div className="pt-3 border-t">
        <PermissionSelector
          permissions={permissions}
          selectedPermissions={selectedPermissions}
          onPermissionToggle={onPermissionToggle}
          roles={roles}
          selectedRole={selectedRole}
          onRoleSelect={onRoleSelect}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;