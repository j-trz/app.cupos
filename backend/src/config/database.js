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