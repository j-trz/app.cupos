import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Shield, X, UserCheck, RefreshCw, BarChart3 } from 'lucide-react';
import Swal from 'sweetalert2';
import RoleService from '../services/roleService';
import PermissionService from '../services/permissionService';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAgencies } from '../hooks/useAgencies';
import { MODULES, ACTIONS } from '../lib/permissionModules.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const emptyRole = {
    name: '',
    code: '',
    description: '',
    is_system: false,
    is_active: true,
    // null = rol global (todas las agencias); un agency_id fuerza el rol a
    // esa agencia únicamente. El backend re-fuerza esto igual si quien crea
    // el rol es agency_admin (siempre queda scopeado a la suya).
    agency_id: null,
};

export default function GestionRoles() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'admin';
    const { data: agenciesData } = useAgencies();
    const agencies = agenciesData?.data || [];
    const agencyName = (id) => agencies.find(a => a.id === id)?.name || 'Agencia desconocida';

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
            is_active: role.is_active ?? true,
            agency_id: role.agency_id || null,
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

    const toggleModuleRow = (permissionIds) => {
        const allSelected = permissionIds.every(id => selectedPermissions.includes(id));
        if (allSelected) {
            setSelectedPermissions(prev => prev.filter(id => !permissionIds.includes(id)));
        } else {
            setSelectedPermissions(prev => [...new Set([...prev, ...permissionIds])]);
        }
    };

    const filteredRoles = roles.filter(r =>
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Matriz módulo x acción — cada celda es el permiso real (id) que existe
    // para ese módulo+acción, o null si nunca se sembró/creó ese permiso
    // puntual (celda vacía, no seleccionable). Resuelve directamente el
    // pedido de "ver pero no modificar/eliminar": cada acción es su propio
    // checkbox independiente en vez de un solo toggle por módulo.
    const permissionMatrix = MODULES.map(module => {
        const row = ACTIONS.map(action => permissions.find(p => p.module === module.value && p.action === action.value) || null);
        return { ...module, row };
    }).filter(m => m.row.some(Boolean));

    const matrixPermissionIds = new Set(permissionMatrix.flatMap(m => m.row.filter(Boolean).map(p => p.id)));
    const otherPermissions = permissions.filter(p => !matrixPermissionIds.has(p.id));

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Roles"
                description="Administra los roles y sus permisos en el sistema"
                icon={Users}
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={fetchRoles}
                            disabled={loading}
                            title="Refrescar datos"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" onClick={openCreate} title="Nuevo rol">
                            <Plus className="h-4 w-4 mr-1" />
                            Nuevo Rol
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={BarChart3}
                    label="Total roles"
                    value={pagination.total}
                    description="Cantidad total de roles."
                />
                <StatCard
                    icon={Shield}
                    label="Del sistema"
                    value={roles.filter(r => r.is_system).length}
                    description="Roles del sistema (no eliminables)."
                />
                <StatCard
                    icon={Users}
                    label="Personalizados"
                    value={roles.filter(r => !r.is_system).length}
                    description="Roles personalizados."
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200">
                {/* Búsqueda */}
                <div className="border-b border-slate-200 p-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar roles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
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
                                <TableHead className="text-center">Descripción</TableHead>
                                <TableHead className="text-center">Tipo</TableHead>
                                <TableHead className="text-center">Agencia</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRoles.length === 0 ? (
                                <TableRow>
                                    <TableCell className="text-center py-10" colSpan={7}>
                                        {searchTerm ? 'No se encontraron roles' : 'No hay roles registrados'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRoles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Shield className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium text-slate-900">{role.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700">
                                                {role.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-slate-600 max-w-xs truncate">
                                            {role.description || '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={role.is_system ? 'default' : 'success'}>
                                                {role.is_system ? 'Sistema' : 'Personalizado'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {role.agency_id ? (
                                                <Badge variant="outline" className="w-fit text-[10px]">{agencyName(role.agency_id)}</Badge>
                                            ) : (
                                                <span className="text-xs text-slate-400">Global</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={role.is_active ? 'success' : 'danger'}>
                                                {role.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openPermissions(role)} title="Gestionar permisos">
                                                    <Shield className="h-4 w-4 text-indigo-600" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openUsers(role)} title="Ver usuarios">
                                                    <UserCheck className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(role)} title="Editar">
                                                    <Edit className="h-4 w-4 text-slate-600" />
                                                </Button>
                                                {!role.is_system && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(role)} title="Eliminar" className="text-red-600 hover:text-red-700">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
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
                            Página {pagination.page} de {totalPages} ({pagination.total} roles)
                        </span>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
                                Anterior
                            </Button>
                            <Button variant="secondary" size="sm" disabled={pagination.page === totalPages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de crear/editar rol */}
            <Modal title={editingId ? 'Editar Rol' : 'Nuevo Rol'} open={showModal} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Nombre *</label>
                        <input
                            type="text"
                            value={formState.name}
                            onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Supervisor de Ventas"
                            required
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Código *</label>
                        <input
                            type="text"
                            value={formState.code}
                            onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="Ej: SALES_SUPERVISOR"
                            required
                            disabled={editingId && formState.is_system}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">Código único en formato MAYÚSCULAS</p>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Descripción</label>
                        <textarea
                            value={formState.description}
                            onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción del rol"
                            rows="3"
                            className="w-full min-h-[80px] rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    {/* Un admin puede elegir agencia (o dejarlo global); un agency_admin
                        siempre crea/edita para su propia agencia — el backend lo
                        fuerza igual, así que ni se le muestra el selector. */}
                    {isSuperAdmin && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Agencia</label>
                            <select
                                value={formState.agency_id || ''}
                                onChange={(e) => setFormState(prev => ({ ...prev, agency_id: e.target.value || null }))}
                                disabled={formState.is_system}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Global (todas las agencias)</option>
                                {agencies.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                Un rol de una agencia solo lo pueden ver/asignar usuarios de esa misma agencia.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formState.is_active}
                            onChange={(e) => setFormState(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="rounded"
                        />
                        <label className="text-sm text-slate-700">Activo</label>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            <X className="h-4 w-4 mr-1" />Cancelar
                        </Button>
                        <Button type="submit">
                            {editingId ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de permisos del rol — matriz módulo x acción */}
            <Modal title={`Permisos de: ${selectedRole?.name || ''}`} open={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} size="xl">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Marcá qué puede hacer este rol en cada área — por ejemplo, tildá "Ver" sin tildar "Editar" ni "Eliminar" para un acceso de solo consulta.
                    </p>

                    <div className="max-h-[450px] overflow-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 z-10">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-slate-600 border-b border-slate-200">Módulo</th>
                                    {ACTIONS.map(a => (
                                        <th key={a.value} className="px-2 py-2 text-center font-medium text-slate-600 border-b border-slate-200 whitespace-nowrap">{a.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {permissionMatrix.map(module => {
                                    const rowIds = module.row.filter(Boolean).map(p => p.id);
                                    const rowAllSelected = rowIds.length > 0 && rowIds.every(id => selectedPermissions.includes(id));
                                    return (
                                        <tr key={module.value} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleModuleRow(rowIds)}
                                                    className="flex items-center gap-1.5 text-slate-900 hover:underline"
                                                    title={rowAllSelected ? 'Destildar toda la fila' : 'Tildar toda la fila'}
                                                >
                                                    <span>{module.icon}</span>
                                                    <span className="font-medium">{module.label}</span>
                                                </button>
                                            </td>
                                            {module.row.map((perm, i) => (
                                                <td key={ACTIONS[i].value} className="px-2 py-2 text-center">
                                                    {perm ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPermissions.includes(perm.id)}
                                                            onChange={() => togglePermission(perm.id)}
                                                            title={perm.name}
                                                            className="rounded"
                                                        />
                                                    ) : (
                                                        <span className="text-slate-200">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {permissionMatrix.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                No hay permisos disponibles. Primero crea permisos en la sección de Permisos.
                            </div>
                        )}
                    </div>

                    {otherPermissions.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">Otros permisos (módulo/acción no estándar)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                                {otherPermissions.map(permission => (
                                    <label key={permission.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissions.includes(permission.id)}
                                            onChange={() => togglePermission(permission.id)}
                                            className="rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-900 truncate">{permission.name}</div>
                                            <div className="text-xs text-slate-500 font-mono truncate">{permission.code}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowPermissionsModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSavePermissions}>
                            Guardar Permisos
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de usuarios del rol */}
            <Modal title={`Usuarios con rol: ${selectedRole?.name || ''}`} open={showUsersModal} onClose={() => setShowUsersModal(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Lista de usuarios que tienen asignado este rol.</p>

                    <div className="max-h-[400px] overflow-y-auto">
                        {roleUsers.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No hay usuarios con este rol asignado
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {roleUsers.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50">
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

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowUsersModal(false)}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
