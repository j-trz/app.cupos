import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Palette, Globe, Mail, Save, X } from 'lucide-react';
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
  const [filteredSettings, setFilteredSettings] = useState([]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const result = await ApiClient.get('/settings');
      setSettings(result.settings || []);
      setFilteredSettings(result.settings || []);
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
    setValue(JSON.stringify(currentValue));
  };

  const handleSave = async () => {
    try {
      // Try to parse the value as JSON, if it fails, use as string
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
      
      await ApiClient.put(`/settings/${updatedKey}`, { value: parsedValue });
      Swal.fire('Guardado', 'Configuración actualizada correctamente', 'success');
      setUpdatedKey(null);
      fetchSettings();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo actualizar la configuración', 'error');
    }
  };

  const handleCancel = () => {
    setUpdatedKey(null);
    setValue('');
  };

  // Filter settings into categories for better organization
  const generalSettings = filteredSettings.filter(setting => 
    !['brand_color', 'text_color', 'logo_url', 'company_name'].includes(setting.key)
  );
  
  const brandingSettings = filteredSettings.filter(setting => 
    ['brand_color', 'text_color', 'logo_url', 'company_name'].includes(setting.key)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes"
        description="Configura opciones generales y white-label para tu instancia del sistema."
        icon={SettingsIcon}
      />

      {/* General Settings */}
      {generalSettings.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Configuración general</h2>
              <p className="text-sm text-slate-500">Ajusta parámetros generales del sistema.</p>
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
                ) : generalSettings.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center py-10" colSpan={3}>
                      No hay ajustes generales configurados.
                    </TableCell>
                  </TableRow>
                ) : (
                  generalSettings.map((setting) => (
                    <TableRow key={setting.key}>
                      <TableCell className="font-mono text-sm">{setting.key}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {typeof setting.value === 'object' 
                          ? JSON.stringify(setting.value) 
                          : String(setting.value)}
                      </TableCell>
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
        </Card>
      )}

      {/* Branding Settings */}
      {brandingSettings.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configuración de marca
              </h2>
              <p className="text-sm text-slate-500">Personaliza la apariencia white-label de tu instancia.</p>
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
                {brandingSettings.map((setting) => (
                  <TableRow key={setting.key}>
                    <TableCell className="font-mono text-sm">{setting.key}</TableCell>
                    <TableCell>
                      {setting.key === 'brand_color' && setting.value ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border" 
                            style={{ backgroundColor: setting.value }}
                          />
                          {setting.value}
                        </div>
                      ) : setting.key === 'logo_url' && setting.value ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={setting.value} 
                            alt="Logo" 
                            className="h-8 w-8 object-contain" 
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <span className="truncate max-w-xs">{setting.value}</span>
                        </div>
                      ) : (
                        typeof setting.value === 'object' 
                          ? JSON.stringify(setting.value) 
                          : String(setting.value)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(setting.key, setting.value)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </Table>
        </Card>
      )}

      {/* Edit Setting Modal */}
      {updatedKey && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Editar {updatedKey}</h3>
            <button 
              onClick={handleCancel}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <textarea
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Ingrese el valor para esta configuración..."
          />
          
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Create New Setting */}
      <Card>
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Agregar nueva configuración</h2>
          <p className="text-sm text-slate-500">Crea una nueva clave de configuración para el sistema.</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Clave</label>
              <input
                type="text"
                placeholder="clave_de_configuracion"
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Valor</label>
              <input
                type="text"
                placeholder="Valor de la configuración"
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary">
              <Save className="h-4 w-4 mr-2" />
              Crear Configuración
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}