-- Agregar sistema de conexiones específicas por tipo de datos
-- Esto permite tener diferentes conexiones activas para diferentes tipos de datos

-- 1. Crear tabla para mapear tipos de datos a conexiones específicas
CREATE TABLE IF NOT EXISTS connection_data_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'productos', 'pedidos', 'all'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para mejor rendimiento
  UNIQUE(user_id, data_type) -- Un usuario solo puede tener una conexión activa por tipo de datos
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE connection_data_types ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad
CREATE POLICY "Users can view own connection data types" ON connection_data_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connection data types" ON connection_data_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connection data types" ON connection_data_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connection data types" ON connection_data_types
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Función para migrar conexiones existentes al nuevo sistema
CREATE OR REPLACE FUNCTION migrate_to_connection_data_types()
RETURNS void AS $$
BEGIN
  -- Migrar conexiones activas existentes como 'all' (para todos los tipos de datos)
  INSERT INTO connection_data_types (user_id, connection_id, data_type, is_active)
  SELECT user_id, id, 'all', true
  FROM data_connections 
  WHERE is_active = true
  ON CONFLICT (user_id, data_type) DO NOTHING;
  
  RAISE NOTICE 'Migración completada: conexiones activas migradas como tipo "all"';
END;
$$ LANGUAGE plpgsql;

-- 5. Ejecutar migración
SELECT migrate_to_connection_data_types();

-- 6. Comentarios para documentación
COMMENT ON TABLE connection_data_types IS 'Mapea tipos de datos específicos a conexiones activas por usuario';
COMMENT ON COLUMN connection_data_types.data_type IS 'Tipo de datos: productos, pedidos, o all para todos los tipos';
COMMENT ON COLUMN connection_data_types.is_active IS 'Si esta conexión está activa para este tipo de datos';

CREATE INDEX idx_connection_data_types_user_id_data_type_is_active
  ON connection_data_types (user_id, data_type, is_active);