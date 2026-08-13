import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Sparkles, Plus, Edit, Trash2, CheckCircle2, Search, Lock, PackagePlus, RefreshCw, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOpportunities, useDeleteOpportunity, useApproveOpportunity, useConvertOpportunityToProduct } from '../hooks/useOpportunities';
import { OportunityForm } from '../components/OportunityForm';
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

// Precarga del mini-form de conversión (ProductForm reusado tal cual) con lo
// que ya existe en la oportunidad — el resto (tarifas por tipo, ruta, ficha,
// etc.) lo completa quien convierte. Cupo Total arranca en los lugares
// liberados (lo efectivamente vendible), no en el total de la oportunidad.
const opportunityToProductDefaults = (opp) => ({
  destino: opp.destino || '',
  compania: opp.compania || '',
  agencia: opp.agencia || '',
  temporada: opp.temporada || '',
  fecha_salida: opp.fecha_salida || '',
  fecha_regreso: opp.fecha_llegada || '',
  cupo: opp.total_liberados || opp.total_lugares || 0,
  tarifa_adt: opp.neto_1 || '',
});

export default function GestionOportunidades() {
  const { user, can } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOportunity, setSelectedOportunity] = useState(null);
  const [convertingOpportunity, setConvertingOpportunity] = useState(null);
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
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterDestino}
          onChange={(e) => setFilterDestino(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm"
        >
          <option value="">Todos los destinos</option>
          {destinoOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-800">
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <Card>
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Acciones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Compañía</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Lugares</TableHead>
              <TableHead>Neto 1</TableHead>
              <TableHead>Cargador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-400">Cargando...</TableCell></TableRow>
            ) : filteredOportunidades.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-400">No hay oportunidades cargadas todavía.</TableCell></TableRow>
            ) : (
              filteredOportunidades.map((opp) => (
                <TableRow key={opp.id}>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
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
                  <TableCell>
                    <Badge variant={getBadgeVariant(opp.estado)}>{formatEstadoLabel(opp.estado)}</Badge>
                    {opp.producto_id && (
                      <div className="mt-1 text-[11px] text-slate-400">Producto #{opp.producto_id}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{opp.destino}</TableCell>
                  <TableCell>{opp.compania}</TableCell>
                  <TableCell>{opp.temporada || '—'}</TableCell>
                  <TableCell>{opp.fecha_salida ? new Date(opp.fecha_salida).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{opp.total_lugares}</TableCell>
                  <TableCell>{opp.neto_1 ? `$${opp.neto_1}` : '—'}</TableCell>
                  <TableCell className="text-xs text-slate-500">{opp.usuario_cargador?.name || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      <OportunityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={selectedOportunity}
        onSuccess={() => setSelectedOportunity(null)}
      />

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
