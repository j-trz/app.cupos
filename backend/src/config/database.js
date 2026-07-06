import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuración de base de datos basada en variables de entorno
const dbProvider = process.env.DB_PROVIDER || 'postgresql'; // postgresql, neon, supabase, etc.

let pool;

switch (dbProvider) {
  case 'neon':
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    break;
    
  case 'supabase':
    pool = new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    break;
    
  case 'postgresql':
  default:
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    });
}

pool.on('connect', () => {
  console.log(`🔌 Conectado exitosamente a la base de datos ${dbProvider.toUpperCase()} (${process.env.DB_PROVIDER})`);
});

pool.on('error', (err) => {
  console.error(`❌ Error inesperado en el pool de conexiones de ${dbProvider.toUpperCase()}:`, err);
});

export const query = (text, params) => pool.query(text, params);
export default pool;

// Función para inicializar la base de datos
const initializeDatabase = async () => {
  try {
    // Helper: obtener tipo de columna existente para adaptarse a bases ya creadas
    const getColumnType = async (schema, table, column) => {
      try {
        const q = `
          SELECT data_type, udt_name
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
          LIMIT 1
        `;
        const r = await query(q, [schema, table, column]);
        if (r.rows.length === 0) return null;
        const dt = r.rows[0].data_type || r.rows[0].udt_name;
        if (!dt) return null;
        // Normalizar a un tipo SQL simple
        if (String(dt).toLowerCase().includes('uuid')) return 'UUID';
        if (String(dt).toLowerCase().includes('int')) return 'INT';
        return String(dt).toUpperCase();
      } catch (err) {
        return null;
      }
    };

    // Detectar tipos actuales (si ya existen tablas)
    const agenciesIdType = (await getColumnType('public', 'agencies', 'id')) || 'UUID';
    const themesIdType = (await getColumnType('public', 'themes', 'id')) || 'UUID';
    const authUsersIdType = (await getColumnType('auth', 'users', 'id')) || 'UUID';
    // Crear tabla products
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        codigo_cupo VARCHAR(255) NOT NULL,
        destino VARCHAR(255) NOT NULL,
        compania VARCHAR(255) NOT NULL,
        disponibilidad INTEGER NOT NULL,
        salida DATE,
        regreso DATE,
        fecha_salida DATE,
        fecha_regreso DATE,
        precio NUMERIC(10, 2),
        ruta VARCHAR(255),
        pnr VARCHAR(255),
        ficha VARCHAR(255),
        temporada VARCHAR(255),
        bloqueo_temporal_minutos INTEGER NULL,
        email_warning_enabled BOOLEAN DEFAULT TRUE,
        is_blocked_for_sale BOOLEAN DEFAULT FALSE,
        op VARCHAR(255),
        carryon BOOLEAN DEFAULT FALSE,
        handbag BOOLEAN DEFAULT FALSE,
        checkedbag BOOLEAN DEFAULT FALSE,
        inf_fare NUMERIC(10, 2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Crear tabla reservations
    await query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        estado VARCHAR(255) NOT NULL DEFAULT 'bloqueo_temporal', -- Estados: solicitud, bloqueo_temporal, bloqueo_permanente, expirada, cancelada
        bloqueo_expira_at TIMESTAMPTZ NULL, -- Fecha y hora de expiración del bloqueo temporal
        precio_venta NUMERIC(10, 2) NOT NULL, -- Precio congelado para el usuario final
        neto_1 NUMERIC(10, 2) NOT NULL, -- Costo neto interno, visible solo para admin
        pedido_id VARCHAR(255) NOT NULL,
        agencia VARCHAR(255) NOT NULL,
        contacto_nombre VARCHAR(255) NOT NULL,
        contacto_email VARCHAR(255) NOT NULL,
        contacto_telefono VARCHAR(255),
        vuelo_codigo VARCHAR(255) NOT NULL,
        vuelo_destino VARCHAR(255) NOT NULL,
        vuelo_compania VARCHAR(255) NOT NULL,
        vuelo_salida DATE NOT NULL,
        vuelo_precio NUMERIC(10, 2), -- Puede corresponder al precio de venta histórico
        nombre_pasajero VARCHAR(255) NOT NULL,
        apellido_pasajero VARCHAR(255) NOT NULL,
        documento_pasajero VARCHAR(255) NOT NULL,
        nacimiento_pasajero DATE,
        nacionalidad_pasajero VARCHAR(255),
        tipo_pasajero VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Crear tabla themes (usar UUID por defecto)
    await query(`
      CREATE TABLE IF NOT EXISTS themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        colors JSONB,
        fonts JSONB,
        logo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla agency_themes adaptando tipos según la base existente
    await query(`
      CREATE TABLE IF NOT EXISTS agency_themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id ${agenciesIdType} NOT NULL,
        theme_id ${themesIdType} NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
        UNIQUE (agency_id, theme_id)
      );
    `);

    // Crear tabla agency_configurations (agency_id usa el tipo detectado)
    await query(`
      CREATE TABLE IF NOT EXISTS agency_configurations (
        id SERIAL PRIMARY KEY,
        agency_id ${agenciesIdType} NOT NULL,
        configuration JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
      );
    `);

    // Crear tabla agency_theme_configs (adaptar types según DB existente)
    await query(`
      CREATE TABLE IF NOT EXISTS agency_theme_configs (
        id SERIAL PRIMARY KEY,
        agency_id ${agenciesIdType} NOT NULL,
        theme_id ${themesIdType} NOT NULL,
        configuration JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
        UNIQUE (agency_id, theme_id)
      );
    `);

    // Crear tabla permissions
    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla roles
    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla role_permissions
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE (role_id, permission_id)
      );
    `);

    // Crear tabla user_roles (usar tipo de auth.users.id si existe)
    await query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id ${authUsersIdType} NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE (user_id, role_id)
      );
    `);

    // Tabla para configuración global del sistema
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Tabla para plantillas de email
    await query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        event_code VARCHAR(255) UNIQUE NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        placeholders TEXT[], -- Array de strings con los nombres de los placeholders esperados
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Tabla para logs de envío de email
    await query(`
      CREATE TABLE IF NOT EXISTS email_log (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed', 'retrying')),
        error_message TEXT,
        sent_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Tabla para reglas de alerta de cupo
    await query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        threshold_quantity INTEGER NOT NULL, -- Umbral de lugares restantes
        actions TEXT[] NOT NULL, -- Array de acciones a tomar (ej: ['email_admin', 'in_app_alert', 'block_sale'])
        send_email_to_admin BOOLEAN DEFAULT FALSE,
        send_email_to_agency BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}'::JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        last_triggered_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ============================================
    // Tabla de logs de auditoría
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(255) NOT NULL,
        user_agent TEXT,
        ip VARCHAR(45),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        duration INTEGER, -- Duración en milisegundos
        status_code INTEGER,
        request_body JSONB,
        response_body JSONB
      );
    `);

    // ============================================
    // Tablas de White Label (Marca Blanca)
    // ============================================

    // Tabla de presets de temas
    await query(`
      CREATE TABLE IF NOT EXISTS theme_presets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        label VARCHAR(100) NOT NULL,
        colors JSONB NOT NULL,
        preview_image TEXT,
        is_dark BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed de presets de temas
    await query(`
      INSERT INTO theme_presets (name, label, colors, is_dark) VALUES
        ('corporate-blue', 'Corporativo Azul', '{"primary":"#2563eb","primary_hover":"#1d4ed8","secondary":"#64748b","secondary_hover":"#475569","accent":"#3b82f6","background":"#f8fafc","surface":"#ffffff","text_primary":"#0f172a","text_secondary":"#64748b","border":"#e2e8f0","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","info":"#3b82f6"}', FALSE),
        ('forest-green', 'Bosque Verde', '{"primary":"#16a34a","primary_hover":"#15803d","secondary":"#6b7280","secondary_hover":"#4b5563","accent":"#84cc16","background":"#f0fdf4","surface":"#ffffff","text_primary":"#14532d","text_secondary":"#6b7280","border":"#bbf7d0","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","info":"#3b82f6"}', FALSE),
        ('royal-purple', 'Púrpura Real', '{"primary":"#7c3aed","primary_hover":"#6d28d9","secondary":"#6b7280","secondary_hover":"#4b5563","accent":"#a78bfa","background":"#faf5ff","surface":"#ffffff","text_primary":"#1e1b4b","text_secondary":"#6b7280","border":"#e9d5ff","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","info":"#3b82f6"}', FALSE),
        ('sunset-orange', 'Naranja Atardecer', '{"primary":"#ea580c","primary_hover":"#c2410c","secondary":"#6b7280","secondary_hover":"#4b5563","accent":"#fb923c","background":"#fff7ed","surface":"#ffffff","text_primary":"#431407","text_secondary":"#6b7280","border":"#fed7aa","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","info":"#3b82f6"}', FALSE),
        ('dark-classic', 'Oscuro Clásico', '{"primary":"#3b82f6","primary_hover":"#60a5fa","secondary":"#6b7280","secondary_hover":"#9ca3af","accent":"#8b5cf6","background":"#0f172a","surface":"#1e293b","text_primary":"#f1f5f9","text_secondary":"#94a3b8","border":"#334155","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","info":"#3b82f6"}', TRUE),
        ('dark-midnight', 'Medianoche', '{"primary":"#6366f1","primary_hover":"#818cf8","secondary":"#64748b","secondary_hover":"#94a3b8","accent":"#a78bfa","background":"#020617","surface":"#0f172a","text_primary":"#e2e8f0","text_secondary":"#94a3b8","border":"#1e293b","success":"#22c55e","warning":"#f59e0b","error":"#ef4444","info":"#3b82f6"}', TRUE)
      ON CONFLICT DO NOTHING;
    `);

    // Tabla de presets de fuentes
    await query(`
      CREATE TABLE IF NOT EXISTS font_presets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        heading_font VARCHAR(100) NOT NULL,
        body_font VARCHAR(100) NOT NULL,
        mono_font VARCHAR(100) DEFAULT 'JetBrains Mono',
        preview_url TEXT,
        is_google_font BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed de presets de fuentes
    await query(`
      INSERT INTO font_presets (name, heading_font, body_font, mono_font) VALUES
        ('Moderno', 'Inter', 'Inter', 'JetBrains Mono'),
        ('Elegante', 'Playfair Display', 'Source Sans Pro', 'JetBrains Mono'),
        ('Corporativo', 'Roboto', 'Roboto', 'JetBrains Mono'),
        ('Creativo', 'Poppins', 'Open Sans', 'JetBrains Mono'),
        ('Minimalista', 'DM Sans', 'DM Sans', 'JetBrains Mono'),
        ('Tecnológico', 'Space Grotesk', 'Inter', 'Fira Code'),
        ('Editorial', 'Merriweather', 'Lato', 'JetBrains Mono'),
        ('Geométrico', 'Outfit', 'Outfit', 'JetBrains Mono')
      ON CONFLICT DO NOTHING;
    `);

    // Tabla de presets de botones
    await query(`
      CREATE TABLE IF NOT EXISTS button_presets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        border_radius VARCHAR(10) NOT NULL,
        shadow VARCHAR(100),
        hover_effect VARCHAR(50),
        hover_scale VARCHAR(10) DEFAULT '1.02',
        transition VARCHAR(50) DEFAULT 'all 0.2s ease',
        preview_css TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed de presets de botones
    await query(`
      INSERT INTO button_presets (name, border_radius, shadow, hover_effect, hover_scale, transition) VALUES
        ('Flat', '0.375rem', 'none', 'opacity', '1', 'all 0.15s ease'),
        ('Rounded', '9999px', '0 1px 2px rgb(0 0 0 / 0.05)', 'scale', '1.05', 'all 0.2s ease'),
        ('Shadowed', '0.5rem', '0 4px 6px -1px rgb(0 0 0 / 0.1)', 'lift', '1.02', 'all 0.2s ease'),
        ('Outlined', '0.375rem', 'none', 'border-color', '1', 'all 0.15s ease'),
        ('Gradient', '0.5rem', '0 2px 4px rgb(0 0 0 / 0.1)', 'gradient-shift', '1.02', 'all 0.3s ease'),
        ('Glass', '0.75rem', '0 8px 32px rgb(0 0 0 / 0.1)', 'blur', '1.02', 'all 0.3s ease')
      ON CONFLICT DO NOTHING;
    `);

    // Tabla de configuraciones de marca blanca por agencia
    await query(`
      CREATE TABLE IF NOT EXISTS white_label_configs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        agency_id VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        company_tagline TEXT,
        logo_url TEXT,
        logo_dark_url TEXT,
        favicon_url TEXT,
        og_image_url TEXT,
        primary_color VARCHAR(7) DEFAULT '#3b82f6',
        primary_hover_color VARCHAR(7) DEFAULT '#2563eb',
        secondary_color VARCHAR(7) DEFAULT '#64748b',
        secondary_hover_color VARCHAR(7) DEFAULT '#475569',
        accent_color VARCHAR(7) DEFAULT '#f59e0b',
        background_color VARCHAR(7) DEFAULT '#f8fafc',
        surface_color VARCHAR(7) DEFAULT '#ffffff',
        text_primary_color VARCHAR(7) DEFAULT '#0f172a',
        text_secondary_color VARCHAR(7) DEFAULT '#64748b',
        border_color VARCHAR(7) DEFAULT '#e2e8f0',
        success_color VARCHAR(7) DEFAULT '#22c55e',
        warning_color VARCHAR(7) DEFAULT '#f59e0b',
        error_color VARCHAR(7) DEFAULT '#ef4444',
        info_color VARCHAR(7) DEFAULT '#3b82f6',
        font_heading VARCHAR(100) DEFAULT 'Inter',
        font_body VARCHAR(100) DEFAULT 'Inter',
        font_mono VARCHAR(100) DEFAULT 'JetBrains Mono',
        font_size_base VARCHAR(10) DEFAULT '16px',
        font_weight_normal INTEGER DEFAULT 400,
        font_weight_medium INTEGER DEFAULT 500,
        font_weight_bold INTEGER DEFAULT 700,
        button_radius VARCHAR(10) DEFAULT '0.5rem',
        button_shadow VARCHAR(100) DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        button_hover_scale VARCHAR(10) DEFAULT '1.02',
        button_transition VARCHAR(50) DEFAULT 'all 0.2s ease',
        sidebar_bg_color VARCHAR(7) DEFAULT '#0f172a',
        sidebar_text_color VARCHAR(7) DEFAULT '#e2e8f0',
        sidebar_active_bg VARCHAR(7) DEFAULT '#ffffff',
        sidebar_active_text VARCHAR(7) DEFAULT '#0f172a',
        sidebar_width VARCHAR(10) DEFAULT '320px',
        sidebar_collapsed_width VARCHAR(10) DEFAULT '80px',
        border_radius_sm VARCHAR(10) DEFAULT '0.25rem',
        border_radius_md VARCHAR(10) DEFAULT '0.5rem',
        border_radius_lg VARCHAR(10) DEFAULT '0.75rem',
        border_radius_xl VARCHAR(10) DEFAULT '1rem',
        shadow_sm VARCHAR(100) DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        shadow_md VARCHAR(100) DEFAULT '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        shadow_lg VARCHAR(100) DEFAULT '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        email_header_logo_url TEXT,
        email_footer_text TEXT,
        email_support_url TEXT,
        legal_company_name VARCHAR(255),
        legal_address TEXT,
        legal_phone VARCHAR(50),
        legal_email VARCHAR(255),
        terms_url TEXT,
        privacy_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Índice único por agencia
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_white_label_configs_agency_id
      ON white_label_configs (agency_id) WHERE is_active = TRUE;
    `);

    // ============================================
    // Tablas de IA (Chat)
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        api_key_encrypted TEXT,
        base_url TEXT,
        default_model VARCHAR(100),
        max_tokens INTEGER DEFAULT 4096,
        temperature DECIMAL(3,2) DEFAULT 0.7,
        top_p DECIMAL(3,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT FALSE,
        is_default BOOLEAN DEFAULT FALSE,
        rate_limit_per_minute INTEGER DEFAULT 60,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
        title VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT,
        tool_calls JSONB,
        tool_result JSONB,
        tokens_used INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ai_actions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        category VARCHAR(50),
        endpoint VARCHAR(255),
        method VARCHAR(10),
        parameters_schema JSONB,
        requires_confirmation BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed de proveedores de IA
    await query(`
      INSERT INTO ai_providers (name, display_name, base_url, default_model, max_tokens, temperature)
      VALUES
        ('openai', 'OpenAI', 'https://api.openai.com/v1', 'gpt-4o', 4096, 0.7),
        ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', 'claude-3-5-sonnet-20241022', 4096, 0.7),
        ('google', 'Google AI', 'https://generativelanguage.googleapis.com/v1beta', 'gemini-1.5-pro', 4096, 0.7),
        ('azure', 'Azure OpenAI', NULL, 'gpt-4', 4096, 0.7),
        ('local', 'Modelo Local', NULL, 'llama-3.1-8b', 2048, 0.7)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed de acciones de IA
    await query(`
      INSERT INTO ai_actions (name, description, category, endpoint, method, parameters_schema, requires_confirmation)
      VALUES
        ('create_reservation', 'Crear una nueva reserva temporal', 'reservations', '/api/orders', 'POST', '{"type":"object","properties":{"productId":{"type":"string"},"body":{"type":"object"}},"required":["productId","body"]}'::jsonb, TRUE),
        ('list_reservations', 'Listar todas las reservas con filtros opcionales', 'reservations', '/api/orders', 'GET', '{"type":"object","properties":{"agencia":{"type":"string"},"estado":{"type":"string"},"fecha_desde":{"type":"string"},"fecha_hasta":{"type":"string"}}}'::jsonb, FALSE),
        ('get_reservation', 'Obtener detalles de una reserva específica', 'reservations', '/api/orders/:id', 'GET', '{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}'::jsonb, FALSE),
        ('confirm_reservation', 'Confirmar una reserva temporal', 'reservations', '/api/orders/:id/confirm', 'POST', '{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}'::jsonb, TRUE),
        ('cancel_reservation', 'Cancelar/eliminar una reserva', 'reservations', '/api/orders/:id', 'DELETE', '{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}'::jsonb, TRUE),
        ('create_user', 'Crear un nuevo usuario del sistema', 'users', '/api/users', 'POST', '{"type":"object","properties":{"email":{"type":"string"},"nombre":{"type":"string"},"agencia":{"type":"string"},"role":{"type":"string"}},"required":["email","nombre","agencia"]}'::jsonb, TRUE),
        ('list_users', 'Listar todos los usuarios del sistema', 'users', '/api/users', 'GET', '{"type":"object","properties":{"agencia":{"type":"string"},"role":{"type":"string"}}}'::jsonb, FALSE),
        ('list_products', 'Listar todos los productos disponibles', 'products', '/api/products', 'GET', '{"type":"object","properties":{"activo":{"type":"boolean"}}}'::jsonb, FALSE),
        ('list_agencies', 'Listar todas las agencias', 'agencies', '/api/agencies', 'GET', '{"type":"object","properties":{"activa":{"type":"boolean"}}}'::jsonb, FALSE),
        ('get_availability', 'Consultar disponibilidad de cupos', 'reservations', '/api/availability', 'GET', '{"type":"object","properties":{"productId":{"type":"string"},"fecha":{"type":"string"}}}'::jsonb, FALSE),
        ('send_notification', 'Enviar notificación a usuarios', 'notifications', '/api/notifications', 'POST', '{"type":"object","properties":{"title":{"type":"string"},"message":{"type":"string"},"targetRole":{"type":"string"}},"required":["title","message"]}'::jsonb, TRUE),
        ('generate_report', 'Generar reporte de datos', 'reports', '/api/reports/generate', 'POST', '{"type":"object","properties":{"type":{"type":"string"},"dateFrom":{"type":"string"},"dateTo":{"type":"string"}},"required":["type"]}'::jsonb, FALSE)
      ON CONFLICT (name) DO NOTHING;
    `);

    // ============================================
    // Tabla de Configuración SMTP por Agencia
    // ============================================

    await query(`
      CREATE TABLE IF NOT EXISTS email_smtp_configs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
        smtp_host VARCHAR(255),
        smtp_port INTEGER DEFAULT 587,
        smtp_user VARCHAR(255),
        smtp_pass TEXT,
        smtp_secure BOOLEAN DEFAULT FALSE,
        email_from VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Índice único por agencia
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_email_smtp_configs_agency_id
      ON email_smtp_configs (agency_id) WHERE is_active = TRUE;
    `);

    // Semillas por defecto: settings y plantillas de email (si no existen)
    await query(`
      INSERT INTO system_settings (key, value)
      VALUES
        ('default_temporary_block_minutes', '{"minutes": 60}'::jsonb),
        ('temporary_block_expiration_email_enabled', '{"enabled": true}'::jsonb),
        ('low_availability_email_enabled', '{"enabled": true}'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    await query(`
      INSERT INTO email_templates (event_code, subject, body_html, placeholders, is_active)
      VALUES
        ('reservation_temporary_blocked', 'Reserva bloqueada temporalmente - {{product_code}}', '<p>Hola {{nombre_usuario}},</p><p>Tu solicitud para el cupo <strong>{{product_code}}</strong> fue bloqueada temporalmente. Expira: {{expires_at}} ({{minutos_restantes}} minutos).</p><p>Precio: {{precio_venta}}</p>', ARRAY['nombre_usuario','product_code','expires_at','minutos_restantes','precio_venta'], TRUE),
        ('reservation_expired', 'Reserva expirada - {{product_code}}', '<p>Hola {{nombre_usuario}},</p><p>Tu bloqueo para el cupo <strong>{{product_code}}</strong> ha expirado y el cupo fue liberado.</p>', ARRAY['nombre_usuario','product_code'], TRUE),
        ('reservation_confirmed', 'Reserva confirmada - {{solicitud_id}}', '<p>Hola {{nombre_usuario}},</p><p>Tu reserva ({{solicitud_id}}) ha sido confirmada.</p><p>Detalles del vuelo: {{vuelo_codigo}} - {{vuelo_destino}} - {{vuelo_compania}}. Precio: {{precio_venta}}</p>', ARRAY['nombre_usuario','solicitud_id','vuelo_codigo','vuelo_destino','vuelo_compania','precio_venta'], TRUE),
        ('reservation_details', 'Detalle de reserva {{pedido_id}}', '<p>Hola {{nombre_usuario}},</p><p>Aquí están los detalles de tu reserva: Pedido: {{pedido_id}}. Vuelo: {{vuelo_codigo}} - {{vuelo_destino}} - {{vuelo_compania}}. Precio: {{precio_venta}}</p>', ARRAY['nombre_usuario','pedido_id','vuelo_codigo','vuelo_destino','vuelo_compania','precio_venta'], TRUE),
        ('low_availability_alert', 'Alerta: baja disponibilidad en {{product_code}}', '<p>Atención,</p><p>Quedan {{availability}} lugares en {{product_code}}. Umbral: {{threshold}}.</p>', ARRAY['product_code','availability','threshold'], TRUE)
      ON CONFLICT (event_code) DO NOTHING;
    `);

    console.log('🔧 Tablas creadas exitosamente: products, reservations, themes, agency_themes, agency_configurations, agency_theme_configs, permissions, roles, role_permissions, user_roles, system_settings, email_templates, email_log, alert_rules, audit_logs, theme_presets, font_presets, button_presets, white_label_configs, ai_providers, ai_chat_sessions, ai_chat_messages, ai_actions');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  }
};

// Inicializar la base de datos después de establecer la conexión
pool.connect().then(() => {
  console.log(`🔌 Conectado exitosamente a la base de datos ${dbProvider.toUpperCase()} (${process.env.DB_PROVIDER})`);
  initializeDatabase(); // Llamar a la función de inicialización
}).catch((err) => {
  console.error(`❌ Error en la conexión a la base de datos ${dbProvider.toUpperCase()}:`, err);
});

pool.on('error', (err) => {
  console.error(`❌ Error inesperado en el pool de conexiones de ${dbProvider.toUpperCase()}:`, err);
});