import { useEffect, useMemo, useState } from 'react';
import { Building2, BarChart3, CheckCircle, Plus, Edit3, Trash2, RefreshCw, X } from 'lucide-react';
import AgencyService from '../services/agencyService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const emptyAgency = {
  code: '',
  name: '',
  email: '',
  address: '',
  color: '#3b82f6',
};

export default function GestionAgencias() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgency, setEditAgency] = useState(null);
  const [formState, setFormState] = useState(emptyAgency);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const items = await AgencyService.listAgencies();
      setAgencies(items);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudieron cargar las agencias' });
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchAgencies();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Agencias actualizadas correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAgencies = useMemo(() => {
    if (!searchTerm) return agencies;
    return agencies.filter((a) =>
      a.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agencies, searchTerm]);

  const openCreate = () => {
    setEditAgency(null);
    setFormState(emptyAgency);
    setDialogOpen(true);
  };

  const openEdit = (agency) => {
    setEditAgency(agency);
    setFormState({ ...agency });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditAgency(null);
    setFormState(emptyAgency);
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (agency) => {
    const result = await Swal.fire({
      title: '¿Eliminar agencia?',
      text: `¿Eliminar agencia ${agency.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });
    if (!result.isConfirmed) return;
    try {
      await AgencyService.deleteAgency(agency.id);
      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Agencia eliminada correctamente', timer: 1500, showConfirmButton: false });
      fetchAgencies();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar la agencia' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editAgency) {
        await AgencyService.updateAgency(editAgency.id, formState);
        Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Agencia actualizada correctamente', timer: 1500, showConfirmButton: false });
      } else {
        await AgencyService.createAgency(formState);
        Swal.fire({ icon: 'success', title: 'Creado', text: 'Agencia creada correctamente', timer: 1500, showConfirmButton: false });
      }
      closeDialog();
      fetchAgencies();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar la agencia' });
    }
  };

  const fields = useMemo(
    () => [
      { name: 'code', label: 'Código', required: true },
      { name: 'name', label: 'Nombre', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Dirección', type: 'textarea' },
      { name: 'color', label: 'Color (hex e.g. #3b82f6)', type: 'color' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Agencias"
        description="Administra las agencias y sus configuraciones de marca."
        icon={Building2}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              title="Refrescar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={openCreate} title="Nueva agencia">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Agencia
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BarChart3}
          label="Total agencias"
          value={filteredAgencies.length}
          description="Cantidad total de agencias registradas."
        />
        <StatCard
          icon={CheckCircle}
          label="Con email"
          value={filteredAgencies.filter((a) => a.email).length}
          description="Agencias con email configurado."
        />
        <StatCard
          icon={Building2}
          label="Sin email"
          value={filteredAgencies.filter((a) => !a.email).length}
          description="Agencias sin email configurado."
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lista de Agencias</h2>
              <p className="text-sm text-slate-500">Gestioná las agencias y sus configuraciones.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por código, nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Código</TableHead>
              <TableHead className="text-center">Nombre</TableHead>
              <TableHead className="text-center">Email</TableHead>
              <TableHead className="text-center">Color</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={5}>
                  Cargando agencias...
                </TableCell>
              </TableRow>
            ) : filteredAgencies.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={5}>
                  {searchTerm ? 'No se encontraron agencias con la búsqueda.' : 'No hay agencias registradas.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAgencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell className="text-center font-medium">{agency.code}</TableCell>
                  <TableCell className="text-center">{agency.name}</TableCell>
                  <TableCell className="text-center">{agency.email || '—'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full border border-slate-300"
                        style={{ backgroundColor: agency.color || '#3b82f6' }}
                      />
                      <span className="text-xs text-slate-500">{agency.color || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(agency)} title="Editar agencia">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(agency)} title="Eliminar agencia" className="text-red-600 hover:text-red-700">
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

      {/* Modal de Crear/Editar Agencia */}
      <Modal title={editAgency ? 'Editar Agencia' : 'Nueva Agencia'} open={dialogOpen} onClose={closeDialog}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formState[field.name] ?? ''}
                    onChange={(e) => handleFormChange(field.name, e.target.value)}
                    className="w-full min-h-[80px] rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder={field.label}
                  />
                ) : field.type === 'color' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formState[field.name] ?? ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      className="h-10 w-10 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formState[field.name] ?? ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder={field.label}
                    />
                  </div>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={formState[field.name] ?? ''}
                    onChange={(e) => handleFormChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={closeDialog}>
              <X className="h-4 w-4 mr-1" />Cancelar
            </Button>
            <Button type="submit">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
