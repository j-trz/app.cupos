import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { connection_id } = await req.json();

    if (!connection_id) {
      throw new Error("connection_id is required");
    }

    // Create an admin client to perform the delete.
    // No user ownership checks are performed as per new requirements.
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Perform the delete on the new `service_credentials` table.
    const { error: deleteError } = await adminSupabaseClient
      .from("service_credentials")
      .delete()
      .eq("connection_id", connection_id);

    if (deleteError) {
      console.error("Error deleting credentials:", deleteError);
      // It's better not to throw an error if the record is just not found.
      // The client might retry deleting something that's already gone.
      if (deleteError.code === 'PGRST116') { // PostgREST code for "Not Found"
         return new Response(JSON.stringify({ success: true, message: "Credentials not found or already deleted." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw new Error(`Failed to delete credentials: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Credentials deleted." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in delete-service-credentials function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});