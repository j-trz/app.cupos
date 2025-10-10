import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case "get-availability":
        return await getAvailability();
      case "get-requests":
        return await getRequests();
      case "get-confirmations":
        return await getConfirmations();
      case "submit-reservation":
        return await submitReservation(payload);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in power-automate-proxy:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getAvailability() {
  const url = Deno.env.get("POWERAUTOMATE_GET_URL");
  if (!url) throw new Error("POWERAUTOMATE_GET_URL not configured");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Power Automate request failed: ${response.status}`);
  const data = await response.json();
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getRequests() {
  const url = Deno.env.get("POWERAUTOMATE_GET_REQUESTS_URL");
  if (!url) throw new Error("POWERAUTOMATE_GET_REQUESTS_URL not configured");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Power Automate request failed: ${response.status}`);
  let data = await response.json();
  data = data.filter((item: any) => item.Estado === "Solicitado");
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getConfirmations() {
  const url = Deno.env.get("POWERAUTOMATE_GET_CONFIRMATIONS_URL");
  if (!url) throw new Error("POWERAUTOMATE_GET_CONFIRMATIONS_URL not configured");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Power Automate request failed: ${response.status}`);
  let data = await response.json();
  data = data.filter((item: any) => item.Estado === "Confirmado");
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function submitReservation(payload: any) {
  const url = Deno.env.get("POWERAUTOMATE_SUBMIT_URL");
  if (!url) throw new Error("POWERAUTOMATE_SUBMIT_URL not configured");

  if (!payload.pedidoId || !payload.vuelo || !payload.pasajeros || !payload.contacto) {
    return new Response(JSON.stringify({ error: "Invalid reservation data structure" }), { status: 400 });
  }

  const records = payload.pasajeros.map((p: any) => ({
    // Simplified mapping
    ...payload.contacto,
    ...payload.vuelo,
    ...p,
    pedido_id: payload.pedidoId,
  }));

  const results = [];
  for (const record of records) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    results.push({ success: response.ok, status: response.status, passenger: `${record.nombre} ${record.apellido}` });
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}