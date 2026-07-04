-- ====================================================================
-- SISTEMA DE GESTIÓN DE CUPOS - SCRIPT DE BASE DE DATOS CONSOLIDADO
-- ====================================================================
-- Este script crea todas las tablas, relaciones, índices, triggers y
-- funciones necesarias para el funcionamiento del sistema form-cupos.
-- Diseñado para ser portable: Funciona en Supabase, Neon, RDS y local.
--
-- NOTA: la gestión de conexiones a APIs externas y sus credenciales
-- (data_connections, api_credentials, service_credentials,
-- connection_data_types) se maneja en un backend separado y NO forma
-- parte de este esquema.
-- ====================================================================

-- 0) Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Compatibilidad con esquemas sin Supabase Auth
-- Si no existe la tabla auth.users, creamos una simulación para que no fallen las llaves foráneas.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    encrypted_password VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Tablas principales del sistema

-- A) Tabla de Agencias
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    logo_url TEXT,
    logo_path TEXT,
    main_color TEXT,
    text_color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT agencies_main_color_hex CHECK (main_color IS NULL OR main_color ~* '^#([A-F0-9]{3}|([A-F0-9]{6}))$'),
    CONSTRAINT agencies_text_color_hex CHECK (text_color IS NULL OR text_color ~* '^#([A-F0-9]{3}|([A-F0-9]{6}))$')
);

COMMENT ON TABLE public.agencies IS 'Catálogo de agencias/clientes';
COMMENT ON COLUMN public.agencies.code IS 'Código único de agencia';
COMMENT ON COLUMN public.agencies.logo_path IS 'Ruta de objeto en storage';
COMMENT ON COLUMN public.agencies.logo_url IS 'URL pública del logo';
COMMENT ON COLUMN public.agencies.main_color IS 'Color principal de marca en HEX';
COMMENT ON COLUMN public.agencies.text_color IS 'Color de texto en HEX para contrastar sobre el color principal';

-- B) Tabla de Perfiles de Usuario (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT,
    agencia TEXT, -- Nombre o código de la agencia (ej: 'default')
    admin BOOLEAN DEFAULT false, -- Mantenido por compatibilidad
    role TEXT DEFAULT 'agency_user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_roles CHECK (role IN ('admin', 'agency_admin', 'agency_user'))
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario conectados con Auth.Users';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario: admin, agency_admin, agency_user';

-- C) Notificaciones del Sistema
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_request', 'request_confirmed', 'new_product', 'low_availability', 'system_update')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(10) DEFAULT '📢',
    color VARCHAR(20) DEFAULT 'blue',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    data JSONB DEFAULT '{}',
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role VARCHAR(50) CHECK (target_role IN ('admin', 'agency_admin', 'agency_user')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE, -- Deprecado a favor de user_notification_states para multi-tenant
    read_at TIMESTAMPTZ
);

COMMENT ON TABLE public.notifications IS 'Tabla para almacenar notificaciones del sistema';

-- D) Estados de Notificaciones del Usuario (user_notification_states)
CREATE TABLE IF NOT EXISTS public.user_notification_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    hidden_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, notification_id)
);

-- E) Historial de Intentos de Inicio de Sesión
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

-- F) Estado de Seguridad y 2FA
CREATE TABLE IF NOT EXISTS public.user_security_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ NULL,
    locked_reason VARCHAR(255),
    failed_attempts_count INTEGER DEFAULT 0,
    last_failed_attempt TIMESTAMPTZ NULL,
    unlock_token VARCHAR(255) NULL,
    unlock_token_expires TIMESTAMPTZ NULL,
    
    -- 2FA
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    backup_codes TEXT[] DEFAULT '{}',
    last_backup_code_used_at TIMESTAMPTZ NULL,
    
    -- Actividad
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ NULL,
    total_logins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_security_status_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- G) Sesiones de Usuario
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

-- ====================================================================
-- 3) Índices para Optimización de Consultas
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_agencies_name ON public.agencies USING GIN (to_tsvector('simple', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON public.agencies(is_active);
CREATE INDEX IF NOT EXISTS idx_agencies_address ON public.agencies USING GIN (to_tsvector('simple', coalesce(address, '')));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_agencia_role ON public.profiles(agencia, role);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (target_user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_role_unread ON public.notifications (target_role, read) WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_notification_states_user_id ON public.user_notification_states (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_states_notification_id ON public.user_notification_states (notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_states_user_unread ON public.user_notification_states (user_id, is_read) WHERE is_read = FALSE AND is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_login_attempts_user_id_attempted_at ON public.user_login_attempts (user_id, attempted_at);
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_email_attempted_at ON public.user_login_attempts (email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_ip_address_attempted_at ON public.user_login_attempts (ip_address, attempted_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_is_active ON public.user_sessions (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON public.user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions (expires_at);

-- ====================================================================
-- 4) Triggers para el campo updated_at
-- ====================================================================

-- Función helper para setear updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para public.agencies
CREATE OR REPLACE TRIGGER trg_agencies_set_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para public.profiles
CREATE OR REPLACE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para public.user_notification_states
CREATE OR REPLACE TRIGGER trg_user_notification_states_set_updated_at
BEFORE UPDATE ON public.user_notification_states
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para public.user_security_status
CREATE OR REPLACE TRIGGER trg_user_security_status_set_updated_at
BEFORE UPDATE ON public.user_security_status
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 5) Funciones Especiales y Helpers de Base de Datos
-- ====================================================================

-- A) Obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B) Obtener agencia del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_current_user_agency()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT agencia 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C) Registrar intento de login
CREATE OR REPLACE FUNCTION public.log_login_attempt(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_ip_address INET,
    p_user_agent TEXT,
    p_success BOOLEAN,
    p_failure_reason VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_login_attempts (
        user_id, email, ip_address, user_agent, success, failure_reason
    ) VALUES (
        p_user_id, p_email, p_ip_address, p_user_agent, p_success, p_failure_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D) Controlar bloqueos de usuario
CREATE OR REPLACE FUNCTION public.check_and_update_lock_status(
    p_user_id UUID,
    p_email VARCHAR(255)
)
RETURNS TABLE (
    is_locked BOOLEAN,
    attempts_remaining INTEGER,
    locked_until TIMESTAMPTZ
) AS $$
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
        current_status.is_locked::BOOLEAN,
        GREATEST(0, max_attempts - failed_attempts)::INTEGER as attempts_remaining,
        CASE 
            WHEN current_status.is_locked 
            THEN current_status.locked_at + lockout_duration
            ELSE NULL 
        END::TIMESTAMPTZ as locked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E) Desbloquear usuario
CREATE OR REPLACE FUNCTION public.unlock_user(
    p_user_id UUID,
    p_admin_id UUID
)
RETURNS BOOLEAN AS $$
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
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- F) Limpiar notificaciones antiguas
CREATE OR REPLACE FUNCTION public.clean_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.notifications 
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND id IN (SELECT notification_id FROM public.user_notification_states WHERE is_read = TRUE);
END;
$$ LANGUAGE plpgsql;

-- G) Obtener recuento de no leídas
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_role VARCHAR(50);
    unread_count INTEGER;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    -- Contar notificaciones no leídas
    SELECT COUNT(*) INTO unread_count
    FROM public.notifications n
    LEFT JOIN public.user_notification_states uns ON (n.id = uns.notification_id AND uns.user_id = user_uuid)
    WHERE COALESCE(uns.is_read, FALSE) = FALSE
      AND COALESCE(uns.is_hidden, FALSE) = FALSE
      AND (
          n.target_user_id = user_uuid
          OR n.target_role = user_role
          OR (n.target_user_id IS NULL AND n.target_role IS NULL)
      );
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- H) Marcar todas las notificaciones como leídas para un usuario
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_role VARCHAR(50);
    updated_count INTEGER := 0;
    notif RECORD;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    -- Recorrer notificaciones no leídas aplicables al usuario
    FOR notif IN 
        SELECT n.id 
        FROM public.notifications n
        LEFT JOIN public.user_notification_states uns ON (n.id = uns.notification_id AND uns.user_id = user_uuid)
        WHERE COALESCE(uns.is_read, FALSE) = FALSE
          AND (n.target_user_id = user_uuid OR n.target_role = user_role OR (n.target_user_id IS NULL AND n.target_role IS NULL))
    LOOP
        INSERT INTO public.user_notification_states (user_id, notification_id, is_read, read_at, updated_at)
        VALUES (user_uuid, notif.id, TRUE, NOW(), NOW())
        ON CONFLICT (user_id, notification_id)
        DO UPDATE SET is_read = TRUE, read_at = NOW(), updated_at = NOW();
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- I) Obtener listado completo de notificaciones con estado
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    user_uuid UUID,
    limit_count INTEGER DEFAULT 50,
    only_unread BOOLEAN DEFAULT FALSE,
    include_hidden BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    notification_id UUID,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    icon VARCHAR(10),
    color VARCHAR(20),
    priority VARCHAR(10),
    data JSONB,
    target_user_id UUID,
    target_role VARCHAR(50),
    created_by UUID,
    created_at TIMESTAMPTZ,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    is_hidden BOOLEAN,
    hidden_at TIMESTAMPTZ
) AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    RETURN QUERY
    SELECT
        n.id as notification_id,
        n.type,
        n.title,
        n.message,
        n.icon,
        n.color,
        n.priority,
        n.data,
        n.target_user_id,
        n.target_role,
        n.created_by,
        n.created_at,
        COALESCE(uns.is_read, FALSE) as is_read,
        uns.read_at,
        COALESCE(uns.is_hidden, FALSE) as is_hidden,
        uns.hidden_at
    FROM public.notifications n
    LEFT JOIN public.user_notification_states uns ON (
        n.id = uns.notification_id AND uns.user_id = user_uuid
    )
    WHERE (
        n.target_user_id = user_uuid
        OR n.target_role = user_role
        OR (n.target_user_id IS NULL AND n.target_role IS NULL)
    )
    AND (
        include_hidden OR COALESCE(uns.is_hidden, FALSE) = FALSE
    )
    AND (
        NOT only_unread OR COALESCE(uns.is_read, FALSE) = FALSE
    )
    ORDER BY n.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- J) Marcar una sola notificación como leída
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    user_uuid UUID,
    notification_uuid UUID,
    read_status BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_notification_states (
        user_id, 
        notification_id, 
        is_read, 
        read_at,
        updated_at
    ) VALUES (
        user_uuid, 
        notification_uuid, 
        read_status,
        CASE WHEN read_status THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (user_id, notification_id)
    DO UPDATE SET 
        is_read = read_status,
        read_at = CASE WHEN read_status THEN NOW() ELSE NULL END,
        updated_at = NOW();
        
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- K) Ocultar notificación
CREATE OR REPLACE FUNCTION public.hide_notification(
    user_uuid UUID,
    notification_uuid UUID,
    hide_status BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_notification_states (
        user_id, 
        notification_id, 
        is_hidden, 
        hidden_at,
        updated_at
    ) VALUES (
        user_uuid, 
        notification_uuid, 
        hide_status,
        CASE WHEN hide_status THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (user_id, notification_id)
    DO UPDATE SET 
        is_hidden = hide_status,
        hidden_at = CASE WHEN hide_status THEN NOW() ELSE NULL END,
        updated_at = NOW();
        
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- L) Obtener columnas de tabla para mapeos dinámicos
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.column_name::TEXT,
        c.data_type::TEXT,
        c.is_nullable::TEXT
    FROM
        information_schema.columns c
    WHERE
        c.table_schema = 'public' AND c.table_name = p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 6) Políticas de Row Level Security (RLS)
-- ====================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para Agencies
CREATE POLICY "admins_and_agency_admins_can_select_agencies" ON public.agencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin','agency_admin')
        )
    );

CREATE POLICY "admins_can_manage_agencies" ON public.agencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Políticas para Profiles
CREATE POLICY "admin_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "agency_admin_can_view_agency_profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND p.role = 'agency_admin' 
              AND p.agencia = public.profiles.agencia
        )
    );

CREATE POLICY "agency_user_can_view_own_profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_can_manage_profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Políticas para Notifications
CREATE POLICY "users_can_view_notifications" ON public.notifications
    FOR SELECT USING (
        target_user_id = auth.uid() 
        OR target_role = get_current_user_role()
        OR (target_user_id IS NULL AND target_role IS NULL)
    );

CREATE POLICY "admins_can_manage_notifications" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para User Notification States
CREATE POLICY "users_can_manage_own_notification_states" ON public.user_notification_states
    FOR ALL USING (user_id = auth.uid());

-- Políticas para Login Attempts
CREATE POLICY "users_can_view_own_login_attempts" ON public.user_login_attempts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admins_can_view_all_login_attempts" ON public.user_login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para Security Status
CREATE POLICY "users_can_manage_own_security_status" ON public.user_security_status
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admins_can_view_all_security_status" ON public.user_security_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para User Sessions
CREATE POLICY "users_can_manage_own_sessions" ON public.user_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admins_can_manage_all_sessions" ON public.user_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ====================================================================
-- 7) Datos Semilla Iniciales (Seed Data)
-- ====================================================================

-- Agencia Default
INSERT INTO public.agencies (code, name, main_color, text_color, is_active)
VALUES ('default', 'Agencia Genérica', '#2c4b8b', '#ffffff', true)
ON CONFLICT (code) DO NOTHING;
