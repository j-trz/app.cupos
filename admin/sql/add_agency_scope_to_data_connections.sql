-- Migration: Add agency scope to data_connections to allow org-wide or per-agency connections
-- Safe, idempotent migration for Supabase (PostgreSQL)

BEGIN;

-- 1) Add columns if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='data_connections' AND column_name='scope'
  ) THEN
    ALTER TABLE public.data_connections
      ADD COLUMN scope TEXT NOT NULL DEFAULT 'user'
      CHECK (scope IN ('user','agency','all'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='data_connections' AND column_name='target_agency'
  ) THEN
    ALTER TABLE public.data_connections
      ADD COLUMN target_agency TEXT;
  END IF;
END $$;

-- 2) Indexes to speed up filtering by scope/agency
CREATE INDEX IF NOT EXISTS idx_data_connections_scope
  ON public.data_connections(scope);

CREATE INDEX IF NOT EXISTS idx_data_connections_scope_agency
  ON public.data_connections(scope, target_agency);

-- 3) RLS Policies: allow users to read agency/all scoped connections of their agency
-- Ensure RLS is enabled
ALTER TABLE public.data_connections ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='data_connections' AND policyname='Users can only access their own connections'
  ) THEN
    DROP POLICY "Users can only access their own connections" ON public.data_connections;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='data_connections' AND policyname='users_can_manage_own_connections'
  ) THEN
    DROP POLICY users_can_manage_own_connections ON public.data_connections;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='data_connections' AND policyname='users_and_agencies_can_view_connections'
  ) THEN
    DROP POLICY users_and_agencies_can_view_connections ON public.data_connections;
  END IF;
END $$;

-- SELECT policy: owner OR scope='all' OR (scope='agency' AND target_agency = get_current_user_agency())
CREATE POLICY users_and_agencies_can_view_connections
ON public.data_connections
FOR SELECT
USING (
  auth.uid() = user_id
  OR scope = 'all'
  OR (scope = 'agency' AND target_agency = get_current_user_agency())
);

-- INSERT/UPDATE/DELETE policy: only owner can manage their rows
CREATE POLICY users_can_manage_own_connections
ON public.data_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4) Documentation
COMMENT ON COLUMN public.data_connections.scope IS 'Ámbito de la conexión: user (solo propietario), agency (disponible para usuarios de esa agencia), all (disponible para todas las agencias)';
COMMENT ON COLUMN public.data_connections.target_agency IS 'Código/nombre de la agencia a la que aplica la conexión cuando scope=agency';

COMMIT;