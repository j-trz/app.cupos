-- Script para corregir la restricción de tipo en data_connections
-- Permitir el tipo 'powerautomate' si no está ya permitido

-- Eliminar la restricción existente si existe
DO $$ 
BEGIN
    -- Intentar eliminar la restricción existente
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'data_connections_type_check' 
        AND table_name = 'data_connections'
    ) THEN
        ALTER TABLE data_connections DROP CONSTRAINT data_connections_type_check;
        RAISE NOTICE 'Constraint data_connections_type_check eliminado';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo eliminar constraint: %', SQLERRM;
END $$;

-- Crear la nueva restricción con todos los tipos soportados
ALTER TABLE data_connections 
ADD CONSTRAINT data_connections_type_check 
CHECK (type IN ('powerautomate', 'supabase', 'smartsheet', 'mongodb', 'tableau'));

-- Verificar que la restricción se aplicó correctamente
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'data_connections_type_check';

-- Mostrar información de la tabla para confirmar
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'data_connections' 
AND column_name = 'type';