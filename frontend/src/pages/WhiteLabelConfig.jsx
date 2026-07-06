import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WhiteLabelService from '../services/whiteLabelService';
import Swal from 'sweetalert2';
import {
    Palette, Type, MousePointer, Layout, Sidebar as SidebarIcon,
    Save, Download, Upload, RefreshCw, Check, Building2, Mail, FileText, Eye,
    Monitor, Smartphone
} from 'lucide-react';
import { ShadcnButton as Button } from '../components/ui/shadcn-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/shadcn-card';
import { ShadcnInput as Input } from '../components/ui/shadcn-input';
import { Label } from '../components/ui/shadcn-label';

const TABS = [
    { id: 'identity', label: 'Identidad', icon: Building2 },
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'fonts', label: 'Tipografías', icon: Type },
    { id: 'buttons', label: 'Botones', icon: MousePointer },
    { id: 'sidebar', label: 'Sidebar', icon: SidebarIcon },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'legal', label: 'Legal', icon: FileText }
];

export default function WhiteLabelConfig() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('identity');
    const [config, setConfig] = useState(null);
    const [configId, setConfigId] = useState(null);
    const [isDefault, setIsDefault] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [themePresets, setThemePresets] = useState([]);
    const [fontPresets, setFontPresets] = useState([]);
    const [buttonPresets, setButtonPresets] = useState([]);
    const [previewMode, setPreviewMode] = useState('desktop');

    useEffect(() => {
        loadConfig();
        loadPresets();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await WhiteLabelService.getConfig();
            if (response.config) {
                setConfig(response.config);
                setIsDefault(response.isDefault || false);
                if (!response.isDefault && response.config.id) {
                    setConfigId(response.config.id);
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
            Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadPresets = async () => {
        try {
            const [themes, fonts, buttons] = await Promise.all([
                WhiteLabelService.getPresets(),
                WhiteLabelService.getFonts(),
                WhiteLabelService.getButtons()
            ]);
            setThemePresets(themes);
            setFontPresets(fonts);
            setButtonPresets(buttons);
        } catch (error) {
            console.error('Error al cargar presets:', error);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (isDefault) {
                await WhiteLabelService.createConfig({
                    agency_id: user.agencia,
                    ...config
                });
                Swal.fire('Creado', 'Configuración creada exitosamente', 'success');
            } else {
                await WhiteLabelService.updateConfig(configId, config);
                Swal.fire('Actualizado', 'Configuración actualizada exitosamente', 'success');
            }
            loadConfig();
        } catch (error) {
            console.error('Error al guardar:', error);
            Swal.fire('Error', error.message || 'No se pudo guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        const result = await Swal.fire({
            title: '¿Restablecer configuración?',
            text: 'Se perderán todos los cambios personalizados',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                if (configId) {
                    await WhiteLabelService.deleteConfig(configId);
                }
                loadConfig();
                Swal.fire('Restablecido', 'Configuración restablecida a valores por defecto', 'success');
            } catch (error) {
                console.error('Error al restablecer:', error);
                Swal.fire('Error', 'No se pudo restablecer la configuración', 'error');
            }
        }
    };

    const handleExport = async () => {
        if (!configId) {
            Swal.fire('Info', 'Primero guarda la configuración', 'info');
            return;
        }
        try {
            await WhiteLabelService.downloadConfig(configId, `white-label-${user.agencia}.json`);
            Swal.fire('Exportado', 'Configuración exportada exitosamente', 'success');
        } catch (error) {
            console.error('Error al exportar:', error);
            Swal.fire('Error', 'No se pudo exportar la configuración', 'error');
        }
    };

    const handleImport = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const importedConfig = await WhiteLabelService.loadConfigFromFile(file);
                await WhiteLabelService.importConfig({
                    agency_id: user.agencia,
                    config: importedConfig.config || importedConfig
                });
                loadConfig();
                Swal.fire('Importado', 'Configuración importada exitosamente', 'success');
            } catch (error) {
                console.error('Error al importar:', error);
                Swal.fire('Error', error.message || 'No se pudo importar la configuración', 'error');
            }
        };
        input.click();
    };

    const updateField = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const applyThemePreset = (preset) => {
        const colors = preset.colors || {};
        setConfig(prev => ({
            ...prev,
            primary_color: colors.primary || preset.primary_color,
            primary_hover_color: colors.primary_hover || preset.primary_hover_color,
            secondary_color: colors.secondary || preset.secondary_color,
            secondary_hover_color: colors.secondary_hover || preset.secondary_hover_color,
            accent_color: colors.accent || preset.accent_color,
            background_color: colors.background || preset.background_color,
            surface_color: colors.surface || preset.surface_color,
            text_primary_color: colors.text_primary || preset.text_primary_color,
            text_secondary_color: colors.text_secondary || preset.text_secondary_color,
            border_color: colors.border || preset.border_color,
            success_color: colors.success || preset.success_color,
            warning_color: colors.warning || preset.warning_color,
            error_color: colors.error || preset.error_color,
            info_color: colors.info || preset.info_color
        }));
    };

    const applyFontPreset = (preset) => {
        setConfig(prev => ({
            ...prev,
            font_heading: preset.heading_font,
            font_body: preset.body_font,
            font_mono: preset.mono_font
        }));
    };

    const applyButtonPreset = (preset) => {
        setConfig(prev => ({
            ...prev,
            button_radius: preset.border_radius,
            button_shadow: preset.shadow,
            button_hover_scale: preset.hover_scale,
            button_transition: preset.transition
        }));
    };

    if (loading || !config) {
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
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-[1800px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Marca Blanca</h1>
                        <p className="text-muted-foreground">
                            Personaliza la apariencia visual del sistema para tu agencia
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleImport}>
                            <Upload className="h-4 w-4 mr-2" />
                            Importar
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={isDefault}>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleReset} disabled={isDefault}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Restablecer
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving} className='border'>
                            {saving ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {isDefault && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-yellow-800">
                                <Check className="h-5 w-5" />
                                <p className="font-medium">
                                    Estás usando la configuración por defecto. Personaliza los valores y guarda para crear tu propia configuración.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Split View Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Configuration Panel */}
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="p-0">
                                <div className="border-b bg-muted/30">
                                    <div className="flex gap-1 overflow-x-auto px-4 pt-2">
                                        {TABS.map(tab => {
                                            const Icon = tab.icon;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                                        ? 'border-primary text-primary'
                                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
                                    {activeTab === 'identity' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-semibold mb-4">Identidad de Marca</h3>
                                                <p className="text-sm text-muted-foreground mb-6">
                                                    Define la identidad visual de tu empresa
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <Label>Nombre de la Empresa</Label>
                                                    <Input
                                                        value={config.company_name || ''}
                                                        onChange={(e) => updateField('company_name', e.target.value)}
                                                        placeholder="Mi Empresa S.A."
                                                    />
                                                </div>

                                                <div>
                                                    <Label>Tagline / Slogan</Label>
                                                    <Input
                                                        value={config.company_tagline || ''}
                                                        onChange={(e) => updateField('company_tagline', e.target.value)}
                                                        placeholder="Innovación y tecnología"
                                                    />
                                                </div>

                                                <div>
                                                    <Label>URL del Logo</Label>
                                                    <Input
                                                        value={config.logo_url || ''}
                                                        onChange={(e) => updateField('logo_url', e.target.value)}
                                                        placeholder="https://ejemplo.com/logo.png"
                                                    />
                                                    {config.logo_url && (
                                                        <div className="mt-2 p-4 border rounded-lg bg-muted/30">
                                                            <img src={config.logo_url} alt="Logo" className="max-h-16 mx-auto" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <Label>URL del Logo Oscuro</Label>
                                                    <Input
                                                        value={config.logo_dark_url || ''}
                                                        onChange={(e) => updateField('logo_dark_url', e.target.value)}
                                                        placeholder="https://ejemplo.com/logo-dark.png"
                                                    />
                                                </div>

                                                <div>
                                                    <Label>URL del Favicon</Label>
                                                    <Input
                                                        value={config.favicon_url || ''}
                                                        onChange={(e) => updateField('favicon_url', e.target.value)}
                                                        placeholder="https://ejemplo.com/favicon.ico"
                                                    />
                                                    {config.favicon_url && (
                                                        <div className="mt-2 p-4 border rounded-lg bg-muted/30 flex items-center gap-2">
                                                            <img src={config.favicon_url} alt="Favicon" className="w-8 h-8" />
                                                            <span className="text-sm text-muted-foreground">Vista previa del favicon</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'colors' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Presets de Temas</CardTitle>
                                                    <CardDescription>
                                                        Selecciona un tema predefinido o personaliza los colores manualmente
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {themePresets.map(preset => {
                                                            const colors = preset.colors || {};
                                                            return (
                                                                <button
                                                                    key={preset.id}
                                                                    onClick={() => applyThemePreset(preset)}
                                                                    className="p-3 border rounded-lg hover:border-primary transition-colors text-left"
                                                                >
                                                                    <div className="flex gap-1 mb-2">
                                                                        <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.primary || preset.primary_color }} />
                                                                        <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.secondary || preset.secondary_color }} />
                                                                        <div className="w-6 h-6 rounded" style={{ backgroundColor: colors.accent || preset.accent_color }} />
                                                                    </div>
                                                                    <p className="text-xs font-medium">{preset.label}</p>
                                                                    {preset.is_dark && (
                                                                        <span className="text-xs text-muted-foreground">Oscuro</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Colores Personalizados</CardTitle>
                                                    <CardDescription>
                                                        Define los colores exactos de tu marca
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <ColorPicker
                                                            label="Color Primario"
                                                            value={config.primary_color}
                                                            onChange={(v) => updateField('primary_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Primario Hover"
                                                            value={config.primary_hover_color}
                                                            onChange={(v) => updateField('primary_hover_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Color Secundario"
                                                            value={config.secondary_color}
                                                            onChange={(v) => updateField('secondary_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Secundario Hover"
                                                            value={config.secondary_hover_color}
                                                            onChange={(v) => updateField('secondary_hover_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Color de Acento"
                                                            value={config.accent_color}
                                                            onChange={(v) => updateField('accent_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Fondo"
                                                            value={config.background_color}
                                                            onChange={(v) => updateField('background_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Superficie"
                                                            value={config.surface_color}
                                                            onChange={(v) => updateField('surface_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Borde"
                                                            value={config.border_color}
                                                            onChange={(v) => updateField('border_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Texto Primario"
                                                            value={config.text_primary_color}
                                                            onChange={(v) => updateField('text_primary_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Texto Secundario"
                                                            value={config.text_secondary_color}
                                                            onChange={(v) => updateField('text_secondary_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Éxito"
                                                            value={config.success_color}
                                                            onChange={(v) => updateField('success_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Advertencia"
                                                            value={config.warning_color}
                                                            onChange={(v) => updateField('warning_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Error"
                                                            value={config.error_color}
                                                            onChange={(v) => updateField('error_color', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Info"
                                                            value={config.info_color}
                                                            onChange={(v) => updateField('info_color', v)}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === 'fonts' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Presets de Tipografías</CardTitle>
                                                    <CardDescription>
                                                        Selecciona una combinación de fuentes predefinida
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {fontPresets.map(preset => (
                                                            <button
                                                                key={preset.id}
                                                                onClick={() => applyFontPreset(preset)}
                                                                className="p-4 border rounded-lg hover:border-primary transition-colors text-left"
                                                            >
                                                                <p className="font-bold mb-1" style={{ fontFamily: preset.heading_font }}>
                                                                    {preset.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground" style={{ fontFamily: preset.body_font }}>
                                                                    Texto de ejemplo
                                                                </p>
                                                                <p className="text-xs mt-2 text-muted-foreground">
                                                                    {preset.heading_font}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Tipografías Personalizadas</CardTitle>
                                                    <CardDescription>
                                                        Define las fuentes específicas para tu marca
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div>
                                                            <Label>Fuente de Títulos</Label>
                                                            <Input
                                                                value={config.font_heading || ''}
                                                                onChange={(e) => updateField('font_heading', e.target.value)}
                                                                placeholder="Inter, Roboto, etc."
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Fuente de Cuerpo</Label>
                                                            <Input
                                                                value={config.font_body || ''}
                                                                onChange={(e) => updateField('font_body', e.target.value)}
                                                                placeholder="Inter, Roboto, etc."
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Fuente Monoespaciada</Label>
                                                            <Input
                                                                value={config.font_mono || ''}
                                                                onChange={(e) => updateField('font_mono', e.target.value)}
                                                                placeholder="Fira Code, Monaco, etc."
                                                            />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === 'buttons' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Presets de Botones</CardTitle>
                                                    <CardDescription>
                                                        Selecciona un estilo de botón predefinido
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {buttonPresets.map(preset => (
                                                            <button
                                                                key={preset.id}
                                                                onClick={() => applyButtonPreset(preset)}
                                                                className="p-4 border rounded-lg hover:border-primary transition-colors text-left"
                                                            >
                                                                <div
                                                                    className="px-4 py-2 text-white text-sm font-medium mb-2"
                                                                    style={{
                                                                        backgroundColor: config.primary_color || '#3b82f6',
                                                                        borderRadius: `${preset.border_radius}px`,
                                                                        boxShadow: preset.shadow === 'sm' ? '0 1px 2px rgba(0,0,0,0.05)' :
                                                                            preset.shadow === 'md' ? '0 4px 6px rgba(0,0,0,0.1)' :
                                                                                preset.shadow === 'lg' ? '0 10px 15px rgba(0,0,0,0.1)' : 'none'
                                                                    }}
                                                                >
                                                                    Botón
                                                                </div>
                                                                <p className="text-xs font-medium">{preset.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Radio: {preset.border_radius}px
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Estilo Personalizado</CardTitle>
                                                    <CardDescription>
                                                        Ajusta los detalles de los botones
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <Label>Radio de Borde (px)</Label>
                                                        <Input
                                                            type="number"
                                                            value={config.button_radius || 6}
                                                            onChange={(e) => updateField('button_radius', parseInt(e.target.value))}
                                                            min="0"
                                                            max="50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Sombra</Label>
                                                        <select
                                                            value={config.button_shadow || 'none'}
                                                            onChange={(e) => updateField('button_shadow', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md"
                                                        >
                                                            <option value="none">Sin sombra</option>
                                                            <option value="sm">Pequeña</option>
                                                            <option value="md">Mediana</option>
                                                            <option value="lg">Grande</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <Label>Escala en Hover</Label>
                                                        <Input
                                                            type="number"
                                                            value={config.button_hover_scale || 1.05}
                                                            onChange={(e) => updateField('button_hover_scale', parseFloat(e.target.value))}
                                                            step="0.01"
                                                            min="1"
                                                            max="1.2"
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === 'sidebar' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Configuración del Sidebar</CardTitle>
                                                    <CardDescription>
                                                        Personaliza la barra lateral de navegación
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <ColorPicker
                                                            label="Fondo del Sidebar"
                                                            value={config.sidebar_bg || '#1f2937'}
                                                            onChange={(v) => updateField('sidebar_bg', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Texto del Sidebar"
                                                            value={config.sidebar_text || '#ffffff'}
                                                            onChange={(v) => updateField('sidebar_text', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Fondo Activo"
                                                            value={config.sidebar_active_bg || '#3b82f6'}
                                                            onChange={(v) => updateField('sidebar_active_bg', v)}
                                                        />
                                                        <ColorPicker
                                                            label="Texto Activo"
                                                            value={config.sidebar_active_text || '#ffffff'}
                                                            onChange={(v) => updateField('sidebar_active_text', v)}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Ancho (px)</Label>
                                                            <Input
                                                                type="number"
                                                                value={config.sidebar_width || 250}
                                                                onChange={(e) => updateField('sidebar_width', parseInt(e.target.value))}
                                                                min="200"
                                                                max="400"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Ancho Colapsado (px)</Label>
                                                            <Input
                                                                type="number"
                                                                value={config.sidebar_collapsed_width || 70}
                                                                onChange={(e) => updateField('sidebar_collapsed_width', parseInt(e.target.value))}
                                                                min="50"
                                                                max="100"
                                                            />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === 'layout' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Configuración de Layout</CardTitle>
                                                    <CardDescription>
                                                        Ajusta el diseño general de la interfaz
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <Label>Radio SM (px)</Label>
                                                            <Input
                                                                type="number"
                                                                value={config.border_radius_sm || 4}
                                                                onChange={(e) => updateField('border_radius_sm', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Radio MD (px)</Label>
                                                            <Input
                                                                type="number"
                                                                value={config.border_radius_md || 6}
                                                                onChange={(e) => updateField('border_radius_md', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Radio LG (px)</Label>
                                                            <Input
                                                                type="number"
                                                                value={config.border_radius_lg || 8}
                                                                onChange={(e) => updateField('border_radius_lg', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <Label>Sombra SM</Label>
                                                            <select
                                                                value={config.shadow_sm || 'sm'}
                                                                onChange={(e) => updateField('shadow_sm', e.target.value)}
                                                                className="w-full px-3 py-2 border rounded-md"
                                                            >
                                                                <option value="none">Sin sombra</option>
                                                                <option value="sm">Pequeña</option>
                                                                <option value="md">Mediana</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <Label>Sombra MD</Label>
                                                            <select
                                                                value={config.shadow_md || 'md'}
                                                                onChange={(e) => updateField('shadow_md', e.target.value)}
                                                                className="w-full px-3 py-2 border rounded-md"
                                                            >
                                                                <option value="none">Sin sombra</option>
                                                                <option value="sm">Pequeña</option>
                                                                <option value="md">Mediana</option>
                                                                <option value="lg">Grande</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <Label>Sombra LG</Label>
                                                            <select
                                                                value={config.shadow_lg || 'lg'}
                                                                onChange={(e) => updateField('shadow_lg', e.target.value)}
                                                                className="w-full px-3 py-2 border rounded-md"
                                                            >
                                                                <option value="none">Sin sombra</option>
                                                                <option value="md">Mediana</option>
                                                                <option value="lg">Grande</option>
                                                                <option value="xl">Extra grande</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === 'emails' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Configuración de Emails</CardTitle>
                                                    <CardDescription>
                                                        Personaliza los correos electrónicos enviados por el sistema
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <Label>URL del Logo en Header</Label>
                                                        <Input
                                                            value={config.email_header_logo_url || ''}
                                                            onChange={(e) => updateField('email_header_logo_url', e.target.value)}
                                                            placeholder="https://ejemplo.com/logo-email.png"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Texto del Footer</Label>
                                                        <Input
                                                            value={config.email_footer_text || ''}
                                                            onChange={(e) => updateField('email_footer_text', e.target.value)}
                                                            placeholder="© 2024 Mi Empresa. Todos los derechos reservados."
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>URL de Soporte</Label>
                                                        <Input
                                                            value={config.email_support_url || ''}
                                                            onChange={(e) => updateField('email_support_url', e.target.value)}
                                                            placeholder="https://soporte.ejemplo.com"
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {activeTab === 'legal' && (
                                        <div className="space-y-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Información Legal</CardTitle>
                                                    <CardDescription>
                                                        Datos legales de tu empresa para términos y condiciones
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div>
                                                            <Label>Nombre Legal de la Empresa</Label>
                                                            <Input
                                                                value={config.legal_company_name || ''}
                                                                onChange={(e) => updateField('legal_company_name', e.target.value)}
                                                                placeholder="Mi Empresa S.A."
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Dirección</Label>
                                                            <Input
                                                                value={config.legal_address || ''}
                                                                onChange={(e) => updateField('legal_address', e.target.value)}
                                                                placeholder="Calle 123, Ciudad, País"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label>Teléfono</Label>
                                                                <Input
                                                                    value={config.legal_phone || ''}
                                                                    onChange={(e) => updateField('legal_phone', e.target.value)}
                                                                    placeholder="+1 234 567 8900"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Email</Label>
                                                                <Input
                                                                    value={config.legal_email || ''}
                                                                    onChange={(e) => updateField('legal_email', e.target.value)}
                                                                    placeholder="legal@ejemplo.com"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label>URL de Términos y Condiciones</Label>
                                                            <Input
                                                                value={config.terms_url || ''}
                                                                onChange={(e) => updateField('terms_url', e.target.value)}
                                                                placeholder="https://ejemplo.com/terminos"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>URL de Política de Privacidad</Label>
                                                            <Input
                                                                value={config.privacy_url || ''}
                                                                onChange={(e) => updateField('privacy_url', e.target.value)}
                                                                placeholder="https://ejemplo.com/privacidad"
                                                            />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="lg:sticky lg:top-6 lg:h-fit">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Eye className="h-5 w-5" />
                                            Previsualización en Vivo
                                        </CardTitle>
                                        <CardDescription>
                                            Vista previa de cómo se verá tu configuración
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant={previewMode === 'desktop' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setPreviewMode('desktop')}
                                        >
                                            <Monitor className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={previewMode === 'mobile' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setPreviewMode('mobile')}
                                        >
                                            <Smartphone className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <LivePreview config={config} mode={previewMode} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ColorPicker({ label, value, onChange }) {
    return (
        <div>
            <Label className="text-sm">{label}</Label>
            <div className="flex gap-2 mt-1">
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border"
                />
                <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                />
            </div>
        </div>
    );
}

function LivePreview({ config, mode }) {
    const primaryColor = config.primary_color || '#3b82f6';
    const secondaryColor = config.secondary_color || '#6b7280';
    const backgroundColor = config.background_color || '#f9fafb';
    const surfaceColor = config.surface_color || '#ffffff';
    const textColor = config.text_primary_color || '#111827';
    const textSecondaryColor = config.text_secondary_color || '#6b7280';
    const sidebarBg = config.sidebar_bg || '#1f2937';
    const sidebarText = config.sidebar_text || '#ffffff';
    const fontFamily = config.font_body || 'Inter, sans-serif';
    const headingFont = config.font_heading || 'Inter, sans-serif';
    const buttonRadius = config.button_radius || 6;
    const companyName = config.company_name || 'Mi Empresa';

    const isMobile = mode === 'mobile';

    return (
        <div
            className={`border rounded-lg overflow-hidden bg-white shadow-lg ${isMobile ? 'max-w-sm mx-auto' : ''}`}
            style={{ fontFamily }}
        >
            {/* Mini Browser Chrome */}
            <div className="bg-gray-100 border-b px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-600">
                    {window.location.origin}
                </div>
            </div>

            {/* App Preview */}
            <div className="flex" style={{ height: isMobile ? '600px' : '500px' }}>
                {/* Sidebar */}
                {!isMobile && (
                    <div
                        className="w-48 flex-shrink-0"
                        style={{
                            backgroundColor: sidebarBg,
                            color: sidebarText
                        }}
                    >
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-6">
                                {config.logo_url ? (
                                    <img src={config.logo_url} alt="Logo" className="w-8 h-8 rounded" />
                                ) : (
                                    <div className="w-8 h-8 rounded" style={{ backgroundColor: primaryColor }}></div>
                                )}
                                <span className="font-bold text-sm" style={{ fontFamily: headingFont }}>
                                    {companyName}
                                </span>
                            </div>
                            <nav className="space-y-1">
                                <div className="px-3 py-2 rounded text-xs" style={{ backgroundColor: config.sidebar_active_bg || primaryColor }}>
                                    Dashboard
                                </div>
                                <div className="px-3 py-2 rounded text-xs opacity-70">
                                    Usuarios
                                </div>
                                <div className="px-3 py-2 rounded text-xs opacity-70">
                                    Productos
                                </div>
                                <div className="px-3 py-2 rounded text-xs opacity-70">
                                    Configuración
                                </div>
                            </nav>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col" style={{ backgroundColor }}>
                    {/* Top Navbar */}
                    <div
                        className="border-b px-4 py-3 flex items-center justify-between"
                        style={{ backgroundColor: surfaceColor }}
                    >
                        <h1 className="text-lg font-bold" style={{ color: textColor, fontFamily: headingFont }}>
                            Dashboard
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {/* Stats Cards */}
                        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-3 mb-4`}>
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    backgroundColor: surfaceColor,
                                    borderRadius: `${buttonRadius}px`,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div className="text-xs" style={{ color: textSecondaryColor }}>
                                    Usuarios
                                </div>
                                <div className="text-xl font-bold" style={{ color: textColor }}>
                                    1,234
                                </div>
                            </div>
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    backgroundColor: surfaceColor,
                                    borderRadius: `${buttonRadius}px`,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div className="text-xs" style={{ color: textSecondaryColor }}>
                                    Ventas
                                </div>
                                <div className="text-xl font-bold" style={{ color: textColor }}>
                                    $45,678
                                </div>
                            </div>
                            {!isMobile && (
                                <div
                                    className="p-3 rounded-lg"
                                    style={{
                                        backgroundColor: surfaceColor,
                                        borderRadius: `${buttonRadius}px`,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <div className="text-xs" style={{ color: textSecondaryColor }}>
                                        Conversión
                                    </div>
                                    <div className="text-xl font-bold" style={{ color: textColor }}>
                                        12.3%
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mb-4">
                            <button
                                className="px-4 py-2 text-white text-xs font-medium"
                                style={{
                                    backgroundColor: primaryColor,
                                    borderRadius: `${buttonRadius}px`,
                                    boxShadow: config.button_shadow === 'sm' ? '0 1px 2px rgba(0,0,0,0.05)' :
                                        config.button_shadow === 'md' ? '0 4px 6px rgba(0,0,0,0.1)' :
                                            config.button_shadow === 'lg' ? '0 10px 15px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                Crear Nuevo
                            </button>
                            <button
                                className="px-4 py-2 text-xs font-medium"
                                style={{
                                    backgroundColor: secondaryColor,
                                    color: surfaceColor,
                                    borderRadius: `${buttonRadius}px`
                                }}
                            >
                                Exportar
                            </button>
                        </div>

                        {/* Table Preview */}
                        <div
                            className="rounded-lg overflow-hidden"
                            style={{
                                backgroundColor: surfaceColor,
                                borderRadius: `${buttonRadius}px`,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div className="border-b px-3 py-2">
                                <div className="text-xs font-semibold" style={{ color: textColor }}>
                                    Últimos Pedidos
                                </div>
                            </div>
                            <div className="divide-y">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded" style={{ backgroundColor: `${primaryColor}20` }}></div>
                                            <div>
                                                <div className="text-xs font-medium" style={{ color: textColor }}>
                                                    Pedido #{1000 + i}
                                                </div>
                                                <div className="text-xs" style={{ color: textSecondaryColor }}>
                                                    Cliente {i}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium" style={{ color: primaryColor }}>
                                            $99.{99 - i}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
