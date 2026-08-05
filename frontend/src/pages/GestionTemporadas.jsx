import { useState } from 'react';
import { Tag, Plus, Edit3, Trash2, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { useTemporadas, useCreateTemporada, useUpdateTemporada, useDeleteTemporada } from '../hooks/useTemporadas';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const emptyForm = { nombre: '', activa: true };

export default function GestionTemporadas() {
  const { can } = useAuth();
  const { data: temporadas = [], isLoading } = useTemporadas();
  const createMutation = useCreateTemporada();
  const updateMutation = useUpdateTemporada();
  const deleteMutation = useDeleteTemporada();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  if (!can('TEMPORADAS_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (temporada) => {
    setEditing(temporada);
    setForm({ nombre: temporada.nombre, activa: temporada.activa });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'El nombre es requerido.' });
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      Swal.fire({ icon: 'success', title: editing ? 'Actualizada' : 'Creada', timer: 1500, showConfirmButton: false });
      closeDialog();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar la temporada.' });
    }
  };

  const handleDelete = async (temporada) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: `¿Eliminar "${temporada.nombre}"?`,
      text: 'Los productos que ya la tenían cargada conservan el nombre como texto, pero deja de estar disponible para elegir en el desplegable.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteMutation.mutateAsync(temporada.id);
      Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar la temporada.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Temporadas"
        description="Lista global que alimenta el desplegable de Temporada en el formulario de Producto."
        icon={Tag}
        action={
          can('TEMPORADAS_CREATE') && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva Temporada
            </Button>
          )
        }
      />

      <Card>
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400">Cargando...</TableCell></TableRow>
            ) : temporadas.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400">No hay temporadas cargadas todavía.</TableCell></TableRow>
            ) : (
              temporadas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-slate-900">{t.nombre}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.activa ? 'success' : 'default'}>{t.activa ? 'Activa' : 'Inactiva'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)} title="Editar" disabled={!can('TEMPORADAS_UPDATE')}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(t)} title="Eliminar" disabled={!can('TEMPORADAS_DELETE')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      <Modal title={editing ? 'Editar Temporada' : 'Nueva Temporada'} open={dialogOpen} onClose={closeDialog} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Ej: Verano 2026"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => setForm((prev) => ({ ...prev, activa: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-slate-700">Activa (aparece en el desplegable de Producto)</span>
          </label>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
