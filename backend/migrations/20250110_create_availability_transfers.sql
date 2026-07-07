-- Tabla para cesión de disponibilidad entre agencias
CREATE TABLE IF NOT EXISTS availability_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_agency VARCHAR(255) NOT NULL,  -- Agencia que cede
    target_agency VARCHAR(255) NOT NULL,  -- Agencia que recibe
    quantity INTEGER NOT NULL CHECK (quantity > 0),  -- Cantidad cedida
    created_by UUID NOT NULL,  -- Usuario que realiza la cesión
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validar que origen y destino sean diferentes
    CONSTRAINT chk_different_agencies CHECK (source_agency != target_agency)
);

-- Índice para consultas por producto
CREATE INDEX IF NOT EXISTS idx_transfers_product_id ON availability_transfers(product_id);

-- Índice para consultas por agencias
CREATE INDEX IF NOT EXISTS idx_transfers_source_agency ON availability_transfers(source_agency);
CREATE INDEX IF NOT EXISTS idx_transfers_target_agency ON availability_transfers(target_agency);

-- Índice para trazabilidad por fecha
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON availability_transfers(created_at);

-- Columna adicional en reservations para vincular con cesiones
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES availability_transfers(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS original_agency VARCHAR(255);  -- Agencia owner del stock

-- Índice en reservas para transfer_id
CREATE INDEX IF NOT EXISTS idx_reservations_transfer_id ON reservations(transfer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_original_agency ON reservations(original_agency);
