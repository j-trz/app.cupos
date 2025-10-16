-- Migration: add missing product columns across candidate tables
-- Applies to: public.productos | public.reservas | public.disponibilidad (if they exist)

-- Ensure helper trigger function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_updated_at'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
    CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $body$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $body$;
    $fn$;
  END IF;
END
$$;

-- Add columns to candidate tables if they exist
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['productos','reservas','disponibilidad']
  LOOP
    IF to_regclass('public.'||tbl) IS NOT NULL THEN
      -- Core product columns
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS codigo_cupo text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS destino text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS compania text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS disponibilidad integer DEFAULT 0;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS fecha_salida date;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS fecha_regreso date;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS precio numeric(12,2) DEFAULT 0;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS ruta text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS pnr text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS ficha text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS temporada text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS neto_1 numeric(12,2);', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS op text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS carryon boolean DEFAULT false;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS handbag boolean DEFAULT false;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS checkedbag boolean DEFAULT false;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS inf_fare numeric(12,2);', tbl);

      -- Timestamps
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();', tbl);

      -- Indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (codigo_cupo);', 'idx_'||tbl||'_codigo_cupo', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (fecha_salida);', 'idx_'||tbl||'_fecha_salida', tbl);

      -- Updated_at trigger
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_updated_at_'||tbl
      ) THEN
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', 'set_updated_at_'||tbl, tbl);
      END IF;
    END IF;
  END LOOP;
END
$$;

-- Optional: table comment
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['productos','reservas','disponibilidad']
  LOOP
    IF to_regclass('public.'||tbl) IS NOT NULL THEN
      EXECUTE format('COMMENT ON TABLE public.%I IS %L;', tbl, 'Tabla de productos/disponibilidad');
    END IF;
  END LOOP;
END
$$;