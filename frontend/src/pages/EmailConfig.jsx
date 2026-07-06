import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmailConfigService from '../services/emailConfigService';
import Swal from 'sweetalert2';
import {
    Mail, Save, TestTube, Send, RefreshCw, Eye, Code, Settings,
    CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';

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
                title="Configuración de Email"
                description="Configura el servidor SMTP y las plantillas de correo"
                icon={Mail}
                action={
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={loadConfig} disabled={loading} title="Refrescar datos">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={CheckCircle}
                    label="Estado SMTP"
                    value={config?.smtp_host ? 'Configurado' : 'Pendiente'}
                    description={config?.smtp_host ? 'Servidor SMTP configurado' : 'Falta configurar el servidor SMTP'}
                />
                <StatCard
                    icon={Mail}
                    label="Plantillas"
                    value={templates.length}
                    description="Cantidad de plantillas disponibles"
                />
                <StatCard
                    icon={config?.smtp_secure ? CheckCircle : AlertCircle}
                    label="Seguridad"
                    value={config?.smtp_secure ? 'TLS/SSL' : 'No seguro'}
                    description={config?.smtp_secure ? 'Conexión cifrada activada' : 'Conexión sin cifrado'}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200 p-2 gap-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id
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
                    {activeTab === 'smtp' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-slate-900">Configuración SMTP</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Host SMTP</label>
                                    <input
                                        type="text"
                                        value={config?.smtp_host || ''}
                                        onChange={(e) => handleConfigChange('smtp_host', e.target.value)}
                                        placeholder="smtp.ejemplo.com"
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Puerto</label>
                                    <input
                                        type="number"
                                        value={config?.smtp_port || 587}
                                        onChange={(e) => handleConfigChange('smtp_port', parseInt(e.target.value))}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Usuario</label>
                                    <input
                                        type="text"
                                        value={config?.smtp_user || ''}
                                        onChange={(e) => handleConfigChange('smtp_user', e.target.value)}
                                        placeholder="usuario@ejemplo.com"
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Contraseña</label>
                                    <input
                                        type="password"
                                        value={config?.smtp_pass || ''}
                                        onChange={(e) => handleConfigChange('smtp_pass', e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Email remitente</label>
                                    <input
                                        type="email"
                                        value={config?.email_from || ''}
                                        onChange={(e) => handleConfigChange('email_from', e.target.value)}
                                        placeholder="noreply@ejemplo.com"
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="smtp_secure"
                                        checked={config?.smtp_secure || false}
                                        onChange={(e) => handleConfigChange('smtp_secure', e.target.checked)}
                                        className="rounded"
                                    />
                                    <label htmlFor="smtp_secure" className="text-sm text-slate-700">Usar conexión segura (TLS/SSL)</label>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                                <Button onClick={handleTestConnection} disabled={testing} variant="secondary">
                                    {testing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                                    Probar conexión
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-slate-900">Plantillas de email</h3>
                            {templates.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">No hay plantillas configuradas</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map(template => (
                                        <div key={template.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <Mail className="h-5 w-5 text-slate-400" />
                                                <div>
                                                    <div className="font-medium text-slate-900">{template.name}</div>
                                                    <div className="text-xs text-slate-500">{template.code}</div>
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
                    )}

                    {activeTab === 'test' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-slate-900">Enviar email de prueba</h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="destinatario@ejemplo.com"
                                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <Button onClick={handleSendTest} disabled={sendingTest}>
                                    {sendingTest ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    Enviar prueba
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal title={`Vista previa: ${selectedTemplate?.name || ''}`} open={showPreview} onClose={() => setShowPreview(false)}>
                <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden h-96 overflow-y-auto">
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
