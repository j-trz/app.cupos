# 🏗️ Configuración Multi-Tenant Completa

## 📋 Problema Identificado

Tu aplicación tiene una arquitectura **multi-tenant** donde:

- **🔐 Backend Principal**: `https://hdsmvuwrdwfivujjnubr.supabase.co` (Edge Functions, seguridad)
- **📊 Base de Datos Usuario**: `https://nstntatroiykjfkmkevq.supabase.co` (datos del cliente)

El error HTTP 400 se debe a que Edge Functions no están configuradas correctamente.

## 🚀 Pasos para Solucionar

### **Paso 1: Configurar Variables de Entorno**

En tu archivo `.env` o variables de entorno, configura:

```bash
# Backend Principal (Edge Functions)
VITE_BACKEND_SUPABASE_URL=https://hdsmvuwrdwfivujjnubr.supabase.co
VITE_BACKEND_SUPABASE_ANON_KEY=tu_anon_key_del_backend

# Base de Datos del Usuario (datos)
VITE_SUPABASE_URL=https://nstntatroiykjfkmkevq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG50YXRyb2l5a2pma21rZXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNzY3NzQsImV4cCI6MjA0NjY1Mjc3NH0.BdOWkZGYWyD_6yGYWNjXNxNyPrUNQTgtD-8E5_AwKkg
```

### **Paso 2: Actualizar supabaseClient.js**

Reemplaza `src/supabaseClient.js` con:

```javascript
import { createClient } from "@supabase/supabase-js";

// 🔐 BACKEND PRINCIPAL - Para Edge Functions
const backendUrl =
  import.meta.env.VITE_BACKEND_SUPABASE_URL ||
  "https://hdsmvuwrdwfivujjnubr.supabase.co";
const backendKey = import.meta.env.VITE_BACKEND_SUPABASE_ANON_KEY;

// 📊 BASE DE DATOS DEL USUARIO - Para datos
const userDbUrl = import.meta.env.VITE_SUPABASE_URL;
const userDbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cliente para el backend principal (Edge Functions, auth, seguridad)
export const supabaseBackend = createClient(backendUrl, backendKey);

// Cliente para la base de datos del usuario (datos)
export const supabaseUserDB = createClient(userDbUrl, userDbKey);

// Cliente principal (mantener compatibilidad)
export const supabase = supabaseBackend;

export function createDynamicSupabaseClient(url, anonKey) {
  return createClient(url, anonKey);
}
```

### **Paso 3: Desplegar Edge Functions en Backend Principal**

1. Ve a **https://hdsmvuwrdwfivujjnubr.supabase.co**
2. **Edge Functions** → **get-decrypted-credentials**
3. Reemplaza el código con:

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

    const { connection_id } = await req.json();
    if (!connection_id) throw new Error("connection_id is required");

    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("🔧 Environment check:", {
      hasMasterKey: !!masterKey,
      masterKeyLength: masterKey?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });

    if (!masterKey || masterKey.length < 32) {
      throw new Error("MASTER_ENCRYPTION_KEY is missing or too short");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

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

4. Haz clic en **"Deploy function"**

### **Paso 4: Configurar Variables de Entorno en Backend**

En **https://hdsmvuwrdwfivujjnubr.supabase.co** → **Settings** → **Edge Functions** → **Environment Variables**:

```bash
MASTER_ENCRYPTION_KEY=tu-clave-secreta-de-32-caracteres-minimo
SUPABASE_URL=https://hdsmvuwrdwfivujjnubr.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_del_backend
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_del_backend
```

### **Paso 5: Probar la Configuración**

1. Usa **diagnostic-backend-correcto.html**
2. Configura la `BACKEND_ANON_KEY` del backend principal
3. Ejecuta "🔍 Probar Backend Principal"

### **Paso 6: Actualizar ConnectionService (Opcional)**

Si quieres usar la nueva arquitectura completamente, actualiza las importaciones en `ConnectionService.js`:

```javascript
import { supabaseBackend, supabaseUserDB } from "../supabaseClient-multitenant";
const supabase = supabaseBackend; // Para Edge Functions y auth
```

## 🎯 Resultado Esperado

Después de esta configuración:

✅ **Edge Functions funcionarán** desde el backend principal
✅ **No más errores HTTP 400** de "Failed to send request"  
✅ **Arquitectura multi-tenant** funcionando correctamente
✅ **Conexiones Supabase NO harán fallback** inapropiado a Power Automate

## ⚠️ Puntos Importantes

- **MASTER_ENCRYPTION_KEY** debe tener 32+ caracteres
- **Backend y UserDB** son proyectos Supabase separados
- **Edge Functions** solo existen en el backend principal
- **Datos del usuario** se almacenan en su base de datos específica

¿Tienes alguna duda sobre algún paso?
