-- Migración: Seed de acciones de IA predefinidas
-- Fecha: 2025-01-07
-- Descripción: Inserta las acciones disponibles para function calling del chat IA

INSERT INTO public.ai_actions (name, description, category, endpoint, method, parameters_schema, requires_confirmation)
VALUES 
    -- Acciones de Reservas
    (
        'create_reservation', 
        'Crear una nueva reserva temporal', 
        'reservations', 
        '/api/orders', 
        'POST',
        '{"type": "object", "properties": {"productId": {"type": "string"}, "body": {"type": "object"}}, "required": ["productId", "body"]}'::jsonb,
        TRUE
    ),
    (
        'list_reservations', 
        'Listar todas las reservas con filtros opcionales', 
        'reservations', 
        '/api/orders', 
        'GET',
        '{"type": "object", "properties": {"agencia": {"type": "string"}, "estado": {"type": "string"}, "fecha_desde": {"type": "string"}, "fecha_hasta": {"type": "string"}}}'::jsonb,
        FALSE
    ),
    (
        'get_reservation', 
        'Obtener detalles de una reserva específica', 
        'reservations', 
        '/api/orders/:id', 
        'GET',
        '{"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}'::jsonb,
        FALSE
    ),
    (
        'confirm_reservation', 
        'Confirmar una reserva temporal', 
        'reservations', 
        '/api/orders/:id/confirm', 
        'POST',
        '{"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}'::jsonb,
        TRUE
    ),
    (
        'cancel_reservation', 
        'Cancelar/eliminar una reserva', 
        'reservations', 
        '/api/orders/:id', 
        'DELETE',
        '{"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}'::jsonb,
        TRUE
    ),
    
    -- Acciones de Usuarios
    (
        'create_user', 
        'Crear un nuevo usuario del sistema', 
        'users', 
        '/api/users', 
        'POST',
        '{"type": "object", "properties": {"email": {"type": "string"}, "nombre": {"type": "string"}, "agencia": {"type": "string"}, "role": {"type": "string"}}, "required": ["email", "nombre", "agencia"]}'::jsonb,
        TRUE
    ),
    (
        'list_users', 
        'Listar todos los usuarios del sistema', 
        'users', 
        '/api/users', 
        'GET',
        '{"type": "object", "properties": {"agencia": {"type": "string"}, "role": {"type": "string"}}}'::jsonb,
        FALSE
    ),
    (
        'update_user', 
        'Actualizar datos de un usuario', 
        'users', 
        '/api/users/:id', 
        'PUT',
        '{"type": "object", "properties": {"id": {"type": "string"}, "data": {"type": "object"}}, "required": ["id", "data"]}'::jsonb,
        TRUE
    ),
    
    -- Acciones de Productos
    (
        'create_product', 
        'Crear un nuevo producto/cupo', 
        'products', 
        '/api/products', 
        'POST',
        '{"type": "object", "properties": {"nombre": {"type": "string"}, "descripcion": {"type": "string"}, "capacidad": {"type": "integer"}}, "required": ["nombre", "capacidad"]}'::jsonb,
        TRUE
    ),
    (
        'list_products', 
        'Listar todos los productos disponibles', 
        'products', 
        '/api/products', 
        'GET',
        '{"type": "object", "properties": {"activo": {"type": "boolean"}}}'::jsonb,
        FALSE
    ),
    (
        'update_product', 
        'Actualizar un producto existente', 
        'products', 
        '/api/products/:id', 
        'PUT',
        '{"type": "object", "properties": {"id": {"type": "string"}, "data": {"type": "object"}}, "required": ["id", "data"]}'::jsonb,
        TRUE
    ),
    
    -- Acciones de Agencias
    (
        'create_agency', 
        'Crear una nueva agencia', 
        'agencies', 
        '/api/agencies', 
        'POST',
        '{"type": "object", "properties": {"nombre": {"type": "string"}, "codigo": {"type": "string"}, "email": {"type": "string"}}, "required": ["nombre", "codigo"]}'::jsonb,
        TRUE
    ),
    (
        'list_agencies', 
        'Listar todas las agencias', 
        'agencies', 
        '/api/agencies', 
        'GET',
        '{"type": "object", "properties": {"activa": {"type": "boolean"}}}'::jsonb,
        FALSE
    ),
    
    -- Acciones de Disponibilidad
    (
        'get_availability', 
        'Consultar disponibilidad de cupos', 
        'reservations', 
        '/api/availability', 
        'GET',
        '{"type": "object", "properties": {"productId": {"type": "string"}, "fecha": {"type": "string"}}}'::jsonb,
        FALSE
    ),
    
    -- Acciones de Notificaciones
    (
        'send_notification', 
        'Enviar notificación a usuarios', 
        'notifications', 
        '/api/notifications', 
        'POST',
        '{"type": "object", "properties": {"title": {"type": "string"}, "message": {"type": "string"}, "targetRole": {"type": "string"}}, "required": ["title", "message"]}'::jsonb,
        TRUE
    ),
    
    -- Acciones de Reportes
    (
        'generate_report', 
        'Generar reporte de datos', 
        'reports', 
        '/api/reports/generate', 
        'POST',
        '{"type": "object", "properties": {"type": {"type": "string"}, "dateFrom": {"type": "string"}, "dateTo": {"type": "string"}}, "required": ["type"]}'::jsonb,
        FALSE
    )
ON CONFLICT (name) DO NOTHING;
