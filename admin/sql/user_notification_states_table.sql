-- SQL Migration: Crear tabla de estados personales de notificaciones
-- Fecha: 2025-01-08
-- Descripción: Tabla para almacenar estados personales de notificaciones por usuario

-- Crear tabla de estados personales de notificaciones
CREATE TABLE IF NOT EXISTS public.user_notification_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    
    -- Estados personales del usuario para esta notificación
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    hidden_at TIMESTAMPTZ NULL,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar duplicados
    UNIQUE(user_id, notification_id)
);

-- Crear índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_user_notification_states_user_id 
ON public.user_notification_states (user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_states_notification_id 
ON public.user_notification_states (notification_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_states_user_unread 
ON public.user_notification_states (user_id, is_read) 
WHERE is_read = FALSE AND is_hidden = FALSE;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.user_notification_states ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propios estados
CREATE POLICY "Users can view their own notification states" ON public.user_notification_states
    FOR SELECT USING (user_id = auth.uid());

-- Política para que los usuarios solo puedan modificar sus propios estados
CREATE POLICY "Users can update their own notification states" ON public.user_notification_states
    FOR ALL USING (user_id = auth.uid());

-- Función para obtener notificaciones con estados personales
DROP FUNCTION IF EXISTS get_user_notifications(UUID, INTEGER, BOOLEAN, BOOLEAN);
CREATE OR REPLACE FUNCTION get_user_notifications(
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        -- Notificaciones dirigidas específicamente al usuario
        n.target_user_id = user_uuid
        OR 
        -- Notificaciones dirigidas al rol del usuario
        n.target_role = user_role
        OR 
        -- Notificaciones globales (sin target específico)
        (n.target_user_id IS NULL AND n.target_role IS NULL)
    )
    AND (
        -- Filtro por ocultas
        include_hidden OR COALESCE(uns.is_hidden, FALSE) = FALSE
    )
    AND (
        -- Filtro por leídas/no leídas
        NOT only_unread OR COALESCE(uns.is_read, FALSE) = FALSE
    )
    ORDER BY n.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Función para marcar notificación como leída para un usuario específico
CREATE OR REPLACE FUNCTION mark_notification_read(
    user_uuid UUID,
    notification_uuid UUID,
    read_status BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insertar o actualizar estado personal
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
$$;

-- Función para ocultar notificación para un usuario específico
CREATE OR REPLACE FUNCTION hide_notification(
    user_uuid UUID,
    notification_uuid UUID,
    hidden_status BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insertar o actualizar estado personal
    INSERT INTO public.user_notification_states (
        user_id, 
        notification_id, 
        is_hidden, 
        hidden_at,
        updated_at
    ) VALUES (
        user_uuid, 
        notification_uuid, 
        hidden_status,
        CASE WHEN hidden_status THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (user_id, notification_id) 
    DO UPDATE SET 
        is_hidden = hidden_status,
        hidden_at = CASE WHEN hidden_status THEN NOW() ELSE NULL END,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Función para marcar todas las notificaciones como leídas para un usuario
CREATE OR REPLACE FUNCTION mark_all_user_notifications_read(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role VARCHAR(50);
    notification_rec RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    -- Iterar sobre todas las notificaciones visibles para el usuario
    FOR notification_rec IN
        SELECT n.id
        FROM public.notifications n
        LEFT JOIN public.user_notification_states uns ON (
            n.id = uns.notification_id AND uns.user_id = user_uuid
        )
        WHERE (
            n.target_user_id = user_uuid
            OR n.target_role = user_role
            OR (n.target_user_id IS NULL AND n.target_role IS NULL)
        )
        AND COALESCE(uns.is_read, FALSE) = FALSE
        AND COALESCE(uns.is_hidden, FALSE) = FALSE
    LOOP
        PERFORM mark_notification_read(user_uuid, notification_rec.id, TRUE);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

-- Función para obtener conteo de notificaciones no leídas para un usuario
CREATE OR REPLACE FUNCTION get_user_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role VARCHAR(50);
    unread_count INTEGER;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    -- Contar notificaciones no leídas y no ocultas
    SELECT COUNT(*) INTO unread_count
    FROM public.notifications n
    LEFT JOIN public.user_notification_states uns ON (
        n.id = uns.notification_id AND uns.user_id = user_uuid
    )
    WHERE (
        n.target_user_id = user_uuid
        OR n.target_role = user_role
        OR (n.target_user_id IS NULL AND n.target_role IS NULL)
    )
    AND COALESCE(uns.is_read, FALSE) = FALSE
    AND COALESCE(uns.is_hidden, FALSE) = FALSE;
    
    RETURN unread_count;
END;
$$;

-- Función para limpiar estados de notificaciones eliminadas
CREATE OR REPLACE FUNCTION cleanup_orphaned_notification_states()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_notification_states
    WHERE notification_id NOT IN (SELECT id FROM public.notifications);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Trigger para limpiar automáticamente estados huérfanos cuando se elimina una notificación
CREATE OR REPLACE FUNCTION cleanup_notification_states_trigger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.user_notification_states 
    WHERE notification_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_notification_states_on_delete
    AFTER DELETE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_notification_states_trigger();

-- Comentarios de documentación
COMMENT ON TABLE public.user_notification_states IS 'Estados personales de notificaciones por usuario';
COMMENT ON COLUMN public.user_notification_states.is_read IS 'Si el usuario ha marcado la notificación como leída';
COMMENT ON COLUMN public.user_notification_states.is_hidden IS 'Si el usuario ha ocultado/eliminado la notificación';
COMMENT ON FUNCTION get_user_notifications IS 'Obtiene notificaciones con estados personales para un usuario';
COMMENT ON FUNCTION mark_notification_read IS 'Marca una notificación como leída para un usuario específico';
COMMENT ON FUNCTION hide_notification IS 'Oculta una notificación para un usuario específico';