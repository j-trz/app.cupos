import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConnectionCredentials {
  type: string;
  credentials: Record<string, any>;
}

async function testSupabaseConnection(credentials: any) {
  try {
    const { url, apiKey } = credentials;

    if (!url || !apiKey) {
      throw new Error("URL y API Key son requeridos para Supabase");
    }

    // Crear cliente de Supabase con las credenciales proporcionadas
    const supabase = createClient(url, apiKey);

    // Probar conexión haciendo una consulta simple
    const { data, error } = await supabase
      .from("_realtime_schema")
      .select("*")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 es "table not found" que es OK
      throw new Error(`Error de conexión: ${error.message}`);
    }

    return {
      success: true,
      message: "Conexión a Supabase exitosa",
      details: {
        url: url,
        status: "connected",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al conectar con Supabase",
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

async function testSmartsheetConnection(credentials: any) {
  try {
    const { apiToken } = credentials;

    if (!apiToken) {
      throw new Error("Token de API es requerido para Smartsheet");
    }

    // Probar conexión con la API de Smartsheet
    const response = await fetch("https://api.smartsheet.com/2.0/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const userData = await response.json();

    return {
      success: true,
      message: "Conexión a Smartsheet exitosa",
      details: {
        user: userData.email,
        status: "connected",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al conectar con Smartsheet",
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

async function testMongoDBConnection(credentials: any) {
  try {
    const { connectionString, database } = credentials;

    if (!connectionString || !database) {
      throw new Error(
        "Connection String y Database son requeridos para MongoDB"
      );
    }

    // Para MongoDB, usaremos MongoDB Data API si está disponible
    // O podríamos usar MongoDB Driver para Deno
    const mongoUrl = new URL(connectionString);

    // Validar formato básico de connection string
    if (!mongoUrl.protocol.startsWith("mongodb")) {
      throw new Error(
        "Connection string debe comenzar con mongodb:// o mongodb+srv://"
      );
    }

    // Crear una conexión simple usando fetch a MongoDB Atlas Data API si está configurado
    // Esto es una implementación básica - en producción se usaría el driver oficial

    return {
      success: true,
      message: "Formato de conexión MongoDB válido",
      details: {
        database: database,
        host: mongoUrl.hostname,
        status: "format_valid",
        note: "Validación básica de formato - implementar driver completo para prueba real",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Error en la configuración de MongoDB",
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

async function testPowerAutomateConnection(credentials: any) {
  try {
    const { flowUrl } = credentials;

    if (!flowUrl) {
      throw new Error("URL del Flow es requerida para Power Automate");
    }

    // Validar que sea una URL válida
    let url;
    try {
      url = new URL(flowUrl);
    } catch {
      throw new Error("URL del Flow no es válida");
    }

    // Verificar que sea una URL de Power Automate
    if (
      !url.hostname.includes("prod-") &&
      !url.hostname.includes("logic-") &&
      !url.hostname.includes("flow.microsoft.com")
    ) {
      throw new Error("La URL no parece ser de Power Automate");
    }

    // Hacer una petición OPTIONS para verificar que el endpoint responde
    const response = await fetch(flowUrl, {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Power Automate puede retornar diferentes códigos para OPTIONS
    // 200, 404, 405 son válidos (indica que el endpoint existe)
    if (
      response.status === 200 ||
      response.status === 404 ||
      response.status === 405
    ) {
      return {
        success: true,
        message: "Conexión a Power Automate exitosa",
        details: {
          url: flowUrl,
          status: "reachable",
          httpStatus: response.status,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      return {
        success: false,
        message: `Power Automate Flow no accesible: HTTP ${response.status}`,
        details: {
          url: flowUrl,
          httpStatus: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString(),
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Error al conectar con Power Automate",
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Función para probar conexión a Tableau
async function testTableauConnection(credentials: any) {
  try {
    const { server, username, password, siteName } = credentials;

    if (!server || !username || !password) {
      throw new Error(
        "Servidor, usuario y contraseña son requeridos para Tableau"
      );
    }

    // Para Tableau, construimos la URL de autenticación
    const authUrl = `${server}/api/3.8/auth/signin`;

    const authPayload = {
      credentials: {
        name: username,
        password: password,
        site: {
          contentUrl: siteName || "",
        },
      },
    };

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authPayload),
    });

    if (response.ok) {
      return {
        success: true,
        message: "Conexión a Tableau establecida correctamente",
        details: {
          status: response.status,
          server: server,
          site: siteName || "default",
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Error de autenticación en Tableau: ${response.status}`,
        details: {
          error: errorText,
          server: server,
          timestamp: new Date().toISOString(),
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error al conectar con Tableau: ${error.message}`,
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar método HTTP
    if (req.method !== "POST") {
      throw new Error("Método no permitido");
    }

    // Verificar autorización
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorización requerido");
    }

    // Parsear cuerpo de la solicitud
    const { type, credentials }: ConnectionCredentials = await req.json();

    if (!type || !credentials) {
      throw new Error("Tipo de conexión y credenciales son requeridos");
    }

    // Probar conexión según el tipo
    let result;
    switch (type) {
      case "powerautomate":
        result = await testPowerAutomateConnection(credentials);
        break;
      case "supabase":
        result = await testSupabaseConnection(credentials);
        break;
      case "smartsheet":
        result = await testSmartsheetConnection(credentials);
        break;
      case "mongodb":
        result = await testMongoDBConnection(credentials);
        break;
      case "tableau":
        result = await testTableauConnection(credentials);
        break;
      default:
        throw new Error(`Tipo de conexión no soportado: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in test-api-connection:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Error interno del servidor",
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message.includes("no permitido")
          ? 405
          : error.message.includes("autorización")
          ? 401
          : 400,
      }
    );
  }
});
