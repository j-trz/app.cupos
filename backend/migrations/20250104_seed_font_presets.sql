-- =============================================================================
-- MIGRACIÓN: Presets de Fuentes Predefinidas
-- Fecha: 2025-01-04
-- Descripción: Inserta combinaciones de fuentes para el sistema de marca blanca
-- =============================================================================

BEGIN;

-- Crear tabla de presets de fuentes
CREATE TABLE IF NOT EXISTS public.font_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    heading_font VARCHAR(100) NOT NULL,
    body_font VARCHAR(100) NOT NULL,
    preview_url TEXT,
    is_google_font BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Limpiar datos existentes
TRUNCATE TABLE public.font_presets RESTART IDENTITY CASCADE;

-- Insertar presets de fuentes
INSERT INTO public.font_presets (name, heading_font, body_font, preview_url) VALUES
('Moderno', 'Inter', 'Inter', 'https://fonts.google.com/specimen/Inter'),
('Elegante', 'Playfair Display', 'Source Sans Pro', 'https://fonts.google.com'),
('Corporativo', 'Roboto', 'Roboto', 'https://fonts.google.com/specimen/Roboto'),
('Creativo', 'Poppins', 'Open Sans', 'https://fonts.google.com'),
('Minimalista', 'DM Sans', 'DM Sans', 'https://fonts.google.com'),
('Tecnológico', 'Space Grotesk', 'Inter', 'https://fonts.google.com'),
('Editorial', 'Merriweather', 'Lato', 'https://fonts.google.com'),
('Geometric', 'Montserrat', 'Open Sans', 'https://fonts.google.com');

-- Comentarios
COMMENT ON TABLE public.font_presets IS 'Presets de combinaciones tipográficas';
COMMENT ON COLUMN public.font_presets.name IS 'Nombre descriptivo del preset';
COMMENT ON COLUMN public.font_presets.heading_font IS 'Familia tipográfica para títulos';
COMMENT ON COLUMN public.font_presets.body_font IS 'Familia tipográfica para texto general';
COMMENT ON COLUMN public.font_presets.preview_url IS 'URL de preview en Google Fonts';
COMMENT ON COLUMN public.font_presets.is_google_font IS 'Indica si es fuente de Google Fonts';

COMMIT;
