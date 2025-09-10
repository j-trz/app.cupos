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

// Decrypt credentials
async function decryptCredentials(encryptedBlob: string, secretKey: string) {
  try {
    const { iv: ivB64, data: encryptedDataB64 } = JSON.parse(encryptedBlob);
    const key = await getEncryptionKey(secretKey);
    const iv = Buffer.from(ivB64, "base64");
    const encryptedData = Buffer.from(encryptedDataB64, "base64");

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );

    const decryptedString = new TextDecoder().decode(decryptedData);
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error("Decryption failed on server:", e);
    throw new Error("Could not decrypt credentials on the server. Check MASTER_ENCRYPTION_KEY and data format.");
  }
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
    const { connection_id } = await req.json();

    if (!connection_id) {
      throw new Error("connection_id is required");
    }

    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    if (!masterKey || masterKey.length < 32) {
      throw new Error("Server configuration error: MASTER_ENCRYPTION_KEY is missing or is not 32 characters long.");
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

    // Use admin client to get the encrypted credentials, but check ownership first
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: credential, error: selectError } = await adminSupabaseClient
      .from("encrypted_service_credentials")
      .select("user_id, encrypted_credentials")
      .eq("connection_id", connection_id)
      .single();

    if (selectError) {
      console.error("Error fetching credentials to decrypt:", selectError);
      throw new Error("Could not find credentials for this connection.");
    }

    if (credential.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Decrypt and return the raw credentials
    const decryptedCredentials = await decryptCredentials(credential.encrypted_credentials, masterKey);

    return new Response(JSON.stringify(decryptedCredentials), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in get-decrypted-credentials function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
