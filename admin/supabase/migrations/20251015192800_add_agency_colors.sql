-- Migration: Add agency brand colors (main_color, text_color)
-- Idempotent migration for Supabase

-- 1) Add columns
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS main_color TEXT;
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS text_color TEXT;

-- 2) Optional hex color constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agencies_main_color_hex'
  ) THEN
    ALTER TABLE public.agencies
      ADD CONSTRAINT agencies_main_color_hex
      CHECK (main_color IS NULL OR main_color ~* '^#([A-F0-9]{3}|([A-F0-9]{6}))$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agencies_text_color_hex'
  ) THEN
    ALTER TABLE public.agencies
      ADD CONSTRAINT agencies_text_color_hex
      CHECK (text_color IS NULL OR text_color ~* '^#([A-F0-9]{3}|([A-F0-9]{6}))$');
  END IF;
END
$$;

-- 3) Comments
COMMENT ON COLUMN public.agencies.main_color IS 'Color principal de marca en HEX (ej: #2c4b8b)';
COMMENT ON COLUMN public.agencies.text_color IS 'Color de texto en HEX para contrastar sobre el color principal (ej: #ffffff)';

-- 4) Seed sensible defaults for "default" agency (no override if already set)
UPDATE public.agencies
SET
  main_color = COALESCE(main_color, '#2c4b8b'),
  text_color = COALESCE(text_color, '#ffffff')
WHERE code = 'default';