import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

// =========== Decryption Helpers ===========
async function getEncryptionKey(secret: string) {
  const keyData = new TextEncoder().encode(secret.slice(0, 32)); // Ensure key is 32 bytes for AES-256
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
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );

    const decryptedString = new TextDecoder().decode(decryptedData);
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Could not decrypt credentials. Check MASTER_ENCRYPTION_KEY and data format.");
  }
}

// =========== Main Cron Job Logic ===========

serve(async (req) => {
  // This is needed to handle CORS preflight requests, though this function is not typically called from a browser.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  console.log("🚀 Cron job 'check-for-new-products-cron' started.");

  try {
    const masterKey = Deno.env.get("MASTER_ENCRYPTION_KEY");
    if (!masterKey) {
      throw new Error("MASTER_ENCRYPTION_KEY is not set in environment.");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get all distinct users who have connections
    const { data: users, error: usersError } = await adminClient
      .from("data_connections")
      .select("user_id")

    if(usersError) throw usersError;
    const userIds = [...new Set(users.map(u => u.user_id))];
    console.log(`Found ${userIds.length} users with connections to check.`);

    // 2. Process each user
    for (const userId of userIds) {
      console.log(`Processing user: ${userId}`);

      // For now, we assume we are checking the 'productos' data type.
      // This could be made more generic later.
      const dataType = 'productos';

      // 3. Find the active connection for this user and data type
      const { data: activeConn, error: activeConnError } = await adminClient
        .from('connection_data_types')
        .select(`
          connection:data_connections ( id, name, type )
        `)
        .eq('user_id', userId)
        .eq('data_type', dataType)
        .eq('is_active', true)
        .single();

      if (activeConnError || !activeConn?.connection) {
        console.log(`User ${userId} has no active connection for '${dataType}'. Skipping.`);
        continue;
      }

      const connection = activeConn.connection;
      console.log(`Found active connection '${connection.name}' (${connection.type}) for user ${userId}.`);

      // 4. Get the encrypted credentials for this connection
      const { data: creds, error: credsError } = await adminClient
        .from('encrypted_service_credentials')
        .select('encrypted_credentials')
        .eq('connection_id', connection.id)
        .single();

      if (credsError || !creds) {
        console.error(`Could not find credentials for connection ${connection.id}. Skipping.`);
        continue;
      }

      // 5. Decrypt credentials
      const credentials = await decryptCredentials(creds.encrypted_credentials, masterKey);

      // 6. Fetch external data based on connection type
      let externalData: any[] = [];
      let fetchError: any = null;

      switch (connection.type) {
        case 'supabase': {
          const { projectUrl, anonKey, tableName } = credentials;
          const externalSupabaseClient = createClient(projectUrl, anonKey);
          const { data, error } = await externalSupabaseClient
            .from(tableName || 'productos')
            .select('codigo_cupo'); // Fetch a unique identifier
          externalData = data || [];
          fetchError = error;
          break;
        }
        case 'powerautomate': {
          const { flowUrl } = credentials;
          const response = await fetch(flowUrl);
          if (response.ok) {
            externalData = await response.json();
          } else {
            fetchError = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
          break;
        }
        case 'smartsheet': {
            // NOTE: This is a simplified fetch. A real implementation would be more robust.
            const { accessToken, sheetId } = credentials;
            const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if(response.ok) {
                const sheet = await response.json();
                externalData = sheet.rows || [];
            } else {
                fetchError = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            break;
        }
        case 'mongodb':
        case 'tableau':
            console.log(`Connection type '${connection.type}' is recognized but data fetching is not yet implemented in the cron job. Skipping.`);
            continue; // Skip to the next user

        default:
          console.log(`Connection type '${connection.type}' not supported by cron job. Skipping.`);
          continue; // Skip to the next user
      }

      if (fetchError) {
        console.error(`Error fetching data for conn ${connection.id} (${connection.type}):`, fetchError);
        continue;
      }

      // 7. Create notification if data is found
      console.log(`Successfully fetched ${externalData.length} items from external source for user ${userId}.`);

      if (externalData && externalData.length > 0) {
        const notification = {
          type: 'new_product',
          title: 'Sincronización de Productos Completada',
          message: `Se encontraron ${externalData.length} productos en la conexión '${connection.name}'.`,
          target_user_id: userId,
          data: {
            connectionId: connection.id,
            itemsFound: externalData.length,
          }
        };

        const { error: notificationError } = await adminClient
          .from('notifications')
          .insert(notification);

        if (notificationError) {
          console.error(`Failed to create notification for user ${userId}:`, notificationError);
        } else {
          console.log(`Successfully created notification for user ${userId}.`);
        }
      }
    }

    console.log("✅ Cron job finished successfully.");
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("🚨 Cron job failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
