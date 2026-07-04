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
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
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

    // Crear tabla themes
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

    // Crear tabla agency_themes
    await query(`
      CREATE TABLE IF NOT EXISTS agency_themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL,
        theme_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
        UNIQUE (agency_id, theme_id)
      );
    `);

    // Crear tabla agency_configurations
    await query(`
      CREATE TABLE IF NOT EXISTS agency_configurations (
        id SERIAL PRIMARY KEY,
        agency_id INT NOT NULL,
        configuration JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
      );
    `);

    // Crear tabla agency_theme_configs
    await query(`
      CREATE TABLE IF NOT EXISTS agency_theme_configs (
        id SERIAL PRIMARY KEY,
        agency_id INT NOT NULL,
        theme_id INT NOT NULL,
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

    // Crear tabla user_roles
    await query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
        ('low_availability_alert', 'Alerta: baja disponibilidad en {{product_code}}', '<p>Atención,</p><p>Quedan {{availability}} lugares en {{product_code}}. Umbral: {{threshold}}.</p>', ARRAY['product_code','availability','threshold'], TRUE),
        ('reservation_details', 'Detalle de reserva {{pedido_id}}', '<p>Hola {{nombre_usuario}},</p><p>Aquí están los detalles de tu reserva: Pedido: {{pedido_id}}. Vuelo: {{vuelo_codigo}} - {{vuelo_destino}} - {{vuelo_compania}}. Precio: {{precio_venta}}</p>', ARRAY['nombre_usuario','pedido_id','vuelo_codigo','vuelo_destino','vuelo_compania','precio_venta'], TRUE)
      ON CONFLICT (event_code) DO NOTHING;
    `);

    console.log('🔧 Tablas products, reservations, themes, agency_themes, agency_configurations, agency_theme_configs, permissions, roles, role_permissions, user_roles, system_settings, email_templates, email_log y alert_rules creadas exitosamente');
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
