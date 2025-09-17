# 🚀 Instrucciones para Desplegar Edge Functions desde el Dashboard de Supabase

## 📋 Problema Identificado

Las Edge Functions no están desplegadas correctamente, por eso obtienes el error "Failed to send a request to the Edge Function".

## 🔧 Solución: Redesplegar desde el Dashboard

### **Paso 1: Ir a Edge Functions**

1. Ve a tu proyecto en https://supabase.com/dashboard
2. En el menú lateral, haz clic en **"Edge Functions"**

### **Paso 2: Verificar Funciones Existentes**

Deberías ver estas funciones:

- ✅ `get-decrypted-credentials`
- ✅ `test-edge-function-config`
- ✅ `save-service-credentials`
- ✅ `delete-service-credentials`
- ✅ `test-api-connection`
- ✅ `power-automate-proxy`

### **Paso 3: Redesplegar get-decrypted-credentials**

1. Haz clic en la función **`get-decrypted-credentials`**
2. Reemplaza todo el código con este (actualizado con CORS y logging):

```typescript
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
  // This is needed to handle CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🔐 [get-decrypted-credentials] Starting request processing");

    // Parse request body with better error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    const { connection_id } = requestBody;
    console.log("🔑 [get-decrypted-credentials] Connection ID:", connection_id);

    if (!connection_id) {
      console.error("❌ Missing connection_id in request");
      throw new Error("connection_id is required");
    }

    // Check environment variables
    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("🔧 [get-decrypted-credentials] Environment check:", {
      hasMasterKey: !!masterKey,
      masterKeyLength: masterKey?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
    });

    if (!masterKey || masterKey.length < 32) {
      console.error("❌ MASTER_ENCRYPTION_KEY missing or too short");
      throw new Error(
        "Server configuration error: MASTER_ENCRYPTION_KEY is missing or is not 32 characters long."
      );
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("❌ Missing required Supabase environment variables");
      throw new Error(
        "Server configuration error: Missing Supabase environment variables."
      );
    }

    // Check authorization header
    const authHeader = req.headers.get("Authorization");
    console.log(
      "🔐 [get-decrypted-credentials] Auth header present:",
      !!authHeader
    );

    if (!authHeader) {
      console.error("❌ No Authorization header provided");
      throw new Error("Authorization header is required");
    }

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log("👤 [get-decrypted-credentials] Getting user from token...");
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!user) {
      console.error("❌ No user found in token");
      return new Response(
        JSON.stringify({ error: "Unauthorized - no user found" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ [get-decrypted-credentials] User authenticated:", user.id);

    // Use admin client to get the encrypted credentials, but check ownership first
    const adminSupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(
      "🔍 [get-decrypted-credentials] Fetching credentials for connection:",
      connection_id
    );
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

    console.log(
      "🔐 [get-decrypted-credentials] Credential found, checking ownership..."
    );
    if (credential.user_id !== user.id) {
      console.error("❌ User does not own this connection:", {
        credentialUserId: credential.user_id,
        requestUserId: user.id,
      });
      return new Response(
        JSON.stringify({ error: "Forbidden - you do not own this connection" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔓 [get-decrypted-credentials] Decrypting credentials...");
    // Decrypt and return the raw credentials
    const decryptedCredentials = await decryptCredentials(
      credential.encrypted_credentials,
      masterKey
    );

    console.log(
      "✅ [get-decrypted-credentials] Credentials decrypted successfully"
    );
    return new Response(JSON.stringify(decryptedCredentials), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("💥 [get-decrypted-credentials] Fatal error:", error);
    console.error("💥 Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Return more specific error information for debugging
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
```

3. Haz clic en **"Deploy function"**

### **Paso 4: Configurar Variables de Entorno (MUY IMPORTANTE)**

1. En Edge Functions, ve a **"Settings"** o **"Environment Variables"**
2. Agrega estas variables:

**🔑 MASTER_ENCRYPTION_KEY**

- Valor: Una clave de 32+ caracteres (ejemplo: `my-super-secret-encryption-key-12345`)

**🔗 SUPABASE_URL**

- Valor: Tu URL de Supabase (ejemplo: `https://nstntatroiykjfkmkevq.supabase.co`)

**🔐 SUPABASE_ANON_KEY**

- Valor: Tu clave anónima (la misma que usas en el frontend)

**⚙️ SUPABASE_SERVICE_ROLE_KEY**

- Valor: Tu service role key (la encontrarás en Settings > API)

### **Paso 5: Verificar test-edge-function-config**

Si ya la desplegaste, verifica que tenga este código:

```typescript
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

    // Get environment variables
    const environmentVariables = {
      MASTER_ENCRYPTION_KEY: !!Deno.env.get("MASTER_ENCRYPTION_KEY"),
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_ANON_KEY: !!Deno.env.get("SUPABASE_ANON_KEY"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    };

    // Check MASTER_ENCRYPTION_KEY length
    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    if (masterKey) {
      environmentVariables.MASTER_ENCRYPTION_KEY = masterKey.length >= 32;
    }

    console.log("🔧 Environment variables status:", environmentVariables);

    // Get auth info
    const authHeader = req.headers.get("Authorization");
    const authInfo = {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length || 0,
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environmentVariables,
      authInfo,
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
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

### **Paso 6: Probar Nuevamente**

1. Después de desplegar y configurar las variables, espera 1-2 minutos
2. Ejecuta nuevamente tu herramienta de diagnóstico
3. Deberías ver resultados diferentes

## ⚠️ Notas Importantes

- **MASTER_ENCRYPTION_KEY** es CRÍTICA - sin ella, get-decrypted-credentials falla
- Las variables de entorno pueden tardar unos minutos en aplicarse
- Si sigues teniendo problemas, verifica los logs en Edge Functions > [función] > Logs

¿Necesitas ayuda con algún paso específico?
