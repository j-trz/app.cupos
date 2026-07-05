-- Migration: Convert themes.id (integer) -> uuid and update dependent FKs
-- WARNING: Run on a backup or non-production environment first. Review before executing.

BEGIN;

-- Ensure extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Add new UUID column to themes
ALTER TABLE IF EXISTS public.themes ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();

-- 2) For each dependent table that may reference themes(id) as integer, create a theme_id_uuid column and populate it
DO $$
BEGIN
  -- agency_themes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agency_themes' AND column_name='theme_id') THEN
    ALTER TABLE public.agency_themes ADD COLUMN IF NOT EXISTS theme_id_uuid UUID;
    UPDATE public.agency_themes at SET theme_id_uuid = t.new_id FROM public.themes t WHERE at.theme_id = t.id;
  END IF;

  -- agency_theme_configs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agency_theme_configs' AND column_name='theme_id') THEN
    ALTER TABLE public.agency_theme_configs ADD COLUMN IF NOT EXISTS theme_id_uuid UUID;
    UPDATE public.agency_theme_configs atc SET theme_id_uuid = t.new_id FROM public.themes t WHERE atc.theme_id = t.id;
  END IF;

  -- agency_configurations may not reference theme_id, but if it does later, handle similarly
END$$;

-- 3) Swap primary key in themes: preserve old id in old_id
ALTER TABLE public.themes DROP CONSTRAINT IF EXISTS themes_pkey;
ALTER TABLE public.themes RENAME COLUMN id TO old_id;
ALTER TABLE public.themes RENAME COLUMN new_id TO id;
ALTER TABLE public.themes ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.themes ADD CONSTRAINT themes_pkey PRIMARY KEY (id);

-- 4) Replace theme_id columns in dependent tables: move theme_id_uuid -> theme_id, recreate FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agency_themes' AND column_name='theme_id_uuid') THEN
    -- Drop existing FK if any
    BEGIN
      ALTER TABLE public.agency_themes DROP CONSTRAINT IF EXISTS agency_themes_theme_id_fkey;
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
    -- rename old integer column and move uuid column into its place
    ALTER TABLE public.agency_themes RENAME COLUMN theme_id TO theme_id_old;
    ALTER TABLE public.agency_themes RENAME COLUMN theme_id_uuid TO theme_id;
    ALTER TABLE public.agency_themes ALTER COLUMN theme_id SET NOT NULL;
    ALTER TABLE public.agency_themes ADD CONSTRAINT agency_themes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agency_theme_configs' AND column_name='theme_id_uuid') THEN
    BEGIN
      ALTER TABLE public.agency_theme_configs DROP CONSTRAINT IF EXISTS agency_theme_configs_theme_id_fkey;
    EXCEPTION WHEN OTHERS THEN
    END;
    ALTER TABLE public.agency_theme_configs RENAME COLUMN theme_id TO theme_id_old;
    ALTER TABLE public.agency_theme_configs RENAME COLUMN theme_id_uuid TO theme_id;
    ALTER TABLE public.agency_theme_configs ALTER COLUMN theme_id SET NOT NULL;
    ALTER TABLE public.agency_theme_configs ADD CONSTRAINT agency_theme_configs_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 5) OPTIONAL: drop old columns and cleanup only after manual verification
-- ALTER TABLE public.agency_themes DROP COLUMN IF EXISTS theme_id_old;
-- ALTER TABLE public.agency_theme_configs DROP COLUMN IF EXISTS theme_id_old;
-- ALTER TABLE public.themes DROP COLUMN IF EXISTS old_id;

COMMIT;

-- After running: verify data integrity, then remove OLD columns if everything is OK.
-- IMPORTANT: Test on a copy before applying in production.
