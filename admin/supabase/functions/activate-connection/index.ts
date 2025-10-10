import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { connection_id } = await req.json();

    if (!connection_id) {
      throw new Error("connection_id is required.");
    }

    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Deactivate all other connections first
    const { error: deactivateError } = await adminSupabaseClient
      .from("service_credentials")
      .update({ is_active: false })
      .neq("connection_id", connection_id);

    if (deactivateError) {
      throw new Error(`Failed to deactivate other connections: ${deactivateError.message}`);
    }

    // Activate the selected connection
    const { error: activateError } = await adminSupabaseClient
      .from("service_credentials")
      .update({ is_active: true })
      .eq("connection_id", connection_id);

    if (activateError) {
      throw new Error(`Failed to activate connection: ${activateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Connection activated." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});