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
    "authorization, x-client-info, apikey, content-type",
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from request
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.admin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin privileges required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { action, userData } = await req.json();

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
    console.error("Error in user-management function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createUser(supabaseAdmin: any, userData: UserData) {
  try {
    // Validate required fields
    if (!userData.email || !userData.password || !userData.nombre) {
      return new Response(
        JSON.stringify({ error: "Email, password and nombre are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create user in auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          nombre: userData.nombre,
          agencia: userData.agencia,
        },
        email_confirm: true,
      });

    if (authError) {
      return new Response(
        JSON.stringify({
          error: `Failed to create user: ${authError.message}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Failed to get user ID" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email: userData.email,
        nombre: userData.nombre,
        agencia: userData.agencia,
        admin: userData.admin || false,
      });

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          error: `Failed to create profile: ${profileError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: "User created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(JSON.stringify({ error: "Failed to create user" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function updateUser(supabaseAdmin: any, userData: UserData) {
  try {
    if (!userData.id) {
      return new Response(
        JSON.stringify({ error: "User ID is required for update" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        nombre: userData.nombre,
        agencia: userData.agencia,
        admin: userData.admin,
      })
      .eq("id", userData.id);

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: `Failed to update profile: ${profileError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User updated successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return new Response(JSON.stringify({ error: "Failed to update user" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function deleteUser(supabaseAdmin: any, userId: string) {
  try {
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete from profiles first
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: `Failed to delete profile: ${profileError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );
    if (authError) {
      console.warn("Failed to delete auth user:", authError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return new Response(JSON.stringify({ error: "Failed to delete user" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function listUsers(supabaseAdmin: any, options: any = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const search = options.search || "";
    const sortBy = options.sortBy || "created_at";
    const sortOrder = options.sortOrder || "desc";

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Construir query base
    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, nombre, agencia, admin, role, created_at", {
        count: "exact",
      });

    // Agregar filtro de búsqueda si existe
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,nombre.ilike.%${search}%,agencia.ilike.%${search}%`
      );
    }

    // Agregar ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Agregar paginación
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch users: ${error.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calcular metadatos de paginación
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return new Response(
      JSON.stringify({
        success: true,
        users: users || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error listing users:", error);
    return new Response(JSON.stringify({ error: "Failed to list users" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
