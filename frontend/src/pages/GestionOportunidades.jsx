import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOpportunities, useDeleteOpportunity, useApproveOpportunity } from '@/hooks/useOpportunities';
import { OportunityForm } from '@/components/OportunityForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, CheckCircle, Eye, Search } from 'lucide-react';

export const GestionOportunidades = () => {
  const { user, can } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOportunity, setSelectedOportunity] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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

  const handleEdit = (oportunidad) => {
    setSelectedOportunity(oportunidad);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedOportunity(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast({ title: 'Oportunidad eliminada', variant: 'success' });
      setDeleteConfirm(null);
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

  const isAdmin = can('USERS_VIEW');
  const canEdit = can('OPPORTUNITIES_UPDATE');
  const canDelete = can('OPPORTUNITIES_DELETE');
  const canCreate = can('OPPORTUNITIES_CREATE');
  const canApprove = can('OPPORTUNITIES_APPROVE');

  const filteredOportunidades = useMemo(() => {
    if (!oportunidades) return [];
    return oportunidades.filter((opp) => {
      if (!isAdmin) {
        // Non-admin can only see their own oportunities
        return opp.usuario_cargador === user?.id;
      }
      return true;
    });
  }, [oportunidades, isAdmin, user]);

  const canEditRow = (opp) => {
    if (isAdmin) return true;
    return opp.usuario_cargador === user?.id && opp.estado === 'pendiente';
  };

  const canDeleteRow = (opp) => {
    if (isAdmin) return true;
    return opp.usuario_cargador === user?.id && opp.estado === 'pendiente';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Oportunidades</h1>
        {canCreate && (
          <Button onClick={handleCreateNew}>+ Nueva Oportunidad</Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <Input
            placeholder="Buscar por destino/compañía..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <Input
          placeholder="Filtrar temporada..."
          value={filterTemporada}
          onChange={(e) => setFilterTemporada(e.target.value)}
        />
        <Input
          placeholder="Filtrar destino..."
          value={filterDestino}
          onChange={(e) => setFilterDestino(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Acciones</TableHead>
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
              <TableRow>
                <TableCell colSpan="9" className="text-center py-4">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredOportunidades.length === 0 ? (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-4">
                  No hay oportunidades
                </TableCell>
              </TableRow>
            ) : (
              filteredOportunidades.map((opp) => (
                <TableRow key={opp.id} className="hover:bg-gray-50">
                  <TableCell className="flex gap-2">
                    {canEditRow(opp) && canEdit && (
                      <button
                        onClick={() => handleEdit(opp)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteRow(opp) && canDelete && (
                      <button
                        onClick={() => setDeleteConfirm(opp)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && opp.estado === 'pendiente' && canApprove && (
                      <button
                        onClick={() => handleApprove(opp.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Aprobar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleEdit(opp)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      opp.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                      opp.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {opp.estado}
                    </span>
                  </TableCell>
                  <TableCell>{opp.destino}</TableCell>
                  <TableCell>{opp.compania}</TableCell>
                  <TableCell>{opp.temporada || '-'}</TableCell>
                  <TableCell>{new Date(opp.fecha_salida).toLocaleDateString()}</TableCell>
                  <TableCell>{opp.total_lugares}</TableCell>
                  <TableCell>${opp.neto_1 || '-'}</TableCell>
                  <TableCell className="text-xs">{opp.usuario_cargador?.name || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Formulario Modal */}
      <OportunityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={selectedOportunity}
        onSuccess={() => {
          setSelectedOportunity(null);
        }}
      />

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar oportunidad?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará la oportunidad de {deleteConfirm?.destino} ({deleteConfirm?.compania}).
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GestionOportunidades;
