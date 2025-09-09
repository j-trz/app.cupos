/**
 * Ejemplo de Implementación del Sistema Multi-Conexión
 *
 * Este archivo muestra casos de uso reales del sistema multi-conexión
 * implementado en el proyecto form-cupos/admin
 */

import ConnectionService from "../src/services/connectionService";
import { supabase } from "../src/supabaseClient";

// ===================================================================
// CASO DE USO 1: CONFIGURACIÓN EMPRESARIAL TÍPICA
// ===================================================================

/**
 * Escenario: Una agencia de viajes que usa:
 * - Supabase para gestionar inventario de productos/cupos
 * - Power Automate para procesar reservas y solicitudes
 */

class MultiConnectionExample {
  /**
   * Paso 1: Configurar las conexiones base
   */
  static async setupBaseConnections() {
    console.log("🔧 Configurando conexiones base...");

    // Conexión Supabase para productos
    const supabaseConnection = await ConnectionService.createConnection(
      {
        name: "Supabase Productos",
        type: "supabase",
        description: "Base de datos principal para gestión de inventario",
        credentials: {
          projectUrl: "https://tu-proyecto.supabase.co",
          anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          tableName: "productos_disponibles",
        },
      },
      "MiPasswordSegura123!"
    );

    // Conexión Power Automate para pedidos
    const powerAutomateConnection = await ConnectionService.createConnection(
      {
        name: "Power Automate Reservas",
        type: "powerautomate",
        description: "Flow para procesar reservas de clientes",
        credentials: {
          flowUrl:
            "https://prod-xx.westeurope.logic.azure.com:443/workflows/...",
        },
      },
      "MiPasswordSegura123!"
    );

    return {
      supabaseId: supabaseConnection.connection.id,
      powerAutomateId: powerAutomateConnection.connection.id,
    };
  }

  /**
   * Paso 2: Configurar asignaciones de tipos de datos
   */
  static async setupDataTypeAssignments(supabaseId, powerAutomateId) {
    console.log("🎯 Configurando asignaciones de tipos de datos...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Asignar Supabase para productos
    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: supabaseId,
        data_type: "productos",
        is_active: true,
      },
    ]);

    // Asignar Power Automate para pedidos
    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: powerAutomateId,
        data_type: "pedidos",
        is_active: true,
      },
    ]);

    console.log("✅ Asignaciones configuradas correctamente");
  }

  /**
   * Paso 3: Usar el sistema en producción
   */
  static async demonstrateUsage() {
    console.log("🚀 Demostrando uso del sistema multi-conexión...");

    // Obtener productos - usa Supabase automáticamente
    console.log("📦 Obteniendo productos...");
    const productosResult = await ConnectionService.getDataFromActiveConnection(
      "productos"
    );

    if (productosResult.success) {
      console.log(
        `✅ Productos obtenidos: ${productosResult.data.length} items`
      );
      console.log("Muestra:", productosResult.data.slice(0, 2));
    }

    // Enviar reserva - usa Power Automate automáticamente
    console.log("📋 Enviando reserva...");
    const reservaData = {
      cliente: "Juan Pérez",
      email: "juan@example.com",
      vuelo: "AA123",
      destino: "Miami",
      fecha: "2024-03-15",
    };

    const reservaResult = await ConnectionService.submitReservation(
      reservaData
    );

    if (reservaResult.success) {
      console.log("✅ Reserva enviada correctamente");
      console.log("Referencia:", reservaResult.referenceId);
    }
  }
}

// ===================================================================
// CASO DE USO 2: MIGRACIÓN GRADUAL
// ===================================================================

/**
 * Escenario: Migración gradual desde sistema legacy
 * Primero configura productos, luego pedidos
 */

class GradualMigrationExample {
  /**
   * Fase 1: Solo configurar productos, pedidos siguen en legacy
   */
  static async phase1_ProductsOnly() {
    console.log("🔄 Fase 1: Migración solo de productos...");

    // Crear conexión MongoDB para productos
    const mongoConnection = await ConnectionService.createConnection(
      {
        name: "MongoDB Productos",
        type: "mongodb",
        description: "Nueva base de datos para productos",
        credentials: {
          connectionString:
            "mongodb+srv://user:pass@cluster.mongodb.net/travel",
          databaseName: "travel_db",
          collectionName: "productos",
        },
      },
      "MiPasswordSegura123!"
    );

    // Solo asignar productos - pedidos siguen usando Power Automate legacy
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: mongoConnection.connection.id,
        data_type: "productos",
        is_active: true,
      },
    ]);

    console.log("✅ Fase 1 completada: Productos migrados a MongoDB");
  }

  /**
   * Fase 2: Migrar también los pedidos
   */
  static async phase2_OrdersAlso() {
    console.log("🔄 Fase 2: Migración de pedidos...");

    // Crear conexión Smartsheet para pedidos
    const smartsheetConnection = await ConnectionService.createConnection(
      {
        name: "Smartsheet Pedidos",
        type: "smartsheet",
        description: "Gestión de pedidos en Smartsheet",
        credentials: {
          accessToken: "ll352u9jujauoqz4gstvsae05",
          sheetId: "1234567890123456",
        },
      },
      "MiPasswordSegura123!"
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: smartsheetConnection.connection.id,
        data_type: "pedidos",
        is_active: true,
      },
    ]);

    console.log("✅ Fase 2 completada: Sistema completamente migrado");
  }

  /**
   * Verificar el estado de migración
   */
  static async checkMigrationStatus() {
    console.log("📊 Verificando estado de migración...");

    // Verificar qué conexiones se están usando
    const productosConnection = await ConnectionService.getActiveConnection(
      "productos"
    );
    const pedidosConnection = await ConnectionService.getActiveConnection(
      "pedidos"
    );

    console.log(
      "Productos:",
      productosConnection
        ? `${productosConnection.name} (${productosConnection.type})`
        : "Sistema Legacy"
    );

    console.log(
      "Pedidos:",
      pedidosConnection
        ? `${pedidosConnection.name} (${pedidosConnection.type})`
        : "Sistema Legacy"
    );
  }
}

// ===================================================================
// CASO DE USO 3: CONFIGURACIÓN MULTI-TENANT
// ===================================================================

/**
 * Escenario: Diferentes agencias con diferentes necesidades
 */

class MultiTenantExample {
  /**
   * Agencia A: Todo en Supabase
   */
  static async setupAgencyA() {
    console.log("🏢 Configurando Agencia A (Todo Supabase)...");

    const supabaseConnection = await ConnectionService.createConnection(
      {
        name: "Supabase Agencia A",
        type: "supabase",
        description: "Base de datos unificada para Agencia A",
        credentials: {
          projectUrl: "https://agencia-a.supabase.co",
          anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          tableName: "datos_completos",
        },
      },
      "PasswordAgenciaA123!"
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Configurar como conexión universal
    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: supabaseConnection.connection.id,
        data_type: "all",
        is_active: true,
      },
    ]);

    console.log("✅ Agencia A configurada con Supabase unificado");
  }

  /**
   * Agencia B: Híbrido Tableau + Power Automate
   */
  static async setupAgencyB() {
    console.log("🏢 Configurando Agencia B (Híbrido)...");

    // Tableau para productos/reportes
    const tableauConnection = await ConnectionService.createConnection(
      {
        name: "Tableau Analytics",
        type: "tableau",
        description: "Análisis y reportes de productos",
        credentials: {
          serverUrl: "https://agencia-b.tableau.com",
          username: "admin@agencia-b.com",
          password: "TableauPass123!",
          siteName: "agencia-b-site",
        },
      },
      "PasswordAgenciaB123!"
    );

    // Power Automate para pedidos
    const powerAutomateConnection = await ConnectionService.createConnection(
      {
        name: "Power Automate B",
        type: "powerautomate",
        description: "Procesamiento de pedidos Agencia B",
        credentials: {
          flowUrl:
            "https://prod-yy.westeurope.logic.azure.com:443/workflows/...",
        },
      },
      "PasswordAgenciaB123!"
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Asignaciones específicas
    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: tableauConnection.connection.id,
        data_type: "productos",
        is_active: true,
      },
      {
        user_id: user.id,
        connection_id: powerAutomateConnection.connection.id,
        data_type: "pedidos",
        is_active: true,
      },
    ]);

    console.log("✅ Agencia B configurada con arquitectura híbrida");
  }
}

// ===================================================================
// CASO DE USO 4: TESTING Y DESARROLLO
// ===================================================================

/**
 * Escenario: Configuraciones diferentes para desarrollo y producción
 */

class DevProductionExample {
  /**
   * Configuración de desarrollo
   */
  static async setupDevelopment() {
    console.log("🛠️ Configurando entorno de desarrollo...");

    // Usar Power Automate para todo en desarrollo (más simple)
    const devConnection = await ConnectionService.createConnection(
      {
        name: "Dev Power Automate",
        type: "powerautomate",
        description: "Conexión de desarrollo - simplificada",
        credentials: {
          flowUrl: "https://dev-flow.logic.azure.com/workflows/...",
        },
      },
      "DevPassword123!"
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("connection_data_types").insert([
      {
        user_id: user.id,
        connection_id: devConnection.connection.id,
        data_type: "all",
        is_active: true,
      },
    ]);

    console.log("✅ Entorno de desarrollo configurado");
  }

  /**
   * Configuración de producción
   */
  static async setupProduction() {
    console.log("🚀 Configurando entorno de producción...");

    // Configuración optimizada para producción
    const connections = await MultiConnectionExample.setupBaseConnections();
    await MultiConnectionExample.setupDataTypeAssignments(
      connections.supabaseId,
      connections.powerAutomateId
    );

    console.log("✅ Entorno de producción configurado");
  }

  /**
   * Función helper para cambiar entre entornos
   */
  static async switchEnvironment(environment) {
    console.log(`🔄 Cambiando a entorno: ${environment}`);

    if (environment === "development") {
      await this.setupDevelopment();
    } else if (environment === "production") {
      await this.setupProduction();
    }
  }
}

// ===================================================================
// CASO DE USO 5: MONITOREO Y DEBUGGING
// ===================================================================

/**
 * Herramientas para monitorear el sistema multi-conexión
 */

class MonitoringExample {
  /**
   * Diagnóstico completo del sistema
   */
  static async systemDiagnostics() {
    console.log("🔍 Ejecutando diagnóstico del sistema...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Verificar conexiones base
    const connectionsResult = await ConnectionService.getUserConnections();
    console.log(
      `📊 Conexiones totales: ${connectionsResult.connections.length}`
    );

    // 2. Verificar asignaciones
    const { data: assignments } = await supabase
      .from("connection_data_types")
      .select(
        `
        *,
        connection:data_connections(name, type)
      `
      )
      .eq("user_id", user.id);

    console.log("📋 Asignaciones activas:");
    assignments?.forEach((assignment) => {
      console.log(
        `  ${assignment.data_type} → ${assignment.connection.name} (${assignment.connection.type})`
      );
    });

    // 3. Probar cada tipo de datos
    const dataTypes = ["productos", "pedidos"];

    for (const dataType of dataTypes) {
      const connection = await ConnectionService.getActiveConnection(dataType);
      console.log(
        `🔗 ${dataType}: ${
          connection
            ? `${connection.name} (${connection.type})`
            : "Sistema Legacy"
        }`
      );
    }
  }

  /**
   * Benchmarking de rendimiento
   */
  static async performanceBenchmark() {
    console.log("⚡ Ejecutando benchmark de rendimiento...");

    const startTime = performance.now();

    // Simular múltiples llamadas concurrentes
    const promises = [
      ConnectionService.getDataFromActiveConnection("productos"),
      ConnectionService.getDataFromActiveConnection("pedidos"),
      ConnectionService.getActiveConnection("productos"),
      ConnectionService.getActiveConnection("pedidos"),
    ];

    await Promise.all(promises);

    const endTime = performance.now();
    console.log(`⏱️ Tiempo total: ${(endTime - startTime).toFixed(2)}ms`);
  }

  /**
   * Verificar salud de conexiones
   */
  static async healthCheck() {
    console.log("🏥 Verificando salud de conexiones...");

    const connectionsResult = await ConnectionService.getUserConnections();

    for (const connection of connectionsResult.connections) {
      try {
        const testResult = await ConnectionService.testConnection(
          connection.id,
          "TestPassword123!"
        );

        console.log(
          `${testResult.success ? "✅" : "❌"} ${connection.name}: ${
            testResult.success ? "OK" : testResult.message
          }`
        );
      } catch (error) {
        console.log(`❌ ${connection.name}: Error - ${error.message}`);
      }
    }
  }
}

// ===================================================================
// FUNCIÓN PRINCIPAL DE EJEMPLO
// ===================================================================

/**
 * Ejecuta todos los ejemplos en secuencia
 */
async function runCompleteExample() {
  console.log("🎯 INICIANDO EJEMPLO COMPLETO DEL SISTEMA MULTI-CONEXIÓN");
  console.log("=".repeat(60));

  try {
    // Ejemplo básico
    console.log("\n1️⃣ EJEMPLO BÁSICO: CONFIGURACIÓN EMPRESARIAL");
    const connections = await MultiConnectionExample.setupBaseConnections();
    await MultiConnectionExample.setupDataTypeAssignments(
      connections.supabaseId,
      connections.powerAutomateId
    );
    await MultiConnectionExample.demonstrateUsage();

    // Diagnóstico
    console.log("\n2️⃣ DIAGNÓSTICO DEL SISTEMA");
    await MonitoringExample.systemDiagnostics();

    // Benchmark
    console.log("\n3️⃣ BENCHMARK DE RENDIMIENTO");
    await MonitoringExample.performanceBenchmark();

    console.log("\n✅ EJEMPLO COMPLETADO EXITOSAMENTE");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error en el ejemplo:", error);
  }
}

// Exportar para uso en otros módulos
export {
  MultiConnectionExample,
  GradualMigrationExample,
  MultiTenantExample,
  DevProductionExample,
  MonitoringExample,
  runCompleteExample,
};

// ===================================================================
// INSTRUCCIONES DE USO
// ===================================================================

/**
 * Para usar estos ejemplos:
 *
 * 1. Asegúrate de tener las dependencias instaladas
 * 2. Configura las variables de entorno necesarias
 * 3. Aplica la migración SQL: sql/add_connection_types.sql
 * 4. Ejecuta el ejemplo que necesites:
 *
 * // Ejemplo básico completo
 * import { runCompleteExample } from './examples/multi-connection-implementation.js';
 * await runCompleteExample();
 *
 * // Solo configuración empresarial
 * import { MultiConnectionExample } from './examples/multi-connection-implementation.js';
 * const connections = await MultiConnectionExample.setupBaseConnections();
 *
 * // Solo diagnóstico
 * import { MonitoringExample } from './examples/multi-connection-implementation.js';
 * await MonitoringExample.systemDiagnostics();
 */
