-- Migración específica: Agregar relación de clave foránea entre user_security_status y profiles
-- Solo ejecutar esta parte si ya tienes las tablas creadas

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
        
        RAISE NOTICE 'Relación de clave foránea agregada exitosamente entre user_security_status y profiles';
    ELSE
        RAISE NOTICE 'La relación de clave foránea ya existe, no se requiere acción';
    END IF;
END $$;