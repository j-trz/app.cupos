import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WhiteLabelService from '../services/whiteLabelService';
import Swal from 'sweetalert2';
import {
    Palette, Type, MousePointer, Layout, Sidebar as SidebarIcon,
    Save, Download, Upload, RefreshCw, Check, Building2, Mail, FileText, Eye,
    Monitor, Smartphone
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configuración de Marca Blanca"
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

            {/* Tabs */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-64 shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1 flex">
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
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {activeTab === 'identity' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        {activeTab === 'fonts' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Tipografías</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['heading', 'body'].map(fontKey => (
                                        <div key={fontKey}>
                                            <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{fontKey === 'heading' ? 'Títulos' : 'Cuerpo'}</label>
                                            <input
                                                type="text"
                                                value={config?.fonts?.[fontKey] || ''}
                                                onChange={(e) => handleFontChange(fontKey, e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            />
                                        </div>
                                    ))}
                                    {fontPresets.length > 0 && (
                                        <div className="pt-4 border-t border-slate-200">
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
                            </div>
                        )}
                        {activeTab === 'colors' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'colors' && 'Colores'}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {['primary', 'secondary', 'background', 'text', 'accent', 'border'].map(colorKey => (
                                        <div key={colorKey}>
                                            <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{colorKey}</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={config?.colors?.[colorKey] || '#000000'}
                                                    onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                                    className="h-10 w-14 rounded border border-slate-300"
                                                />
                                                <input
                                                    type="text"
                                                    value={config?.colors?.[colorKey] || ''}
                                                    onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {themePresets.length > 0 && (
                                        <div className="pt-4 border-t border-slate-200">
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
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-slate-900">Identidad de la marca</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Nombre de la agencia</label>
                                <input
                                    type="text"
                                    value={config?.identity?.agency_name || ''}
                                    onChange={(e) => handleIdentityChange('agency_name', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Email de contacto</label>
                                <input
                                    type="email"
                                    value={config?.identity?.contact_email || ''}
                                    onChange={(e) => handleIdentityChange('contact_email', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-600">Eslogan</label>
                                <input
                                    type="text"
                                    value={config?.identity?.slogan || ''}
                                    onChange={(e) => handleIdentityChange('slogan', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'colors' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        {activeTab === 'layout' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Layout</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['maxWidth', 'padding'].map(key => (
                                        <div key={key}>
                                            <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key}</label>
                                            <input
                                                type="text"
                                                value={config?.layout?.[key] || ''}
                                                onChange={(e) => handleLayoutChange(key, e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'sidebar' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'sidebar' && 'Sidebar'}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">Ancho</label>
                                        <input
                                            type="text"
                                            value={config?.sidebar?.width || ''}
                                            onChange={(e) => handleSidebarChange('width', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">Color de fondo</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={config?.sidebar?.backgroundColor || '#000000'}
                                                onChange={(e) => handleSidebarChange('backgroundColor', e.target.value)}
                                                className="h-10 w-14 rounded border border-slate-300"
                                            />
                                            <input
                                                type="text"
                                                value={config?.sidebar?.backgroundColor || ''}
                                                onChange={(e) => handleSidebarChange('backgroundColor', e.target.value)}
                                                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'colors' && 'Colores'}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {['primary', 'secondary', 'background', 'text', 'accent', 'border'].map(colorKey => (
                                <div key={colorKey}>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{colorKey}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={config?.colors?.[colorKey] || '#000000'}
                                            onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                            className="h-10 w-14 rounded border border-slate-300"
                                        />
                                        <input
                                            type="text"
                                            value={config?.colors?.[colorKey] || ''}
                                            onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {themePresets.length > 0 && (
                            <div className="pt-4 border-t border-slate-200">
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
                )}

                {activeTab === 'fonts' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        {activeTab === 'legal' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'legal' && 'Legal'}</h3>
                                <div className="space-y-4">
                                    {['termsUrl', 'privacyUrl'].map(key => (
                                        <div key={key}>
                                            <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key === 'termsUrl' ? 'URL Términos' : 'URL Privacidad'}</label>
                                            <input
                                                type="text"
                                                value={config?.legal?.[key] || ''}
                                                onChange={(e) => handleLegalChange(key, e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'emails' && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Emails</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['headerColor', 'footerText', 'logoUrl'].map(key => (
                                        <div key={key} className={key === 'footerText' ? 'md:col-span-2' : ''}>
                                            <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key}</label>
                                            {key === 'headerColor' ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={config?.emails?.[key] || '#000000'}
                                                        onChange={(e) => handleEmailsChange(key, e.target.value)}
                                                        className="h-10 w-14 rounded border border-slate-300"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={config?.emails?.[key] || ''}
                                                        onChange={(e) => handleEmailsChange(key, e.target.value)}
                                                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={config?.emails?.[key] || ''}
                                                    onChange={(e) => handleEmailsChange(key, e.target.value)}
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'fonts' && 'Tipografías'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['heading', 'body'].map(fontKey => (
                                <div key={fontKey}>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{fontKey === 'heading' ? 'Títulos' : 'Cuerpo'}</label>
                                    <input
                                        type="text"
                                        value={config?.fonts?.[fontKey] || ''}
                                        onChange={(e) => handleFontChange(fontKey, e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            ))}
                        </div>
                        {fontPresets.length > 0 && (
                            <div className="pt-4 border-t border-slate-200">
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
                )}

                {activeTab === 'buttons' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'buttons' && 'Botones'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['borderRadius', 'paddingX', 'paddingY'].map(key => (
                                <div key={key}>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">{key}</label>
                                    <input
                                        type="text"
                                        value={config?.buttons?.[key] || ''}
                                        onChange={(e) => handleButtonChange(key, e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            ))}
                        </div>
                        {buttonPresets.length > 0 && (
                            <div className="pt-4 border-t border-slate-200">
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
                )}

                {activeTab === 'sidebar' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'sidebar' && 'Sidebar'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Ancho</label>
                                <input
                                    type="text"
                                    value={config?.sidebar?.width || ''}
                                    onChange={(e) => handleSidebarChange('width', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Color de fondo</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config?.sidebar?.backgroundColor || '#000000'}
                                        onChange={(e) => handleSidebarChange('backgroundColor', e.target.value)}
                                        className="h-10 w-14 rounded border border-slate-300"
                                    />
                                    <input
                                        type="text"
                                        value={config?.sidebar?.backgroundColor || ''}
                                        onChange={(e) => handleSidebarChange('backgroundColor', e.target.value)}
                                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'layout' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'layout' && 'Layout'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['maxWidth', 'padding'].map(key => (
                                <div key={key}>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key}</label>
                                    <input
                                        type="text"
                                        value={config?.layout?.[key] || ''}
                                        onChange={(e) => handleLayoutChange(key, e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'emails' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'emails' && 'Emails'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['headerColor', 'footerText', 'logoUrl'].map(key => (
                                <div key={key} className={key === 'footerText' ? 'md:col-span-2' : ''}>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key}</label>
                                    {key === 'headerColor' ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={config?.emails?.[key] || '#000000'}
                                                onChange={(e) => handleEmailsChange(key, e.target.value)}
                                                className="h-10 w-14 rounded border border-slate-300"
                                            />
                                            <input
                                                type="text"
                                                value={config?.emails?.[key] || ''}
                                                onChange={(e) => handleEmailsChange(key, e.target.value)}
                                                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={config?.emails?.[key] || ''}
                                            onChange={(e) => handleEmailsChange(key, e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'legal' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'legal' && 'Legal'}</h3>
                        <div className="space-y-4">
                            {['termsUrl', 'privacyUrl'].map(key => (
                                <div key={key}>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key === 'termsUrl' ? 'URL Términos' : 'URL Privacidad'}</label>
                                    <input
                                        type="text"
                                        value={config?.legal?.[key] || ''}
                                        onChange={(e) => handleLegalChange(key, e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Vista previa</h3>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setPreviewMode('desktop')} className={`p-2 rounded-md ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}>
                            <Monitor className="h-4 w-4 text-slate-600" />
                        </button>
                        <button onClick={() => setPreviewMode('mobile')} className={`p-2 rounded-md ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}>
                            <Smartphone className="h-4 w-4 text-slate-600" />
                        </button>
                    </div>
                </div>
                <div className={`border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center py-12 ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
                    <div className="text-center space-y-2">
                        <Eye className="h-8 w-8 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-500">Vista previa del tema aplicado</p>
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
        </div >
    );
}
