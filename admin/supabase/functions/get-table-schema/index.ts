import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Keep the provider-specific schema fetching functions
async function getSupabaseSchema(credentials: any, tableName: string) {
    try {
        const { url, apiKey } = credentials;
        const supabase = createClient(url, apiKey);
        const { data, error } = await supabase.rpc('get_table_columns', { p_table_name: tableName });

        if (error) {
            throw new Error(`Failed to get schema from Supabase: ${error.message}`);
        }

        return {
            success: true,
            columns: data.map((col: any) => ({
                name: col.column_name,
                type: col.data_type,
                is_nullable: col.is_nullable === 'YES',
            })),
        };
    } catch (error) {
        throw new Error(`Error getting Supabase schema: ${error.message}`);
    }
}

async function getSmartsheetSchema(credentials: any, sheetId: string) {
    try {
        const { apiToken } = credentials;
        const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
            headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (!response.ok) throw new Error(`Smartsheet API error: ${response.statusText}`);
        const sheetData = await response.json();
        return {
            success: true,
            columns: sheetData.columns.map((col: any) => ({
                name: col.title,
                type: col.type,
                is_nullable: !col.validation?.strict,
            })),
        };
    } catch (error) {
        throw new Error(`Error getting Smartsheet schema: ${error.message}`);
    }
}
// Add placeholder functions for other providers as needed
async function getMongoDBSchema(credentials: any, collectionName: string) {
    return { success: true, columns: [{ name: '_id', type: 'ObjectId' }], message: 'Schema is dynamic in MongoDB.' };
}
async function getPowerAutomateSchema(credentials: any) {
    return { success: true, columns: [{ name: 'FieldName', type: 'String' }], message: 'Schema must be defined manually for Power Automate.' };
}
async function getTableauSchema(credentials: any) {
    return { success: true, columns: [{ name: 'Dimension', type: 'String' }], message: 'Schema depends on the Tableau data source.' };
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { connection_id, table_name } = await req.json();

    if (!connection_id || !table_name) {
      throw new Error("connection_id and table_name are required.");
    }

    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: conn, error: fetchError } = await adminSupabaseClient
      .from("service_credentials")
      .select("provider, credentials")
      .eq("connection_id", connection_id)
      .single();

    if (fetchError) {
      throw new Error(`Could not find connection details. Error: ${fetchError.message}`);
    }

    const { provider, credentials } = conn;

    let result;
    switch (provider) {
      case "supabase":
        result = await getSupabaseSchema(credentials, table_name);
        break;
      case "smartsheet":
        result = await getSmartsheetSchema(credentials, table_name);
        break;
      case "mongodb":
        result = await getMongoDBSchema(credentials, table_name);
        break;
      case "powerautomate":
        result = await getPowerAutomateSchema(credentials);
        break;
      case "tableau":
        result = await getTableauSchema(credentials);
        break;
      default:
        throw new Error(`Unsupported provider for schema fetching: ${provider}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});