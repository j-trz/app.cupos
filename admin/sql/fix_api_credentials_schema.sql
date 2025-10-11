-- FIX esquema api_credentials para evitar "PGRST204: user_id no existe" y 400 Bad Request
-- Ejecutar en Supabase SQL Editor

-- 0) Extensión para gen_random_uuid (si no estuviera)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Crear tabla si no existe (con user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_credentials'
  ) THEN
    CREATE TABLE public.api_credentials (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      connection_id UUID NOT NULL REFERENCES public.data_connections(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      credential_key TEXT NOT NULL,
      credential_value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END
$$ LANGUAGE plpgsql;

-- 2) Asegurar columnas requeridas (idempotente)
DO $$
BEGIN
  -- connection_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='connection_id'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD COLUMN connection_id UUID;
    ALTER TABLE public.api_credentials
      ADD CONSTRAINT api_credentials_connection_fk
      FOREIGN KEY (connection_id) REFERENCES public.data_connections(id) ON DELETE CASCADE;
  END IF;

  -- user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD COLUMN user_id UUID;
  END IF;

  -- credential_key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='credential_key'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD COLUMN credential_key TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.api_credentials
      ALTER COLUMN credential_key DROP DEFAULT;
  END IF;

  -- credential_value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='credential_value'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD COLUMN credential_value TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.api_credentials
      ALTER COLUMN credential_value DROP DEFAULT;
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END
$$ LANGUAGE plpgsql;

-- 3) Backfill user_id desde data_connections si fuera necesario
UPDATE public.api_credentials c
SET user_id = dc.user_id
FROM public.data_connections dc
WHERE c.connection_id = dc.id
  AND (c.user_id IS NULL OR c.user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- 4) Marcar user_id como NOT NULL y agregar FK si faltara
DO $$
BEGIN
  -- NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_credentials' AND column_name='user_id'
      AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.api_credentials
      ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- FK a auth.users si no existiera
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'api_credentials_user_fk'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD CONSTRAINT api_credentials_user_fk
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 5) Índices y UNIQUE (idempotente)
CREATE INDEX IF NOT EXISTS idx_api_credentials_connection ON public.api_credentials(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_user ON public.api_credentials(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_credentials_unique_credential_key'
  ) THEN
    ALTER TABLE public.api_credentials
      ADD CONSTRAINT api_credentials_unique_credential_key
      UNIQUE (connection_id, credential_key);
  END IF;
END
$$ LANGUAGE plpgsql;

-- 6) RLS y políticas
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='api_credentials' AND policyname='Users can view own credentials'
  ) THEN
    DROP POLICY "Users can view own credentials" ON public.api_credentials;
  END IF;
  CREATE POLICY "Users can view own credentials" ON public.api_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='api_credentials' AND policyname='Users can insert own credentials'
  ) THEN
    DROP POLICY "Users can insert own credentials" ON public.api_credentials;
  END IF;
  CREATE POLICY "Users can insert own credentials" ON public.api_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='api_credentials' AND policyname='Users can update own credentials'
  ) THEN
    DROP POLICY "Users can update own credentials" ON public.api_credentials;
  END IF;
  CREATE POLICY "Users can update own credentials" ON public.api_credentials
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='api_credentials' AND policyname='Users can delete own credentials'
  ) THEN
    DROP POLICY "Users can delete own credentials" ON public.api_credentials;
  END IF;
  CREATE POLICY "Users can delete own credentials" ON public.api_credentials
    FOR DELETE
    USING (auth.uid() = user_id);
END
$$ LANGUAGE plpgsql;

-- 7) Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_api_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_api_credentials_updated_at_trigger ON public.api_credentials;
CREATE TRIGGER update_api_credentials_updated_at_trigger
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_credentials_updated_at();

-- 8) Forzar refresco de caché de esquema de PostgREST (workaround ligero):
-- Cambiar un comentario obliga a detectar cambios
COMMENT ON TABLE public.api_credentials IS 'Tabla simplificada para credenciales (actualizada)';