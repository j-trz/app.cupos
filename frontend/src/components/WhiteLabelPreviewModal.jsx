import { useState } from 'react';
import { X, Monitor, Smartphone, Mail, LayoutDashboard, Eye } from 'lucide-react';
import Button from './ui/Button.jsx';

function PreviewSidebarPreview({ config, collapsed }) {
    const s = config?.sidebar || {};
    const c = config?.colors || {};
    const f = config?.fonts || {};

    return (
        <div className="h-full transition-all duration-300" style={{
            width: collapsed ? 56 : (parseInt(s.width) || 280),
            backgroundColor: s.backgroundColor || '#0f172a',
            color: s.textColor || '#f8fafc',
            fontFamily: f.body || 'Inter, system-ui, sans-serif',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflow: 'hidden',
        }}>
            {!collapsed && (
                <>
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor: `${s.textColor || '#f8fafc'}20` }}>
                        {config?.identity?.logoUrl ? (
                            <img src={config.identity.logoUrl} alt="" className="h-7 w-7 rounded" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <div className="h-7 w-7 rounded" style={{ backgroundColor: c.primary || '#3b82f6' }} />
                        )}
                        <span className="text-sm font-semibold truncate">{config?.identity?.agency_name || 'Mi Agencia'}</span>
                    </div>
                    {['Dashboard', 'Reservas', 'Productos', 'Agencias'].map((item, i) => (
                        <div key={item} className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer"
                            style={{
                                backgroundColor: i === 0 ? (s.activeColor || c.primary) : 'transparent',
                                color: i === 0 ? '#fff' : (s.textColor || '#f8fafc'),
                                opacity: i === 0 ? 1 : 0.7,
                            }}
                            onMouseEnter={(e) => {
                                if (i !== 0) { e.currentTarget.style.backgroundColor = s.hoverColor || '#1e293b'; e.currentTarget.style.opacity = '1'; }
                            }}
                            onMouseLeave={(e) => {
                                if (i !== 0) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.7'; }
                            }}>
                            <div className="h-4 w-4 rounded bg-current opacity-30" />
                            <span className="truncate">{item}</span>
                        </div>
                    ))}
                </>
            )}
            {collapsed && (
                <>
                    <div className="h-8 w-8 rounded mx-auto mt-2" style={{ backgroundColor: c.primary || '#3b82f6' }} />
                    {['D', 'R', 'P'].map((letter, i) => (
                        <div key={i} className="h-8 w-8 rounded mx-auto flex items-center justify-center text-xs" style={{ backgroundColor: `${s.textColor || '#f8fafc'}15`, color: s.textColor || '#f8fafc' }}>{letter}</div>
                    ))}
                </>
            )}
        </div>
    );
}

function PreviewCardPreview({ config }) {
    const c = config?.colors || {};
    const f = config?.fonts || {};
    const b = config?.buttons || {};
    const radiusMap = { sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px' };

    return (
        <div className="rounded-xl border p-6" style={{
            backgroundColor: c.surface || '#ffffff',
            borderColor: c.border || '#e2e8f0',
            fontFamily: f.body || 'Inter, system-ui, sans-serif',
            borderRadius: radiusMap[b.borderRadius] || '8px',
        }}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-sm font-semibold" style={{ color: c.text_primary || '#0f172a', fontFamily: f.heading }}>
                        Estadísticas
                    </p>
                    <p className="text-xs mt-1" style={{ color: c.text_secondary || '#64748b' }}>Resumen mensual</p>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.primary || '#3b82f6'}15` }}>
                    <Eye className="h-5 w-5" style={{ color: c.primary || '#3b82f6' }} />
                </div>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: c.text_primary || '#0f172a' }}>1,234</p>
            <p className="text-xs" style={{ color: c.success || '#22c55e' }}>+12% vs mes anterior</p>
            <div className="mt-4 pt-4 border-t" style={{ borderColor: c.border || '#e2e8f0' }}>
                <div className="flex items-center justify-between text-xs">
                    <span style={{ color: c.text_secondary || '#64748b' }}>Estado</span>
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${c.success || '#22c55e'}20`, color: c.success || '#22c55e' }}>Activo</span>
                </div>
            </div>
        </div>
    );
}

function PreviewLoginPreview({ config }) {
    const c = config?.colors || {};
    const f = config?.fonts || {};
    const b = config?.buttons || {};
    const radiusMap = { sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px' };

    return (
        <div className="flex items-center justify-center min-h-[300px] rounded-xl" style={{ backgroundColor: c.background || '#ffffff', fontFamily: f.body }}>
            <div className="w-full max-w-sm p-6 rounded-xl border" style={{ backgroundColor: c.surface || '#ffffff', borderColor: c.border || '#e2e8f0' }}>
                <div className="text-center mb-6">
                    <div className="h-12 w-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: c.primary || '#3b82f6' }}>
                        <Eye className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold" style={{ color: c.text_primary || '#0f172a', fontFamily: f.heading }}>
                        {config?.identity?.agency_name || 'Mi Agencia'}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: c.text_secondary || '#64748b' }}>
                        {config?.identity?.slogan || 'Inicia sesión para continuar'}
                    </p>
                </div>
                <div className="space-y-3">
                    <input type="text" placeholder="Email" className="w-full px-3 py-2 text-sm rounded-md border" style={{ backgroundColor: c.background, borderColor: c.border, color: c.text_primary, fontFamily: f.body }} readOnly />
                    <input type="password" placeholder="Contraseña" className="w-full px-3 py-2 text-sm rounded-md border" style={{ backgroundColor: c.background, borderColor: c.border, color: c.text_primary, fontFamily: f.body }} readOnly />
                    <button className="w-full py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90" style={{
                        backgroundColor: c.primary || '#3b82f6',
                        borderRadius: radiusMap[b.borderRadius] || '8px',
                        fontWeight: b.fontWeight || '500',
                    }}>Iniciar sesión</button>
                </div>
            </div>
        </div>
    );
}

function PreviewEmailPreview({ config }) {
    const c = config?.colors || {};
    const f = config?.fonts || {};

    return (
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: c.border || '#e2e8f0' }}>
            <div className="px-4 py-3" style={{ backgroundColor: c.primary || '#3b82f6' }}>
                <div className="flex items-center gap-2">
                    {config?.identity?.logoUrl ? (
                        <img src={config.identity.logoUrl} alt="" className="h-6 w-6 rounded" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                        <div className="h-6 w-6 rounded bg-white/20" />
                    )}
                    <span className="text-sm font-semibold text-white">{config?.identity?.agency_name || 'Mi Agencia'}</span>
                </div>
            </div>
            <div className="px-4 py-4" style={{ backgroundColor: c.background || '#ffffff', fontFamily: f.body }}>
                <p className="text-sm font-semibold mb-2" style={{ color: c.text_primary || '#0f172a' }}>Confirmación de reserva</p>
                <p className="text-xs leading-relaxed" style={{ color: c.text_secondary || '#64748b' }}>
                    Estimado cliente, su reserva ha sido confirmada exitosamente. A continuación encontrará los detalles de su reserva.
                </p>
                <div className="mt-3 p-3 rounded" style={{ backgroundColor: c.surface || '#f8fafc', borderColor: c.border }}>
                    <p className="text-xs font-medium" style={{ color: c.text_primary }}>Pedido: #12345</p>
                    <p className="text-xs mt-1" style={{ color: c.text_secondary }}>Destino: Cancún, México</p>
                </div>
                <div className="mt-3">
                    <button className="px-4 py-2 text-xs font-medium text-white rounded-md" style={{ backgroundColor: c.primary || '#3b82f6' }}>
                        Ver detalles
                    </button>
                </div>
            </div>
            <div className="px-4 py-3 text-center border-t" style={{ backgroundColor: c.surface, borderColor: c.border }}>
                <p className="text-[10px]" style={{ color: c.text_secondary }}>© 2025 {config?.identity?.agency_name || 'Mi Agencia'}. Todos los derechos reservados.</p>
            </div>
        </div>
    );
}

const previewModes = [
    { id: 'sidebar', label: 'Sidebar', icon: LayoutDashboard },
    { id: 'login', label: 'Login', icon: Eye },
    { id: 'card', label: 'Tarjeta', icon: LayoutDashboard },
    { id: 'email', label: 'Email', icon: Mail },
];

export default function WhiteLabelPreviewModal({ open, onClose, config }) {
    const [mode, setMode] = useState('sidebar');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Vista previa en vivo</h2>
                        <p className="text-sm text-slate-500">Visualiza cómo se verá tu marca blanca</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={sidebarCollapsed} onChange={(e) => setSidebarCollapsed(e.target.checked)}
                                className="rounded border-slate-300" />
                            Sidebar colapsado
                        </label>
                        <button onClick={onClose} className="ml-2 p-1.5 rounded-lg hover:bg-slate-100">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 px-6 py-3 border-b bg-slate-50">
                    {previewModes.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setMode(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Preview content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                    {mode === 'sidebar' && (
                        <div className="flex bg-white rounded-xl overflow-hidden shadow-lg min-h-[400px]">
                            <PreviewSidebarPreview config={config} collapsed={sidebarCollapsed} />
                            <div className="flex-1 p-6">
                                <h3 className="text-xl font-semibold mb-2" style={{ color: config?.colors?.text_primary, fontFamily: config?.fonts?.heading }}>Contenido principal</h3>
                                <p className="text-sm" style={{ color: config?.colors?.text_secondary, fontFamily: config?.fonts?.body }}>
                                    Aquí se muestra cómo el sidebar se integra con el contenido. Cambia entre vista normal y colapsada.
                                </p>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg border" style={{ backgroundColor: config?.colors?.surface, borderColor: config?.colors?.border }}>
                                        <p className="text-2xl font-bold" style={{ color: config?.colors?.primary }}>2,450</p>
                                        <p className="text-xs mt-1" style={{ color: config?.colors?.text_secondary }}>Total reservas</p>
                                    </div>
                                    <div className="p-4 rounded-lg border" style={{ backgroundColor: config?.colors?.surface, borderColor: config?.colors?.border }}>
                                        <p className="text-2xl font-bold" style={{ color: config?.colors?.success }}>98%</p>
                                        <p className="text-xs mt-1" style={{ color: config?.colors?.text_secondary }}>Confirmadas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {mode === 'login' && (
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <PreviewLoginPreview config={config} />
                        </div>
                    )}
                    {mode === 'card' && (
                        <div className="bg-slate-50 rounded-xl p-6">
                            <PreviewCardPreview config={config} />
                        </div>
                    )}
                    {mode === 'email' && (
                        <div className="max-w-md mx-auto">
                            <PreviewEmailPreview config={config} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                    <span>Los cambios se aplican en tiempo real al guardar</span>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config?.colors?.primary }} />
                            <span>Primary: {config?.colors?.primary || '#3b82f6'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config?.sidebar?.backgroundColor }} />
                            <span>Sidebar: {config?.sidebar?.backgroundColor || '#0f172a'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
