-- Tabla para almacenar conexiones a APIs externas de forma segura
-- Tabla para almacenar metadatos de conexiones a APIs externas.
-- Las credenciales encriptadas se almacenan en una tabla separada y segura.

CREATE TABLE IF NOT EXISTS data_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('powerautomate', 'supabase', 'smartsheet', 'mongodb', 'tableau')),
    description TEXT,
    connection_status VARCHAR(20) DEFAULT 'unknown' CHECK (connection_status IN ('unknown', 'connected', 'failed', 'testing')),
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para mejorar performance
    CONSTRAINT unique_user_connection_name UNIQUE (user_id, name)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_data_connections_user_id ON data_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_data_connections_type ON data_connections(type);

-- RLS (Row Level Security) para asegurar que cada usuario solo vea sus conexiones
ALTER TABLE data_connections ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver/modificar sus propias conexiones
CREATE POLICY "Users can only access their own connections" ON data_connections
    FOR ALL USING (auth.uid() = user_id);

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_data_connections_updated_at 
    BEFORE UPDATE ON data_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE data_connections IS 'Almacena metadatos sobre las conexiones a APIs externas. Las credenciales se guardan en la tabla encrypted_service_credentials.';
COMMENT ON COLUMN data_connections.connection_status IS 'Estado de la última prueba de conexión';