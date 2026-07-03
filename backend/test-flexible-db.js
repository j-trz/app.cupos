/**
 * Script de prueba para verificar la configuración de la base de datos flexible
 */

import { query } from './src/db.js';

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...');
  
  try {
    // Intentar una consulta simple
    const result = await query('SELECT version();');
    console.log('✅ Conexión exitosa a la base de datos!');
    console.log('📦 Versión de PostgreSQL:', result.rows[0].version);
    
    // Probar con otra consulta simple
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 5;
    `);
    
    console.log('📋 Tablas encontradas:', tablesResult.rows.map(r => r.table_name));
    
    console.log('\n🎉 ¡Todo está configurado correctamente para el backend flexible!');
    
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
  }
}

// Ejecutar la prueba
testConnection();