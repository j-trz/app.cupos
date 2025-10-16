-- Migration: Add address column to agencies
-- Idempotent

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.agencies.address IS 'Dirección física de la agencia';

-- Optional full-text index for address searches
CREATE INDEX IF NOT EXISTS idx_agencies_address
  ON public.agencies USING GIN (to_tsvector('simple', coalesce(address, '')));