import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AtlasConfigService from '../services/atlasConfigService';
import Swal from 'sweetalert2';
import { Plug, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Lock, User, Building2 } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

const INPUT_CLASSES = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
const LABEL_CLASSES = "mb-1 block text-xs font-medium text-slate-600";

const EMPTY_CONFIG = { usuario: '', clave: '', empresa: '', sucursal: '', environment: 'test' };

export default function AtlasConfig() {
    const { can } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [config, setConfig] = useState(EMPTY_CONFIG);
    const [configId, setConfigId] = useState(null);
    const [isDefault, setIsDefault] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await AtlasConfigService.getConfig();
            if (response.config) {
                setConfig({ ...EMPTY_CONFIG, ...response.config });
                setIsDefault(response.isDefault);
                if (!response.isDefault && response.config.id) {
                    setConfigId(response.config.id);
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración de Atlas:', error);
            Swal.fire('Error', 'No se pudo cargar la configuración de Atlas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (isDefault) {
                await AtlasConfigService.createConfig(config);
            } else {
                await AtlasConfigService.updateConfig(configId, config);
            }
            Swal.fire({ icon: 'success', title: 'Guardado', text: 'Configuración de Atlas guardada', timer: 1500, showConfirmButton: false });
            loadConfig();
        } catch (error) {
            console.error('Error al guardar configuración de Atlas:', error);
            Swal.fire('Error', error.message || 'No se pudo guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            setTesting(true);
            const result = await AtlasConfigService.testConnection(config);
            if (result.success) {
                Swal.fire({ icon: 'success', title: 'Conexión exitosa', text: 'Las credenciales de Atlas funcionan correctamente', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Error de conexión', text: result.error || 'No se pudo conectar con Atlas' });
            }
        } catch (error) {
            console.error('Error al probar conexión con Atlas:', error);
            Swal.fire('Error', error.message || 'Error al probar la conexión', 'error');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!can('ATLAS_VIEW')) {
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
                title="Integración con Atlas"
                description="Configurá las credenciales de Netviax Atlas para buscar contactos y autocompletar el formulario de reserva."
                icon={Plug}
                action={
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={loadConfig} disabled={loading} title="Refrescar datos">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving || !can('ATLAS_UPDATE')}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                        </Button>
                    </div>
                }
            />

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASSES}>Usuario</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={config.usuario}
                                onChange={(e) => handleConfigChange('usuario', e.target.value)}
                                placeholder="usuario@agencia.com"
                                className={`${INPUT_CLASSES} pl-10`}
                                disabled={!can('ATLAS_UPDATE')}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={LABEL_CLASSES}>Clave</label>
                        <input
                            type="password"
                            value={config.clave}
                            onChange={(e) => handleConfigChange('clave', e.target.value)}
                            placeholder={isDefault ? '••••••••' : 'Dejar vacío para no cambiarla'}
                            className={INPUT_CLASSES}
                            disabled={!can('ATLAS_UPDATE')}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLASSES}>Empresa</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={config.empresa}
                                onChange={(e) => handleConfigChange('empresa', e.target.value.toUpperCase())}
                                placeholder="Ej: JETUY"
                                className={`${INPUT_CLASSES} pl-10`}
                                disabled={!can('ATLAS_UPDATE')}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={LABEL_CLASSES}>Sucursal</label>
                        <input
                            type="text"
                            value={config.sucursal}
                            onChange={(e) => handleConfigChange('sucursal', e.target.value.toUpperCase())}
                            placeholder="Ej: CC"
                            className={INPUT_CLASSES}
                            disabled={!can('ATLAS_UPDATE')}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASSES}>Ambiente</label>
                        <select
                            value={config.environment}
                            onChange={(e) => handleConfigChange('environment', e.target.value)}
                            className={INPUT_CLASSES}
                            disabled={!can('ATLAS_UPDATE')}
                        >
                            <option value="test">Test / Sandbox (puede tener errores 500 intermitentes)</option>
                            <option value="prod">Producción</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        Desde el 01/07/2026 Netviax filtra el acceso por IP de origen. Si "Probar conexión" falla con timeout
                        o sin respuesta, puede ser que falte pedirle a Netviax que habilite la IP de salida del servidor.
                    </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {isDefault ? 'Sin configurar todavía' : 'Configuración guardada'}
                    </p>
                    <Button onClick={handleTestConnection} disabled={testing} variant="secondary">
                        {testing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                        Probar conexión
                    </Button>
                </div>
            </div>
        </div>
    );
}
