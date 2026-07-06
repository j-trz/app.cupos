#!/usr/bin/env node

/**
 * Cron job para expirar reservas sin documento contable
 * Se ejecuta cada hora para verificar reservas bloqueadas sin doc_contable
 */

import { expireReservationsWithoutDocContable } from '../src/services/reservationService.js';
import { query } from '../src/db.js';

async function runExpirationJob() {
  console.log('🔄 Ejecutando job de expiración de reservas sin documento contable...');
  
  try {
    const result = await expireReservationsWithoutDocContable();
    console.log(`✅ Job completado. Reservas expiradas: ${result.length}`);
    
    if (result.length > 0) {
      console.log(`Reservas expiradas IDs: ${result.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error ejecutando job de expiración:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('📊 Conexión a base de datos PostgreSQL...');
  try {
    // Verificar conexión
    const connectionTest = await query('SELECT NOW()');
    console.log('✅ Conexión establecida:', connectionTest.rows[0].now);
    
    // Ejecutar job
    await runExpirationJob();
    
    console.log('✅ Job de expiración completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

export { runExpirationJob };