-- Migración: Seed de proveedores de IA predefinidos
-- Fecha: 2025-01-06
-- Descripción: Inserta los proveedores de IA más comunes como datos iniciales

INSERT INTO public.ai_providers (name, display_name, base_url, default_model, max_tokens, temperature)
VALUES 
    ('openai', 'OpenAI', 'https://api.openai.com/v1', 'gpt-4o', 4096, 0.7),
    ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', 'claude-3-5-sonnet-20241022', 4096, 0.7),
    ('google', 'Google AI', 'https://generativelanguage.googleapis.com/v1beta', 'gemini-1.5-pro', 4096, 0.7),
    ('azure', 'Azure OpenAI', NULL, 'gpt-4', 4096, 0.7),
    ('local', 'Modelo Local', NULL, 'llama-3.1-8b', 2048, 0.7)
ON CONFLICT (name) DO NOTHING;

-- Marcar OpenAI como proveedor por defecto si no hay ninguno marcado
UPDATE public.ai_providers 
SET is_default = TRUE 
WHERE name = 'openai' 
AND NOT EXISTS (
    SELECT 1 FROM public.ai_providers WHERE is_default = TRUE
);
