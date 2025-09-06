-- SQL Migration: Crear tabla de notificaciones
-- Fecha: 2025-01-05
-- Descripción: Tabla para almacenar notificaciones del sistema

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_request', 'request_confirmed', 'new_product', 'low_availability', 'system_update')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(10) DEFAULT '📢',
    color VARCHAR(20) DEFAULT 'blue',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    data JSONB DEFAULT '{}',
    
    -- Targeting: puede ser para un usuario específico, un rol, o global (null)
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role VARCHAR(50) CHECK (target_role IN ('admin', 'agency_admin', 'agency_user')),
    
    -- Metadatos
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ
);

-- Crear índices adicionales para consultas complejas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (target_user_id, read) 
WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_role_unread 
ON public.notifications (target_role, read) 
WHERE read = FALSE;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus notificaciones
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (
        -- Notificaciones dirigidas específicamente al usuario
        target_user_id = auth.uid() 
        OR 
        -- Notificaciones dirigidas al rol del usuario
        target_role = (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        )
        OR 
        -- Notificaciones globales (sin target específico)
        (target_user_id IS NULL AND target_role IS NULL)
    );

-- Política para que los usuarios puedan marcar como leídas sus notificaciones
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (
        target_user_id = auth.uid() 
        OR 
        target_role = (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        )
        OR 
        (target_user_id IS NULL AND target_role IS NULL)
    );

-- Política para que solo los administradores puedan crear notificaciones
CREATE POLICY "Admins can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'agency_admin')
        )
    );

-- Política para que solo los administradores puedan eliminar notificaciones
CREATE POLICY "Admins can delete notifications" ON public.notifications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Función para limpiar notificaciones antigas (30 días)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.notifications 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND read = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para limpiar automáticamente (ejecutar diariamente)
-- Nota: Esto requiere configuración adicional del scheduler de PostgreSQL

-- Función para obtener conteo de notificaciones no leídas
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_role VARCHAR(50);
    unread_count INTEGER;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    -- Contar notificaciones no leídas
    SELECT COUNT(*) INTO unread_count
    FROM public.notifications
    WHERE read = FALSE
    AND (
        target_user_id = user_uuid
        OR target_role = user_role
        OR (target_user_id IS NULL AND target_role IS NULL)
    );
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_role VARCHAR(50);
    updated_count INTEGER;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    
    -- Marcar como leídas
    UPDATE public.notifications 
    SET read = TRUE, read_at = NOW()
    WHERE read = FALSE
    AND (
        target_user_id = user_uuid
        OR target_role = user_role
        OR (target_user_id IS NULL AND target_role IS NULL)
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios de documentación
COMMENT ON TABLE public.notifications IS 'Tabla para almacenar notificaciones del sistema';
COMMENT ON COLUMN public.notifications.type IS 'Tipo de notificación: new_request, request_confirmed, new_product, low_availability, system_update';
COMMENT ON COLUMN public.notifications.target_user_id IS 'Usuario específico destinatario (opcional)';
COMMENT ON COLUMN public.notifications.target_role IS 'Rol destinatario (opcional)';
COMMENT ON COLUMN public.notifications.data IS 'Datos adicionales en formato JSON';
COMMENT ON COLUMN public.notifications.priority IS 'Prioridad: low, medium, high';

-- Datos de ejemplo (opcional, para testing)
INSERT INTO public.notifications (type, title, message, target_role, created_by) VALUES
('system_update', 'Sistema Actualizado', 'El sistema de gestión de cupos ha sido actualizado con nuevas funcionalidades.', NULL, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;