-- MIGRACIÓN: Sistema de Roles y Permisos
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna role a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agency_user';

-- 2. Migrar datos existentes: convertir admin boolean a role
UPDATE profiles 
SET role = CASE 
  WHEN admin = true THEN 'admin'
  ELSE 'agency_user'
END;

-- 3. Agregar constraint para valores válidos de rol
ALTER TABLE profiles 
ADD CONSTRAINT valid_roles 
CHECK (role IN ('admin', 'agency_admin', 'agency_user'));

-- 4. Crear índice para optimizar consultas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. Crear índice compuesto para consultas por agencia y rol
CREATE INDEX IF NOT EXISTS idx_profiles_agencia_role ON profiles(agencia, role);

-- 6. Actualizar Row Level Security (RLS) para roles
-- Política para admin: puede ver todos los perfiles
CREATE POLICY "admin_can_view_all_profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Política para agency_admin: puede ver perfiles de su agencia
CREATE POLICY "agency_admin_can_view_agency_profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'agency_admin' 
      AND p.agencia = profiles.agencia
    )
  );

-- Política para agency_user: solo puede ver su propio perfil
CREATE POLICY "agency_user_can_view_own_profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- 7. Crear función helper para obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear función helper para obtener agencia del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_agency()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT agencia 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comentarios de documentación
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: admin, agency_admin, agency_user';
COMMENT ON FUNCTION get_current_user_role() IS 'Obtiene el rol del usuario autenticado actual';
COMMENT ON FUNCTION get_current_user_agency() IS 'Obtiene la agencia del usuario autenticado actual';

-- 10. Verificar migración
SELECT 
  'MIGRACIÓN COMPLETADA' as status,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'agency_admin' THEN 1 END) as agency_admins,
  COUNT(CASE WHEN role = 'agency_user' THEN 1 END) as agency_users
FROM profiles;