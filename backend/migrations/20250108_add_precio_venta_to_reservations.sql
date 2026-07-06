-- =============================================================================
-- MIGRACIÓN: Agregar columna precio_venta a reservations
-- Fecha: 2025-01-08
-- Descripción: Agrega la columna precio_venta si no existe
-- =============================================================================

BEGIN;

-- Agregar columna precio_venta si no existe
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Actualizar valores nulos o por defecto con el valor de vuelo_precio
UPDATE public.reservations 
SET precio_venta = COALESCE(vuelo_precio, 0)
WHERE precio_venta = 0 OR precio_venta IS NULL;

COMMIT;
