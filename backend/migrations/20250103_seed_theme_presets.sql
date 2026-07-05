-- =============================================================================
-- MIGRACIÓN: Presets de Temas Predefinidos
-- Fecha: 2025-01-03
-- Descripción: Inserta temas predefinidos para el sistema de marca blanca
-- =============================================================================

BEGIN;

-- Crear tabla de presets de temas
CREATE TABLE IF NOT EXISTS public.theme_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    colors JSONB NOT NULL,
    preview_image TEXT,
    is_dark BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Limpiar datos existentes (si es necesario para re-ejecutar)
TRUNCATE TABLE public.theme_presets RESTART IDENTITY CASCADE;

-- =============================================================================
-- Temas Light (Claro)
-- =============================================================================

INSERT INTO public.theme_presets (name, label, colors, is_dark) VALUES
('corporate-blue', 'Corporativo Azul', '{
    "primary": "#2563eb",
    "primary_hover": "#1d4ed8",
    "secondary": "#64748b",
    "accent": "#3b82f6",
    "background": "#f8fafc",
    "surface": "#ffffff",
    "text_primary": "#0f172a",
    "text_secondary": "#64748b",
    "border": "#e2e8f0",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444"
}', FALSE),

('forest-green', 'Bosque Verde', '{
    "primary": "#16a34a",
    "primary_hover": "#15803d",
    "secondary": "#6b7280",
    "accent": "#84cc16",
    "background": "#f0fdf4",
    "surface": "#ffffff",
    "text_primary": "#14532d",
    "text_secondary": "#6b7280",
    "border": "#bbf7d0",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444"
}', FALSE),

('royal-purple', 'Púrpura Real', '{
    "primary": "#7c3aed",
    "primary_hover": "#6d28d9",
    "secondary": "#6b7280",
    "accent": "#a78bfa",
    "background": "#faf5ff",
    "surface": "#ffffff",
    "text_primary": "#1e1b4b",
    "text_secondary": "#6b7280",
    "border": "#e9d5ff",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444"
}', FALSE),

('sunset-orange', 'Naranja Atardecer', '{
    "primary": "#ea580c",
    "primary_hover": "#c2410c",
    "secondary": "#6b7280",
    "accent": "#fb923c",
    "background": "#fff7ed",
    "surface": "#ffffff",
    "text_primary": "#431407",
    "text_secondary": "#6b7280",
    "border": "#fed7aa",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444"
}', FALSE);

-- =============================================================================
-- Temas Dark (Oscuro)
-- =============================================================================

INSERT INTO public.theme_presets (name, label, colors, is_dark) VALUES
('dark-classic', 'Oscuro Clásico', '{
    "primary": "#3b82f6",
    "primary_hover": "#60a5fa",
    "secondary": "#6b7280",
    "accent": "#8b5cf6",
    "background": "#0f172a",
    "surface": "#1e293b",
    "text_primary": "#f1f5f9",
    "text_secondary": "#94a3b8",
    "border": "#334155",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444"
}', TRUE),

('dark-midnight', 'Medianoche', '{
    "primary": "#6366f1",
    "primary_hover": "#818cf8",
    "secondary": "#64748b",
    "accent": "#a78bfa",
    "background": "#020617",
    "surface": "#0f172a",
    "text_primary": "#e2e8f0",
    "text_secondary": "#94a3b8",
    "border": "#1e293b",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444"
}', TRUE);

-- Comentarios
COMMENT ON TABLE public.theme_presets IS 'Presets de temas de color para marca blanca';
COMMENT ON COLUMN public.theme_presets.name IS 'Identificador único del tema';
COMMENT ON COLUMN public.theme_presets.label IS 'Nombre visible del tema';
COMMENT ON COLUMN public.theme_presets.colors IS 'Paleta de colores en formato JSON';
COMMENT ON COLUMN public.theme_presets.is_dark IS 'Indica si es tema oscuro o claro';

COMMIT;
