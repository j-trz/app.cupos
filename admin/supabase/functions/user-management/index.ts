import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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
      case "listLockedUsers":
        return await listLockedUsers(supabaseAdmin);
      case "listUsers2FA":
        return await listUsers2FA(supabaseAdmin);
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
    return new Response(
      JSON.stringify({ error: "Email, password, and nombre are required" }),
      { status: 400 }
    );
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: { nombre: userData.nombre, agencia: userData.agencia },
      email_confirm: true,
    });

  if (authError) {
    return new Response(
      JSON.stringify({
        error: `Failed to create auth user: ${authError.message}`,
      }),
      { status: 400 }
    );
  }
  const userId = authData.user?.id;
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Could not get user ID after creation" }),
      { status: 500 }
    );
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
    return new Response(
      JSON.stringify({
        error: `Failed to create profile: ${profileError.message}`,
      }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ success: true, userId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function updateUser(supabaseAdmin: any, userData: UserData) {
  if (!userData.id) {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
    });
  }
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      nombre: userData.nombre,
      agencia: userData.agencia,
      admin: userData.admin,
    })
    .eq("id", userData.id);

  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to update profile: ${error.message}` }),
      { status: 500 }
    );
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function deleteUser(supabaseAdmin: any, userId: string) {
  if (!userId) {
    return new Response(JSON.stringify({ error: "User ID is required" }), {
      status: 400,
    });
  }
  // The `profiles` table should have a cascade delete on the user ID.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to delete user: ${error.message}` }),
      { status: 500 }
    );
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function listUsers(supabaseAdmin: any, options: any = {}) {
  const { data, error } = await supabaseAdmin.from("profiles").select("*");
  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to list users: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  return new Response(JSON.stringify({ success: true, users: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Listado de usuarios bloqueados con perfil normalizado
 */
async function listLockedUsers(supabaseAdmin: any) {
  const { data: securityData, error: securityError } = await supabaseAdmin
    .from("user_security_status")
    .select(
      "user_id, is_locked, locked_at, locked_reason, failed_attempts_count"
    )
    .eq("is_locked", true);

  if (securityError) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch locked users: ${securityError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!securityData || securityData.length === 0) {
    return new Response(JSON.stringify({ success: true, lockedUsers: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = securityData.map((i: any) => i.user_id);
  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, nombre, agencia, role")
    .in("id", userIds);

  if (profilesError) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch profiles: ${profilesError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
  const lockedUsers = await Promise.all(
    securityData.map(async (securityItem: any) => {
      let rawProfile = profilesMap.get(securityItem.user_id) || null;

      if (!rawProfile) {
        try {
          const { data: authRes } = await supabaseAdmin.auth.admin.getUserById(
            securityItem.user_id
          );
          const email = authRes?.user?.email ?? null;
          if (email) {
            rawProfile = { id: securityItem.user_id, email };
          }
        } catch (_e) {
          // ignore
        }
      }

      const profile = rawProfile
        ? {
            ...rawProfile,
            full_name:
              (rawProfile as any).full_name ??
              (rawProfile as any).nombre ??
              ((rawProfile as any).email
                ? (rawProfile as any).email.split("@")[0]
                : "N/A"),
            agency:
              (rawProfile as any).agency ?? (rawProfile as any).agencia ?? null,
          }
        : {
            id: securityItem.user_id,
            full_name: null,
            agency: null,
            email: null,
          };

      return { ...securityItem, profiles: profile };
    })
  );

  return new Response(JSON.stringify({ success: true, lockedUsers }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Listado de usuarios con 2FA habilitado con perfil normalizado
 */
async function listUsers2FA(supabaseAdmin: any) {
  const { data: securityData, error: securityError } = await supabaseAdmin
    .from("user_security_status")
    .select("user_id, two_factor_enabled, backup_codes, created_at")
    .eq("two_factor_enabled", true);

  if (securityError) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch 2FA users: ${securityError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!securityData || securityData.length === 0) {
    return new Response(JSON.stringify({ success: true, users: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = securityData.map((i: any) => i.user_id);
  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, nombre, agencia, role")
    .in("id", userIds);

  if (profilesError) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch profiles: ${profilesError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
  const users = await Promise.all(
    securityData.map(async (securityItem: any) => {
      let rawProfile = profilesMap.get(securityItem.user_id) || null;

      if (!rawProfile) {
        try {
          const { data: authRes } = await supabaseAdmin.auth.admin.getUserById(
            securityItem.user_id
          );
          const email = authRes?.user?.email ?? null;
          if (email) {
            rawProfile = { id: securityItem.user_id, email };
          }
        } catch (_e) {
          // ignore
        }
      }

      const profile = rawProfile
        ? {
            ...rawProfile,
            full_name:
              (rawProfile as any).full_name ??
              (rawProfile as any).nombre ??
              ((rawProfile as any).email
                ? (rawProfile as any).email.split("@")[0]
                : "N/A"),
            agency:
              (rawProfile as any).agency ?? (rawProfile as any).agencia ?? null,
          }
        : {
            id: securityItem.user_id,
            full_name: null,
            agency: null,
            email: null,
          };

      return {
        ...securityItem,
        profiles: profile,
        backup_codes_count: securityItem.backup_codes?.length || 0,
      };
    })
  );

  return new Response(JSON.stringify({ success: true, users }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
