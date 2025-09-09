-- ====================================================================
-- MIGRACIÓN COMPLETA DEL SISTEMA 2FA - APLICAR EN SUPABASE SQL EDITOR
-- ====================================================================
-- Ejecutar este script completo para finalizar la integración 2FA
-- ⚠️  IMPORTANTE: Ejecutar en orden secuencial

-- ====================================================================
-- PASO 1: AGREGAR RELACIONES DE CLAVE FORÁNEA
-- ====================================================================

-- Agregar foreign key constraint a profiles si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_security_status_profile_fkey'
    ) THEN
        ALTER TABLE public.user_security_status
        ADD CONSTRAINT user_security_status_profile_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Relación de clave foránea agregada exitosamente entre user_security_status y profiles';
    ELSE
        RAISE NOTICE '✅ La relación de clave foránea ya existe, no se requiere acción';
    END IF;
END $$;

-- ====================================================================
-- PASO 2: CONFIGURAR POLÍTICAS RLS PARA USER_SESSIONS
-- ====================================================================

-- Agregar política para insertar sesiones (cualquier usuario autenticado)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_sessions' 
        AND policyname = 'Users can insert their own sessions'
    ) THEN
        CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
            FOR INSERT 
            WITH CHECK (user_id = auth.uid());
        
        RAISE NOTICE '✅ Política de INSERT para user_sessions creada exitosamente';
    ELSE
        RAISE NOTICE '✅ La política de INSERT para user_sessions ya existe';
    END IF;
END $$;

-- Agregar política para que admins puedan ver todas las sesiones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_sessions' 
        AND policyname = 'Admins can view all sessions'
    ) THEN
        CREATE POLICY "Admins can view all sessions" ON public.user_sessions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
        
        RAISE NOTICE '✅ Política de SELECT para admins en user_sessions creada exitosamente';
    ELSE
        RAISE NOTICE '✅ La política de SELECT para admins en user_sessions ya existe';
    END IF;
END $$;

-- Agregar política para que admins puedan actualizar sesiones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_sessions' 
        AND policyname = 'Admins can update all sessions'
    ) THEN
        CREATE POLICY "Admins can update all sessions" ON public.user_sessions
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
        
        RAISE NOTICE '✅ Política de UPDATE para admins en user_sessions creada exitosamente';
    ELSE
        RAISE NOTICE '✅ La política de UPDATE para admins en user_sessions ya existe';
    END IF;
END $$;

-- Verificar que RLS esté habilitado
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- PASO 3: VERIFICACIONES DE INTEGRIDAD
-- ====================================================================

-- Verificar políticas existentes
SELECT 
    '🔍 POLÍTICAS RLS CONFIGURADAS:' as info,
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd
FROM pg_policies 
WHERE tablename = 'user_sessions'
ORDER BY policyname;

-- Verificar relaciones de clave foránea
SELECT 
    '🔍 RELACIONES CONFIGURADAS:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_security_status';

-- ====================================================================
-- RESULTADO ESPERADO
-- ====================================================================

SELECT '🎯 MIGRACIÓN 2FA COMPLETADA EXITOSAMENTE' as resultado,
       'Sistema listo para pruebas completas' as estado;

-- ====================================================================
-- NOTAS POST-MIGRACIÓN
-- ====================================================================
-- 1. Reiniciar la aplicación para aplicar cambios
-- 2. Realizar pruebas de login con usuarios existentes
-- 3. Verificar configuración 2FA obligatoria para nuevos usuarios
-- 4. Confirmar funcionamiento del panel administrativo
-- ====================================================================