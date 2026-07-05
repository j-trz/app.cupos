import { useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import ApiClient from '../services/apiClient';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatedKey, setUpdatedKey] = useState(null);
  const [value, setValue] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/settings');
      setSettings(result.settings || []);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron cargar los ajustes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (key, currentValue) => {
    setUpdatedKey(key);
    setValue(currentValue);
  };

  const handleSave = async () => {
    try {
      await ApiClient.put(`/settings/${updatedKey}`, { value });
      Swal.fire('Guardado', 'Configuración actualizada correctamente', 'success');
      setUpdatedKey(null);
      fetchSettings();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo actualizar la configuración', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes"
        description="Configura opciones generales y white-label para tu instancia del sistema."
        icon={SettingsIcon}
      />

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Configuración del sistema</h2>
            <p className="text-sm text-slate-500">Ajusta parámetros de white-label y comportamientos generales.</p>
          </div>
        </div>

        <Table className="p-6">
          <table className="min-w-full border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={3}>
                    Cargando ajustes...
                  </TableCell>
                </TableRow>
              ) : settings.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={3}>
                    No hay ajustes configurados.
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((setting) => (
                  <TableRow key={setting.key}>
                    <TableCell>{setting.key}</TableCell>
                    <TableCell>{setting.value}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(setting.key, setting.value)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </Table>

        {updatedKey && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Editar {updatedKey}</h3>
            <textarea
              rows={4}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-4 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setUpdatedKey(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
