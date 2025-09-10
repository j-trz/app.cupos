import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to get the encryption key. It must be a 32-byte string.
async function getEncryptionKey(secret: string) {
  const keyData = new TextEncoder().encode(secret.slice(0, 32));
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt credentials
async function encryptCredentials(credentials: object, secretKey: string) {
  const key = await getEncryptionKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const credentialsString = JSON.stringify(credentials);
  const encodedData = new TextEncoder().encode(credentialsString);

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData
  );

  const ivB64 = Buffer.from(iv).toString("base64");
  const encryptedDataB64 = Buffer.from(encryptedData).toString("base64");

  return JSON.stringify({ iv: ivB64, data: encryptedDataB64 });
}

serve(async (req) => {
  // This is needed to handle CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { connection_id, credentials } = await req.json();

    if (!connection_id || !credentials) {
      throw new Error("connection_id and credentials are required");
    }

    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    if (!masterKey || masterKey.length < 32) {
      throw new Error("Server configuration error: MASTER_ENCRYPTION_KEY is missing or is not 32 characters long.");
    }

    // Create a Supabase client with the user's auth token to verify ownership
    const userSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Security Check: Verify the user owns the connection
    const { data: connection, error: connError } = await userSupabaseClient
      .from("data_connections")
      .select("id, user_id")
      .eq("id", connection_id)
      .single();

    if (connError || !connection || connection.user_id !== user.id) {
       return new Response(JSON.stringify({ error: "Forbidden: Connection not found or you do not own it." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Encrypt the credentials
    const encryptedBlob = await encryptCredentials(credentials, masterKey);

    // Create an admin client to upsert the encrypted credentials
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: upsertError } = await adminSupabaseClient
      .from("encrypted_service_credentials")
      .upsert({
        connection_id: connection_id,
        user_id: user.id,
        encrypted_credentials: encryptedBlob,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'connection_id' });

    if (upsertError) {
      console.error("Error upserting credentials:", upsertError);
      throw new Error("Failed to save encrypted credentials.");
    }

    return new Response(JSON.stringify({ success: true, message: "Credentials saved securely." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in save-service-credentials function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
