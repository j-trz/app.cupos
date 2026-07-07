-- Migración para cesión de disponibilidad entre agencias (backend-go)
-- Esta migración se aplica automáticamente cuando el servidor inicia

CREATE TABLE IF NOT EXISTS availability_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_agency VARCHAR(255) NOT NULL,
    target_agency VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_different_agencies CHECK (source_agency != target_agency)
);

CREATE INDEX IF NOT EXISTS idx_transfers_product_id ON availability_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source_agency ON availability_transfers(source_agency);
CREATE INDEX IF NOT EXISTS idx_transfers_target_agency ON availability_transfers(target_agency);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON availability_transfers(created_at);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES availability_transfers(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS original_agency VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_reservations_transfer_id ON reservations(transfer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_original_agency ON reservations(original_agency);

-- Columna color para agencies (para el frontend GestionAgencias)
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';
