# 🔧 Solución Alternativa: MASTER_ENCRYPTION_KEY como Parámetro

## 🎯 Problema Identificado

Las Edge Functions de Supabase no pueden acceder a los Secrets configurados. Esto es un problema conocido en algunas versiones de Supabase.

## 🚀 Solución Temporal

**Pasar la MASTER_ENCRYPTION_KEY desde el frontend** hasta que encontremos una solución permanente.

## ⚠️ IMPORTANTE

Esta es una solución temporal para debugging. **NO ES RECOMENDADA PARA PRODUCCIÓN** porque expone la clave.

## 📋 Pasos

### **Paso 1: Actualizar ConnectionService**

En tu aplicación, modifica el método `getDecryptedCredentials` para incluir la clave:

```javascript
// En ConnectionService.js, línea aproximada 143
static async getDecryptedCredentials(connectionId) {
  try {
    console.log(`🔐 [ConnectionService] Getting credentials for connection: ${connectionId}`);

    // TEMPORAL: Pasar MASTER_ENCRYPTION_KEY como parámetro
    const TEMP_MASTER_KEY = "my-application-master-key-2024-secure-32-chars"; // 32+ caracteres

    const { data, error } = await supabase.functions.invoke(
      "get-decrypted-credentials",
      {
        body: {
          connection_id: connectionId,
          master_encryption_key: TEMP_MASTER_KEY  // TEMPORAL
        }
      }
    );

    // ... resto del código
  } catch (error) {
    // ... manejo de errores
  }
}
```

### **Paso 2: Actualizar Edge Function**

Modifica `get-decrypted-credentials` para aceptar la clave como parámetro:

```typescript
// Al inicio de la función, después de obtener connection_id
const { connection_id, master_encryption_key } = requestBody;

// Usar la clave del parámetro si está disponible
let masterKey = master_encryption_key || Deno.env.get("MASTER_ENCRYPTION_KEY");

console.log("🔧 Master key source:", {
  fromParameter: !!master_encryption_key,
  fromEnvironment: !!Deno.env.get("MASTER_ENCRYPTION_KEY"),
  hasKey: !!masterKey,
  keyLength: masterKey?.length || 0,
});
```

### **Paso 3: Código Completo de la Edge Function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    console.error("Decryption failed:", e);
    throw new Error(
      "Could not decrypt credentials. Check MASTER_ENCRYPTION_KEY."
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("🔐 [get-decrypted-credentials] Starting...");

    const requestBody = await req.json();
    const { connection_id, master_encryption_key } = requestBody;

    if (!connection_id) throw new Error("connection_id is required");

    // Intentar obtener master key desde parámetro o ambiente
    let masterKey =
      master_encryption_key || Deno.env.get("MASTER_ENCRYPTION_KEY");

    console.log("🔧 Master key check:", {
      fromParameter: !!master_encryption_key,
      fromEnvironment: !!Deno.env.get("MASTER_ENCRYPTION_KEY"),
      hasKey: !!masterKey,
      keyLength: masterKey?.length || 0,
    });

    if (!masterKey || masterKey.length < 32) {
      throw new Error(
        `MASTER_ENCRYPTION_KEY missing or too short. Length: ${
          masterKey?.length || 0
        }`
      );
    }

    // Obtener otras variables de entorno
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    // Validar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY"),
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener credenciales encriptadas
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: credential, error: selectError } = await adminClient
      .from("encrypted_service_credentials")
      .select("user_id, encrypted_credentials")
      .eq("connection_id", connection_id)
      .single();

    if (selectError) {
      if (selectError.code === "PGRST116") {
        throw new Error("No credentials found for this connection");
      }
      throw new Error(`Database error: ${selectError.message}`);
    }

    if (credential.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Desencriptar y retornar
    const decryptedCredentials = await decryptCredentials(
      credential.encrypted_credentials,
      masterKey
    );

    console.log("✅ Credentials decrypted successfully");
    return new Response(JSON.stringify(decryptedCredentials), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("💥 Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
```

## 🎯 Resultado Esperado

Con esta solución temporal:

- ✅ Las credenciales se desencriptarán correctamente
- ✅ No más errores HTTP 400
- ✅ Las conexiones Supabase funcionarán sin fallback inapropiado

## 🔒 Solución Permanente (Para Después)

Una vez que funcione, podemos explorar:

1. **Usar variables de entorno del proyecto** (no Edge Functions)
2. **Configurar la clave en el código del backend**
3. **Usar un servicio de gestión de secretos externo**

¿Quieres probar esta solución temporal?
