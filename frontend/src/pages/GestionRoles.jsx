import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Shield, Check, X, UserCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import RoleService from '../services/roleService';
import PermissionService from '../services/permissionService';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '../components/ui/shadcn-dialog';

const emptyRole = {
    name: '',
    code: '',
    description: '',
    is_system: false,
    is_active: true
};

// Módulos disponibles para agrupar permisos
const MODULES = [
    { value: 'dashboard', label: 'Dashboard', icon: '📊' },
    { value: 'users', label: 'Usuarios', icon: '👥' },
    { value: 'agencies', label: 'Agencias', icon: '🏢' },
    { value: 'products', label: 'Productos', icon: '📦' },
    { value: 'reservations', label: 'Reservas', icon: '📅' },
    { value: 'notifications', label: 'Notificaciones', icon: '🔔' },
    { value: 'settings', label: 'Configuración', icon: '⚙️' },
    { value: 'white_label', label: 'Marca Blanca', icon: '🎨' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'ai', label: 'Inteligencia Artificial', icon: '🤖' },
    { value: 'permissions', label: 'Permisos', icon: '🔐' },
    { value: 'roles', label: 'Roles', icon: '🛡️' },
    { value: 'reports', label: 'Reportes', icon: '📈' }
];

export default function GestionRoles() {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [formState, setFormState] = useState(emptyRole);
    const [editingId, setEditingId] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [roleUsers, setRoleUsers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
    }, [pagination.page]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };
            const response = await RoleService.listRoles(params);
            setRoles(response.data || []);
            if (response.pagination) {
                setPagination(prev => ({
                    ...prev,
                    total: response.pagination.total || 0
                }));
            }
        } catch (error) {
            console.error('Error al cargar roles:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los roles'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await PermissionService.listPermissions({ limit: 1000 });
            setPermissions(response.data || []);
        } catch (error) {
            console.error('Error al cargar permisos:', error);
        }
    };

    const openCreate = () => {
        setFormState(emptyRole);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (role) => {
        setFormState({
            name: role.name || '',
            code: role.code || '',
            description: role.description || '',
            is_system: role.is_system ?? false,
            is_active: role.is_active ?? true
        });
        setEditingId(role.id);
        setShowModal(true);
    };

    const openPermissions = async (role) => {
        setSelectedRole(role);
        try {
            const response = await PermissionService.getRolePermissions(role.id);
            const rolePermissionIds = (response.data || []).map(p => p.id);
            setSelectedPermissions(rolePermissionIds);
            setShowPermissionsModal(true);
        } catch (error) {
            console.error('Error al cargar permisos del rol:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los permisos del rol'
            });
        }
    };

    const openUsers = async (role) => {
        setSelectedRole(role);
        try {
            const response = await RoleService.getRoleUsers(role.id);
            setRoleUsers(response.data || []);
            setShowUsersModal(true);
        } catch (error) {
            console.error('Error al cargar usuarios del rol:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los usuarios del rol'
            });
        }
    };

    const handleDelete = async (role) => {
        if (role.is_system) {
            Swal.fire({
                icon: 'warning',
                title: 'No se puede eliminar',
                text: 'Los roles del sistema no se pueden eliminar'
            });
            return;
        }

        const result = await Swal.fire({
            title: '¿Eliminar rol?',
            text: `Se eliminará el rol "${role.name}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await RoleService.deleteRole(role.id);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El rol fue eliminado correctamente',
                    timer: 1500
                });
                fetchRoles();
            } catch (error) {
                console.error('Error al eliminar rol:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'No se pudo eliminar el rol'
                });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formState.name || !formState.code) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor complete todos los campos obligatorios'
            });
            return;
        }

        try {
            if (editingId) {
                await RoleService.updateRole(editingId, formState);
                Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'El rol fue actualizado correctamente',
                    timer: 1500
                });
            } else {
                await RoleService.createRole(formState);
                Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'El rol fue creado correctamente',
                    timer: 1500
                });
            }
            setShowModal(false);
            fetchRoles();
        } catch (error) {
            console.error('Error al guardar rol:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo guardar el rol'
            });
        }
    };

    const handleSavePermissions = async () => {
        try {
            await PermissionService.assignPermissionsToRole(selectedRole.id, selectedPermissions);
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'Los permisos fueron actualizados correctamente',
                timer: 1500
            });
            setShowPermissionsModal(false);
        } catch (error) {
            console.error('Error al guardar permisos:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudieron guardar los permisos'
            });
        }
    };

    const togglePermission = (permissionId) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const toggleModulePermissions = (moduleValue) => {
        const modulePermissions = permissions
            .filter(p => p.module === moduleValue)
            .map(p => p.id);

        const allSelected = modulePermissions.every(id => selectedPermissions.includes(id));

        if (allSelected) {
            setSelectedPermissions(prev => prev.filter(id => !modulePermissions.includes(id)));
        } else {
            setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissions])]);
        }
    };

    const filteredRoles = roles.filter(r =>
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupar permisos por módulo
    const permissionsByModule = MODULES.map(module => ({
        ...module,
        permissions: permissions.filter(p => p.module === module.value)
    })).filter(m => m.permissions.length > 0);

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-6 ">
            <PageHeader
                title="Gestión de Roles"
                description="Administra los roles y sus permisos en el sistema"
                icon={Users}
                action={
                    <Button onClick={openCreate} className="border">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Rol
                    </Button>
                }
            />

            {/* Búsqueda */}
            <div className="bg-white rounded-lg border p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Tabla de roles */}
            <div className="bg-white rounded-lg border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <Table>
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descripción</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRoles.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                                        {searchTerm ? 'No se encontraron roles' : 'No hay roles registrados'}
                                    </td>
                                </tr>
                            ) : (
                                filteredRoles.map((role) => (
                                    <tr key={role.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-900">{role.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700">
                                                {role.code}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                            {role.description || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {role.is_system ? (
                                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                                    Sistema
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                                    Personalizado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {role.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                                    <Check className="w-3 h-3" />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                                                    <X className="w-3 h-3" />
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openPermissions(role)}
                                                    title="Gestionar permisos"
                                                >
                                                    <Shield className="w-4 h-4 text-indigo-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openUsers(role)}
                                                    title="Ver usuarios"
                                                >
                                                    <UserCheck className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(role)}
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4 text-slate-600" />
                                                </Button>
                                                {!role.is_system && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(role)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
                        <span className="text-sm text-slate-600">
                            Página {pagination.page} de {totalPages} ({pagination.total} roles)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === totalPages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de crear/editar rol */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Rol' : 'Nuevo Rol'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId ? 'Modifica los datos del rol' : 'Crea un nuevo rol en el sistema'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre *
                            </label>
                            <Input
                                value={formState.name}
                                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej: Supervisor de Ventas"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Código *
                            </label>
                            <Input
                                value={formState.code}
                                onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                placeholder="Ej: SALES_SUPERVISOR"
                                className="font-mono"
                                required
                                disabled={editingId && formState.is_system}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Código único en formato MAYÚSCULAS
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={formState.description}
                                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descripción del rol"
                                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                                rows="3"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formState.is_active}
                                    onChange={(e) => setFormState(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="rounded"
                                />
                                <span className="text-sm text-slate-700">Activo</span>
                            </label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {editingId ? 'Actualizar' : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de permisos del rol */}
            <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Permisos de: {selectedRole?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Selecciona los permisos que tendrá este rol. Los permisos están agrupados por módulo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {permissionsByModule.map(module => {
                            const modulePermissionIds = module.permissions.map(p => p.id);
                            const selectedCount = modulePermissionIds.filter(id => selectedPermissions.includes(id)).length;
                            const allSelected = selectedCount === modulePermissionIds.length;
                            const someSelected = selectedCount > 0 && !allSelected;

                            return (
                                <div key={module.value} className="border rounded-lg overflow-hidden">
                                    <div
                                        className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b cursor-pointer hover:bg-slate-100"
                                        onClick={() => toggleModulePermissions(module.value)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{module.icon}</span>
                                            <span className="font-medium text-slate-900">{module.label}</span>
                                            <span className="text-xs text-slate-500">
                                                ({selectedCount}/{module.permissions.length})
                                            </span>
                                        </div>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${allSelected ? 'bg-indigo-600 border-indigo-600' :
                                            someSelected ? 'border-indigo-600' : 'border-slate-300'
                                            }`}>
                                            {allSelected && <Check className="w-3 h-3 text-white" />}
                                            {someSelected && <div className="w-2 h-2 bg-indigo-600 rounded-sm" />}
                                        </div>
                                    </div>
                                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {module.permissions.map(permission => (
                                            <label
                                                key={permission.id}
                                                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(permission.id)}
                                                    onChange={() => togglePermission(permission.id)}
                                                    className="rounded text-indigo-600"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-900 truncate">
                                                        {permission.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono truncate">
                                                        {permission.code}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {permissionsByModule.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                No hay permisos disponibles. Primero crea permisos en la sección de Permisos.
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPermissionsModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSavePermissions}>
                            Guardar Permisos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de usuarios del rol */}
            <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                            Usuarios con rol: {selectedRole?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Lista de usuarios que tienen asignado este rol
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[400px] overflow-y-auto">
                        {roleUsers.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No hay usuarios con este rol asignado
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {roleUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-900 truncate">{user.name}</div>
                                            <div className="text-sm text-slate-500 truncate">{user.email}</div>
                                        </div>
                                        {user.agency_name && (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                                {user.agency_name}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowUsersModal(false)}
                        >
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
