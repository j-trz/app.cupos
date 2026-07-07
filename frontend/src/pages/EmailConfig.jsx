import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmailConfigService from '../services/emailConfigService';
import Swal from 'sweetalert2';
import {
    Mail, Save, TestTube, Send, RefreshCw, Eye, Code, Settings,
    CheckCircle, XCircle, AlertCircle, Server, Lock, User
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Modal from '../components/Modal.jsx';

const INPUT_CLASSES = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
const LABEL_CLASSES = "mb-1 block text-xs font-medium text-slate-600";

export default function EmailConfig() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [config, setConfig] = useState(null);
    const [configId, setConfigId] = useState(null);
    const [isDefault, setIsDefault] = useState(true);
    const [testEmail, setTestEmail] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [activeTab, setActiveTab] = useState('smtp');

    useEffect(() => {
        loadConfig();
        loadTemplates();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await EmailConfigService.getConfig();
            if (response.config) {
                setConfig(response.config);
                setIsDefault(response.isDefault);
                if (!response.isDefault && response.config.id) {
                    setConfigId(response.config.id);
                }
            } else {
                setConfig({
                    smtp_host: '',
                    smtp_port: 587,
                    smtp_user: '',
                    smtp_pass: '',
                    smtp_secure: false,
                    email_from: ''
                });
            }
        } catch (error) {
            console.error('Error al cargar configuración SMTP:', error);
            Swal.fire('Error', 'No se pudo cargar la configuración SMTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const response = await EmailConfigService.getTemplates();
            setTemplates(response.templates || []);
        } catch (error) {
            console.error('Error al cargar plantillas:', error);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (isDefault) {
                await EmailConfigService.createConfig(config);
                Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'Configuración SMTP creada exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await EmailConfigService.updateConfig(configId, config);
                Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Configuración SMTP actualizada',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            loadConfig();
        } catch (error) {
            console.error('Error al guardar configuración SMTP:', error);
            Swal.fire('Error', error.message || 'No se pudo guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            setTesting(true);
            const result = await EmailConfigService.testConnection({
                smtp_host: config.smtp_host,
                smtp_port: config.smtp_port,
                smtp_user: config.smtp_user,
                smtp_pass: config.smtp_pass,
                smtp_secure: config.smtp_secure
            });

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Conexión Exitosa',
                    text: 'La conexión SMTP está funcionando correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Conexión',
                    text: result.error || 'No se pudo conectar al servidor SMTP'
                });
            }
        } catch (error) {
            console.error('Error al probar conexión:', error);
            Swal.fire('Error', error.message || 'Error al probar la conexión', 'error');
        } finally {
            setTesting(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) {
            Swal.fire('Atención', 'Ingresa un email de destino', 'warning');
            return;
        }
        try {
            setSendingTest(true);
            await EmailConfigService.sendTestEmail(testEmail);
            Swal.fire({
                icon: 'success',
                title: 'Email enviado',
                text: 'El email de prueba fue enviado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al enviar email de prueba:', error);
            Swal.fire('Error', error.message || 'No se pudo enviar el email de prueba', 'error');
        } finally {
            setSendingTest(false);
        }
    };

    const handlePreviewTemplate = async (template) => {
        try {
            const response = await EmailConfigService.previewTemplate(template.id);
            setPreviewHtml(response.html || '');
            setSelectedTemplate(template);
            setShowPreview(true);
        } catch (error) {
            console.error('Error al obtener vista previa:', error);
            Swal.fire('Error', 'No se pudo obtener la vista previa', 'error');
        }
    };

    const handleConfigChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'smtp', label: 'SMTP', icon: Settings },
        { id: 'templates', label: 'Plantillas', icon: Mail },
        { id: 'test', label: 'Prueba', icon: TestTube }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configuración de Correo"
                description="Configura el servidor SMTP y las plantillas de correo electrónico"
                icon={Mail}
                action={
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={loadConfig} disabled={loading} title="Refrescar datos">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards - En una sola fila */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config?.smtp_host ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">Estado SMTP</div>
                            <div className="text-xs text-slate-500">{config?.smtp_host ? 'Configurado' : 'Pendiente'}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">Plantillas</div>
                            <div className="text-xs text-slate-500">{templates.length} disponibles</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config?.smtp_secure ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {config?.smtp_secure ? <Lock className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">Seguridad</div>
                            <div className="text-xs text-slate-500">{config?.smtp_secure ? 'TLS/SSL' : 'No seguro'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs - Rediseñado como lista horizontal compacta */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200 p-2 gap-1 bg-slate-50">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* Tab SMTP */}
                    {activeTab === 'smtp' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Configuración del servidor SMTP</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className={LABEL_CLASSES}>Host SMTP</label>
                                        <div className="relative">
                                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={config?.smtp_host || ''}
                                                onChange={(e) => handleConfigChange('smtp_host', e.target.value)}
                                                placeholder="smtp.gmail.com"
                                                className={`${INPUT_CLASSES} pl-10`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASSES}>Puerto</label>
                                        <input
                                            type="number"
                                            value={config?.smtp_port || 587}
                                            onChange={(e) => handleConfigChange('smtp_port', parseInt(e.target.value))}
                                            className={INPUT_CLASSES}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASSES}>Conexión segura</label>
                                        <select
                                            value={config?.smtp_secure ? 'true' : 'false'}
                                            onChange={(e) => handleConfigChange('smtp_secure', e.target.value === 'true')}
                                            className={INPUT_CLASSES}
                                        >
                                            <option value="false">STARTTLS (puerto 587)</option>
                                            <option value="true">SSL/TLS (puerto 465)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASSES}>Usuario</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={config?.smtp_user || ''}
                                                onChange={(e) => handleConfigChange('smtp_user', e.target.value)}
                                                placeholder="usuario@ejemplo.com"
                                                className={`${INPUT_CLASSES} pl-10`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASSES}>Contraseña</label>
                                        <input
                                            type="password"
                                            value={config?.smtp_pass || ''}
                                            onChange={(e) => handleConfigChange('smtp_pass', e.target.value)}
                                            placeholder="••••••••"
                                            className={INPUT_CLASSES}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={LABEL_CLASSES}>Email remitente</label>
                                        <input
                                            type="email"
                                            value={config?.email_from || ''}
                                            onChange={(e) => handleConfigChange('email_from', e.target.value)}
                                            placeholder="noreply@ejemplo.com"
                                            className={INPUT_CLASSES}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-500">
                                    <Lock className="h-4 w-4 inline mr-1" />
                                    La contraseña se almacena de forma segura y encriptada
                                </p>
                                <Button onClick={handleTestConnection} disabled={testing} variant="secondary">
                                    {testing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                                    Probar conexión
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Tab Plantillas */}
                    {activeTab === 'templates' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Plantillas de email disponibles</h3>
                                {templates.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                        <p>No hay plantillas configuradas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {templates.map(template => (
                                            <div key={template.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-slate-100">
                                                        <Mail className="h-5 w-5 text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{template.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{template.code}</div>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => handlePreviewTemplate(template)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab Prueba */}
                    {activeTab === 'test' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Enviar email de prueba</h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    Envía un correo electrónico de prueba para verificar que la configuración SMTP funciona correctamente.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <label className={LABEL_CLASSES}>Email de destino</label>
                                        <input
                                            type="email"
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            placeholder="destinatario@ejemplo.com"
                                            className={INPUT_CLASSES}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button onClick={handleSendTest} disabled={sendingTest} className="w-full sm:w-auto">
                                            {sendingTest ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                            Enviar prueba
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Vista Previa */}
            <Modal title={`Vista previa: ${selectedTemplate?.name || ''}`} open={showPreview} onClose={() => setShowPreview(false)}>
                <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden h-96 overflow-y-auto bg-white">
                        {previewHtml ? (
                            <iframe
                                title="Vista previa"
                                srcDoc={previewHtml}
                                className="w-full h-full border-0"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">No hay contenido para mostrar</div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => setShowPreview(false)}>Cerrar</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
