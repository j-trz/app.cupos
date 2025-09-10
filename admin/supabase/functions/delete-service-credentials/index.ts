import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { connection_id } = await req.json();

    if (!connection_id) {
      throw new Error("connection_id is required");
    }

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create an admin client to perform the delete, but first check ownership
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Security Check: Verify the user owns the credentials before deleting.
    const { data: credential_to_delete, error: selectError } = await adminSupabaseClient
      .from("encrypted_service_credentials")
      .select("user_id")
      .eq("connection_id", connection_id)
      .single();

    if (selectError) {
      // If it doesn't exist, that's fine, the job is done.
      return new Response(JSON.stringify({ success: true, message: "No credentials to delete or already deleted." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (credential_to_delete.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Perform the delete
    const { error: deleteError } = await adminSupabaseClient
      .from("encrypted_service_credentials")
      .delete()
      .eq("connection_id", connection_id);

    if (deleteError) {
      console.error("Error deleting credentials:", deleteError);
      throw new Error("Failed to delete encrypted credentials.");
    }

    return new Response(JSON.stringify({ success: true, message: "Credentials deleted securely." }), {
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
