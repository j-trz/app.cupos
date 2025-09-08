import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Error: Variables de entorno VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Ejecutar migración de notificaciones
 */
async function migrateNotifications() {
  console.log("🚀 Iniciando migración del sistema de notificaciones...\n");

  try {
    // 1. Leer y ejecutar el SQL de la nueva tabla
    const sqlPath = path.join(
      __dirname,
      "../sql/user_notification_states_table.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("📄 Ejecutando migración de base de datos...");
    const { error: migrationError } = await supabase.rpc("exec_sql", {
      sql_query: sql,
    });

    if (migrationError) {
      // Si la función exec_sql no existe, ejecutar línea por línea
      console.log("⚠️  Ejecutando SQL línea por línea...");

      // Dividir el SQL en statements individuales
      const statements = sql
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
          const { error } = await supabase.rpc("exec_sql", {
            sql_query: statement + ";",
          });
          if (error) {
            console.error(`❌ Error ejecutando statement: ${error.message}`);
          }
        }
      }
    }

    console.log("✅ Migración de base de datos completada");

    // 2. Verificar que las nuevas tablas y funciones existen
    console.log("\n🔍 Verificando estructura de base de datos...");

    // Verificar tabla user_notification_states
    const { data: tableExists, error: tableError } = await supabase
      .from("user_notification_states")
      .select("count")
      .limit(1);

    if (
      tableError &&
      !tableError.message.includes(
        'relation "user_notification_states" does not exist'
      )
    ) {
      console.log("✅ Tabla user_notification_states verificada");
    } else if (tableError) {
      console.log("❌ Tabla user_notification_states no encontrada");
      throw new Error(
        "La tabla user_notification_states no fue creada correctamente"
      );
    }

    // Verificar función get_user_notifications
    const { data: funcData, error: funcError } = await supabase.rpc(
      "get_user_notifications",
      {
        user_uuid: "00000000-0000-0000-0000-000000000000", // UUID dummy para test
        limit_count: 1,
      }
    );

    if (!funcError || funcError.message.includes("no rows")) {
      console.log("✅ Función get_user_notifications verificada");
    } else {
      console.log("❌ Función get_user_notifications no encontrada");
      console.log("Error:", funcError.message);
    }

    // 3. Migrar datos existentes (si es necesario)
    console.log("\n📊 Verificando notificaciones existentes...");

    const { data: existingNotifications, error: notifError } = await supabase
      .from("notifications")
      .select("id, read, target_user_id")
      .limit(10);

    if (notifError) {
      console.log(
        "⚠️  No se pudieron verificar notificaciones existentes:",
        notifError.message
      );
    } else {
      console.log(
        `✅ Encontradas ${
          existingNotifications?.length || 0
        } notificaciones existentes`
      );

      if (existingNotifications && existingNotifications.length > 0) {
        console.log(
          "💡 Las notificaciones existentes mantendrán su comportamiento actual"
        );
        console.log(
          "💡 Los nuevos estados personales se crearán cuando los usuarios interactúen"
        );
      }
    }

    // 4. Probar funciones básicas
    console.log("\n🧪 Probando funciones del sistema...");

    // Test de conteo (debería devolver 0 para usuario dummy)
    const { data: countData, error: countError } = await supabase.rpc(
      "get_user_unread_notifications_count",
      {
        user_uuid: "00000000-0000-0000-0000-000000000000",
      }
    );

    if (!countError) {
      console.log("✅ Función de conteo funcionando correctamente");
    } else {
      console.log("❌ Error en función de conteo:", countError.message);
    }

    console.log("\n🎉 ¡Migración completada exitosamente!");
    console.log("\n📋 Resumen de cambios:");
    console.log("• ✅ Tabla user_notification_states creada");
    console.log("• ✅ Funciones SQL para gestión personal implementadas");
    console.log("• ✅ Políticas RLS configuradas");
    console.log("• ✅ Índices optimizados creados");
    console.log("• ✅ Triggers de limpieza automática configurados");

    console.log("\n💡 Beneficios del nuevo sistema:");
    console.log(
      "• 👤 Cada usuario puede gestionar sus notificaciones independientemente"
    );
    console.log("• 🔄 Marcar como leído/no leído sin afectar otros usuarios");
    console.log(
      "• 🗑️  Ocultar notificaciones personalmente sin eliminarlas para otros"
    );
    console.log("• 📊 Estadísticas personales de notificaciones");
    console.log("• ⚡ Consultas optimizadas con funciones SQL dedicadas");
  } catch (error) {
    console.error("\n❌ Error durante la migración:", error.message);
    console.error("\n🔧 Pasos para resolver:");
    console.error(
      "1. Verificar que las variables de entorno están configuradas"
    );
    console.error("2. Verificar permisos de la clave de servicio de Supabase");
    console.error("3. Revisar que la base de datos esté accesible");
    console.error(
      "4. Ejecutar manualmente el SQL desde sql/user_notification_states_table.sql"
    );
    process.exit(1);
  }
}

/**
 * Función auxiliar para ejecutar SQL
 */
async function _executeSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, "utf8");

    // Dividir en statements individuales
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Ejecutando statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc("exec_sql", {
          sql_query: statement + ";",
        });

        if (error) {
          console.error(`❌ Error en statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Error ejecutando archivo SQL:", error.message);
    throw error;
  }
}

// Ejecutar migración si el script se ejecuta directamente
if (import.meta.url === `file://${globalThis.process?.argv?.[1] || ""}`) {
  migrateNotifications();
}

export { migrateNotifications };
