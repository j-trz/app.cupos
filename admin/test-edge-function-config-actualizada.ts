import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🔧 [test-edge-function-config] Starting configuration test");

    // Intentar obtener variables de entorno desde diferentes fuentes
    console.log("🔍 Checking environment variables and secrets...");

    // Método estándar para variables de entorno
    let masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    let supabaseUrl = Deno.env.get("SUPABASE_URL");
    let supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("🔧 Raw environment access:", {
      masterKey: masterKey ? "FOUND" : "NOT_FOUND",
      supabaseUrl: supabaseUrl ? "FOUND" : "NOT_FOUND",
      supabaseAnonKey: supabaseAnonKey ? "FOUND" : "NOT_FOUND",
      supabaseServiceKey: supabaseServiceKey ? "FOUND" : "NOT_FOUND",
    });

    // Get environment variables status (para compatibilidad con código anterior)
    const environmentVariables = {
      MASTER_ENCRYPTION_KEY: !!masterKey,
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_ANON_KEY: !!supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    };

    // Verificar longitud de MASTER_ENCRYPTION_KEY si existe
    if (masterKey) {
      environmentVariables.MASTER_ENCRYPTION_KEY = masterKey.length >= 32;
      console.log(`🔑 MASTER_ENCRYPTION_KEY length: ${masterKey.length} chars`);
    }

    console.log("🔧 Environment variables status:", environmentVariables);

    // Get auth info
    const authHeader = req.headers.get("Authorization");
    const authInfo = {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length || 0,
    };

    // Información adicional de debugging
    const debugInfo = {
      timestamp: new Date().toISOString(),
      denoVersion: "Edge Function Runtime",
      availableEnvKeys: Object.keys(Deno.env.toObject()).length,
      // Mostrar algunas variables sin exponer valores sensibles
      sampleEnvKeys: Object.keys(Deno.env.toObject()).slice(0, 5),
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environmentVariables,
      authInfo,
      debugInfo,
      message: "Configuration test completed successfully",
    };

    console.log("✅ [test-edge-function-config] Test completed:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("💥 [test-edge-function-config] Error:", error);

    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
