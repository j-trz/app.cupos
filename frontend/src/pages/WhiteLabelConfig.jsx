import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WhiteLabelService from '../services/whiteLabelService';
import Swal from 'sweetalert2';
import {
    Palette, Type, MousePointer, Layout, Sidebar as SidebarIcon,
    Save, Download, Upload, RefreshCw, Check, Building2, Mail, FileText, Eye,
    Monitor, Smartphone, Image, Link
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

const tabs = [
    { id: 'identity', label: 'Identidad', icon: Building2 },
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'fonts', label: 'Tipografías', icon: Type },
    { id: 'buttons', label: 'Botones', icon: MousePointer },
    { id: 'sidebar', label: 'Sidebar', icon: SidebarIcon },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'legal', label: 'Legal', icon: FileText }
];

const INPUT_CLASSES = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
const LABEL_CLASSES = "mb-1 block text-xs font-medium text-slate-600";
const COLOR_INPUT_CLASSES = "h-10 w-14 rounded border border-slate-300";

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
                Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'Configuración creada exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await WhiteLabelService.updateConfig(configId, config);
                Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Configuración actualizada exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
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
                Swal.fire({
                    icon: 'success',
                    title: 'Restablecido',
                    text: 'Configuración restablecida a valores por defecto',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error al restablecer:', error);
                Swal.fire('Error', 'No se pudo restablecer la configuración', 'error');
            }
        }
    };

    const handleExport = async () => {
        try {
            const data = await WhiteLabelService.exportConfig(configId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'white-label-config.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al exportar:', error);
            Swal.fire('Error', 'No se pudo exportar la configuración', 'error');
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await WhiteLabelService.importConfig(data);
            Swal.fire({
                icon: 'success',
                title: 'Importado',
                text: 'Configuración importada exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
            loadConfig();
        } catch (error) {
            console.error('Error al importar:', error);
            Swal.fire('Error', 'No se pudo importar la configuración', 'error');
        }
    };

    const applyThemePreset = (preset) => {
        setConfig(prev => ({
            ...prev,
            colors: { ...prev?.colors, ...preset.colors }
        }));
    };

    const applyFontPreset = (preset) => {
        setConfig(prev => ({
            ...prev,
            fonts: { ...prev?.fonts, ...preset.fonts }
        }));
    };

    const applyButtonPreset = (preset) => {
        setConfig(prev => ({
            ...prev,
            buttons: { ...prev?.buttons, ...preset.buttons }
        }));
    };

    const handleColorChange = (key, value) => {
        setConfig(prev => ({ ...prev, colors: { ...prev?.colors, [key]: value } }));
    };

    const handleFontChange = (key, value) => {
        setConfig(prev => ({ ...prev, fonts: { ...prev?.fonts, [key]: value } }));
    };

    const handleButtonChange = (key, value) => {
        setConfig(prev => ({ ...prev, buttons: { ...prev?.buttons, [key]: value } }));
    };

    const handleSidebarChange = (key, value) => {
        setConfig(prev => ({ ...prev, sidebar: { ...prev?.sidebar, [key]: value } }));
    };

    const handleLayoutChange = (key, value) => {
        setConfig(prev => ({ ...prev, layout: { ...prev?.layout, [key]: value } }));
    };

    const handleIdentityChange = (key, value) => {
        setConfig(prev => ({ ...prev, identity: { ...prev?.identity, [key]: value } }));
    };

    const handleEmailsChange = (key, value) => {
        setConfig(prev => ({ ...prev, emails: { ...prev?.emails, [key]: value } }));
    };

    const handleLegalChange = (key, value) => {
        setConfig(prev => ({ ...prev, legal: { ...prev?.legal, [key]: value } }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    // Contenido principal según tab activo
    const renderContent = () => {
        switch (activeTab) {
            case 'identity':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Identidad de la marca</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Nombre de la agencia</label>
                                <input
                                    type="text"
                                    value={config?.identity?.agency_name || ''}
                                    onChange={(e) => handleIdentityChange('agency_name', e.target.value)}
                                    className={INPUT_CLASSES}
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Email de contacto</label>
                                <input
                                    type="email"
                                    value={config?.identity?.contact_email || ''}
                                    onChange={(e) => handleIdentityChange('contact_email', e.target.value)}
                                    className={INPUT_CLASSES}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={LABEL_CLASSES}>Eslogan</label>
                                <input
                                    type="text"
                                    value={config?.identity?.slogan || ''}
                                    onChange={(e) => handleIdentityChange('slogan', e.target.value)}
                                    className={INPUT_CLASSES}
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Logo URL</label>
                                <div className="relative">
                                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={config?.identity?.logoUrl || ''}
                                        onChange={(e) => handleIdentityChange('logoUrl', e.target.value)}
                                        className={`${INPUT_CLASSES} pl-10`}
                                        placeholder="https://ejemplo.com/logo.png"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Favicon URL</label>
                                <input
                                    type="text"
                                    value={config?.identity?.faviconUrl || ''}
                                    onChange={(e) => handleIdentityChange('faviconUrl', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="https://ejemplo.com/favicon.ico"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'colors':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Paleta de colores</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {['primary', 'secondary', 'background', 'surface', 'text_primary', 'text_secondary', 'accent', 'border'].map(colorKey => (
                                <div key={colorKey}>
                                    <label className={LABEL_CLASSES} capitalize>{colorKey.replace('_', ' ')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={config?.colors?.[colorKey] || '#000000'}
                                            onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                            className={COLOR_INPUT_CLASSES}
                                        />
                                        <input
                                            type="text"
                                            value={config?.colors?.[colorKey] || ''}
                                            onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                            className={`${INPUT_CLASSES} font-mono text-xs`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {themePresets.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-slate-200">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Presets de temas</h4>
                                <div className="flex flex-wrap gap-2">
                                    {themePresets.map(preset => (
                                        <Button key={preset.id} size="sm" variant="secondary" onClick={() => applyThemePreset(preset)}>
                                            {preset.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'fonts':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Tipografías</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Títulos (Heading)</label>
                                <input
                                    type="text"
                                    value={config?.fonts?.heading || ''}
                                    onChange={(e) => handleFontChange('heading', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="Inter, system-ui, sans-serif"
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Cuerpo (Body)</label>
                                <input
                                    type="text"
                                    value={config?.fonts?.body || ''}
                                    onChange={(e) => handleFontChange('body', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="Inter, system-ui, sans-serif"
                                />
                            </div>
                        </div>
                        {fontPresets.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-slate-200">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Presets de fuentes</h4>
                                <div className="flex flex-wrap gap-2">
                                    {fontPresets.map(preset => (
                                        <Button key={preset.id} size="sm" variant="secondary" onClick={() => applyFontPreset(preset)}>
                                            {preset.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'buttons':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Estilo de botones</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Border Radius</label>
                                <input
                                    type="text"
                                    value={config?.buttons?.borderRadius || ''}
                                    onChange={(e) => handleButtonChange('borderRadius', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="lg"
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Padding X</label>
                                <input
                                    type="text"
                                    value={config?.buttons?.paddingX || ''}
                                    onChange={(e) => handleButtonChange('paddingX', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="4"
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Padding Y</label>
                                <input
                                    type="text"
                                    value={config?.buttons?.paddingY || ''}
                                    onChange={(e) => handleButtonChange('paddingY', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="2"
                                />
                            </div>
                        </div>
                        {buttonPresets.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-slate-200">
                                <h4 className="text-sm font-medium text-slate-700 mb-3">Presets de botones</h4>
                                <div className="flex flex-wrap gap-2">
                                    {buttonPresets.map(preset => (
                                        <Button key={preset.id} size="sm" variant="secondary" onClick={() => applyButtonPreset(preset)}>
                                            {preset.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'sidebar':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Configuración del sidebar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Ancho</label>
                                <input
                                    type="text"
                                    value={config?.sidebar?.width || ''}
                                    onChange={(e) => handleSidebarChange('width', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="280px"
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Color de fondo</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config?.sidebar?.backgroundColor || '#000000'}
                                        onChange={(e) => handleSidebarChange('backgroundColor', e.target.value)}
                                        className={COLOR_INPUT_CLASSES}
                                    />
                                    <input
                                        type="text"
                                        value={config?.sidebar?.backgroundColor || ''}
                                        onChange={(e) => handleSidebarChange('backgroundColor', e.target.value)}
                                        className={`${INPUT_CLASSES} font-mono text-xs`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Color de texto</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config?.sidebar?.textColor || '#ffffff'}
                                        onChange={(e) => handleSidebarChange('textColor', e.target.value)}
                                        className={COLOR_INPUT_CLASSES}
                                    />
                                    <input
                                        type="text"
                                        value={config?.sidebar?.textColor || ''}
                                        onChange={(e) => handleSidebarChange('textColor', e.target.value)}
                                        className={`${INPUT_CLASSES} font-mono text-xs`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Color hover</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config?.sidebar?.hoverColor || '#ffffff'}
                                        onChange={(e) => handleSidebarChange('hoverColor', e.target.value)}
                                        className={COLOR_INPUT_CLASSES}
                                    />
                                    <input
                                        type="text"
                                        value={config?.sidebar?.hoverColor || ''}
                                        onChange={(e) => handleSidebarChange('hoverColor', e.target.value)}
                                        className={`${INPUT_CLASSES} font-mono text-xs`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'layout':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Configuración del layout</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Ancho máximo</label>
                                <input
                                    type="text"
                                    value={config?.layout?.maxWidth || ''}
                                    onChange={(e) => handleLayoutChange('maxWidth', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="1400px"
                                />
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Padding</label>
                                <input
                                    type="text"
                                    value={config?.layout?.padding || ''}
                                    onChange={(e) => handleLayoutChange('padding', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="24px"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'emails':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Configuración de emails</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Color de cabecera</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config?.emails?.headerColor || '#000000'}
                                        onChange={(e) => handleEmailsChange('headerColor', e.target.value)}
                                        className={COLOR_INPUT_CLASSES}
                                    />
                                    <input
                                        type="text"
                                        value={config?.emails?.headerColor || ''}
                                        onChange={(e) => handleEmailsChange('headerColor', e.target.value)}
                                        className={`${INPUT_CLASSES} font-mono text-xs`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>URL del Logo</label>
                                <input
                                    type="text"
                                    value={config?.emails?.logoUrl || ''}
                                    onChange={(e) => handleEmailsChange('logoUrl', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="https://ejemplo.com/logo-email.png"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={LABEL_CLASSES}>Texto del footer</label>
                                <input
                                    type="text"
                                    value={config?.emails?.footerText || ''}
                                    onChange={(e) => handleEmailsChange('footerText', e.target.value)}
                                    className={INPUT_CLASSES}
                                    placeholder="© 2024 Tu Agencia. Todos los derechos reservados."
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'legal':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Enlaces legales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASSES}>Términos y condiciones</label>
                                <div className="relative">
                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="url"
                                        value={config?.legal?.termsUrl || ''}
                                        onChange={(e) => handleLegalChange('termsUrl', e.target.value)}
                                        className={`${INPUT_CLASSES} pl-10`}
                                        placeholder="https://ejemplo.com/terminos"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASSES}>Política de privacidad</label>
                                <div className="relative">
                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="url"
                                        value={config?.legal?.privacyUrl || ''}
                                        onChange={(e) => handleLegalChange('privacyUrl', e.target.value)}
                                        className={`${INPUT_CLASSES} pl-10`}
                                        placeholder="https://ejemplo.com/privacidad"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configuración de Diseño"
                description="Personaliza la identidad visual de la plataforma"
                icon={Palette}
                action={
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={loadConfig} disabled={loading} title="Refrescar datos">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleExport} title="Exportar configuración">
                            <Download className="h-4 w-4 mr-1" />
                            Exportar
                        </Button>
                        <label className="cursor-pointer">
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                            <Button size="sm" variant="secondary" as="span" title="Importar configuración">
                                <Upload className="h-4 w-4 mr-1" />
                                Importar
                            </Button>
                        </label>
                    </div>
                }
            />

            {/* Tabs - Estilo horizontal compacto como email-config */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200 p-2 gap-1 bg-slate-50 flex-wrap">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* Vista previa fijo a la derecha */}
                    <div className="flex gap-6">
                        {/* Contenido principal */}
                        <div className="flex-1">{renderContent()}</div>

                        {/* Vista Previa fijo */}
                        <div className="w-64 shrink-0 space-y-4 flex-1">
                            <div className="bg-white rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-slate-900">Vista previa</h3>
                                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                        <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-md ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}>
                                            <Monitor className="h-4 w-4 text-slate-600" />
                                        </button>
                                        <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-md ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}>
                                            <Smartphone className="h-4 w-4 text-slate-600" />
                                        </button>
                                    </div>
                                </div>
                                <div className={`border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center py-6 ${previewMode === 'mobile' ? 'max-w-[200px] mx-auto' : ''}`}>
                                    <div className="text-center space-y-1.5">
                                        <Eye className="h-6 w-6 text-slate-400 mx-auto" />
                                        <p className="text-xs text-slate-500">Vista previa</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
                <Button variant="secondary" onClick={handleReset}>
                    Restablecer
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar configuración
                </Button>
            </div>
        </div>
    );
}
