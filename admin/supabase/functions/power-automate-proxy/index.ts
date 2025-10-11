// Deno global interface
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface ReservationData {
  pedido_id: string;
  agencia: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono: string;
  vuelo_codigo: string;
  vuelo_destino: string;
  vuelo_compania: string;
  vuelo_salida: string;
  vuelo_precio: string;
  neto_1: string;
  op: string;
  temporada: string;
  pnr: string;
  ficha: string;
  ruta: string;
  nombre_pasajero: string;
  apellido_pasajero: string;
  documento_pasajero: string;
  nacimiento_pasajero: string;
  nacionalidad_pasajero: string;
  tipo_pasajero: string;
}

serve(async (req) => {
  // Enhanced CORS handling - always return CORS headers
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin") ?? "*";
    const reqHeaders =
      req.headers.get("Access-Control-Request-Headers") ??
      "authorization, x-client-info, apikey, content-type";
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": reqHeaders,
        Vary: "Origin",
      },
    });
  }

  try {
    console.log("🚀 Power Automate Proxy - Request received:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase configuration");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: "Missing Supabase configuration",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from request - with better error handling
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("❌ Authentication failed:", userError);
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: userError?.message || "Invalid token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ User authenticated:", user.id);

    // Verify user has valid profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agencia, admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile not found:", profileError);
      return new Response(
        JSON.stringify({
          error: "User profile not found",
          details: profileError?.message,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Profile found:", profile);

    // Parse request body
    let action, payload;
    try {
      const body = await req.json();
      action = body.action;
      payload = body.payload;
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: "Expected JSON with 'action' and optional 'payload'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📋 Action requested:", action);

    // Handle different actions
    switch (action) {
      case "get-availability":
        return await getAvailability();
      case "get-requests":
        return await getRequests(profile);
      case "get-confirmations":
        return await getConfirmations(profile);
      case "submit-reservation":
        return await submitReservation(payload, profile, user);
      default:
        return new Response(
          JSON.stringify({
            error: "Invalid action",
            details: `Unknown action: ${action}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("💥 Unhandled error in power-automate-proxy:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getAvailability() {
  try {
    console.log("📊 Getting availability data...");

    // Get Power Automate URLs from environment variables
    const availabilityUrl = Deno.env.get("POWERAUTOMATE_GET_URL");
    if (!availabilityUrl) {
      console.error("❌ POWERAUTOMATE_GET_URL not configured");
      throw new Error("POWERAUTOMATE_GET_URL not configured");
    }

    console.log("🌐 Fetching from Power Automate:", availabilityUrl);

    const response = await fetch(availabilityUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error(`❌ Power Automate responded with ${response.status}`);
      throw new Error(`Power Automate request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.length || 0} availability records`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching availability:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch availability data",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function getRequests(profile: any) {
  try {
    console.log("📋 Getting requests data...");

    const requestsUrl = Deno.env.get("POWERAUTOMATE_GET_REQUESTS_URL");
    if (!requestsUrl) {
      console.error("❌ POWERAUTOMATE_GET_REQUESTS_URL not configured");
      throw new Error("POWERAUTOMATE_GET_REQUESTS_URL not configured");
    }

    const response = await fetch(requestsUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Power Automate request failed: ${response.status}`);
    }

    let data = await response.json();

    // Filter by status
    data = data.filter((item: any) => item.Estado === "Solicitado");

    // Apply user-specific filters based on profile
    if (!profile.admin && profile.agencia) {
      data = data.filter((item: any) => item.Agencia === profile.agencia);
    }

    console.log(`✅ Retrieved ${data.length} requests after filtering`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching requests:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch requests data",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function getConfirmations(profile: any) {
  try {
    console.log("✅ Getting confirmations data...");

    const confirmationsUrl = Deno.env.get(
      "POWERAUTOMATE_GET_CONFIRMATIONS_URL"
    );
    if (!confirmationsUrl) {
      console.error("❌ POWERAUTOMATE_GET_CONFIRMATIONS_URL not configured");
      throw new Error("POWERAUTOMATE_GET_CONFIRMATIONS_URL not configured");
    }

    const response = await fetch(confirmationsUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Power Automate request failed: ${response.status}`);
    }

    let data = await response.json();

    // Filter by status
    data = data.filter((item: any) => item.Estado === "Confirmado");

    // Apply user-specific filters based on profile
    if (!profile.admin && profile.agencia) {
      data = data.filter((item: any) => item.Agencia === profile.agencia);
    }

    console.log(`✅ Retrieved ${data.length} confirmations after filtering`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching confirmations:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch confirmations data",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function submitReservation(payload: any, profile: any, user: any) {
  try {
    console.log("🚀 Submitting reservation...");

    const postUrl = Deno.env.get("POWERAUTOMATE_SUBMIT_URL");
    if (!postUrl) {
      console.error("❌ POWERAUTOMATE_SUBMIT_URL not configured");
      throw new Error("POWERAUTOMATE_SUBMIT_URL not configured");
    }

    // Validate payload structure
    if (
      !payload.pedidoId ||
      !payload.vuelo ||
      !payload.pasajeros ||
      !payload.contacto
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid reservation data structure",
          details:
            "Missing required fields: pedidoId, vuelo, pasajeros, or contacto",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate that the user can make reservations for this agency
    if (
      !profile.admin &&
      profile.agencia &&
      payload.contacto.agencia !== profile.agencia
    ) {
      return new Response(
        JSON.stringify({
          error: "Cannot make reservations for other agencies",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate reservation records
    const reservationRecords = payload.pasajeros.map((pasajero: any) => ({
      pedido_id: payload.pedidoId,
      agencia: payload.contacto.agencia,
      contacto_nombre: payload.contacto.nombre,
      contacto_email: payload.contacto.email,
      contacto_telefono: payload.contacto.telefono,
      vuelo_codigo: payload.vuelo.codigo_cupo,
      vuelo_destino: payload.vuelo.destino,
      vuelo_compania: payload.vuelo.compania,
      vuelo_salida: payload.vuelo.salida,
      vuelo_precio: payload.vuelo.precio,
      neto_1: payload.vuelo.neto_1 || "0",
      op: payload.vuelo.op || "0",
      temporada: payload.vuelo.temporada,
      pnr: payload.vuelo.pnr,
      ficha: payload.vuelo.ficha,
      ruta: payload.vuelo.ruta,
      nombre_pasajero: pasajero.nombre,
      apellido_pasajero: pasajero.apellido,
      documento_pasajero: pasajero.documento,
      nacimiento_pasajero: pasajero.nacimiento,
      nacionalidad_pasajero: pasajero.nacionalidad,
      tipo_pasajero: pasajero.tipo,
    }));

    // Submit each reservation record
    const results: Array<{
      success: boolean;
      status?: number;
      error?: string;
      passenger: string;
    }> = [];

    for (const record of reservationRecords) {
      try {
        const response = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

        results.push({
          success: response.ok,
          status: response.status,
          passenger: `${record.nombre_pasajero} ${record.apellido_pasajero}`,
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: error?.message || "Unknown error",
          passenger: `${record.nombre_pasajero} ${record.apellido_pasajero}`,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.length - successCount;

    console.log(
      `✅ Reservation submitted: ${successCount} success, ${errorCount} failed`
    );

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total: results.length,
          successful: successCount,
          failed: errorCount,
          details: results,
        },
        referenceId: payload.pedidoId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error submitting reservation:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to submit reservation",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
