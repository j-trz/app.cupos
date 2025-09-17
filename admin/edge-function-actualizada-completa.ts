import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getEncryptionKey(secret) {
  const keyData = new TextEncoder().encode(secret.slice(0, 32));
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function decryptCredentials(encryptedBlob, secretKey) {
  try {
    const { iv: ivB64, data: encryptedDataB64 } = JSON.parse(encryptedBlob);
    const key = await getEncryptionKey(secretKey);
    const iv = Buffer.from(ivB64, "base64");
    const encryptedData = Buffer.from(encryptedDataB64, "base64");
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );
    const decryptedString = new TextDecoder().decode(decryptedData);
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error(
      "Could not decrypt credentials. Check MASTER_ENCRYPTION_KEY."
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
    console.log("🔐 [get-decrypted-credentials] Starting request processing");

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    // 🔥 AQUÍ ES DONDE CAMBIAS EL CÓDIGO 🔥
    // REEMPLAZA ESTA LÍNEA:
    // const { connection_id } = requestBody;
    // POR ESTAS LÍNEAS:
    const { connection_id, master_encryption_key } = requestBody;

    console.log("🔑 Connection ID:", connection_id);

    if (!connection_id) {
      console.error("❌ Missing connection_id in request");
      throw new Error("connection_id is required");
    }

    // Intentar obtener variables de entorno desde diferentes fuentes
    console.log("🔧 Checking environment variables...");

    // 🔥 AQUÍ TAMBIÉN CAMBIAS 🔥
    // REEMPLAZA ESTA LÍNEA:
    // let masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    // POR ESTAS LÍNEAS:
    let masterKey =
      master_encryption_key || Deno.env.get("MASTER_ENCRYPTION_KEY");

    let supabaseUrl = Deno.env.get("SUPABASE_URL");
    let supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Método 2: Intentar desde secrets (nueva forma de Supabase)
    if (!masterKey) {
      try {
        // En Supabase más reciente, los secrets se acceden de manera diferente
        masterKey = await Deno.env.get("MASTER_ENCRYPTION_KEY");
      } catch (e) {
        console.log("No se pudo acceder a MASTER_ENCRYPTION_KEY desde secrets");
      }
    }

    // 🔥 AGREGAR ESTE NUEVO LOGGING 🔥
    console.log("🔧 Master key source:", {
      fromParameter: !!master_encryption_key,
      fromEnvironment: !!Deno.env.get("MASTER_ENCRYPTION_KEY"),
      hasKey: !!masterKey,
      keyLength: masterKey?.length || 0,
    });

    console.log("🔧 Environment check:", {
      hasMasterKey: !!masterKey,
      masterKeyLength: masterKey?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
      // Debug: primeros caracteres de las variables (sin exponer completamente)
      masterKeyPreview: masterKey
        ? `${masterKey.substring(0, 8)}...`
        : "NOT_FOUND",
      urlPreview: supabaseUrl
        ? `${supabaseUrl.substring(0, 20)}...`
        : "NOT_FOUND",
    });

    if (!masterKey) {
      console.error(
        "❌ MASTER_ENCRYPTION_KEY not found in environment or secrets"
      );
      throw new Error(
        "MASTER_ENCRYPTION_KEY is not configured. Please add it to Secrets in Supabase Dashboard."
      );
    }

    if (masterKey.length < 32) {
      console.error(
        `❌ MASTER_ENCRYPTION_KEY too short: ${masterKey.length} chars, needs 32+`
      );
      throw new Error(
        `MASTER_ENCRYPTION_KEY is too short (${masterKey.length} chars). Must be at least 32 characters.`
      );
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("❌ Missing required Supabase environment variables");
      throw new Error(
        "Missing required Supabase configuration. Check SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const authHeader = req.headers.get("Authorization");
    console.log("🔐 Auth header present:", !!authHeader);

    if (!authHeader) {
      console.error("❌ No Authorization header provided");
      throw new Error("Authorization header is required");
    }

    // Create user client to validate auth
    const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    console.log("👤 Getting user from token...");
    const {
      data: { user },
      error: userError,
    } = await userSupabaseClient.auth.getUser();

    if (userError) {
      console.error("❌ Error getting user:", userError);
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          details: userError.message,
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!user) {
      console.error("❌ No user found in token");
      return new Response(
        JSON.stringify({
          error: "Unauthorized - no user found",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("✅ User authenticated:", user.id);

    // Use admin client to get encrypted credentials
    const adminSupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔍 Fetching credentials for connection:", connection_id);
    const { data: credential, error: selectError } = await adminSupabaseClient
      .from("encrypted_service_credentials")
      .select("user_id, encrypted_credentials")
      .eq("connection_id", connection_id)
      .single();

    if (selectError) {
      console.error("❌ Error fetching credentials:", selectError);
      if (selectError.code === "PGRST116") {
        throw new Error(
          "No credentials found for this connection. Please save credentials first."
        );
      }
      throw new Error(`Database error: ${selectError.message}`);
    }

    if (!credential) {
      console.error("❌ No credential data returned");
      throw new Error("No credentials found for this connection.");
    }

    console.log("🔐 Credential found, checking ownership...");
    if (credential.user_id !== user.id) {
      console.error("❌ User does not own this connection:", {
        credentialUserId: credential.user_id,
        requestUserId: user.id,
      });
      return new Response(
        JSON.stringify({
          error: "Forbidden - you do not own this connection",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("🔓 Decrypting credentials...");
    const decryptedCredentials = await decryptCredentials(
      credential.encrypted_credentials,
      masterKey
    );

    console.log("✅ Credentials decrypted successfully");
    return new Response(JSON.stringify(decryptedCredentials), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("💥 Fatal error:", error);
    console.error("💥 Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    const errorResponse = {
      error: error.message,
      timestamp: new Date().toISOString(),
      function: "get-decrypted-credentials",
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 400,
    });
  }
});
