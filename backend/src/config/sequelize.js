import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbProvider = process.env.DB_PROVIDER || 'postgresql';

let sequelize;

switch (dbProvider) {
  case 'neon':
    sequelize = new Sequelize(process.env.NEON_DATABASE_URL, {
      dialect: 'postgres',
      ssl: { rejectUnauthorized: false },
      logging: false
    });
    break;
    
  case 'supabase':
    sequelize = new Sequelize(process.env.SUPABASE_DATABASE_URL, {
      dialect: 'postgres',
      ssl: { rejectUnauthorized: false },
      logging: false
    });
    break;
    
  case 'postgresql':
  default:
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      ssl: { rejectUnauthorized: false },
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
}

export { sequelize };