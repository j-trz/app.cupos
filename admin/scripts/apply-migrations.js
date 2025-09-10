import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from 'url';

// Replicate __dirname since it's not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Note: Use the SERVICE_ROLE_KEY for admin-level operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file."
  );
  console.log("\nACTION REQUIRED:");
  console.log("1. Create a file named 'admin/.env'");
  console.log("2. Add the following content, replacing the placeholders:");
  console.log("   VITE_SUPABASE_URL=your_supabase_url");
  console.log("   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key");
  console.log("\nThis script will not be able to run migrations, but it will print the necessary SQL for you to run manually.");
}

async function runMigrations() {
  console.log("🚀 Starting database migration script...");

  const sqlDir = path.join(__dirname, "../sql");

  // Define the order of migrations
  const migrationFiles = [
    'add_is_active_column.sql',
    'add_connection_types.sql',
  ];

  const allFiles = fs.readdirSync(sqlDir).filter(file => file.endsWith('.sql'));

  // Add remaining files to the list, avoiding duplicates and ensuring the critical ones are first
  const orderedFiles = [...migrationFiles];
  allFiles.forEach(file => {
    if (!orderedFiles.includes(file)) {
      orderedFiles.push(file);
    }
  });

  console.log("\nDue to security limitations of the execution environment, I cannot run the SQL migrations directly.");
  console.log("This script will display the required SQL commands in the correct order for you to apply them manually.");
  console.log("\nACTION REQUIRED:");
  console.log("Please copy the SQL content for the following files and run them in your Supabase SQL Editor in this order:");

  let step = 1;
  for (const file of orderedFiles) {
    const filePath = path.join(sqlDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`\n--- [Step ${step++}: Execute SQL from ${file}] ---`);
      const sqlContent = fs.readFileSync(filePath, "utf8");
      console.log(sqlContent);
      console.log(`--- [End of ${file}] ---`);
    }
  }

   console.log("\n✅ Migration script finished. Please apply the SQL above manually.");
}

runMigrations().catch(error => {
  console.error("\nMigration script failed:", error.message);
  process.exit(1);
});
