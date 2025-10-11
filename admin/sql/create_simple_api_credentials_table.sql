-- Crear tabla simple para credenciales de API (sin encriptación)
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_key TEXT NOT NULL,
    credential_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para mejorar rendimiento
    CONSTRAINT unique_credential_key UNIQUE (connection_id, credential_key)
);

-- Crear índices
CREATE INDEX idx_api_credentials_connection ON api_credentials(connection_id);
CREATE INDEX idx_api_credentials_user ON api_credentials(user_id);

-- Habilitar RLS
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias credenciales
CREATE POLICY "Users can view own credentials" ON api_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar sus propias credenciales
CREATE POLICY "Users can insert own credentials" ON api_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propias credenciales
CREATE POLICY "Users can update own credentials" ON api_credentials
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan eliminar sus propias credenciales
CREATE POLICY "Users can delete own credentials" ON api_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Función para actualizar el timestamp updated_at
CREATE OR REPLACE FUNCTION update_api_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_api_credentials_updated_at_trigger
    BEFORE UPDATE ON api_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_api_credentials_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE api_credentials IS 'Tabla simplificada para almacenar credenciales de API sin encriptación';
COMMENT ON COLUMN api_credentials.connection_id IS 'ID de la conexión asociada';
COMMENT ON COLUMN api_credentials.user_id IS 'ID del usuario propietario';
COMMENT ON COLUMN api_credentials.credential_key IS 'Nombre del campo de credencial (ej: apiKey, flowUrl, etc)';
COMMENT ON COLUMN api_credentials.credential_value IS 'Valor de la credencial en texto plano';