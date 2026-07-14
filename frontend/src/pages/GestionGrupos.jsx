import { useState } from 'react';
import Swal from 'sweetalert2';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useConfirmGroup, useResolveGroupCancellation } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import { useAgencies } from '../hooks/useAgencies';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/Modal.jsx';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import GroupForm from '../components/GroupForm';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import { useToast } from '../hooks/use-toast';
import { formatDateOnly } from '../lib/dateOnly.js';
import { Search, Plus, Edit, Trash2, Luggage, ThumbsUp, ThumbsDown, Lock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const formatDate = formatDateOnly;

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const COTIZACION_VARIANT = {
  pendiente: 'default',
  cotizada: 'warning',
  aceptada: 'success',
  rechazada: 'danger',
};

const RESERVAR_VARIANT = {
  confirmada: 'success',
  cancelacion_solicitada: 'warning',
  cancelada: 'danger',
};

const COTIZACION_LABEL = {
  pendiente: 'Pendiente',
  cotizada: 'Cotizada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

const RESERVAR_LABEL = {
  confirmada: 'Confirmado',
  cancelacion_solicitada: 'Cancelación solicitada',
  cancelada: 'Cancelado',
};

const GestionGrupos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { data: agencies = [] } = useAgencies();
  const { data: usersData } = useUsers();
  const users = usersData?.data || [];
  const agencyName = (code) => agencies.find((a) => a.code === code)?.name || code || '—';
  const userName = (id) => {
    const u = users.find((u) => u.id === id);
    return u ? `${u.nombre} ${u.apellido}` : '—';
  };

  const { data: groupsResult, isLoading, isError, isFetching } = useGroups();

  if (!can('GROUPS_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  const groups = Array.isArray(groupsResult) ? groupsResult : Array.isArray(groupsResult?.data) ? groupsResult.data : [];
  const filteredGroups = groups.filter((g) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (g.destino || '').toLowerCase().includes(q) || (g.compania || '').toLowerCase().includes(q) || (g.ficha || '').toLowerCase().includes(q);
  });

  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const confirmGroupMutation = useConfirmGroup();
  const resolveCancellationMutation = useResolveGroupCancellation();

  const handleCreateGroup = async (groupData) => {
    try {
      await createGroupMutation.mutateAsync(groupData);
      toast({ title: 'Éxito', description: 'Grupo creado correctamente' });
      setIsModalOpen(false);
      setEditingGroup(null);
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Error al crear el grupo', variant: 'destructive' });
    }
  };

  const handleUpdateGroup = async (groupData) => {
    try {
      await updateGroupMutation.mutateAsync({ id: editingGroup.id, groupData });
      toast({ title: 'Éxito', description: 'Grupo actualizado correctamente' });
      setIsModalOpen(false);
      setEditingGroup(null);
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Error al actualizar el grupo', variant: 'destructive' });
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const result = await Swal.fire({
      title: '¿Eliminar grupo?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Grupo eliminado correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al eliminar el grupo' });
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleConfirmGroup = async (group) => {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Confirmar grupo?',
      text: 'Se van a revelar al usuario los datos de nominación, emisión y gastos.',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await confirmGroupMutation.mutateAsync(group.id);
      Swal.fire({ icon: 'success', title: 'Confirmado', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo confirmar el grupo' });
    }
  };

  const handleResolveCancellation = async (group, decision) => {
    const result = await Swal.fire({
      icon: 'question',
      title: decision === 'approve' ? '¿Aprobar cancelación?' : '¿Rechazar cancelación?',
      input: 'text',
      inputLabel: 'Notas (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Volver',
    });
    if (!result.isConfirmed) return;
    try {
      await resolveCancellationMutation.mutateAsync({ id: group.id, decision, notas: result.value || '' });
      Swal.fire({ icon: 'success', title: 'Listo', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo resolver la cancelación' });
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grupos" description="Administra las solicitudes y cotizaciones de vuelos a medida" icon={Luggage} />
        <Card>
          <div className="p-10 text-center text-red-600">Error al cargar los grupos</div>
        </Card>
      </div>
    );
  }

  const pendientes = groups.filter((g) => g.estado_cotizacion === 'pendiente').length;
  const confirmados = groups.filter((g) => g.estado_reservar === 'confirmada').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos"
        description="Administra las solicitudes y cotizaciones de vuelos a medida"
        icon={Luggage}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['groups'] })}
              disabled={isFetching}
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => { setEditingGroup(null); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Grupo
            </Button>
          </div>
        }
      />

      <StatsHero
        stats={[
          { icon: Luggage, label: 'Total grupos', value: groups.length, description: 'Solicitudes y cotizaciones registradas.', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
          { icon: RefreshCw, label: 'Pendientes de cotizar', value: pendientes, description: 'Todavía sin cotización cargada.', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
          { icon: CheckCircle2, label: 'Confirmados', value: confirmados, description: 'Grupos ya confirmados.', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
        ]}
      />

      <Modal
        title={editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingGroup(null); }}
        size="3xl"
      >
        <GroupForm
          onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
          onCancel={() => { setIsModalOpen(false); setEditingGroup(null); }}
          defaultValues={editingGroup || {}}
          isEditing={!!editingGroup}
        />
      </Modal>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por destino, compañía o ficha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable columns={8} rows={5} />
      ) : filteredGroups.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <TableComponent>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Compañía</TableHead>
                  <TableHead>Lugares</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Regreso</TableHead>
                  <TableHead>PNR Aerolínea</TableHead>
                  <TableHead>PNR Agencia</TableHead>
                  <TableHead>Neto 01</TableHead>
                  <TableHead>Estado Cotización</TableHead>
                  <TableHead>Estado Reserva</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium text-slate-900">{userName(group.vendedor)}</TableCell>
                    <TableCell>{agencyName(group.agency)}</TableCell>
                    <TableCell>{group.destino || '—'}</TableCell>
                    <TableCell>{group.compania || '—'}</TableCell>
                    <TableCell>{group.cantidad_lugares || '—'}</TableCell>
                    <TableCell>{formatDate(group.salida)}</TableCell>
                    <TableCell>{formatDate(group.regreso)}</TableCell>
                    <TableCell>{group.pnr_airline || '—'}</TableCell>
                    <TableCell>{group.pnr_agency || '—'}</TableCell>
                    <TableCell>{formatMoney(group.neto_01)}</TableCell>
                    <TableCell>
                      <Badge variant={COTIZACION_VARIANT[group.estado_cotizacion] || 'default'}>
                        {COTIZACION_LABEL[group.estado_cotizacion] || group.estado_cotizacion || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {group.estado_reservar ? (
                        <Badge variant={RESERVAR_VARIANT[group.estado_reservar] || 'default'}>
                          {RESERVAR_LABEL[group.estado_reservar] || group.estado_reservar}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleEditGroup(group)} title="Editar / Cotizar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {group.estado_cotizacion === 'aceptada' && !group.estado_reservar && (
                          <Button variant="outline" size="sm" onClick={() => handleConfirmGroup(group)} title="Confirmar grupo" className="text-emerald-600 hover:text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {group.estado_reservar === 'cancelacion_solicitada' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleResolveCancellation(group, 'approve')} title="Aprobar cancelación" className="text-emerald-600 hover:text-emerald-800">
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleResolveCancellation(group, 'decline')} title="Rechazar cancelación" className="text-amber-600 hover:text-amber-800">
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDeleteGroup(group.id)} title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableComponent>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No hay grupos"
          description="No se encontraron grupos en el sistema"
          icon="🧳"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer grupo
            </Button>
          }
        />
      )}
    </div>
  );
};

export default GestionGrupos;
