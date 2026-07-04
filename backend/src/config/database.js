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
        neto_1 NUMERIC(10, 2),
        op VARCHAR(255),
        carryon BOOLEAN DEFAULT FALSE,
        handbag BOOLEAN DEFAULT FALSE,
        checkedbag BOOLEAN DEFAULT FALSE,
        inf_fare NUMERIC(10, 2)
      );
    `);

    // Crear tabla reservations
    await query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        estado VARCHAR(255) NOT NULL,
        pedido_id VARCHAR(255) NOT NULL,
        agencia VARCHAR(255) NOT NULL,
        contacto_nombre VARCHAR(255) NOT NULL,
        contacto_email VARCHAR(255) NOT NULL,
        contacto_telefono VARCHAR(255),
        vuelo_codigo VARCHAR(255) NOT NULL,
        vuelo_destino VARCHAR(255) NOT NULL,
        vuelo_compania VARCHAR(255) NOT NULL,
        vuelo_salida DATE NOT NULL,
        vuelo_precio NUMERIC(10, 2),
        nombre_pasajero VARCHAR(255) NOT NULL,
        apellido_pasajero VARCHAR(255) NOT NULL,
        documento_pasajero VARCHAR(255) NOT NULL,
        nacimiento_pasajero DATE,
        nacionalidad_pasajero VARCHAR(255),
        tipo_pasajero VARCHAR(255)
      );
    `);

    // Crear tabla themes
    await query(`
      CREATE TABLE IF NOT EXISTS themes (
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
        agency_id INT NOT NULL,
        theme_id INT NOT NULL,
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

    console.log('🔧 Tablas products, reservations, themes, agency_themes, agency_configurations, agency_theme_configs, permissions, roles, role_permissions y user_roles creadas exitosamente');
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
