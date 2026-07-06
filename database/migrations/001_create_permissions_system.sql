-- ====================================================================
-- MIGRACIÓN: Sistema de Permisos Granulares
-- ====================================================================
-- Crea las tablas necesarias para el sistema de permisos y roles
-- granulares del sistema form-cupos.
-- ====================================================================

-- 1) Tabla de Permisos
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.permissions IS 'Permisos granulares del sistema';
COMMENT ON COLUMN public.permissions.code IS 'Código único del permiso (ej: USERS_CREATE, RESERVATIONS_DELETE)';
COMMENT ON COLUMN public.permissions.module IS 'Módulo al que pertenece (dashboard, users, products, reservations, etc.)';

CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON public.permissions(is_active);

-- 2) Tabla de Roles Granulares
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roles IS 'Roles granulares del sistema';
COMMENT ON COLUMN public.roles.is_system IS 'Los roles de sistema no se pueden eliminar';

CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_active ON public.roles(is_active);

-- 3) Tabla de relación Role-Permission
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

-- 4) Tabla de relación User-Role
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);

-- 5) Insertar permisos por defecto del sistema
INSERT INTO public.permissions (name, code, module, description) VALUES
-- Dashboard
('Ver Dashboard', 'DASHBOARD_VIEW', 'dashboard', 'Acceso al panel principal'),

-- Usuarios
('Ver Usuarios', 'USERS_VIEW', 'users', 'Listar y buscar usuarios'),
('Crear Usuarios', 'USERS_CREATE', 'users', 'Crear nuevos usuarios'),
('Editar Usuarios', 'USERS_UPDATE', 'users', 'Modificar datos de usuarios'),
('Eliminar Usuarios', 'USERS_DELETE', 'users', 'Eliminar usuarios'),
('Desbloquear Usuarios', 'USERS_UNLOCK', 'users', 'Desbloquear cuentas de usuarios'),

-- Agencias
('Ver Agencias', 'AGENCIES_VIEW', 'agencies', 'Listar y buscar agencias'),
('Crear Agencias', 'AGENCIES_CREATE', 'agencies', 'Crear nuevas agencias'),
('Editar Agencias', 'AGENCIES_UPDATE', 'agencies', 'Modificar datos de agencias'),
('Eliminar Agencias', 'AGENCIES_DELETE', 'agencies', 'Eliminar agencias'),

-- Productos
('Ver Productos', 'PRODUCTS_VIEW', 'products', 'Listar y buscar productos'),
('Crear Productos', 'PRODUCTS_CREATE', 'products', 'Crear nuevos productos'),
('Editar Productos', 'PRODUCTS_UPDATE', 'products', 'Modificar datos de productos'),
('Eliminar Productos', 'PRODUCTS_DELETE', 'products', 'Eliminar productos'),

-- Reservas
('Ver Reservas', 'RESERVATIONS_VIEW', 'reservations', 'Listar y buscar reservas'),
('Crear Reservas', 'RESERVATIONS_CREATE', 'reservations', 'Crear nuevas reservas'),
('Editar Reservas', 'RESERVATIONS_UPDATE', 'reservations', 'Modificar reservas'),
('Eliminar Reservas', 'RESERVATIONS_DELETE', 'reservations', 'Eliminar reservas'),
('Confirmar Reservas', 'RESERVATIONS_CONFIRM', 'reservations', 'Confirmar reservas pendientes'),

-- Notificaciones
('Ver Notificaciones', 'NOTIFICATIONS_VIEW', 'notifications', 'Listar notificaciones'),
('Crear Notificaciones', 'NOTIFICATIONS_CREATE', 'notifications', 'Crear notificaciones del sistema'),
('Eliminar Notificaciones', 'NOTIFICATIONS_DELETE', 'notifications', 'Eliminar notificaciones'),

-- Configuración
('Ver Configuración', 'SETTINGS_VIEW', 'settings', 'Ver configuración del sistema'),
('Editar Configuración', 'SETTINGS_UPDATE', 'settings', 'Modificar configuración del sistema'),

-- Marca Blanca
('Ver Marca Blanca', 'WHITE_LABEL_VIEW', 'white_label', 'Ver configuración de marca blanca'),
('Editar Marca Blanca', 'WHITE_LABEL_UPDATE', 'white_label', 'Modificar configuración de marca blanca'),

-- Email
('Ver Config Email', 'EMAIL_VIEW', 'email', 'Ver configuración SMTP'),
('Editar Config Email', 'EMAIL_UPDATE', 'email', 'Modificar configuración SMTP'),

-- IA
('Ver Config IA', 'AI_VIEW', 'ai', 'Ver configuración de IA'),
('Editar Config IA', 'AI_UPDATE', 'ai', 'Modificar configuración de IA'),

-- Permisos
('Ver Permisos', 'PERMISSIONS_VIEW', 'permissions', 'Listar permisos'),
('Crear Permisos', 'PERMISSIONS_CREATE', 'permissions', 'Crear nuevos permisos'),
('Editar Permisos', 'PERMISSIONS_UPDATE', 'permissions', 'Modificar permisos'),
('Eliminar Permisos', 'PERMISSIONS_DELETE', 'permissions', 'Eliminar permisos'),

-- Roles
('Ver Roles', 'ROLES_VIEW', 'roles', 'Listar roles'),
('Crear Roles', 'ROLES_CREATE', 'roles', 'Crear nuevos roles'),
('Editar Roles', 'ROLES_UPDATE', 'roles', 'Modificar roles'),
('Eliminar Roles', 'ROLES_DELETE', 'roles', 'Eliminar roles'),
('Asignar Permisos', 'ROLES_ASSIGN_PERMISSIONS', 'roles', 'Asignar permisos a roles'),

-- Reportes
('Ver Reportes', 'REPORTS_VIEW', 'reports', 'Acceder a reportes y estadísticas'),
('Exportar Datos', 'REPORTS_EXPORT', 'reports', 'Exportar datos en CSV/Excel/PDF')
ON CONFLICT (code) DO NOTHING;

-- 6) Insertar roles por defecto del sistema
INSERT INTO public.roles (name, code, description, is_system) VALUES
('Administrador Total', 'SUPER_ADMIN', 'Acceso total al sistema con todos los permisos', true),
('Administrador de Agencia', 'AGENCY_ADMIN', 'Administrador con acceso completo a su agencia', true),
('Supervisor de Ventas', 'SALES_SUPERVISOR', 'Puede gestionar reservas y productos de su agencia', false),
('Agente de Ventas', 'SALES_AGENT', 'Puede crear y gestionar reservas', false),
('Solo Consulta', 'VIEWER', 'Solo puede ver información sin modificar', false)
ON CONFLICT (code) DO NOTHING;

-- 7) Asignar todos los permisos al rol SUPER_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 8) Asignar permisos al rol AGENCY_ADMIN (todos excepto permisos de sistema)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'AGENCY_ADMIN'
  AND p.module NOT IN ('permissions', 'roles')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 9) Asignar permisos al rol SALES_SUPERVISOR
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'SALES_SUPERVISOR'
  AND p.module IN ('dashboard', 'products', 'reservations', 'notifications', 'reports')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 10) Asignar permisos al rol SALES_AGENT
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'SALES_AGENT'
  AND p.code IN (
    'DASHBOARD_VIEW',
    'PRODUCTS_VIEW',
    'RESERVATIONS_VIEW', 'RESERVATIONS_CREATE', 'RESERVATIONS_UPDATE',
    'NOTIFICATIONS_VIEW'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 11) Asignar permisos al rol VIEWER (solo lectura)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'VIEWER'
  AND p.code LIKE '%_VIEW'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 12) Función para obtener permisos de un usuario
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_id UUID, permission_code TEXT, permission_name TEXT, permission_module TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.id, p.code, p.name, p.module
  FROM public.permissions p
  INNER JOIN public.role_permissions rp ON rp.permission_id = p.id
  INNER JOIN public.user_roles ur ON ur.role_id = rp.role_id
  WHERE ur.user_id = p_user_id
    AND p.is_active = true
  ORDER BY p.module, p.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13) Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_perm BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.permissions p
    INNER JOIN public.role_permissions rp ON rp.permission_id = p.id
    INNER JOIN public.user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
      AND p.code = p_permission_code
      AND p.is_active = true
  ) INTO v_has_perm;
  
  RETURN COALESCE(v_has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14) Trigger para actualizar updated_at en permissions
CREATE OR REPLACE FUNCTION public.update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_permissions_updated_at ON public.permissions;
CREATE TRIGGER trigger_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permissions_updated_at();

-- 15) Trigger para actualizar updated_at en roles
DROP TRIGGER IF EXISTS trigger_roles_updated_at ON public.roles;
CREATE TRIGGER trigger_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permissions_updated_at();
