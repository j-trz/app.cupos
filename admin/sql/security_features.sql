-- SQL Migration: Sistema de Seguridad Avanzado
-- Fecha: 2025-01-08
-- Descripción: Implementar bloqueo por intentos fallidos, seguimiento de actividad y 2FA

-- Tabla para rastrear intentos de login fallidos
CREATE TABLE IF NOT EXISTS public.user_login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    failure_reason VARCHAR(100),
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX idx_user_login_attempts_user_id_attempted_at ON public.user_login_attempts (user_id, attempted_at);
CREATE INDEX idx_user_login_attempts_email_attempted_at ON public.user_login_attempts (email, attempted_at);
CREATE INDEX idx_user_login_attempts_ip_address_attempted_at ON public.user_login_attempts (ip_address, attempted_at);

-- Tabla para gestión de bloqueos de usuarios
CREATE TABLE IF NOT EXISTS public.user_security_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ NULL,
    locked_reason VARCHAR(255),
    failed_attempts_count INTEGER DEFAULT 0,
    last_failed_attempt TIMESTAMPTZ NULL,
    unlock_token VARCHAR(255) NULL,
    unlock_token_expires TIMESTAMPTZ NULL,
    
    -- 2FA fields
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    backup_codes TEXT[] DEFAULT '{}',
    last_backup_code_used_at TIMESTAMPTZ NULL,
    
    -- Activity tracking
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ NULL,
    total_logins INTEGER DEFAULT 0,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    END IF;
END $$;

-- Tabla para sesiones activas (para auto-logout)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id_is_active ON public.user_sessions (user_id, is_active);
CREATE INDEX idx_user_sessions_session_token ON public.user_sessions (session_token);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions (expires_at);

-- Habilitar Row Level Security
ALTER TABLE public.user_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_login_attempts
CREATE POLICY "Users can view their own login attempts" ON public.user_login_attempts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login attempts" ON public.user_login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas RLS para user_security_status
CREATE POLICY "Users can view their own security status" ON public.user_security_status
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own security status" ON public.user_security_status
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security statuses" ON public.user_security_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas RLS para user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Función para registrar intento de login
CREATE OR REPLACE FUNCTION log_login_attempt(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_ip_address INET,
    p_user_agent TEXT,
    p_success BOOLEAN,
    p_failure_reason VARCHAR(100) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_login_attempts (
        user_id, email, ip_address, user_agent, success, failure_reason
    ) VALUES (
        p_user_id, p_email, p_ip_address, p_user_agent, p_success, p_failure_reason
    );
END;
$$;

-- Función para verificar y actualizar estado de bloqueo
CREATE OR REPLACE FUNCTION check_and_update_lock_status(
    p_user_id UUID,
    p_email VARCHAR(255)
)
RETURNS TABLE (
    is_locked BOOLEAN,
    attempts_remaining INTEGER,
    locked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_status RECORD;
    failed_attempts INTEGER;
    max_attempts INTEGER := 3;
    lockout_duration INTERVAL := '30 minutes';
BEGIN
    -- Obtener estado actual
    SELECT * INTO current_status 
    FROM public.user_security_status 
    WHERE user_id = p_user_id;
    
    -- Si no existe registro, crearlo
    IF current_status IS NULL THEN
        INSERT INTO public.user_security_status (user_id)
        VALUES (p_user_id);
        
        SELECT * INTO current_status 
        FROM public.user_security_status 
        WHERE user_id = p_user_id;
    END IF;
    
    -- Verificar si ya está bloqueado y si debe desbloquearse automáticamente
    IF current_status.is_locked AND current_status.locked_at + lockout_duration <= NOW() THEN
        UPDATE public.user_security_status 
        SET 
            is_locked = FALSE,
            failed_attempts_count = 0,
            locked_at = NULL,
            locked_reason = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        current_status.is_locked := FALSE;
        current_status.failed_attempts_count := 0;
    END IF;
    
    -- Contar intentos fallidos en las últimas 24 horas
    SELECT COUNT(*) INTO failed_attempts
    FROM public.user_login_attempts
    WHERE (user_id = p_user_id OR email = p_email)
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '24 hours';
    
    -- Actualizar contador de intentos fallidos
    UPDATE public.user_security_status 
    SET 
        failed_attempts_count = failed_attempts,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Bloquear usuario si excede el límite
    IF failed_attempts >= max_attempts AND NOT current_status.is_locked THEN
        UPDATE public.user_security_status 
        SET 
            is_locked = TRUE,
            locked_at = NOW(),
            locked_reason = 'Demasiados intentos de login fallidos',
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        current_status.is_locked := TRUE;
        current_status.locked_at := NOW();
    END IF;
    
    -- Retornar estado actual
    RETURN QUERY SELECT 
        current_status.is_locked,
        GREATEST(0, max_attempts - failed_attempts) as attempts_remaining,
        CASE 
            WHEN current_status.is_locked 
            THEN current_status.locked_at + lockout_duration
            ELSE NULL 
        END as locked_until;
END;
$$;

-- Función para desbloquear usuario (solo admins)
CREATE OR REPLACE FUNCTION unlock_user(
    p_user_id UUID,
    p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Verificar que quien ejecuta es admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_admin_id AND role = 'admin'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Solo los administradores pueden desbloquear usuarios';
    END IF;
    
    -- Desbloquear usuario
    UPDATE public.user_security_status 
    SET 
        is_locked = FALSE,
        failed_attempts_count = 0,
        locked_at = NULL,
        locked_reason = NULL,
        unlock_token = NULL,
        unlock_token_expires = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Limpiar intentos fallidos recientes
    DELETE FROM public.user_login_attempts
    WHERE user_id = p_user_id 
    AND success = FALSE 
    AND attempted_at > NOW() - INTERVAL '24 hours';
    
    RETURN TRUE;
END;
$$;

-- Función para registrar actividad de usuario
CREATE OR REPLACE FUNCTION update_user_activity(
    p_user_id UUID,
    p_session_token VARCHAR(255) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar última actividad en security_status
    UPDATE public.user_security_status 
    SET 
        last_activity = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Actualizar sesión activa si se proporciona token
    IF p_session_token IS NOT NULL THEN
        UPDATE public.user_sessions 
        SET last_activity = NOW()
        WHERE session_token = p_session_token AND user_id = p_user_id;
    END IF;
END;
$$;

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW() OR last_activity < NOW() - INTERVAL '10 minutes';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Función para obtener estadísticas de seguridad (para admins)
CREATE OR REPLACE FUNCTION get_security_stats()
RETURNS TABLE (
    total_users INTEGER,
    locked_users INTEGER,
    active_sessions INTEGER,
    failed_attempts_today INTEGER,
    users_with_2fa INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM auth.users) as total_users,
        (SELECT COUNT(*)::INTEGER FROM public.user_security_status WHERE is_locked = TRUE) as locked_users,
        (SELECT COUNT(*)::INTEGER FROM public.user_sessions WHERE is_active = TRUE AND expires_at > NOW()) as active_sessions,
        (SELECT COUNT(*)::INTEGER FROM public.user_login_attempts WHERE success = FALSE AND attempted_at > CURRENT_DATE) as failed_attempts_today,
        (SELECT COUNT(*)::INTEGER FROM public.user_security_status WHERE two_factor_enabled = TRUE) as users_with_2fa;
END;
$$;

-- Función para inicializar registro de seguridad para usuarios existentes
CREATE OR REPLACE FUNCTION initialize_existing_users_security()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_rec RECORD;
    inserted_count INTEGER := 0;
BEGIN
    FOR user_rec IN 
        SELECT id FROM auth.users 
        WHERE id NOT IN (SELECT user_id FROM public.user_security_status)
    LOOP
        INSERT INTO public.user_security_status (user_id)
        VALUES (user_rec.id);
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$;

-- Trigger para crear registro de seguridad automáticamente para nuevos usuarios
CREATE OR REPLACE FUNCTION create_user_security_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_security_status (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

-- Crear trigger (comentado porque auth.users puede no permitir triggers personalizados)
-- CREATE TRIGGER on_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_user_security_record();

-- Comentarios de documentación
COMMENT ON TABLE public.user_login_attempts IS 'Registro de intentos de login para auditoría y seguridad';
COMMENT ON TABLE public.user_security_status IS 'Estado de seguridad de usuarios: bloqueos, 2FA, actividad';
COMMENT ON TABLE public.user_sessions IS 'Gestión de sesiones activas para auto-logout';

COMMENT ON FUNCTION log_login_attempt IS 'Registra intento de login exitoso o fallido';
COMMENT ON FUNCTION check_and_update_lock_status IS 'Verifica y actualiza estado de bloqueo del usuario';
COMMENT ON FUNCTION unlock_user IS 'Desbloquea usuario (solo administradores)';
COMMENT ON FUNCTION update_user_activity IS 'Actualiza última actividad del usuario';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Limpia sesiones expiradas';

-- Inicializar registros de seguridad para usuarios existentes
SELECT initialize_existing_users_security();