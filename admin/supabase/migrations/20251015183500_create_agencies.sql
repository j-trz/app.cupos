-- Migration: Agencies table and storage bucket for logos
-- Safe and idempotent for Supabase

-- 0) Required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Table: public.agencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  logo_url TEXT,
  logo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agencies_name ON public.agencies USING GIN (to_tsvector('simple', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON public.agencies(is_active);

-- 2) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_agencies_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_agencies_set_updated_at
    BEFORE UPDATE ON public.agencies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 3) RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='agencies' AND policyname='admins_and_agency_admins_can_select_agencies'
  ) THEN
    DROP POLICY "admins_and_agency_admins_can_select_agencies" ON public.agencies;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='agencies' AND policyname='admins_can_manage_agencies'
  ) THEN
    DROP POLICY "admins_can_manage_agencies" ON public.agencies;
  END IF;
END$$;

CREATE POLICY "admins_and_agency_admins_can_select_agencies" ON public.agencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','agency_admin')
    )
  );

CREATE POLICY "admins_can_manage_agencies" ON public.agencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.agencies IS 'Catálogo de agencias/clientes';
COMMENT ON COLUMN public.agencies.code IS 'Código único de agencia';
COMMENT ON COLUMN public.agencies.logo_path IS 'Ruta de objeto en storage (bucket agency-logos)';
COMMENT ON COLUMN public.agencies.logo_url IS 'URL pública del logo (si el bucket es público)';

-- 4) Storage bucket for logos (public)
DO $$
BEGIN
  PERFORM storage.create_bucket('agency-logos', public => true);
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Bucket agency-logos already exists';
END$$;

-- Storage policies
-- Remove conflicting policies (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read agency logos'
  ) THEN
    DROP POLICY "Public read agency logos" ON storage.objects;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins manage agency logos'
  ) THEN
    DROP POLICY "Admins manage agency logos" ON storage.objects;
  END IF;
END$$;

CREATE POLICY "Public read agency logos" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'agency-logos');

CREATE POLICY "Admins manage agency logos" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'agency-logos' AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'agency-logos' AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 5) Optional seed
INSERT INTO public.agencies (code, name, is_active)
VALUES ('default', 'Agencia Genérica', true)
ON CONFLICT (code) DO NOTHING;