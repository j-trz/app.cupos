-- Corrección de políticas RLS para user_sessions
-- Soluciona el error 403 Forbidden al crear sesiones

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
        
        RAISE NOTICE 'Política de INSERT para user_sessions creada exitosamente';
    ELSE
        RAISE NOTICE 'La política de INSERT para user_sessions ya existe';
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
        
        RAISE NOTICE 'Política de SELECT para admins en user_sessions creada exitosamente';
    ELSE
        RAISE NOTICE 'La política de SELECT para admins en user_sessions ya existe';
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
        
        RAISE NOTICE 'Política de UPDATE para admins en user_sessions creada exitosamente';
    ELSE
        RAISE NOTICE 'La política de UPDATE para admins en user_sessions ya existe';
    END IF;
END $$;

-- Verificar que RLS esté habilitado
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Mostrar políticas existentes para verificación
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_sessions';