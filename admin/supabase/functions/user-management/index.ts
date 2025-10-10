import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

interface UserData {
  id?: string;
  email: string;
  nombre: string;
  agencia: string;
  admin: boolean;
  password?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, userData } = await req.json();

    // No authorization checks are performed here.
    // The function is now a public API for user management.

    switch (action) {
      case "create":
        return await createUser(supabaseAdmin, userData);
      case "update":
        return await updateUser(supabaseAdmin, userData);
      case "delete":
        return await deleteUser(supabaseAdmin, userData.id);
      case "list":
        return await listUsers(supabaseAdmin, userData);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in user-management:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createUser(supabaseAdmin: any, userData: UserData) {
    if (!userData.email || !userData.password || !userData.nombre) {
      return new Response(JSON.stringify({ error: "Email, password, and nombre are required" }), { status: 400 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: { nombre: userData.nombre, agencia: userData.agencia },
        email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }), { status: 400 });
    }
    const userId = authData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not get user ID after creation" }), { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: userData.email,
        nombre: userData.nombre,
        agencia: userData.agencia,
        admin: userData.admin || false,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId); // Rollback
      return new Response(JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function updateUser(supabaseAdmin: any, userData: UserData) {
    if (!userData.id) {
        return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
    }
    const { error } = await supabaseAdmin.from("profiles").update({
        nombre: userData.nombre,
        agencia: userData.agencia,
        admin: userData.admin,
    }).eq("id", userData.id);

    if (error) {
        return new Response(JSON.stringify({ error: `Failed to update profile: ${error.message}` }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function deleteUser(supabaseAdmin: any, userId: string) {
    if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
    }
    // The `profiles` table should have a cascade delete on the user ID.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
        return new Response(JSON.stringify({ error: `Failed to delete user: ${error.message}` }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function listUsers(supabaseAdmin: any, options: any = {}) {
    const { data, error } = await supabaseAdmin.from("profiles").select("*");
    if (error) {
        return new Response(JSON.stringify({ error: `Failed to list users: ${error.message}` }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, users: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}