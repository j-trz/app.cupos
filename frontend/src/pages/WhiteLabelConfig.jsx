import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WhiteLabelService from '../services/whiteLabelService';
import Swal from 'sweetalert2';
import {
    Palette, Type, MousePointer, Layout, Sidebar as SidebarIcon,
    Save, Download, Upload, RefreshCw, Check, Building2, Mail, FileText, Eye
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
    const [activeTab, setActiveTab] = useState('colors');
    const [config, setConfig] = useState(null);
    const [configId, setConfigId] = useState(null);
    const [isDefault, setIsDefault] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [themePresets, setThemePresets] = useState([]);
    const [fontPresets, setFontPresets] = useState([]);
    const [buttonPresets, setButtonPresets] = useState([]);

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
                // Crear nueva configuración
                await WhiteLabelService.createConfig({
                    agency_id: user.agencia,
                    ...config
                });
                Swal.fire('Creado', 'Configuración creada exitosamente', 'success');
            } else {
                // Actualizar existente
                await WhiteLabelService.updateConfig(configId, config);
                Swal.fire('Actualizado', 'Configuración actualizada exitosamente', 'success');
            }
            loadConfig(); // Recargar para obtener el ID
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
        setConfig(prev => ({
            ...prev,
            primary_color: preset.primary_color,
            primary_hover_color: preset.primary_hover_color,
            secondary_color: preset.secondary_color,
            secondary_hover_color: preset.secondary_hover_color,
            accent_color: preset.accent_color,
            background_color: preset.background_color,
            surface_color: preset.surface_color,
            text_primary_color: preset.text_primary_color,
            text_secondary_color: preset.text_secondary_color,
            border_color: preset.border_color
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
        <div className="space-y-6 p-6">
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
                    <Button size="sm" onClick={handleSave} disabled={saving}>
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

            <div className="border-b">
                <div className="flex gap-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
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

            <div className="space-y-6">
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
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {themePresets.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyThemePreset(preset)}
                                            className="p-3 border rounded-lg hover:border-primary transition-colors text-left"
                                        >
                                            <div className="flex gap-1 mb-2">
                                                <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary_color }} />
                                                <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary_color }} />
                                                <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.accent_color }} />
                                            </div>
                                            <p className="text-xs font-medium">{preset.label}</p>
                                            {preset.is_dark && (
                                                <span className="text-xs text-muted-foreground">Oscuro</span>
                                            )}
                                        </button>
                                    ))}
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
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                            placeholder="JetBrains Mono, Fira Code, etc."
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
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {buttonPresets.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyButtonPreset(preset)}
                                            className="p-4 border rounded-lg hover:border-primary transition-colors"
                                        >
                                            <div
                                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium mb-2"
                                                style={{
                                                    borderRadius: preset.border_radius,
                                                    boxShadow: preset.shadow
                                                }}
                                            >
                                                {preset.name}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Radio: {preset.border_radius}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Botones Personalizados</CardTitle>
                                <CardDescription>
                                    Personaliza el estilo de los botones
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Radio de Borde</Label>
                                        <Input
                                            value={config.button_radius || ''}
                                            onChange={(e) => updateField('button_radius', e.target.value)}
                                            placeholder="0.5rem, 8px, etc."
                                        />
                                    </div>
                                    <div>
                                        <Label>Sombra</Label>
                                        <Input
                                            value={config.button_shadow || ''}
                                            onChange={(e) => updateField('button_shadow', e.target.value)}
                                            placeholder="0 1px 2px 0 rgb(0 0 0 / 0.05)"
                                        />
                                    </div>
                                    <div>
                                        <Label>Escala en Hover</Label>
                                        <Input
                                            value={config.button_hover_scale || ''}
                                            onChange={(e) => updateField('button_hover_scale', e.target.value)}
                                            placeholder="1.02, 1.05, etc."
                                        />
                                    </div>
                                    <div>
                                        <Label>Transición</Label>
                                        <Input
                                            value={config.button_transition || ''}
                                            onChange={(e) => updateField('button_transition', e.target.value)}
                                            placeholder="all 0.2s ease"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'layout' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración de Layout</CardTitle>
                            <CardDescription>
                                Define los radios de borde y sombras del sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Radio Pequeño</Label>
                                    <Input
                                        value={config.border_radius_sm || ''}
                                        onChange={(e) => updateField('border_radius_sm', e.target.value)}
                                        placeholder="0.25rem"
                                    />
                                </div>
                                <div>
                                    <Label>Radio Mediano</Label>
                                    <Input
                                        value={config.border_radius_md || ''}
                                        onChange={(e) => updateField('border_radius_md', e.target.value)}
                                        placeholder="0.5rem"
                                    />
                                </div>
                                <div>
                                    <Label>Radio Grande</Label>
                                    <Input
                                        value={config.border_radius_lg || ''}
                                        onChange={(e) => updateField('border_radius_lg', e.target.value)}
                                        placeholder="0.75rem"
                                    />
                                </div>
                                <div>
                                    <Label>Radio Extra Grande</Label>
                                    <Input
                                        value={config.border_radius_xl || ''}
                                        onChange={(e) => updateField('border_radius_xl', e.target.value)}
                                        placeholder="1rem"
                                    />
                                </div>
                                <div>
                                    <Label>Sombra Pequeña</Label>
                                    <Input
                                        value={config.shadow_sm || ''}
                                        onChange={(e) => updateField('shadow_sm', e.target.value)}
                                        placeholder="0 1px 2px 0 rgb(0 0 0 / 0.05)"
                                    />
                                </div>
                                <div>
                                    <Label>Sombra Mediana</Label>
                                    <Input
                                        value={config.shadow_md || ''}
                                        onChange={(e) => updateField('shadow_md', e.target.value)}
                                        placeholder="0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                    />
                                </div>
                                <div>
                                    <Label>Sombra Grande</Label>
                                    <Input
                                        value={config.shadow_lg || ''}
                                        onChange={(e) => updateField('shadow_lg', e.target.value)}
                                        placeholder="0 10px 15px -3px rgb(0 0 0 / 0.1)"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'sidebar' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración del Sidebar</CardTitle>
                            <CardDescription>
                                Personaliza la apariencia del menú lateral
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <ColorPicker
                                    label="Fondo del Sidebar"
                                    value={config.sidebar_bg_color}
                                    onChange={(v) => updateField('sidebar_bg_color', v)}
                                />
                                <ColorPicker
                                    label="Texto del Sidebar"
                                    value={config.sidebar_text_color}
                                    onChange={(v) => updateField('sidebar_text_color', v)}
                                />
                                <ColorPicker
                                    label="Fondo Activo"
                                    value={config.sidebar_active_bg}
                                    onChange={(v) => updateField('sidebar_active_bg', v)}
                                />
                                <ColorPicker
                                    label="Texto Activo"
                                    value={config.sidebar_active_text}
                                    onChange={(v) => updateField('sidebar_active_text', v)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Ancho del Sidebar</Label>
                                    <Input
                                        value={config.sidebar_width || ''}
                                        onChange={(e) => updateField('sidebar_width', e.target.value)}
                                        placeholder="320px"
                                    />
                                </div>
                                <div>
                                    <Label>Ancho Colapsado</Label>
                                    <Input
                                        value={config.sidebar_collapsed_width || ''}
                                        onChange={(e) => updateField('sidebar_collapsed_width', e.target.value)}
                                        placeholder="80px"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function ColorPicker({ label, value, onChange }) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex items-center gap-2 mt-1">
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-10 border border-input rounded cursor-pointer"
                />
                <Input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                />
            </div>
        </div>
    );
}
