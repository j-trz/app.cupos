import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // This is needed to handle CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { connection_id, credentials, connection_name, provider, column_mapping } = await req.json();

    if (!connection_id || !credentials || !connection_name || !provider) {
      throw new Error("connection_id, credentials, connection_name, and provider are required");
    }

    // Admin client to upsert the credentials.
    // Bypassing user-specific checks as per new requirements.
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Storing credentials in a new table `service_credentials` in plaintext.
    // The table is expected to have columns:
    // connection_id (PK), credentials (jsonb), connection_name (text), provider (text), updated_at (timestamp)
    const upsertData: {
      connection_id: string;
      connection_name: string;
      provider: string;
      credentials: any;
      column_mapping?: any;
      updated_at: string;
    } = {
      connection_id: connection_id,
      connection_name: connection_name,
      provider: provider,
      credentials: credentials,
      updated_at: new Date().toISOString(),
    };

    if (column_mapping) {
      upsertData.column_mapping = column_mapping;
    }

    const { error: upsertError } = await adminSupabaseClient
      .from("service_credentials")
      .upsert(upsertData, { onConflict: "connection_id" });

    if (upsertError) {
      console.error("Error upserting credentials:", upsertError);
      throw new Error(`Failed to save credentials: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Credentials saved." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in save-service-credentials function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});