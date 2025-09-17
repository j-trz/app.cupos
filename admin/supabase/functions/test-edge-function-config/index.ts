import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Check all required environment variables
    const envCheck = {
      MASTER_ENCRYPTION_KEY: {
        exists: !!Deno.env.get("MASTER_ENCRYPTION_KEY"),
        length: Deno.env.get("MASTER_ENCRYPTION_KEY")?.length || 0,
        valid: (Deno.env.get("MASTER_ENCRYPTION_KEY")?.length || 0) >= 32,
      },
      SUPABASE_URL: {
        exists: !!Deno.env.get("SUPABASE_URL"),
        value:
          Deno.env.get("SUPABASE_URL")?.substring(0, 30) + "..." || "NOT SET",
      },
      SUPABASE_ANON_KEY: {
        exists: !!Deno.env.get("SUPABASE_ANON_KEY"),
        length: Deno.env.get("SUPABASE_ANON_KEY")?.length || 0,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        length: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.length || 0,
      },
    };

    const authHeader = req.headers.get("Authorization");

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: envCheck,
      authHeader: {
        present: !!authHeader,
        type: authHeader?.split(" ")[0] || "none",
        length: authHeader?.length || 0,
      },
      allProblems: [],
    };

    // Check for problems
    if (!envCheck.MASTER_ENCRYPTION_KEY.valid) {
      diagnostics.allProblems.push(
        "MASTER_ENCRYPTION_KEY missing or too short (needs 32+ chars)"
      );
    }
    if (!envCheck.SUPABASE_URL.exists) {
      diagnostics.allProblems.push("SUPABASE_URL not set");
    }
    if (!envCheck.SUPABASE_ANON_KEY.exists) {
      diagnostics.allProblems.push("SUPABASE_ANON_KEY not set");
    }
    if (!envCheck.SUPABASE_SERVICE_ROLE_KEY.exists) {
      diagnostics.allProblems.push("SUPABASE_SERVICE_ROLE_KEY not set");
    }
    if (!authHeader) {
      diagnostics.allProblems.push("No Authorization header provided");
    }

    const status =
      diagnostics.allProblems.length === 0 ? "ALL_GOOD" : "HAS_PROBLEMS";

    return new Response(
      JSON.stringify({
        status,
        diagnostics,
        message:
          status === "ALL_GOOD"
            ? "All environment variables and auth are properly configured"
            : `Found ${diagnostics.allProblems.length} configuration issues`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status === "ALL_GOOD" ? 200 : 400,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "ERROR",
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
