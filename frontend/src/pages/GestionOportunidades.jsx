import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Sparkles, Plus, Edit3, Trash2, CheckCircle2, Eye, Search, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOpportunities, useDeleteOpportunity, useApproveOpportunity } from '../hooks/useOpportunities';
import { OportunityForm } from '../components/OportunityForm';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import ActionIconButton from '../components/ui/ActionIconButton.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { useToast } from '../hooks/use-toast';

const getBadgeVariant = (estado) => {
  if (estado === 'aprobada') return 'success';
  if (estado === 'rechazada') return 'danger';
  return 'warning';
};

export default function GestionOportunidades() {
  const { user, can } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOportunity, setSelectedOportunity] = useState(null);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTemporada, setFilterTemporada] = useState('');
  const [filterDestino, setFilterDestino] = useState('');

  const { data: oportunidades = [], isLoading } = useOpportunities({
    search: searchTerm,
    estado: filterEstado,
    temporada: filterTemporada,
    destino: filterDestino,
  });

  const deleteMutation = useDeleteOpportunity();
  const approveMutation = useApproveOpportunity();

  const isAdmin = can('USERS_VIEW');
  const canEdit = can('OPPORTUNITIES_UPDATE');
  const canDelete = can('OPPORTUNITIES_DELETE');
  const canCreate = can('OPPORTUNITIES_CREATE');
  const canApprove = can('OPPORTUNITIES_APPROVE');

  const filteredOportunidades = useMemo(() => {
    if (!oportunidades) return [];
    // No-admin solo ve sus propias oportunidades cargadas.
    return oportunidades.filter((opp) => isAdmin || opp.usuario_cargador === user?.id);
  }, [oportunidades, isAdmin, user]);

  const canEditRow = (opp) => isAdmin || (opp.usuario_cargador === user?.id && opp.estado === 'pendiente');
  const canDeleteRow = (opp) => isAdmin || (opp.usuario_cargador === user?.id && opp.estado === 'pendiente');

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
          canCreate && (
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva Oportunidad
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Buscar por destino/compañía..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <Input placeholder="Filtrar temporada..." value={filterTemporada} onChange={(e) => setFilterTemporada(e.target.value)} className="w-44" />
        <Input placeholder="Filtrar destino..." value={filterDestino} onChange={(e) => setFilterDestino(e.target.value)} className="w-44" />
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
                        <ActionIconButton icon={Edit3} onClick={() => handleEdit(opp)} title="Editar" />
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
                      {isAdmin && (
                        <ActionIconButton icon={Eye} onClick={() => handleEdit(opp)} title="Ver detalles" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(opp.estado)}>{opp.estado}</Badge>
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
    </div>
  );
}
