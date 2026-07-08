import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import WhiteLabelService from '../services/whiteLabelService';

const WhiteLabelContext = createContext(null);

// Configuración por defecto
const DEFAULT_CONFIG = {
    identity: {
        agency_name: '',
        contact_email: '',
        slogan: '',
        logoUrl: '',
        faviconUrl: ''
    },
    colors: {
        primary: '#3b82f6',
        primary_hover: '#2563eb',
        secondary: '#64748b',
        secondary_hover: '#475569',
        accent: '#f59e0b',
        background: '#f8fafc',
        surface: '#ffffff',
        text_primary: '#0f172a',
        text_secondary: '#64748b',
        border: '#e2e8f0',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    },
    fonts: {
        heading: 'Inter',
        body: 'Inter',
        mono: 'JetBrains Mono'
    },
    buttons: {
        radius: '0.5rem',
        shadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        hover_scale: '1.02',
        transition: 'all 0.2s ease'
    },
    sidebar: {
        bg_color: '#0f172a',
        text_color: '#e2e8f0',
        active_bg: '#ffffff',
        active_text: '#0f172a',
        hover_bg: '#1e293b',
        hover_text: '#ffffff',
        width: '320px',
        collapsed_width: '80px'
    },
    layout: {
        border_radius_sm: '0.25rem',
        border_radius_md: '0.5rem',
        border_radius_lg: '0.75rem',
        border_radius_xl: '1rem',
        shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }
};

// Función para convertir color hex a RGB
function hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return '0, 0, 0';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

// Función para aplicar CSS variables al document
export function applyCSSVariables(config) {
    const root = document.documentElement;

    // Colors
    if (config.colors) {
        Object.entries(config.colors).forEach(([key, value]) => {
            const varName = `--color-${key.replace('_', '-')}`;
            root.style.setProperty(varName, value);
            // También crear versión RGB para uso con opacity
            root.style.setProperty(`${varName}-rgb`, hexToRgb(value));
        });
    }

    // Fonts
    if (config.fonts) {
        root.style.setProperty('--font-heading', `"${config.fonts.heading}", ui-sans-serif, system-ui, sans-serif`);
        root.style.setProperty('--font-body', `"${config.fonts.body}", ui-sans-serif, system-ui, sans-serif`);
        root.style.setProperty('--font-mono', `"${config.fonts.mono}", ui-monospace, monospace`);
    }

    // Buttons
    if (config.buttons) {
        root.style.setProperty('--button-radius', config.buttons.radius || '0.5rem');
        root.style.setProperty('--button-shadow', config.buttons.shadow || 'none');
        root.style.setProperty('--button-hover-scale', config.buttons.hover_scale || '1.02');
        root.style.setProperty('--button-transition', config.buttons.transition || 'all 0.2s ease');
    }

    // Sidebar
    if (config.sidebar) {
        root.style.setProperty('--sidebar-bg-color', config.sidebar.bg_color || '#0f172a');
        root.style.setProperty('--sidebar-text-color', config.sidebar.text_color || '#e2e8f0');
        root.style.setProperty('--sidebar-active-bg', config.sidebar.active_bg || '#ffffff');
        root.style.setProperty('--sidebar-active-text', config.sidebar.active_text || '#0f172a');
        root.style.setProperty('--sidebar-hover-bg', config.sidebar.hover_bg || '#1e293b');
        root.style.setProperty('--sidebar-width', config.sidebar.width || '320px');
        root.style.setProperty('--sidebar-collapsed-width', config.sidebar.collapsed_width || '80px');
    }

    // Layout
    if (config.layout) {
        root.style.setProperty('--radius-sm', config.layout.border_radius_sm || '0.25rem');
        root.style.setProperty('--radius-md', config.layout.border_radius_md || '0.5rem');
        root.style.setProperty('--radius-lg', config.layout.border_radius_lg || '0.75rem');
        root.style.setProperty('--radius-xl', config.layout.border_radius_xl || '1rem');
        root.style.setProperty('--shadow-sm', config.layout.shadow_sm || '0 1px 2px 0 rgb(0 0 0 / 0.05)');
        root.style.setProperty('--shadow-md', config.layout.shadow_md || '0 4px 6px -1px rgb(0 0 0 / 0.1)');
        root.style.setProperty('--shadow-lg', config.layout.shadow_lg || '0 10px 15px -3px rgb(0 0 0 / 0.1)');
    }
}

export function WhiteLabelProvider({ children }) {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [isDefault, setIsDefault] = useState(true);
    const [configId, setConfigId] = useState(null);

    const loadConfig = async () => {
        try {
            setIsLoading(true);
            const response = await WhiteLabelService.getConfig();

            if (response?.config) {
                const dbConfig = response.config;

                // Transformar formato de DB a formato estructurado
                const newConfig = {
                    identity: {
                        agency_name: dbConfig.identity?.agency_name || dbConfig.agency_name || '',
                        contact_email: dbConfig.identity?.contact_email || dbConfig.contact_email || '',
                        slogan: dbConfig.identity?.slogan || dbConfig.slogan || '',
                        logoUrl: dbConfig.identity?.logoUrl || dbConfig.logoUrl || '',
                        faviconUrl: dbConfig.identity?.faviconUrl || dbConfig.faviconUrl || ''
                    },
                    colors: {
                        primary: dbConfig.primary_color || DEFAULT_CONFIG.colors.primary,
                        primary_hover: dbConfig.primary_hover_color || DEFAULT_CONFIG.colors.primary_hover,
                        secondary: dbConfig.secondary_color || DEFAULT_CONFIG.colors.secondary,
                        secondary_hover: dbConfig.secondary_hover_color || DEFAULT_CONFIG.colors.secondary_hover,
                        accent: dbConfig.accent_color || DEFAULT_CONFIG.colors.accent,
                        background: dbConfig.background_color || DEFAULT_CONFIG.colors.background,
                        surface: dbConfig.surface_color || DEFAULT_CONFIG.colors.surface,
                        text_primary: dbConfig.text_primary_color || DEFAULT_CONFIG.colors.text_primary,
                        text_secondary: dbConfig.text_secondary_color || DEFAULT_CONFIG.colors.text_secondary,
                        border: dbConfig.border_color || DEFAULT_CONFIG.colors.border,
                        success: dbConfig.success_color || DEFAULT_CONFIG.colors.success,
                        warning: dbConfig.warning_color || DEFAULT_CONFIG.colors.warning,
                        error: dbConfig.error_color || DEFAULT_CONFIG.colors.error,
                        info: dbConfig.info_color || DEFAULT_CONFIG.colors.info
                    },
                    fonts: {
                        heading: dbConfig.font_heading || DEFAULT_CONFIG.fonts.heading,
                        body: dbConfig.font_body || DEFAULT_CONFIG.fonts.body,
                        mono: dbConfig.font_mono || DEFAULT_CONFIG.fonts.mono
                    },
                    buttons: {
                        radius: dbConfig.button_radius || DEFAULT_CONFIG.buttons.radius,
                        shadow: dbConfig.button_shadow || DEFAULT_CONFIG.buttons.shadow,
                        hover_scale: dbConfig.button_hover_scale || DEFAULT_CONFIG.buttons.hover_scale,
                        transition: dbConfig.button_transition || DEFAULT_CONFIG.buttons.transition
                    },
                    sidebar: {
                        bg_color: dbConfig.sidebar?.backgroundColor || dbConfig.sidebar_bg_color || DEFAULT_CONFIG.sidebar.bg_color,
                        text_color: dbConfig.sidebar?.textColor || dbConfig.sidebar_text_color || DEFAULT_CONFIG.sidebar.text_color,
                        active_bg: dbConfig.sidebar?.activeColor || dbConfig.sidebar_active_bg || DEFAULT_CONFIG.sidebar.active_bg,
                        active_text: dbConfig.sidebar?.activeText || dbConfig.sidebar_active_text || DEFAULT_CONFIG.sidebar.active_text,
                        hover_bg: dbConfig.sidebar?.hoverColor || dbConfig.sidebar_hover_bg || DEFAULT_CONFIG.sidebar.hover_bg,
                        hover_text: dbConfig.sidebar?.hoverTextColor || dbConfig.sidebar_hover_text || DEFAULT_CONFIG.sidebar.hover_text,
                        width: dbConfig.sidebar?.width || dbConfig.sidebar_width || DEFAULT_CONFIG.sidebar.width,
                        collapsed_width: dbConfig.sidebar?.collapsedWidth || dbConfig.sidebar_collapsed_width || DEFAULT_CONFIG.sidebar.collapsed_width
                    },
                    layout: {
                        border_radius_sm: dbConfig.border_radius_sm || DEFAULT_CONFIG.layout.border_radius_sm,
                        border_radius_md: dbConfig.border_radius_md || DEFAULT_CONFIG.layout.border_radius_md,
                        border_radius_lg: dbConfig.border_radius_lg || DEFAULT_CONFIG.layout.border_radius_lg,
                        border_radius_xl: dbConfig.border_radius_xl || DEFAULT_CONFIG.layout.border_radius_xl,
                        shadow_sm: dbConfig.shadow_sm || DEFAULT_CONFIG.layout.shadow_sm,
                        shadow_md: dbConfig.shadow_md || DEFAULT_CONFIG.layout.shadow_md,
                        shadow_lg: dbConfig.shadow_lg || DEFAULT_CONFIG.layout.shadow_lg
                    }
                };

                setConfig(newConfig);
                setIsDefault(response.isDefault || false);
                setConfigId(dbConfig.id || null);
            }
        } catch (error) {
            console.error('Error loading white-label config:', error);
            // Mantener configuración por defecto en caso de error
            setConfig(DEFAULT_CONFIG);
            setIsDefault(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        if (config) {
            applyCSSVariables(config);
        }
    }, [config]);

    const refresh = () => {
        loadConfig();
    };

    const value = useMemo(
        () => ({
            config,
            isLoading,
            isDefault,
            configId,
            refresh,
            colors: config.colors,
            fonts: config.fonts,
            buttons: config.buttons,
            sidebar: config.sidebar,
            layout: config.layout
        }),
        [config, isLoading, isDefault, configId]
    );

    return (
        <WhiteLabelContext.Provider value={value}>
            {children}
        </WhiteLabelContext.Provider>
    );
}

export function useWhiteLabel() {
    const context = useContext(WhiteLabelContext);
    if (!context) {
        throw new Error('useWhiteLabel must be used within WhiteLabelProvider');
    }
    return context;
}

// Hook específico para obtener solo los colores
export function useColors() {
    const { colors } = useWhiteLabel();
    return colors;
}

// Hook específico para obtener solo las fuentes
export function useFonts() {
    const { fonts } = useWhiteLabel();
    return fonts;
}
