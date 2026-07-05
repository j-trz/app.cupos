-- =============================================================================
-- MIGRACIÓN: Presets de Botones Predefinidos
-- Fecha: 2025-01-05
-- Descripción: Inserta estilos de botones para el sistema de marca blanca
-- =============================================================================

BEGIN;

-- Crear tabla de presets de botones
CREATE TABLE IF NOT EXISTS public.button_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    border_radius VARCHAR(10) NOT NULL,
    shadow VARCHAR(100),
    hover_effect VARCHAR(50),
    preview_css TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Limpiar datos existentes
TRUNCATE TABLE public.button_presets RESTART IDENTITY CASCADE;

-- Insertar presets de botones
INSERT INTO public.button_presets (name, border_radius, shadow, hover_effect) VALUES
('Flat', '0.375rem', 'none', 'opacity'),
('Rounded', '9999px', '0 1px 2px rgb(0 0 0 / 0.05)', 'scale'),
('Shadowed', '0.5rem', '0 4px 6px -1px rgb(0 0 0 / 0.1)', 'lift'),
('Outlined', '0.375rem', 'none', 'border-color'),
('Gradient', '0.5rem', '0 2px 4px rgb(0 0 0 / 0.1)', 'gradient-shift'),
('Glass', '0.75rem', '0 8px 32px rgb(0 0 0 / 0.1)', 'blur');

-- Comentarios
COMMENT ON TABLE public.button_presets IS 'Presets de estilos de botones';
COMMENT ON COLUMN public.button_presets.name IS 'Nombre del estilo de botón';
COMMENT ON COLUMN public.button_presets.border_radius IS 'Radio de borde del botón';
COMMENT ON COLUMN public.button_presets.shadow IS 'Sombra del botón (box-shadow CSS)';
COMMENT ON COLUMN public.button_presets.hover_effect IS 'Efecto al pasar el mouse';
COMMENT ON COLUMN public.button_presets.preview_css IS 'CSS para preview visual';

COMMIT;
