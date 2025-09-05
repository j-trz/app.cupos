import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SchemaRequest {
  type: string;
  credentials: Record<string, any>;
  tableName: string;
}

async function getSupabaseSchema(credentials: any, tableName: string) {
  try {
    const { url, apiKey } = credentials;
    const supabase = createClient(url, apiKey);

    // Obtener esquema de la tabla usando información del sistema
    const { data, error } = await supabase.from(tableName).select("*").limit(1);

    if (error) {
      throw new Error(`Error al acceder a la tabla: ${error.message}`);
    }

    // Si tenemos datos, extraer las columnas
    let columns: string[] = [];
    if (data && data.length > 0) {
      columns = Object.keys(data[0]);
    } else {
      // Si no hay datos, intentar obtener el esquema de otra manera
      // Esto es limitado con la API REST, en una implementación real
      // se usaría una consulta SQL directa para obtener el esquema
      columns = ["id", "created_at", "updated_at"]; // Columnas comunes
    }

    return {
      success: true,
      schema: {
        tableName,
        totalColumns: columns.length,
        hasData: data && data.length > 0,
      },
      columns: columns.map((col) => ({
        name: col,
        type: "unknown", // La API REST no provee tipos
        nullable: true,
        isPrimaryKey: col === "id",
      })),
    };
  } catch (error) {
    throw new Error(`Error obteniendo esquema de Supabase: ${error.message}`);
  }
}

async function getSmartsheetSchema(credentials: any, sheetId: string) {
  try {
    const { apiToken } = credentials;

    // Obtener información de la hoja de Smartsheet
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const sheetData = await response.json();

    // Extraer columnas de la hoja
    const columns = sheetData.columns.map((col: any) => ({
      name: col.title,
      type: col.type || "TEXT_NUMBER",
      nullable: !col.validation?.strict,
      isPrimaryKey: col.primary === true,
      smartsheetId: col.id,
    }));

    return {
      success: true,
      schema: {
        sheetName: sheetData.name,
        sheetId: sheetData.id,
        totalColumns: columns.length,
        totalRows: sheetData.totalRowCount || 0,
      },
      columns,
    };
  } catch (error) {
    throw new Error(`Error obteniendo esquema de Smartsheet: ${error.message}`);
  }
}

async function getMongoDBSchema(credentials: any, collectionName: string) {
  try {
    const { connectionString, database } = credentials;

    // Esta es una implementación básica
    // En una implementación real se usaría el driver oficial de MongoDB
    // Por ahora, devolvemos un esquema genérico basado en MongoDB común

    const commonMongoFields = [
      { name: "_id", type: "ObjectId", nullable: false, isPrimaryKey: true },
      { name: "createdAt", type: "Date", nullable: true, isPrimaryKey: false },
      { name: "updatedAt", type: "Date", nullable: true, isPrimaryKey: false },
    ];

    return {
      success: true,
      schema: {
        collectionName,
        database,
        isSchemaless: true,
        note: "MongoDB es schemaless - estos son campos comunes",
      },
      columns: commonMongoFields,
    };
  } catch (error) {
    throw new Error(`Error obteniendo esquema de MongoDB: ${error.message}`);
  }
}

async function getPowerAutomateSchema(credentials: any, tableName?: string) {
  try {
    const { flowUrl } = credentials;

    if (!flowUrl) {
      throw new Error("URL del Flow es requerida para Power Automate");
    }

    // Para Power Automate, retornamos un esquema genérico basado en los campos
    // comunes que se usan en formularios de vuelos
    const powerAutomateFields = [
      {
        name: "Nombre_Completo",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      { name: "Cedula", type: "String", nullable: false, isPrimaryKey: true },
      { name: "Email", type: "String", nullable: false, isPrimaryKey: false },
      { name: "Telefono", type: "String", nullable: true, isPrimaryKey: false },
      {
        name: "Vuelo_Salida",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      { name: "Ruta", type: "String", nullable: false, isPrimaryKey: false },
      {
        name: "Temporada",
        type: "String",
        nullable: true,
        isPrimaryKey: false,
      },
      { name: "Asiento", type: "String", nullable: true, isPrimaryKey: false },
      { name: "Estado", type: "String", nullable: true, isPrimaryKey: false },
      {
        name: "Observaciones",
        type: "String",
        nullable: true,
        isPrimaryKey: false,
      },
      {
        name: "Fecha_Creacion",
        type: "DateTime",
        nullable: false,
        isPrimaryKey: false,
      },
    ];

    return {
      success: true,
      schema: {
        flowName: tableName || "Power Automate Flow",
        flowUrl: flowUrl,
        isFormBased: true,
        note: "Esquema basado en estructura común de formularios de vuelos",
      },
      columns: powerAutomateFields,
    };
  } catch (error) {
    throw new Error(
      `Error obteniendo esquema de Power Automate: ${error.message}`
    );
  }
}

async function getTableauSchema(credentials: any, viewName?: string) {
  try {
    const { server, username, password, siteName } = credentials;

    if (!server || !username || !password) {
      throw new Error(
        "Servidor, usuario y contraseña son requeridos para Tableau"
      );
    }

    // Para Tableau, retornamos un esquema genérico basado en campos comunes
    // En una implementación real se usaría la REST API de Tableau para obtener metadatos
    const tableauFields = [
      {
        name: "ID",
        type: "Integer",
        nullable: false,
        isPrimaryKey: true,
      },
      {
        name: "Passenger_Name",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      {
        name: "Document_ID",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      {
        name: "Email",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      {
        name: "Phone",
        type: "String",
        nullable: true,
        isPrimaryKey: false,
      },
      {
        name: "Flight_Number",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      {
        name: "Route",
        type: "String",
        nullable: false,
        isPrimaryKey: false,
      },
      {
        name: "Season",
        type: "String",
        nullable: true,
        isPrimaryKey: false,
      },
      {
        name: "Seat_Number",
        type: "String",
        nullable: true,
        isPrimaryKey: false,
      },
      {
        name: "Status",
        type: "String",
        nullable: true,
        isPrimaryKey: false,
      },
      {
        name: "Created_Date",
        type: "DateTime",
        nullable: false,
        isPrimaryKey: false,
      },
    ];

    return {
      success: true,
      schema: {
        viewName: viewName || "Tableau Data Source",
        server: server,
        site: siteName || "default",
        isVisualizationBased: true,
        note: "Esquema basado en estructura común de datos de vuelos para Tableau",
      },
      columns: tableauFields,
    };
  } catch (error) {
    throw new Error(`Error obteniendo esquema de Tableau: ${error.message}`);
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
    const { type, credentials, tableName }: SchemaRequest = await req.json();

    if (!type || !credentials || !tableName) {
      throw new Error("Tipo, credenciales y nombre de tabla son requeridos");
    }

    // Obtener esquema según el tipo
    let result;
    switch (type) {
      case "powerautomate":
        result = await getPowerAutomateSchema(credentials, tableName);
        break;
      case "supabase":
        result = await getSupabaseSchema(credentials, tableName);
        break;
      case "smartsheet":
        result = await getSmartsheetSchema(credentials, tableName); // tableName es sheetId para Smartsheet
        break;
      case "mongodb":
        result = await getMongoDBSchema(credentials, tableName);
        break;
      case "tableau":
        result = await getTableauSchema(credentials, tableName);
        break;
      default:
        throw new Error(`Tipo de conexión no soportado: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-table-schema:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Error interno del servidor",
        schema: null,
        columns: [],
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
