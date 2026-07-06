-- =============================================================================
-- MIGRACIÓN: Agregar columnas ficha_venta y doc_contable a reservations
-- Fecha: 2025-01-09
-- Descripción: Agrega columnas para gestión de documentación contable y confirmação
-- =============================================================================

BEGIN;

-- Agregar columna ficha_venta (número de ficha/ticket de venta)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS ficha_venta VARCHAR(255);

-- Agregar columna doc_contable (documento contable para confirmación)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS doc_contable VARCHAR(255);

-- Agregar columna doc_contable_added_at (fecha de agregado del documento)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS doc_contable_added_at TIMESTAMPTZ;

-- Agregar columna confirmada_por_usuario (si el usuario confirmó con doc_contable)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS confirmada_por_usuario BOOLEAN DEFAULT FALSE;

-- Agregar columna doc_contable_expires_at (fecha de expiración del bloqueo por doc)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS doc_contable_expires_at TIMESTAMPTZ;

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_reservations_ficha_venta ON public.reservations(ficha_venta);
CREATE INDEX IF NOT EXISTS idx_reservations_doc_contable ON public.reservations(doc_contable);
CREATE INDEX IF NOT EXISTS idx_reservations_doc_contable_expires_at ON public.reservations(doc_contable_expires_at);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmada_por_usuario ON public.reservations(confirmada_por_usuario);

-- Comentarios
COMMENT ON COLUMN public.reservations.ficha_venta IS 'Número de ficha/ticket de venta';
COMMENT ON COLUMN public.reservations.doc_contable IS 'Documento contable para confirmación de reserva';
COMMENT ON COLUMN public.reservations.doc_contable_added_at IS 'Fecha en que se agregó el documento contable';
COMMENT ON COLUMN public.reservations.confirmada_por_usuario IS 'Indica si el usuario confirmó la reserva con doc_contable';
COMMENT ON COLUMN public.reservations.doc_contable_expires_at IS 'Fecha de expiración del plazo para agregar doc_contable';

COMMIT;
