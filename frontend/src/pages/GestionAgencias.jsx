import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit3, Building2, Check, X } from 'lucide-react';
import AgencyService from '../services/agencyService';
import Swal from 'sweetalert2';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/shadcn-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/shadcn-dialog';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';

// Backend expects: code, name, email, address, color
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgency, setEditAgency] = useState(null);
  const [formState, setFormState] = useState(emptyAgency);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const items = await AgencyService.listAgencies();
      setAgencies(items);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron cargar las agencias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

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

  const handleDelete = async (agency) => {
    const result = await Swal.fire({
      title: 'Eliminar agencia',
      text: `¿Eliminar agencia ${agency.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await AgencyService.deleteAgency(agency.id);
      Swal.fire('Eliminado', 'Agencia eliminada correctamente', 'success');
      fetchAgencies();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo eliminar la agencia', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editAgency) {
        await AgencyService.updateAgency(editAgency.id, formState);
        Swal.fire('Actualizado', 'Agencia actualizada correctamente', 'success');
      } else {
        await AgencyService.createAgency(formState);
        Swal.fire('Creado', 'Agencia creada correctamente', 'success');
      }
      setDialogOpen(false);
      fetchAgencies();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo guardar la agencia', 'error');
    }
  };

  // Backend expects: code, name, email, address, color
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Agencias</h1>
          <p className="text-muted-foreground">
            Administra las agencias y sus configuraciones de marca.
          </p>
        </div>
        <Button onClick={openCreate} className="border">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Agencia
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Agencias</CardTitle>
          <CardDescription>
            {agencies.length} {agencies.length === 1 ? 'agencia' : 'agencias'} registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    Cargando agencias...
                  </TableCell>
                </TableRow>
              ) : agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    No se encontraron agencias.
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.code}</TableCell>
                    <TableCell>{agency.name}</TableCell>
                    <TableCell>{agency.email || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(agency)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(agency)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{editAgency ? 'Editar Agencia' : 'Nueva Agencia'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label} {field.required && '*'}
                  </Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      value={formState[field.name] ?? ''}
                      onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 w-full"
                    />
                  ) : field.type === 'color' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        id={field.name}
                        name={field.name}
                        value={formState[field.name] ?? ''}
                        onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                        className="h-10 w-10 border border-input rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={formState[field.name] ?? ''}
                        onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                        placeholder={field.label}
                      />
                    </div>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type || 'text'}
                      name={field.name}
                      value={formState[field.name] ?? ''}
                      onChange={(e) => setFormState({ ...formState, [field.name]: e.target.value })}
                      className="mt-1"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}