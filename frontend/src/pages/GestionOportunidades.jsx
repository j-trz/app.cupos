import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Sparkles, Plus, Edit, Trash2, CheckCircle2, Search, Lock, PackagePlus, RefreshCw, RotateCcw, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOpportunities, useDeleteOpportunity, useApproveOpportunity, useConvertOpportunityToProduct, useBulkDeleteOpportunities, useBulkApproveOpportunities } from '../hooks/useOpportunities';
import { OportunityForm } from '../components/OportunityForm';
import BulkSelectionBar from '../components/ui/BulkSelectionBar.jsx';
import ProductForm from '../components/ProductForm';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import ActionIconButton from '../components/ui/ActionIconButton.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/use-toast';

const getBadgeVariant = (estado) => {
  if (estado === 'aprobada') return 'success';
  if (estado === 'rechazada') return 'danger';
  if (estado === 'producto') return 'product';
  return 'warning';
};

const formatEstadoLabel = (estado) => {
  if (!estado) return '—';
  return estado.charAt(0).toUpperCase() + estado.slice(1);
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-AR');
};

const profileName = (profile) => {
  if (!profile) return 'N/A';
  const name = [profile.nombre, profile.apellido].filter(Boolean).join(' ');
  return name || profile.email || 'N/A';
};

// Precarga del mini-form de conversión (ProductForm reusado tal cual) con lo
// que ya existe en la oportunidad — el resto (tarifas por tipo, ruta, ficha,
// etc.) lo completa quien convierte. Cupo Total arranca en los lugares
// liberados (lo efectivamente vendible), no en el total de la oportunidad.
const opportunityToProductDefaults = (opp) => ({
  destino: opp.destino || '',
  compania: opp.compania || '',
  agencia: opp.agencia || '',
  temporada: opp.temporada || '',
  servicio: opp.servicio || '',
  fecha_salida: opp.fecha_salida || '',
  fecha_regreso: opp.fecha_llegada || '',
  cupo: opp.total_liberados || opp.total_lugares || 0,
  tarifa_adt: opp.neto_1 || '',
  carryon: opp.carryon || false,
  handbag: opp.handbag || false,
  checkedbag: opp.checkedbag || false,
  carryon_kg: opp.carryon_kg || '',
  handbag_kg: opp.handbag_kg || '',
  checkedbag_kg: opp.checkedbag_kg || '',
});

export default function GestionOportunidades() {
  const { user, can } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOportunity, setSelectedOportunity] = useState(null);
  const [convertingOpportunity, setConvertingOpportunity] = useState(null);
  const [historyOpportunity, setHistoryOpportunity] = useState(null);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTemporada, setFilterTemporada] = useState('');
  const [filterDestino, setFilterDestino] = useState('');

  const { data: oportunidades = [], isLoading, isFetching, refetch } = useOpportunities({
    search: searchTerm,
    estado: filterEstado,
    temporada: filterTemporada,
    destino: filterDestino,
  });

  const deleteMutation = useDeleteOpportunity();
  const approveMutation = useApproveOpportunity();
  const convertMutation = useConvertOpportunityToProduct();
  const bulkDeleteMutation = useBulkDeleteOpportunities();
  const bulkApproveMutation = useBulkApproveOpportunities();

  // Multi-selección
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const isAdmin = can('USERS_VIEW');
  const canEdit = can('OPPORTUNITIES_UPDATE');
  const canDelete = can('OPPORTUNITIES_DELETE');
  const canCreate = can('OPPORTUNITIES_CREATE');
  const canApprove = can('OPPORTUNITIES_APPROVE');
  const canConvert = can('OPPORTUNITIES_CONVERT');

  const destinoOptions = useMemo(() => {
    if (!Array.isArray(oportunidades)) return [];
    return Array.from(new Set(oportunidades.map((o) => o.destino).filter(Boolean))).sort();
  }, [oportunidades]);

  const temporadaOptions = useMemo(() => {
    if (!Array.isArray(oportunidades)) return [];
    return Array.from(new Set(oportunidades.map((o) => o.temporada).filter(Boolean))).sort();
  }, [oportunidades]);

  const hasActiveFilters = !!(searchTerm || filterEstado || filterTemporada || filterDestino);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEstado('');
    setFilterTemporada('');
    setFilterDestino('');
  };

  const filteredOportunidades = useMemo(() => {
    if (!oportunidades) return [];
    // No-admin solo ve sus propias oportunidades cargadas.
    return oportunidades.filter((opp) => isAdmin || opp.usuario_cargador === user?.id);
  }, [oportunidades, isAdmin, user]);

  // Estado "producto" es terminal (ya se convirtió, ver ConvertOpportunityToProduct
  // en el backend) — ni el admin puede editar/eliminar de ahí en más.
  const canEditRow = (opp) => opp.estado !== 'producto' && (isAdmin || (opp.usuario_cargador === user?.id && opp.estado === 'pendiente'));
  const canDeleteRow = (opp) => opp.estado !== 'producto' && (isAdmin || (opp.usuario_cargador === user?.id && opp.estado === 'pendiente'));
  const canConvertRow = (opp) => opp.estado === 'aprobada' && !opp.producto_id && (isAdmin || (opp.usuario_cargador === user?.id && opp.agencia === user?.agencia));

  const handleEdit = (opp) => {
    setSelectedOportunity(opp);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedOportunity(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (opp) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar oportunidad?',
      text: `Se eliminará la oportunidad de ${opp.destino} (${opp.compania}). Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteMutation.mutateAsync(opp.id);
      toast({ title: 'Oportunidad eliminada', variant: 'success' });
    } catch (err) {
      toast({ title: 'Error al eliminar', description: err.message, variant: 'destructive' });
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveMutation.mutateAsync(id);
      toast({ title: 'Oportunidad aprobada', variant: 'success' });
    } catch (err) {
      toast({ title: 'Error al aprobar', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: `¿Eliminar ${selectedIds.length} oportunidades?`,
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      toast({ title: 'Éxito', description: `${selectedIds.length} oportunidades eliminadas.`, variant: 'success' });
      setSelectedIds([]);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error al eliminar masivamente.', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkApprove = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${selectedIds.length} oportunidades?`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setIsBulkApproving(true);
    try {
      await bulkApproveMutation.mutateAsync(selectedIds);
      toast({ title: 'Éxito', description: `${selectedIds.length} oportunidades aprobadas.`, variant: 'success' });
      setSelectedIds([]);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Error al aprobar masivamente.', variant: 'destructive' });
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleOpenConvert = (opp) => setConvertingOpportunity(opp);

  const handleSubmitConvert = async (productData) => {
    try {
      await convertMutation.mutateAsync({ id: convertingOpportunity.id, data: productData });
      toast({ title: 'Oportunidad convertida', description: 'El producto quedó pendiente de aprobación de un admin.', variant: 'success' });
      setConvertingOpportunity(null);
    } catch (err) {
      toast({ title: 'Error al convertir', description: err.message, variant: 'destructive' });
    }
  };

  // Guard después de todos los hooks (ver regla 5 de Gotchas y Reglas de Oro).
  if (!can('OPPORTUNITIES_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oportunidades"
        description="Vuelos con lugares liberados o excedentes para ofrecer como cupo nuevo."
        icon={Sparkles}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Actualizar lista"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {canCreate && (
              <Button size="sm" onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nueva Oportunidad
              </Button>
            )}
          </div>
        }
      />

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Buscar por destino, compañía..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
          <option value="producto">Convertida a Producto</option>
        </select>

        <select
          value={filterTemporada}
          onChange={(e) => setFilterTemporada(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm"
        >
          <option value="">Todas las temporadas</option>
          {temporadaOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filterDestino}
          onChange={(e) => setFilterDestino(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm"
        >
          <option value="">Todos los destinos</option>
          {destinoOptions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-800">
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonTable columns={8} rows={5} />
      ) : filteredOportunidades.length === 0 ? (
        <EmptyState icon="✨" title="No hay oportunidades" description="No hay oportunidades cargadas todavía." />
      ) : (
      <Card className="overflow-hidden">
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center sticky left-0 z-20 bg-slate-50 border-r border-b border-slate-200">
                <input
                  type="checkbox"
                  checked={filteredOportunidades.length > 0 && selectedIds.length === filteredOportunidades.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(filteredOportunidades.map(o => o.id));
                    else setSelectedIds([]);
                  }}
                  className="rounded border-gray-300 w-4 h-4"
                />
              </TableHead>
              <TableHead className="w-32 sticky left-10 z-20 bg-slate-50 border-r border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-center">Acciones</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Estado Aerolínea</TableHead>
              <TableHead className="text-center">Servicio</TableHead>
              <TableHead className="text-center">Destino</TableHead>
              <TableHead className="text-center">Compañía</TableHead>
              <TableHead className="text-center">Temporada</TableHead>
              <TableHead className="text-center">Validez</TableHead>
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Llegada</TableHead>
              <TableHead className="text-center">Equipaje</TableHead>
              <TableHead className="text-center">Lugares</TableHead>
              <TableHead className="text-center">Liberados</TableHead>
              <TableHead className="text-right">Neto 1</TableHead>
              <TableHead className="text-right">Neto 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredOportunidades.map((opp) => (
                <TableRow key={opp.id} className={`group ${selectedIds.includes(opp.id) ? 'bg-blue-50/50' : ''}`}>
                  <TableCell className="w-10 text-center sticky left-0 z-10 bg-white border-r border-slate-200 group-hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(opp.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(prev => [...prev, opp.id]);
                        else setSelectedIds(prev => prev.filter(id => id !== opp.id));
                      }}
                      className="rounded border-gray-300 w-4 h-4"
                    />
                  </TableCell>
                  <TableCell className="sticky left-10 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                    <div className="flex items-center justify-center gap-1">
                      <ActionIconButton
                        icon={History}
                        onClick={() => setHistoryOpportunity(opp)}
                        title="Historial de carga y aprobación"
                        className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      />
                      {canEditRow(opp) && canEdit && (
                        <ActionIconButton icon={Edit} onClick={() => handleEdit(opp)} title="Editar" />
                      )}
                      {canDeleteRow(opp) && canDelete && (
                        <ActionIconButton icon={Trash2} variant="danger" onClick={() => handleDelete(opp)} title="Eliminar" />
                      )}
                      {isAdmin && opp.estado === 'pendiente' && canApprove && (
                        <ActionIconButton
                          icon={CheckCircle2}
                          onClick={() => handleApprove(opp.id)}
                          title="Aprobar"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        />
                      )}
                      {canConvertRow(opp) && canConvert && (
                        <ActionIconButton
                          icon={PackagePlus}
                          onClick={() => handleOpenConvert(opp)}
                          title="Convertir a producto"
                          className="text-sky-600 hover:bg-sky-50 hover:text-sky-700"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getBadgeVariant(opp.estado)}>{formatEstadoLabel(opp.estado)}</Badge>
                    {opp.producto_id && (
                      <div className="mt-1 text-[11px] text-slate-400">Producto #{opp.producto_id}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {opp.estado_interno ? (
                      <div>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {opp.estado_interno}
                        </span>
                        {opp.motivo_rechazo && (
                          <div className="mt-0.5 text-[11px] text-rose-500 font-normal">{opp.motivo_rechazo}</div>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {opp.servicio ? (
                      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        {opp.servicio}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-900">{opp.destino}</TableCell>
                  <TableCell className="text-center">{opp.compania}</TableCell>
                  <TableCell className="text-center">{opp.temporada || '—'}</TableCell>
                  <TableCell className="text-center">{formatDate(opp.validez)}</TableCell>
                  <TableCell className="text-center">{formatDate(opp.fecha_salida)}</TableCell>
                  <TableCell className="text-center">{formatDate(opp.fecha_llegada)}</TableCell>
                  <TableCell className="text-center text-xs">
                    {[
                      opp.handbag && `Mochila (${opp.handbag_kg || 0}kg)`,
                      opp.carryon && `Cabina (${opp.carryon_kg || 0}kg)`,
                      opp.checkedbag && `Bodega (${opp.checkedbag_kg || 0}kg)`,
                    ].filter(Boolean).join(' • ') || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="info">{opp.total_lugares ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {opp.total_liberados ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{opp.neto_1 ? `$${opp.neto_1}` : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{opp.neto_2 ? `$${opp.neto_2}` : '—'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </TableComponent>
      </Card>
      )}

      <BulkSelectionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        entityLabel="oportunidad"
        actions={[
          { label: 'Aprobar', icon: CheckCircle2, variant: 'success', onClick: handleBulkApprove, loading: isBulkApproving },
          { label: 'Eliminar', icon: Trash2, variant: 'danger', onClick: handleBulkDelete, loading: isBulkDeleting }
        ]}
      />

      <OportunityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={selectedOportunity}
        onSuccess={() => setSelectedOportunity(null)}
      />

      {/* Modal de Historial */}
      <Modal
        title="Historial de la Oportunidad"
        open={!!historyOpportunity}
        onClose={() => setHistoryOpportunity(null)}
        size="lg"
      >
        {historyOpportunity && (
          <div className="space-y-4 text-sm">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-500 w-40">Cargado por</td>
                    <td className="px-4 py-3 text-slate-800">{profileName(historyOpportunity.cargador_user)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-500">Fecha de carga</td>
                    <td className="px-4 py-3 text-slate-800">{formatDateTime(historyOpportunity.fecha_cargado)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-500">Estado actual</td>
                    <td className="px-4 py-3">
                      <Badge variant={getBadgeVariant(historyOpportunity.estado)}>{formatEstadoLabel(historyOpportunity.estado)}</Badge>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-500">Aprobado por</td>
                    <td className="px-4 py-3 text-slate-800">
                      {historyOpportunity.autorizador_user
                        ? profileName(historyOpportunity.autorizador_user)
                        : <span className="text-slate-400 italic">Sin aprobación aún</span>}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-500">Fecha aprobación</td>
                    <td className="px-4 py-3 text-slate-800">
                      {historyOpportunity.fecha_aprobado
                        ? formatDateTime(historyOpportunity.fecha_aprobado)
                        : <span className="text-slate-400 italic">—</span>}
                    </td>
                  </tr>
                  {historyOpportunity.producto_id && (
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-500">Producto generado</td>
                      <td className="px-4 py-3 text-slate-800">#{historyOpportunity.producto_id}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setHistoryOpportunity(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Convertir Oportunidad a Producto"
        open={!!convertingOpportunity}
        onClose={() => setConvertingOpportunity(null)}
        size="4xl"
      >
        {convertingOpportunity && (
          <ProductForm
            onSubmit={handleSubmitConvert}
            onCancel={() => setConvertingOpportunity(null)}
            defaultValues={opportunityToProductDefaults(convertingOpportunity)}
            isEditing={false}
          />
        )}
      </Modal>
    </div>
  );
}
