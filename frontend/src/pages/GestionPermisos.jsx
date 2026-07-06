import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Search, Filter, Key, CheckCircle, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
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
} from '../components/ui/shadcn-dialog';

const emptyPermission = {
    name: '',
    code: '',
    module: '',
    description: '',
    is_active: true
};

// Módulos disponibles del sistema
const MODULES = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'users', label: 'Usuarios' },
    { value: 'agencies', label: 'Agencias' },
    { value: 'products', label: 'Productos' },
    { value: 'reservations', label: 'Reservas' },
    { value: 'notifications', label: 'Notificaciones' },
    { value: 'settings', label: 'Configuración' },
    { value: 'white_label', label: 'Marca Blanca' },
    { value: 'email', label: 'Email' },
    { value: 'ai', label: 'Inteligencia Artificial' },
    { value: 'permissions', label: 'Permisos' },
    { value: 'roles', label: 'Roles' },
    { value: 'reports', label: 'Reportes' }
];

export default function GestionPermisos() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formState, setFormState] = useState(emptyPermission);
    const [editingId, setEditingId] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    useEffect(() => {
        fetchPermissions();
    }, [pagination.page, moduleFilter]);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                module: moduleFilter || undefined
            };
            const response = await PermissionService.listPermissions(params);
            setPermissions(response.data || []);
            if (response.pagination) {
                setPagination(prev => ({
                    ...prev,
                    total: response.pagination.total || 0
                }));
            }
        } catch (error) {
            console.error('Error al cargar permisos:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los permisos'
            });
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setFormState(emptyPermission);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (permission) => {
        setFormState({
            name: permission.name || '',
            code: permission.code || '',
            module: permission.module || '',
            description: permission.description || '',
            is_active: permission.is_active ?? true
        });
        setEditingId(permission.id);
        setShowModal(true);
    };

    const handleDelete = async (permission) => {
        const result = await Swal.fire({
            title: '¿Eliminar permiso?',
            text: `Se eliminará el permiso "${permission.name}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await PermissionService.deletePermission(permission.id);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El permiso fue eliminado correctamente',
                    timer: 1500
                });
                fetchPermissions();
            } catch (error) {
                console.error('Error al eliminar permiso:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message || 'No se pudo eliminar el permiso'
                });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formState.name || !formState.code || !formState.module) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor complete todos los campos obligatorios'
            });
            return;
        }

        try {
            if (editingId) {
                await PermissionService.updatePermission(editingId, formState);
                Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'El permiso fue actualizado correctamente',
                    timer: 1500
                });
            } else {
                await PermissionService.createPermission(formState);
                Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'El permiso fue creado correctamente',
                    timer: 1500
                });
            }
            setShowModal(false);
            fetchPermissions();
        } catch (error) {
            console.error('Error al guardar permiso:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo guardar el permiso'
            });
        }
    };

    const filteredPermissions = permissions.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getModuleLabel = (moduleValue) => {
        const module = MODULES.find(m => m.value === moduleValue);
        return module ? module.label : moduleValue;
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Permisos"
                description="Administra los permisos del sistema por módulo"
                icon={Shield}
                action={
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Permiso
                    </Button>
                }
            />

            {/* Filtros */}
            <div className="bg-white rounded-lg border p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar permisos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={moduleFilter}
                            onChange={(e) => {
                                setModuleFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="border rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">Todos los módulos</option>
                            {MODULES.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla de permisos */}
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
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Módulo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descripción</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPermissions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                                        {searchTerm || moduleFilter ? 'No se encontraron permisos con los filtros aplicados' : 'No hay permisos registrados'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPermissions.map((permission) => (
                                    <tr key={permission.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Key className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-900">{permission.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700">
                                                {permission.code}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                                {getModuleLabel(permission.module)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                            {permission.description || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {permission.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                                                    <XCircle className="w-3 h-3" />
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(permission)}
                                                >
                                                    <Edit className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(permission)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
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
                            Página {pagination.page} de {totalPages} ({pagination.total} permisos)
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

            {/* Modal de crear/editar */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Permiso' : 'Nuevo Permiso'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre *
                            </label>
                            <Input
                                value={formState.name}
                                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej: Ver usuarios"
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
                                placeholder="Ej: USERS_VIEW"
                                className="font-mono"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Código único en formato MAYÚSCULAS (ej: USERS_CREATE, RESERVATIONS_DELETE)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Módulo *
                            </label>
                            <select
                                value={formState.module}
                                onChange={(e) => setFormState(prev => ({ ...prev, module: e.target.value }))}
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Seleccionar módulo</option>
                                {MODULES.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={formState.description}
                                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descripción opcional del permiso"
                                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                                rows="3"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formState.is_active}
                                onChange={(e) => setFormState(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="rounded"
                            />
                            <label htmlFor="is_active" className="text-sm text-slate-700">
                                Permiso activo
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
        </div>
    );
}
