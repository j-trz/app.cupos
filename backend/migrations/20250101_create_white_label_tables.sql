-- =============================================================================
-- MIGRACIÓN: Sistema de Marca Blanca Profesional
-- Fecha: 2025-01-01
-- Descripción: Crea las tablas necesarias para el sistema de white-label
-- =============================================================================

BEGIN;

-- =============================================================================
-- Tabla: white_label_configs
-- Configuración completa por agencia
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.white_label_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Identidad Visual
    company_name VARCHAR(255),
    company_tagline TEXT,
    logo_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    og_image_url TEXT,
    
    -- Paleta de Colores
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    primary_hover_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    secondary_hover_color VARCHAR(7) DEFAULT '#475569',
    accent_color VARCHAR(7) DEFAULT '#f59e0b',
    background_color VARCHAR(7) DEFAULT '#f8fafc',
    surface_color VARCHAR(7) DEFAULT '#ffffff',
    text_primary_color VARCHAR(7) DEFAULT '#0f172a',
    text_secondary_color VARCHAR(7) DEFAULT '#64748b',
    border_color VARCHAR(7) DEFAULT '#e2e8f0',
    success_color VARCHAR(7) DEFAULT '#22c55e',
    warning_color VARCHAR(7) DEFAULT '#f59e0b',
    error_color VARCHAR(7) DEFAULT '#ef4444',
    info_color VARCHAR(7) DEFAULT '#3b82f6',
    
    -- Tipografías
    font_heading VARCHAR(100) DEFAULT 'Inter',
    font_body VARCHAR(100) DEFAULT 'Inter',
    font_mono VARCHAR(100) DEFAULT 'JetBrains Mono',
    font_size_base VARCHAR(10) DEFAULT '16px',
    font_weight_normal INTEGER DEFAULT 400,
    font_weight_medium INTEGER DEFAULT 500,
    font_weight_bold INTEGER DEFAULT 700,
    
    -- Botones
    button_radius VARCHAR(10) DEFAULT '0.5rem',
    button_shadow VARCHAR(50) DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    button_hover_scale VARCHAR(10) DEFAULT '1.02',
    button_transition VARCHAR(50) DEFAULT 'all 0.2s ease',
    
    -- Sidebar
    sidebar_bg_color VARCHAR(7) DEFAULT '#0f172a',
    sidebar_text_color VARCHAR(7) DEFAULT '#e2e8f0',
    sidebar_active_bg VARCHAR(7) DEFAULT '#ffffff',
    sidebar_active_text VARCHAR(7) DEFAULT '#0f172a',
    sidebar_width VARCHAR(10) DEFAULT '320px',
    sidebar_collapsed_width VARCHAR(10) DEFAULT '80px',
    
    -- Layout
    border_radius_sm VARCHAR(10) DEFAULT '0.25rem',
    border_radius_md VARCHAR(10) DEFAULT '0.5rem',
    border_radius_lg VARCHAR(10) DEFAULT '0.75rem',
    border_radius_xl VARCHAR(10) DEFAULT '1rem',
    shadow_sm VARCHAR(100) DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    shadow_md VARCHAR(100) DEFAULT '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    shadow_lg VARCHAR(100) DEFAULT '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    
    -- Emails
    email_header_logo_url TEXT,
    email_footer_text TEXT,
    email_support_url TEXT,
    
    -- Legal
    legal_company_name VARCHAR(255),
    legal_address TEXT,
    legal_phone VARCHAR(50),
    legal_email VARCHAR(255),
    terms_url TEXT,
    privacy_url TEXT,
    
    -- Configuración
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agency_id)
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_white_label_configs_agency_id ON public.white_label_configs(agency_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_is_active ON public.white_label_configs(is_active);

-- Comentarios
COMMENT ON TABLE public.white_label_configs IS 'Configuración de marca blanca por agencia';
COMMENT ON COLUMN public.white_label_configs.agency_id IS 'ID de la agencia asociada';
COMMENT ON COLUMN public.white_label_configs.primary_color IS 'Color primario en formato HEX';
COMMENT ON COLUMN public.white_label_configs.font_heading IS 'Familia tipográfica para títulos';
COMMENT ON COLUMN public.white_label_configs.font_body IS 'Familia tipográfica para texto general';
COMMENT ON COLUMN public.white_label_configs.button_radius IS 'Radio de borde de botones';
COMMENT ON COLUMN public.white_label_configs.sidebar_bg_color IS 'Color de fondo del sidebar';

COMMIT;
