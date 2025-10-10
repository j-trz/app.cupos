import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ... (Keep all the test-connection helper functions as they are)
async function testSupabaseConnection(credentials: any) {
  try {
    const { url, apiKey } = credentials;
    if (!url || !apiKey) throw new Error("URL and API Key are required for Supabase");
    const supabase = createClient(url, apiKey);
    const { error } = await supabase.from("_realtime_schema").select("*").limit(1);
    if (error && error.code !== "PGRST116") throw new Error(`Connection error: ${error.message}`);
    return { success: true, message: "Supabase connection successful." };
  } catch (error) {
    return { success: false, message: `Failed to connect to Supabase: ${error.message}` };
  }
}

async function testSmartsheetConnection(credentials: any) {
  try {
    const { apiToken } = credentials;
    if (!apiToken) throw new Error("API Token is required for Smartsheet");
    const response = await fetch("https://api.smartsheet.com/2.0/users/me", {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!response.ok) throw new Error(`Smartsheet API returned HTTP ${response.status}`);
    const userData = await response.json();
    return { success: true, message: `Smartsheet connection successful for ${userData.email}.` };
  } catch (error) {
    return { success: false, message: `Failed to connect to Smartsheet: ${error.message}` };
  }
}

async function testMongoDBConnection(credentials: any) {
  // This is a basic validation. A real implementation would use a Deno MongoDB driver.
  try {
    const { connectionString } = credentials;
    if (!connectionString) throw new Error("Connection String is required for MongoDB");
    if (!connectionString.startsWith("mongodb://") && !connectionString.startsWith("mongodb+srv://")) {
      throw new Error("Invalid MongoDB connection string format.");
    }
    return { success: true, message: "MongoDB connection string format is valid." };
  } catch (error) {
    return { success: false, message: `MongoDB configuration error: ${error.message}` };
  }
}

async function testPowerAutomateConnection(credentials: any) {
    try {
        const { flowUrl } = credentials;
        if (!flowUrl) {
            throw new Error("URL del Flow es requerida para Power Automate");
        }
        let url;
        try {
            url = new URL(flowUrl);
        } catch {
            throw new Error("URL del Flow no es válida");
        }
        if (!url.hostname.includes("logic.azure.com") && !url.hostname.includes("flow.microsoft.com")) {
            throw new Error("La URL no parece ser de Power Automate o Logic Apps");
        }
        const response = await fetch(flowUrl, { method: "OPTIONS" });
        if (response.status >= 200 && response.status < 500) {
            return { success: true, message: "Conexión a Power Automate exitosa", details: { url: flowUrl, status: "reachable", httpStatus: response.status } };
        } else {
            return { success: false, message: `Power Automate Flow no accesible: HTTP ${response.status}`, details: { url: flowUrl, httpStatus: response.status } };
        }
    } catch (error) {
        return { success: false, message: `Error al conectar con Power Automate: ${error.message}` };
    }
}

async function testTableauConnection(credentials: any) {
    try {
        const { server, username, password, siteName } = credentials;
        if (!server || !username || !password) {
            throw new Error("Servidor, usuario y contraseña son requeridos para Tableau");
        }
        const authUrl = `${server}/api/3.8/auth/signin`;
        const authPayload = { credentials: { name: username, password: password, site: { contentUrl: siteName || "" } } };
        const response = await fetch(authUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authPayload) });
        if (response.ok) {
            return { success: true, message: "Conexión a Tableau establecida correctamente" };
        } else {
            const errorText = await response.text();
            return { success: false, message: `Error de autenticación en Tableau: ${response.status}`, details: { error: errorText } };
        }
    } catch (error) {
        return { success: false, message: `Error al conectar con Tableau: ${error.message}` };
    }
}


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { connection_id } = await req.json();

    if (!connection_id) {
      throw new Error("connection_id is required to test a connection.");
    }

    // Create admin client to fetch the credentials, bypassing user checks.
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the plaintext credentials from the new `service_credentials` table.
    const { data: conn, error: fetchError } = await adminSupabaseClient
      .from("service_credentials")
      .select("provider, credentials")
      .eq("connection_id", connection_id)
      .single();

    if (fetchError) {
      throw new Error(`Could not find connection details for ID ${connection_id}. Error: ${fetchError.message}`);
    }

    if (!conn || !conn.provider || !conn.credentials) {
      throw new Error("Connection details are incomplete or missing.");
    }

    const { provider, credentials } = conn;

    // Test connection based on the provider type from the database
    let result;
    switch (provider) {
      case "powerautomate":
        result = await testPowerAutomateConnection(credentials);
        break;
      case "supabase":
        result = await testSupabaseConnection(credentials);
        break;
      case "smartsheet":
        result = await testSmartsheetConnection(credentials);
        break;
      case "mongodb":
        result = await testMongoDBConnection(credentials);
        break;
      case "tableau":
        result = await testTableauConnection(credentials);
        break;
      default:
        throw new Error(`Unsupported connection provider: ${provider}`);
    }

    // After testing, update the connection status in the database
    const { error: updateError } = await adminSupabaseClient
      .from("service_credentials")
      .update({
        connection_status: result.success ? "connected" : "failed",
        last_tested_at: new Date().toISOString(),
      })
      .eq("connection_id", connection_id);

    if (updateError) {
      // Log the error but don't fail the request, as the test result is more important.
      console.error("Failed to update connection status:", updateError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in test-api-connection:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});