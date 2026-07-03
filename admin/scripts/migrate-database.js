const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Leer variables de entorno
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Necesita la clave de servicio

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Error: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY son requeridos"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log("🚀 Iniciando migración de base de datos...");

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, "../sql/add_is_active_column.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("📄 Ejecutando script SQL...");

    // Ejecutar el SQL
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: sqlContent,
    });

    if (error) {
      // Si la función exec_sql no existe, intentar con query directo
      console.log(
        "⚠️  Función exec_sql no disponible, ejecutando con query directo..."
      );

      const { data: queryData, error: queryError } = await supabase
        .from("information_schema.columns")
        .select("*")
        .eq("table_name", "data_connections")
        .eq("column_name", "is_active");

      if (queryError) {
        throw queryError;
      }

      if (queryData && queryData.length > 0) {
        console.log(
          "✅ La columna is_active ya existe en la tabla data_connections"
        );
      } else {
        console.log(
          "❌ No se pudo verificar la existencia de la columna. Por favor, ejecute el SQL manualmente."
        );
        console.log("\n📋 SQL a ejecutar en la consola de Supabase:");
        console.log("==========================================");
        console.log(sqlContent);
        console.log("==========================================");
      }
    } else {
      console.log("✅ Migración ejecutada exitosamente");
      console.log("📊 Resultado:", data);
    }

    // Verificar que la columna existe
    console.log("\n🔍 Verificando resultado...");
    const { data: verification, error: verifyError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, column_default, is_nullable")
      .eq("table_name", "data_connections")
      .eq("column_name", "is_active");

    if (verifyError) {
      console.error("❌ Error verificando la migración:", verifyError.message);
    } else if (verification && verification.length > 0) {
      console.log("✅ Verificación exitosa - Columna is_active encontrada:");
      console.table(verification);
    } else {
      console.log("⚠️  No se pudo verificar la columna is_active");
    }
  } catch (error) {
    console.error("❌ Error durante la migración:", error.message);
    console.log(
      "\n📋 Por favor, ejecute el siguiente SQL manualmente en la consola de Supabase:"
    );
    console.log(
      "================================================================="
    );
    const sqlPath = path.join(__dirname, "../sql/add_is_active_column.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    console.log(sqlContent);
    console.log(
      "================================================================="
    );
  }
}

console.log("🔧 Script de migración de base de datos");
console.log("=======================================");
runMigration();
