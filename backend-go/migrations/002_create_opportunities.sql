-- Crear tabla opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia VARCHAR(255) NOT NULL,
  temporada VARCHAR(100),
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  destino VARCHAR(255) NOT NULL,
  compania VARCHAR(255) NOT NULL,
  validez DATE,
  fecha_salida DATE NOT NULL,
  fecha_llegada DATE,
  total_lugares INT NOT NULL DEFAULT 0,
  total_liberados INT NOT NULL DEFAULT 0,
  neto_1 NUMERIC(12,2),
  neto_2 NUMERIC(12,2),
  estado_interno VARCHAR(255),
  fecha_cargado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_cargador UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  usuario_autorizador UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_opportunities_agencia ON opportunities(agencia);
CREATE INDEX IF NOT EXISTS idx_opportunities_estado ON opportunities(estado);
CREATE INDEX IF NOT EXISTS idx_opportunities_destino ON opportunities(destino);
CREATE INDEX IF NOT EXISTS idx_opportunities_temporada ON opportunities(temporada);
CREATE INDEX IF NOT EXISTS idx_opportunities_usuario_cargador ON opportunities(usuario_cargador);
