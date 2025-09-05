-- Tabla para almacenar conexiones a APIs externas de forma segura
-- Las credenciales se almacenan encriptadas con encriptación zero-knowledge

CREATE TABLE IF NOT EXISTS data_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('powerautomate', 'supabase', 'smartsheet', 'mongodb', 'tableau')),
    description TEXT,
    encrypted_credentials JSONB NOT NULL, -- Credenciales encriptadas con AES-GCM
    column_mapping JSONB DEFAULT '{}', -- Mapeo de columnas a campos de la app
    is_active BOOLEAN DEFAULT false,
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
CREATE INDEX IF NOT EXISTS idx_data_connections_status ON data_connections(connection_status);
CREATE INDEX IF NOT EXISTS idx_data_connections_created_at ON data_connections(created_at DESC);

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
COMMENT ON TABLE data_connections IS 'Almacena conexiones a APIs externas con credenciales encriptadas usando encriptación zero-knowledge';
COMMENT ON COLUMN data_connections.encrypted_credentials IS 'Credenciales encriptadas con PBKDF2 + AES-GCM del lado del cliente';
COMMENT ON COLUMN data_connections.column_mapping IS 'Mapeo de columnas de la fuente externa a campos de la aplicación';
COMMENT ON COLUMN data_connections.connection_status IS 'Estado de la última prueba de conexión';

-- Insertar datos de ejemplo (solo para desarrollo - remover en producción)
-- NOTA: Estos son datos de ejemplo, no credenciales reales
INSERT INTO data_connections (user_id, name, type, description, encrypted_credentials) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Reemplazar con UUID real en desarrollo
    'Ejemplo Supabase',
    'supabase',
    'Conexión de ejemplo a Supabase',
    '{
        "encryptedData": [1,2,3,4,5],
        "salt": [10,20,30,40,50],
        "iv": [100,200,300],
        "algorithm": "AES-GCM",
        "keyDerivation": "PBKDF2",
        "iterations": 100000
    }'::jsonb
) ON CONFLICT DO NOTHING;

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'data_connections' 
ORDER BY ordinal_position;