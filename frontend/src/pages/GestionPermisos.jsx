import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Search, Filter, Key, CheckCircle, XCircle, RefreshCw, BarChart3 } from 'lucide-react';
import Swal from 'sweetalert2';
import PermissionService from '../services/permissionService';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

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
                    timer: 1500,
                    showConfirmButton: false
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
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await PermissionService.createPermission(formState);
                Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'El permiso fue creado correctamente',
                    timer: 1500,
                    showConfirmButton: false
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
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={fetchPermissions}
                            disabled={loading}
                            title="Refrescar datos"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" onClick={openCreate} title="Nuevo permiso">
                            <Plus className="h-4 w-4 mr-1" />
                            Nuevo Permiso
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={BarChart3}
                    label="Total permisos"
                    value={pagination.total}
                    description="Cantidad total de permisos."
                />
                <StatCard
                    icon={CheckCircle}
                    label="Activos"
                    value={permissions.filter(p => p.is_active).length}
                    description="Permisos activos en el sistema."
                />
                <StatCard
                    icon={XCircle}
                    label="Inactivos"
                    value={permissions.filter(p => !p.is_active).length}
                    description="Permisos inactivos."
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200">
                {/* Filtros */}
                <div className="border-b border-slate-200 p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar permisos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <select
                                value={moduleFilter}
                                onChange={(e) => {
                                    setModuleFilter(e.target.value);
                                    setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="">Todos los módulos</option>
                                {MODULES.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                ) : (
                    <TableComponent>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Nombre</TableHead>
                                <TableHead className="text-center">Código</TableHead>
                                <TableHead className="text-center">Módulo</TableHead>
                                <TableHead className="text-center">Descripción</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPermissions.length === 0 ? (
                                <TableRow>
                                    <TableCell className="text-center py-10" colSpan={6}>
                                        {searchTerm || moduleFilter ? 'No se encontraron permisos con los filtros aplicados' : 'No hay permisos registrados'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPermissions.map((permission) => (
                                    <TableRow key={permission.id}>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Key className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium text-slate-900">{permission.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700">
                                                {permission.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="default">
                                                {getModuleLabel(permission.module)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-slate-600 max-w-xs truncate">
                                            {permission.description || '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={permission.is_active ? 'success' : 'danger'}>
                                                {permission.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(permission)}
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4 text-slate-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(permission)}
                                                    title="Eliminar"
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </TableComponent>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                        <span className="text-sm text-slate-600">
                            Página {pagination.page} de {totalPages} ({pagination.total} permisos)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="secondary"
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
            <Modal title={editingId ? 'Editar Permiso' : 'Nuevo Permiso'} open={showModal} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={formState.name}
                            onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Ver usuarios"
                            required
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Código *
                        </label>
                        <input
                            type="text"
                            value={formState.code}
                            onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="Ej: USERS_VIEW"
                            required
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Código único en formato MAYÚSCULAS (ej: USERS_CREATE, RESERVATIONS_DELETE)
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Módulo *
                        </label>
                        <select
                            value={formState.module}
                            onChange={(e) => setFormState(prev => ({ ...prev, module: e.target.value }))}
                            required
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">Seleccionar módulo</option>
                            {MODULES.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Descripción
                        </label>
                        <textarea
                            value={formState.description}
                            onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción opcional del permiso"
                            rows="3"
                            className="w-full min-h-[80px] rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
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

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            <XCircle className="h-4 w-4 mr-1" />Cancelar
                        </Button>
                        <Button type="submit">
                            {editingId ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
