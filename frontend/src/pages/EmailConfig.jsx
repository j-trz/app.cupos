import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmailConfigService from '../services/emailConfigService';
import Swal from 'sweetalert2';
import {
    Mail, Save, TestTube, Send, RefreshCw, Eye, Code, Settings,
    CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';
import { Switch } from '../components/ui/shadcn-switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/shadcn-tabs';

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
                Swal.fire('Creado', 'Configuración SMTP creada exitosamente', 'success');
            } else {
                await EmailConfigService.updateConfig(configId, config);
                Swal.fire('Actualizado', 'Configuración SMTP actualizada', 'success');
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
                    confirmButtonColor: '#3b82f6'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Conexión',
                    text: result.error || 'No se pudo conectar al servidor SMTP',
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error) {
            console.error('Error al probar conexión:', error);
            Swal.fire('Error', error.message || 'Error al probar la conexión', 'error');
        } finally {
            setTesting(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmail) {
            Swal.fire('Advertencia', 'Ingresa un email destinatario', 'warning');
            return;
        }

        try {
            setSendingTest(true);
            const result = await EmailConfigService.sendTestEmail(testEmail);

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Email Enviado',
                    text: `Email de prueba enviado a ${testEmail}`,
                    confirmButtonColor: '#3b82f6'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al Enviar',
                    text: result.error || 'No se pudo enviar el email',
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error) {
            console.error('Error al enviar email de prueba:', error);
            Swal.fire('Error', error.message || 'Error al enviar el email', 'error');
        } finally {
            setSendingTest(false);
        }
    };

    const handleTemplateChange = (field, value) => {
        setSelectedTemplate(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveTemplate = async () => {
        if (!selectedTemplate?.id) return;

        try {
            await EmailConfigService.updateTemplate(selectedTemplate.id, {
                subject: selectedTemplate.subject,
                body_html: selectedTemplate.body_html,
                is_active: selectedTemplate.is_active
            });
            Swal.fire('Actualizado', 'Plantilla actualizada exitosamente', 'success');
            loadTemplates();
        } catch (error) {
            console.error('Error al actualizar plantilla:', error);
            Swal.fire('Error', error.message || 'No se pudo actualizar la plantilla', 'error');
        }
    };

    const updateField = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Mail className="h-8 w-8" />
                    Configuración de Email
                </h1>
                <p className="text-muted-foreground mt-2">
                    Configura el servidor SMTP y personaliza las plantillas de email
                </p>
            </div>

            <Tabs defaultValue="smtp" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="smtp" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Servidor SMTP
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Plantillas de Email
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="smtp" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración del Servidor SMTP</CardTitle>
                            <CardDescription>
                                Configura los parámetros de tu servidor de correo electrónico
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="smtp_host">Servidor SMTP</Label>
                                    <Input
                                        id="smtp_host"
                                        placeholder="smtp.gmail.com"
                                        value={config?.smtp_host || ''}
                                        onChange={(e) => updateField('smtp_host', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="smtp_port">Puerto</Label>
                                    <Input
                                        id="smtp_port"
                                        type="number"
                                        placeholder="587"
                                        value={config?.smtp_port || 587}
                                        onChange={(e) => updateField('smtp_port', parseInt(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="smtp_user">Usuario</Label>
                                    <Input
                                        id="smtp_user"
                                        placeholder="tu@email.com"
                                        value={config?.smtp_user || ''}
                                        onChange={(e) => updateField('smtp_user', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="smtp_pass">Contraseña</Label>
                                    <Input
                                        id="smtp_pass"
                                        type="password"
                                        placeholder="••••••••"
                                        value={config?.smtp_pass || ''}
                                        onChange={(e) => updateField('smtp_pass', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="email_from">Email Remitente</Label>
                                    <Input
                                        id="email_from"
                                        placeholder="noreply@tuempresa.com"
                                        value={config?.email_from || ''}
                                        onChange={(e) => updateField('email_from', e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center space-x-2 pt-6">
                                    <Switch
                                        id="smtp_secure"
                                        checked={config?.smtp_secure || false}
                                        onCheckedChange={(checked) => updateField('smtp_secure', checked)}
                                    />
                                    <Label htmlFor="smtp_secure">Usar SSL/TLS</Label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Guardar Configuración
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleTestConnection}
                                    disabled={testing || !config?.smtp_host || !config?.smtp_user}
                                >
                                    {testing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Probando...
                                        </>
                                    ) : (
                                        <>
                                            <TestTube className="h-4 w-4 mr-2" />
                                            Probar Conexión
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="border-t pt-6 mt-6">
                                <h3 className="text-lg font-semibold mb-4">Enviar Email de Prueba</h3>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="email@ejemplo.com"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSendTestEmail}
                                        disabled={sendingTest || !testEmail || !configId}
                                    >
                                        {sendingTest ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Enviar
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {!configId && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        <AlertCircle className="h-4 w-4 inline mr-1" />
                                        Guarda la configuración primero para poder enviar emails de prueba
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="templates" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>Plantillas</CardTitle>
                                <CardDescription>
                                    Selecciona una plantilla para editar
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {templates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => setSelectedTemplate(template)}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedTemplate?.id === template.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:bg-muted'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">{template.event_code}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {template.subject}
                                            </div>
                                            <div className="flex items-center gap-1 mt-2">
                                                {template.is_active ? (
                                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-red-500" />
                                                )}
                                                <span className="text-xs">
                                                    {template.is_active ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                    {templates.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No hay plantillas disponibles
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>
                                    {selectedTemplate ? `Editar: ${selectedTemplate.event_code}` : 'Selecciona una Plantilla'}
                                </CardTitle>
                                <CardDescription>
                                    Edita el asunto y el contenido HTML de la plantilla
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {selectedTemplate ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="subject">Asunto</Label>
                                            <Input
                                                id="subject"
                                                value={selectedTemplate.subject || ''}
                                                onChange={(e) => handleTemplateChange('subject', e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <Label htmlFor="body_html">Contenido HTML</Label>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPreviewHtml(selectedTemplate.body_html)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Vista Previa
                                                </Button>
                                            </div>
                                            <textarea
                                                id="body_html"
                                                value={selectedTemplate.body_html || ''}
                                                onChange={(e) => handleTemplateChange('body_html', e.target.value)}
                                                className="w-full h-64 px-3 py-2 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="<html>...</html>"
                                            />
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is_active"
                                                checked={selectedTemplate.is_active || false}
                                                onCheckedChange={(checked) => handleTemplateChange('is_active', checked)}
                                            />
                                            <Label htmlFor="is_active">Plantilla Activa</Label>
                                        </div>

                                        <div className="flex gap-2 pt-4">
                                            <Button onClick={handleSaveTemplate}>
                                                <Save className="h-4 w-4 mr-2" />
                                                Guardar Plantilla
                                            </Button>
                                        </div>

                                        {previewHtml && (
                                            <div className="border-t pt-4 mt-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Label>Vista Previa</Label>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPreviewHtml('')}
                                                    >
                                                        Cerrar
                                                    </Button>
                                                </div>
                                                <div className="border rounded-md p-4 bg-white">
                                                    <iframe
                                                        srcDoc={previewHtml}
                                                        className="w-full h-96 border-0"
                                                        title="Vista previa del email"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Selecciona una plantilla de la lista para comenzar a editar</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
