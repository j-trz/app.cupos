import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    throw new Error(
      "Could not decrypt credentials on the server. Check MASTER_ENCRYPTION_KEY and data format."
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    const { connection_id } = requestBody;
    if (!connection_id) {
      throw new Error("connection_id is required");
    }

    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!masterKey || masterKey.length < 32) {
      throw new Error(
        "Server configuration error: MASTER_ENCRYPTION_KEY is missing or is not 32 characters long."
      );
    }
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error(
        "Server configuration error: Missing Supabase environment variables."
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    // Get user info
    const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile to check admin role
    const { data: profile, error: profileError } = await userSupabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // Get credentials and global flag
    const adminSupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: credential, error: selectError } = await adminSupabaseClient
      .from("encrypted_service_credentials")
      .select("user_id, encrypted_credentials, is_global")
      .eq("connection_id", connection_id)
      .single();

    if (selectError) {
      if (selectError.code === "PGRST116") {
        throw new Error(
          "No credentials found for this connection. Please save credentials first."
        );
      }
      throw new Error(`Database error: ${selectError.message}`);
    }
    if (!credential) {
      throw new Error("No credentials found for this connection.");
    }

    // Permitir acceso si el usuario es dueño, si es admin, o si la conexión es global
    if (credential.user_id !== user.id && !isAdmin && !credential.is_global) {
      return new Response(
        JSON.stringify({ error: "Forbidden - you do not own this connection" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Decrypt and return the raw credentials
    const decryptedCredentials = await decryptCredentials(
      credential.encrypted_credentials,
      masterKey
    );

    return new Response(JSON.stringify(decryptedCredentials), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorResponse = {
      error: error.message,
      timestamp: new Date().toISOString(),
      function: "get-decrypted-credentials",
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
