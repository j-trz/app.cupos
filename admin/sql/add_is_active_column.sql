-- Migración: Agregar columna is_active a tabla data_connections existente
-- Solo se ejecuta si la columna no existe

DO $$
BEGIN
    -- Verificar si la columna is_active ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'data_connections' 
        AND column_name = 'is_active'
    ) THEN
        -- Agregar la columna is_active
        ALTER TABLE data_connections 
        ADD COLUMN is_active BOOLEAN DEFAULT false;
        
        -- Agregar índice para optimizar consultas por conexión activa
        CREATE INDEX IF NOT EXISTS idx_data_connections_active 
        ON data_connections(user_id, is_active) 
        WHERE is_active = true;
        
        -- Función para asegurar que solo una conexión esté activa por usuario
        CREATE OR REPLACE FUNCTION ensure_single_active_connection()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Si se está activando una conexión
            IF NEW.is_active = true AND OLD.is_active = false THEN
                -- Desactivar todas las otras conexiones del mismo usuario
                UPDATE data_connections 
                SET is_active = false 
                WHERE user_id = NEW.user_id 
                AND id != NEW.id 
                AND is_active = true;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Trigger para mantener única conexión activa por usuario
        DROP TRIGGER IF EXISTS ensure_single_active_connection_trigger ON data_connections;
        CREATE TRIGGER ensure_single_active_connection_trigger
            BEFORE UPDATE ON data_connections
            FOR EACH ROW
            WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
            EXECUTE FUNCTION ensure_single_active_connection();
            
        RAISE NOTICE 'Columna is_active agregada exitosamente a data_connections';
    ELSE
        RAISE NOTICE 'La columna is_active ya existe en data_connections';
    END IF;
END
$$;

-- Verificar el resultado
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'data_connections' 
AND column_name = 'is_active';