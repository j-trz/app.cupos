import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWhiteLabel, applyCSSVariables } from '../contexts/WhiteLabelContext';
import WhiteLabelService from '../services/whiteLabelService';
import Swal from 'sweetalert2';
import {
    Palette, Type, MousePointer, Layout, Sidebar as SidebarIcon,
    Save, Download, Upload, RefreshCw, Check, Building2, Mail, FileText, Eye,
    Image, Link
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Badge from '../components/ui/Badge.jsx';
import WhiteLabelPreviewModal from '../components/WhiteLabelPreviewModal.jsx';

// ─── Colores preset para quick-pick ────────────────────────────
const PRESET_COLORS = {
    'Ocean': { primary: '#0ea5e9', secondary: '#64748b', accent: '#f59e0b', surface: '#f0f9ff', background: '#ffffff' },
    'Bosque': { primary: '#16a34a', secondary: '#475569', accent: '#ea580c', surface: '#f0fdf4', background: '#ffffff' },
    'Viola': { primary: '#9333ea', secondary: '#64748b', accent: '#f59e0b', surface: '#faf5ff', background: '#ffffff' },
    'Berry': { primary: '#dc2626', secondary: '#475569', accent: '#f59e0b', surface: '#fef2f2', background: '#ffffff' },
    'Noche': { primary: '#e2e8f0', secondary: '#94a3b8', accent: '#fbbf24', surface: '#1e293b', background: '#0f172a' },
    'Rose': { primary: '#ec4899', secondary: '#64748b', accent: '#f59e0b', surface: '#fdf2f8', background: '#ffffff' },
};

// ─── Fonts disponibles ────────────────────────────────────────
const FONT_OPTIONS = [
    { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
    { value: 'Roboto, system-ui, sans-serif', label: 'Roboto' },
    { value: 'Poppins, system-ui, sans-serif', label: 'Poppins' },
    { value: 'Montserrat, system-ui, sans-serif', label: 'Montserrat' },
    { value: 'Open Sans, system-ui, sans-serif', label: 'Open Sans' },
    { value: 'Lato, system-ui, sans-serif', label: 'Lato' },
    { value: 'Nunito, system-ui, sans-serif', label: 'Nunito' },
    { value: 'DM Sans, system-ui, sans-serif', label: 'DM Sans' },
];

const INPUT_CLASSES = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
const COLOR_INPUT_CLASSES = "h-10 w-14 rounded border border-slate-300";
const SECTION_PAD = "space-y-6";

// ─── Default config ───────────────────────────────────────────
const DEFAULT_CONFIG = {
    identity: { agency_name: '', contact_email: '', slogan: '', logoUrl: '', faviconUrl: '' },
    colors: {
        primary: '#3b82f6', secondary: '#64748b', background: '#ffffff',
        surface: '#f8fafc', text_primary: '#0f172a', text_secondary: '#64748b',
        accent: '#f59e0b', border: '#e2e8f0', success: '#22c55e', error: '#ef4444',
    },
    fonts: { heading: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' },
    buttons: { borderRadius: 'md', paddingX: '4', paddingY: '2', fontWeight: 'medium' },
    sidebar: { width: '280px', backgroundColor: '#0f172a', textColor: '#f8fafc', hoverColor: '#1e293b', hoverTextColor: '#ffffff', activeColor: '#3b82f6' },
    layout: { maxWidth: '100%', padding: '24px', borderRadius: 'lg' },
    legal: { termsUrl: '', privacyUrl: '' },
};

const tabs = [
    { id: 'identity', label: 'Identidad', icon: Building2 },
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'fonts', label: 'Tipografías', icon: Type },
    { id: 'buttons', label: 'Botones', icon: MousePointer },
    { id: 'sidebar', label: 'Sidebar', icon: SidebarIcon },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'legal', label: 'Legal', icon: FileText },
];

// ═══════════════════════════════════════════════════════════════
// Mini Preview Components (usados en el formulario)
// ═══════════════════════════════════════════════════════════════

function PreviewButton({ config, label = 'Botón Primario' }) {
    const b = config.buttons;
    const c = config.colors;
    const radiusMap = { sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px' };
    const pxMap = { 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px' };
    const pyMap = { 1: '4px', 2: '8px', 3: '10px', 4: '12px', 5: '14px', 6: '16px' };

    return (
        <button style={{
            backgroundColor: c.primary,
            color: '#ffffff',
            borderRadius: radiusMap[b.borderRadius] || '8px',
            paddingLeft: pxMap[b.paddingX] || '16px',
            paddingRight: pxMap[b.paddingX] || '16px',
            paddingTop: pyMap[b.paddingY] || '8px',
            paddingBottom: pyMap[b.paddingY] || '8px',
            fontWeight: b.fontWeight || '500',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}>
            {label}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function WhiteLabelConfig() {
    const { user } = useAuth();
    const { config: appConfig, refresh } = useWhiteLabel();
    const [activeTab, setActiveTab] = useState('identity');
    const [config, setConfig] = useState(null);
    const [configId, setConfigId] = useState(null);
    const [isDefault, setIsDefault] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Vista previa estado
    const [previewModalOpen, setPreviewModalOpen] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    // Aplicar config actual al CSS custom properties en tiempo real
    useEffect(() => {
        if (!config) return;
        try {
            const flat = flattenForCSS(config);
            applyCSSVariables(flat);
        } catch (e) { /* noop */ }
    }, [config]);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await WhiteLabelService.getConfig();
            if (response?.config) {
                const merged = {
                    ...DEFAULT_CONFIG,
                    ...response.config,
                    identity: { ...DEFAULT_CONFIG.identity, ...(response.config.identity || {}) },
                    colors: { ...DEFAULT_CONFIG.colors, ...(response.config.colors || {}) },
                    fonts: { ...DEFAULT_CONFIG.fonts, ...(response.config.fonts || {}) },
                    buttons: { ...DEFAULT_CONFIG.buttons, ...(response.config.buttons || {}) },
                    sidebar: { ...DEFAULT_CONFIG.sidebar, ...(response.config.sidebar || {}) },
                    layout: { ...DEFAULT_CONFIG.layout, ...(response.config.layout || {}) },
                    legal: { ...DEFAULT_CONFIG.legal, ...(response.config.legal || {}) },
                };
                setConfig(merged);
                setIsDefault(response.isDefault ?? true);
                if (!response.isDefault && response.config.id) setConfigId(response.config.id);
            } else {
                setConfig({ ...DEFAULT_CONFIG });
                setIsDefault(true);
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
            setConfig({ ...DEFAULT_CONFIG });
            setIsDefault(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (isDefault) {
                await WhiteLabelService.createConfig({ agency_id: user.agencia, ...config });
                Swal.fire({ icon: 'success', title: 'Creado', text: 'Configuración creada exitosamente', timer: 1500, showConfirmButton: false });
            } else {
                await WhiteLabelService.updateConfig(configId, config);
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Configuración actualizada exitosamente', timer: 1500, showConfirmButton: false });
            }
            // Recargar la config global del context
            refresh();
            loadConfig();
        } catch (error) {
            console.error('Error al guardar:', error);
            Swal.fire('Error', error.message || 'No se pudo guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        const result = await Swal.fire({
            title: '¿Restablecer?', text: 'Se perderán los cambios personalizados',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, restablecer', cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                if (configId) await WhiteLabelService.deleteConfig(configId);
                loadConfig();
                Swal.fire({ icon: 'success', title: 'Restablecido', timer: 1500, showConfirmButton: false });
            } catch (error) {
                Swal.fire('Error', 'No se pudo restablecer', 'error');
            }
        }
    };

    // Helpers de cambio
    const up = (section, key, val) => setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: val } }));

    // Flatten for CSS vars
    const flattenForCSS = (cfg) => ({
        config: {
            colors: cfg.colors,
            fonts: { heading: cfg.fonts.heading, body: cfg.fonts.body },
            buttons: { radius: btnRadiusToRem(cfg.buttons.borderRadius), shadow: 'none', hover_scale: '1.02', transition: 'all 0.2s ease' },
            sidebar: { bg_color: cfg.sidebar.backgroundColor, text_color: cfg.sidebar.textColor, active_bg: cfg.sidebar.activeColor, active_text: '#fff', hover_bg: cfg.sidebar.hoverColor || '#1e293b', hover_text: cfg.sidebar.hoverTextColor || '#ffffff', width: cfg.sidebar.width, collapsed_width: '56px' },
            layout: { border_radius_sm: '4px', border_radius_md: '8px', border_radius_lg: cfg.buttons.borderRadius === 'lg' ? '12px' : '8px', border_radius_xl: '16px', shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1)', shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
        }
    });

    const btnRadiusToRem = (r) => {
        const map = { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px' };
        return map[r] || '0.5rem';
    };

    if (loading) {
        return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>;
    }

    const c = config?.colors || DEFAULT_CONFIG.colors;
    const f = config?.fonts || DEFAULT_CONFIG.fonts;
    const b = config?.buttons || DEFAULT_CONFIG.buttons;
    const s = config?.sidebar || DEFAULT_CONFIG.sidebar;
    const id = config?.identity || DEFAULT_CONFIG.identity;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configuración de Marca Blanca"
                description="Personaliza la identidad visual de tu agencia. Cada cambio se refleja en tiempo real."
                icon={Palette}
                action={
                    <div className="flex items-center gap-2">
                        <Badge variant={isDefault ? 'warning' : 'success'}>{isDefault ? 'Predeterminado' : 'Personalizado'}</Badge>
                        <Button variant="secondary" size="sm" onClick={() => setPreviewModalOpen(true)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Vista previa
                        </Button>
                        <Button size="sm" onClick={loadConfig} disabled={loading} title="Recargar">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleReset}>
                            Restablecer
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar
                        </Button>
                    </div>
                }
            />

            {/* ═══ FORMULARIO (full width) ═══ */}
            <div className="w-full">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 p-2 gap-1 bg-slate-50 flex-wrap">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        <Icon className="h-4 w-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Contenido */}
                        <div className="p-6">
                            {/* ───────── IDENTITY ───────── */}
                            {activeTab === 'identity' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Identidad de la marca</h3>
                                        <p className="text-sm text-slate-500 mb-4">Nombre, email de contacto y branding principal.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Nombre de la agencia *</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input type="text" value={id.agency_name || ''} onChange={e => up('identity', 'agency_name', e.target.value)}
                                                    className={`${INPUT_CLASSES} pl-10`} placeholder="Ej: Form Travel" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Email de contacto</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input type="email" value={id.contact_email || ''} onChange={e => up('identity', 'contact_email', e.target.value)}
                                                    className={`${INPUT_CLASSES} pl-10`} placeholder="contacto@formtravel.com" />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Eslogan</label>
                                            <input type="text" value={id.slogan || ''} onChange={e => up('identity', 'slogan', e.target.value)}
                                                className={INPUT_CLASSES} placeholder="Viajes inolvidables, siempre a tu medida." />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Logo URL</label>
                                            <div className="relative">
                                                <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input type="text" value={id.logoUrl || ''} onChange={e => up('identity', 'logoUrl', e.target.value)}
                                                    className={`${INPUT_CLASSES} pl-10`} placeholder="https://..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Favicon URL</label>
                                            <input type="text" value={id.faviconUrl || ''} onChange={e => up('identity', 'faviconUrl', e.target.value)}
                                                className={INPUT_CLASSES} placeholder="https://..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ───────── COLORS ───────── */}
                            {activeTab === 'colors' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Paleta de colores</h3>
                                        <p className="text-sm text-slate-500 mb-4">Seleccioná o escribí el código hexadecimal.</p>
                                    </div>

                                    {/* Presets rápidos */}
                                    <div>
                                        <label className="mb-2 block text-xs font-medium text-slate-600">Temas rápidos</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(PRESET_COLORS).map(([name, palette]) => (
                                                <button key={name} onClick={() => {
                                                    setConfig(prev => ({ ...prev, colors: { ...prev.colors, ...palette } }));
                                                }}
                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors">
                                                    <div className="flex -space-x-1">
                                                        {Object.values(palette).slice(0, 3).map((color, i) => (
                                                            <div key={i} className="h-4 w-4 rounded-full border border-white ring-1 ring-slate-100" style={{ backgroundColor: color }} />
                                                        ))}
                                                    </div>
                                                    {name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Color pickers */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {Object.entries(c).map(([key, val]) => (
                                            <div key={key}>
                                                <label className="mb-1 block text-xs font-medium text-slate-600 capitalize">{key.replace(/_/g, ' ')}</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={val} onChange={e => up('colors', key, e.target.value)}
                                                        className={COLOR_INPUT_CLASSES} />
                                                    <input type="text" value={val} onChange={e => up('colors', key, e.target.value)}
                                                        className={`${INPUT_CLASSES} font-mono text-xs`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ───────── FONTS ───────── */}
                            {activeTab === 'fonts' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Tipografías</h3>
                                        <p className="text-sm text-slate-500 mb-4">Fuentes para títulos y cuerpo del texto.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Títulos (Heading)</label>
                                            <select value={f.heading || ''} onChange={e => up('fonts', 'heading', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {FONT_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value.split(',')[0] }}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Cuerpo (Body)</label>
                                            <select value={f.body || ''} onChange={e => up('fonts', 'body', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {FONT_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value.split(',')[0] }}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {/* Font preview */}
                                    <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Preview Heading</p>
                                            <p style={{ fontFamily: f.heading, fontSize: 24, fontWeight: 600, color: c.text_primary }}>
                                                La rápida marrón del zorro saltando
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Preview Body</p>
                                            <p style={{ fontFamily: f.body, fontSize: 14, color: c.text_secondary, lineHeight: 1.6 }}>
                                                El diseño tipográfico es fundamental para la legibilidad y la estética de cualquier plataforma. Una buena combinación de fuentes mejora la experiencia del usuario significativamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ───────── BUTTONS ───────── */}
                            {activeTab === 'buttons' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Estilo de botones</h3>
                                        <p className="text-sm text-slate-500 mb-4">Radio de bordes, padding y peso de fuente.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Border Radius</label>
                                            <select value={b.borderRadius || 'md'} onChange={e => up('buttons', 'borderRadius', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {['sm', 'md', 'lg', 'xl', 'full'].map(v => <option key={v} value={v}>{v === 'sm' ? 'Pequeño (6px)' : v === 'md' ? 'Mediano (8px)' : v === 'lg' ? 'Grande (12px)' : v === 'xl' ? 'Extra grande (16px)' : 'Redondo (9999px)'}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Padding X</label>
                                            <select value={b.paddingX || '4'} onChange={e => up('buttons', 'paddingX', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {[2, 3, 4, 5, 6].map(v => <option key={v} value={String(v)}>{v === 2 ? '2 (8px)' : v === 3 ? '3 (12px)' : v === 4 ? '4 (16px)' : v === 5 ? '5 (20px)' : '6 (24px)'}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Padding Y</label>
                                            <select value={b.paddingY || '2'} onChange={e => up('buttons', 'paddingY', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {[1, 2, 3, 4, 5, 6].map(v => <option key={v} value={String(v)}>{v === 1 ? '1 (4px)' : v === 2 ? '2 (8px)' : v === 3 ? '3 (10px)' : v === 4 ? '4 (12px)' : v === 5 ? '5 (14px)' : '6 (16px)'}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Font Weight</label>
                                            <select value={b.fontWeight || '500'} onChange={e => up('buttons', 'fontWeight', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {['normal', '400', '500', '600', '700'].map(v => <option key={v} value={v}>{v === 'normal' || v === '400' ? 'Normal (400)' : v === '500' ? 'Medium (500)' : v === '600' ? 'Semi bold (600)' : v === '700' ? 'Bold (700)' : ''}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Botón preview row */}
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <PreviewButton config={config} label="Primario" />
                                        <button style={{
                                            backgroundColor: 'transparent', color: c.primary,
                                            borderRadius: b.borderRadius === 'lg' ? '12px' : '8px',
                                            padding: '8px 16px', fontWeight: b.fontWeight || '500', fontSize: '14px',
                                            border: `1px solid ${c.border}`, cursor: 'pointer',
                                        }}>Secundario</button>
                                        <button style={{
                                            backgroundColor: c.success, color: '#fff',
                                            borderRadius: b.borderRadius === 'lg' ? '12px' : '8px',
                                            padding: '8px 16px', fontWeight: b.fontWeight || '500', fontSize: '14px',
                                            border: 'none', cursor: 'pointer',
                                        }}>Éxito</button>
                                    </div>
                                </div>
                            )}

                            {/* ───────── SIDEBAR ───────── */}
                            {activeTab === 'sidebar' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Sidebar</h3>
                                        <p className="text-sm text-slate-500 mb-4">Ancho, colores y estilo de navegación lateral.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Ancho</label>
                                            <input type="text" value={s.width || '280px'} onChange={e => up('sidebar', 'width', e.target.value)}
                                                className={INPUT_CLASSES} placeholder="280px" />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Color activo</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={s.activeColor || c.primary} onChange={e => up('sidebar', 'activeColor', e.target.value)}
                                                    className={COLOR_INPUT_CLASSES} />
                                                <input type="text" value={s.activeColor || c.primary} onChange={e => up('sidebar', 'activeColor', e.target.value)}
                                                    className={`${INPUT_CLASSES} font-mono text-xs`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Fondo</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={s.backgroundColor || '#0f172a'} onChange={e => up('sidebar', 'backgroundColor', e.target.value)}
                                                    className={COLOR_INPUT_CLASSES} />
                                                <input type="text" value={s.backgroundColor || '#0f172a'} onChange={e => up('sidebar', 'backgroundColor', e.target.value)}
                                                    className={`${INPUT_CLASSES} font-mono text-xs`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Texto</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={s.textColor || '#f8fafc'} onChange={e => up('sidebar', 'textColor', e.target.value)}
                                                    className={COLOR_INPUT_CLASSES} />
                                                <input type="text" value={s.textColor || '#f8fafc'} onChange={e => up('sidebar', 'textColor', e.target.value)}
                                                    className={`${INPUT_CLASSES} font-mono text-xs`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Hover (fondo)</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={s.hoverColor || '#1e293b'} onChange={e => up('sidebar', 'hoverColor', e.target.value)}
                                                    className={COLOR_INPUT_CLASSES} />
                                                <input type="text" value={s.hoverColor || '#1e293b'} onChange={e => up('sidebar', 'hoverColor', e.target.value)}
                                                    className={`${INPUT_CLASSES} font-mono text-xs`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Hover (texto)</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={s.hoverTextColor || '#ffffff'} onChange={e => up('sidebar', 'hoverTextColor', e.target.value)}
                                                    className={COLOR_INPUT_CLASSES} />
                                                <input type="text" value={s.hoverTextColor || '#ffffff'} onChange={e => up('sidebar', 'hoverTextColor', e.target.value)}
                                                    className={`${INPUT_CLASSES} font-mono text-xs`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ───────── LAYOUT ───────── */}
                            {activeTab === 'layout' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Layout general</h3>
                                        <p className="text-sm text-slate-500 mb-4">Max ancho, padding y radio de esquinas.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Max Width</label>
                                            <input type="text" value={config.layout.maxWidth || '100%'} onChange={e => up('layout', 'maxWidth', e.target.value)}
                                                className={INPUT_CLASSES} placeholder="1400px" />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Padding</label>
                                            <input type="text" value={config.layout.padding || '24px'} onChange={e => up('layout', 'padding', e.target.value)}
                                                className={INPUT_CLASSES} placeholder="24px" />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Border Radius General</label>
                                            <select value={config.layout.borderRadius || 'lg'} onChange={e => up('layout', 'borderRadius', e.target.value)}
                                                className={`${INPUT_CLASSES} bg-white`}>
                                                {['sm', 'md', 'lg', 'xl'].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ───────── LEGAL ───────── */}
                            {activeTab === 'legal' && (
                                <div className={SECTION_PAD}>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 mb-1">Enlaces legales</h3>
                                        <p className="text-sm text-slate-500 mb-4">URLs para términos y política de privacidad.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Términos y condiciones</label>
                                            <div className="relative">
                                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input type="url" value={config.legal.termsUrl || ''} onChange={e => up('legal', 'termsUrl', e.target.value)}
                                                    className={`${INPUT_CLASSES} pl-10`} placeholder="https://..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-600">Política de privacidad</label>
                                            <div className="relative">
                                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input type="url" value={config.legal.privacyUrl || ''} onChange={e => up('legal', 'privacyUrl', e.target.value)}
                                                    className={`${INPUT_CLASSES} pl-10`} placeholder="https://..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom actions */}
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-6 bg-slate-50">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Palette className="h-3.5 w-3.5" />
                            <span>Los cambios se aplican en tiempo real. Hacé click en "Guardar" para persistirlos.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={handleReset}>
                                Restablecer
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar configuración
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de vista previa */}
            <WhiteLabelPreviewModal
                open={previewModalOpen}
                onClose={() => setPreviewModalOpen(false)}
                config={config}
            />
        </div>
    );
}
