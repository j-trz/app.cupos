import fetch from 'node-fetch'; // No es estrictamente necesario en Node 18+, pero nos asegura compatibilidad. En Node 18 fetch es nativo global.
import { query } from '../db.js';

// Helpers para testear conexiones a proveedores externos
async function testPowerAutomate(flowUrl) {
  try {
    if (!flowUrl) throw new Error('URL del Flow no configurada.');
    const url = new URL(flowUrl);
    if (!url.hostname.includes('logic.azure.com') && !url.hostname.includes('flow.microsoft.com')) {
      throw new Error('La URL no pertenece a Power Automate o Azure Logic Apps.');
    }
    const response = await fetch(flowUrl, { method: 'OPTIONS' });
    if (response.status >= 200 && response.status < 500) {
      return { success: true, message: 'Conexión a Power Automate exitosa.' };
    }
    return { success: false, message: `Flow no accesible. HTTP Status: ${response.status}` };
  } catch (error) {
    return { success: false, message: `Error de red/validación: ${error.message}` };
  }
}

async function testSupabase(url, apiKey) {
  try {
    if (!url || !apiKey) throw new Error('URL y API Key requeridas.');
    // Hacer una consulta REST rápida a Supabase
    const response = await fetch(`${url}/rest/v1/profiles?limit=1`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    // Si da 200 u otro código de autenticación aceptable (como 406/404 que indica que la API responde)
    if (response.ok || response.status < 500) {
      return { success: true, message: 'Conexión a Supabase establecida correctamente.' };
    }
    return { success: false, message: `Supabase respondió con código HTTP: ${response.status}` };
  } catch (error) {
    return { success: false, message: `Error conectando a Supabase: ${error.message}` };
  }
}

async function testSmartsheet(apiToken) {
  try {
    if (!apiToken) throw new Error('API Token requerido.');
    const response = await fetch('https://api.smartsheet.com/2.0/users/me', {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, message: `Smartsheet conectada. Usuario: ${data.email}` };
    }
    return { success: false, message: `Smartsheet denegó el acceso. HTTP status: ${response.status}` };
  } catch (error) {
    return { success: false, message: `Error conectando a Smartsheet: ${error.message}` };
  }
}

async function testMongoDB(connectionString) {
  try {
    if (!connectionString) throw new Error('Cadena de conexión requerida.');
    if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
      throw new Error('Formato de connection string MongoDB inválido.');
    }
    return { success: true, message: 'Formato de conexión MongoDB validado.' };
  } catch (error) {
    return { success: false, message: `Error en MongoDB config: ${error.message}` };
  }
}

async function testTableau(server, username, password, siteName) {
  try {
    if (!server || !username || !password) {
      throw new Error('Servidor, usuario y contraseña son requeridos para Tableau.');
    }
    const authUrl = `${server}/api/3.8/auth/signin`;
    const authPayload = {
      credentials: {
        name: username,
        password: password,
        site: { contentUrl: siteName || '' }
      }
    };
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });
    if (response.ok) {
      return { success: true, message: 'Conexión a Tableau exitosa.' };
    }
    return { success: false, message: `Tableau denegó el acceso (HTTP ${response.status}).` };
  } catch (error) {
    return { success: false, message: `Error conectando a Tableau: ${error.message}` };
  }
}

/**
 * Listar conexiones con filtrado por rol y agencia
 */
export const listConnections = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const userAgency = req.user.agencia;

  try {
    let sql = '';
    const params = [];

    if (userRole === 'admin') {
      // Admin ve todas
      sql = 'SELECT * FROM public.data_connections ORDER BY created_at DESC';
    } else if (userRole === 'agency_admin') {
      // Ve las propias, globales (all), o de su agencia
      sql = `
        SELECT * FROM public.data_connections
        WHERE user_id = $1 
           OR scope = 'all'
           OR (scope = 'agency' AND target_agency = $2)
        ORDER BY created_at DESC
      `;
      params.push(userId, userAgency);
    } else {
      // Agency user ve solo las globales, de su agencia o propias
      sql = `
        SELECT * FROM public.data_connections
        WHERE user_id = $1 
           OR scope = 'all'
           OR (scope = 'agency' AND target_agency = $2)
        ORDER BY created_at DESC
      `;
      params.push(userId, userAgency);
    }

    const result = await query(sql, params);
    res.status(200).json({
      success: true,
      connections: result.rows
    });
  } catch (error) {
    console.error('❌ Error listando conexiones:', error);
    res.status(500).json({ error: 'Error al obtener conexiones.' });
  }
};

/**
 * Crear nueva conexión de datos con credenciales
 */
export const createConnection = async (req, res) => {
  const { name, type, description, scope, target_agency, credentials } = req.body;
  const userId = req.user.id;

  if (!name || !type || !credentials) {
    return res.status(400).json({ error: 'Nombre, tipo y credenciales son requeridos.' });
  }

  try {
    // 1. Insertar conexión
    const connSql = `
      INSERT INTO public.data_connections (user_id, name, type, description, scope, target_agency)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const connResult = await query(connSql, [
      userId,
      name,
      type,
      description || null,
      scope || 'user',
      (scope === 'agency' ? target_agency || req.user.agencia : null)
    ]);
    const connection = connResult.rows[0];

    // 2. Insertar credenciales en api_credentials
    const credentialEntries = Object.entries(credentials);
    for (const [key, value] of credentialEntries) {
      await query(
        `INSERT INTO public.api_credentials (connection_id, user_id, credential_key, credential_value)
         VALUES ($1, $2, $3, $4)`,
        [connection.id, userId, key, String(value)]
      );
    }

    res.status(201).json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('❌ Error creando conexión:', error);
    res.status(500).json({ error: 'Error al crear la conexión.' });
  }
};

/**
 * Eliminar conexión
 */
export const deleteConnection = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // 1. Verificar propiedad o admin
    const checkSql = 'SELECT id, user_id FROM public.data_connections WHERE id = $1';
    const checkResult = await query(checkSql, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conexión no encontrada.' });
    }

    const connection = checkResult.rows[0];
    if (connection.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'No tiene permisos para eliminar esta conexión.' });
    }

    // 2. Eliminar (las credenciales se borran automáticamente gracias a ON DELETE CASCADE)
    await query('DELETE FROM public.data_connections WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Conexión eliminada correctamente.'
    });
  } catch (error) {
    console.error('❌ Error eliminando conexión:', error);
    res.status(500).json({ error: 'Error al eliminar la conexión.' });
  }
};

/**
 * Activar una conexión y desactivar todas las demás
 */
export const activateConnection = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Desactivar las demás conexiones (en service_credentials o data_connections)
    // El sistema anterior usaba la tabla 'service_credentials' para el flag is_active
    // Vamos a actualizar tanto en public.service_credentials como en public.data_connections si aplica.
    
    // Primero en la tabla de compatibilidad service_credentials
    await query('UPDATE public.service_credentials SET is_active = FALSE WHERE connection_id != $1', [id]);
    await query('UPDATE public.service_credentials SET is_active = TRUE WHERE connection_id = $1', [id]);

    // También podemos tener una columna is_active en data_connections
    // Vamos a comprobar si data_connections tiene la columna is_active en la BD antes de hacer update
    const hasCol = await query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='data_connections' AND column_name='is_active'
    `);
    if (hasCol.rows.length > 0) {
      await query('UPDATE public.data_connections SET is_active = FALSE WHERE id != $1', [id]);
      await query('UPDATE public.data_connections SET is_active = TRUE WHERE id = $1', [id]);
    }

    res.status(200).json({
      success: true,
      message: 'Conexión activada correctamente.'
    });
  } catch (error) {
    console.error('❌ Error activando conexión:', error);
    res.status(500).json({ error: 'Error al activar la conexión.' });
  }
};

/**
 * Probar conexión a la API externa
 */
export const testConnection = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Buscar metadatos de conexión
    const connResult = await query('SELECT type, name FROM public.data_connections WHERE id = $1', [id]);
    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conexión no encontrada.' });
    }

    const { type, name } = connResult.rows[0];

    // 2. Buscar credenciales asociadas en api_credentials
    const credResult = await query(
      'SELECT credential_key, credential_value FROM public.api_credentials WHERE connection_id = $1',
      [id]
    );

    // Mapear credenciales a un objeto estructurado
    const credentials = {};
    credResult.rows.forEach(row => {
      credentials[row.credential_key] = row.credential_value;
    });

    let result = { success: false, message: 'Proveedor de conexión desconocido.' };

    // 3. Ejecutar testeo según tipo
    if (type === 'powerautomate') {
      // El key en el frontend puede ser flowUrl, URL, postUrl, etc.
      const url = credentials.flowUrl || credentials.URL || credentials.postUrl || credentials.submitUrl;
      result = await testPowerAutomate(url);
    } else if (type === 'supabase') {
      result = await testSupabase(credentials.url || credentials.URL, credentials.apiKey || credentials.apikey);
    } else if (type === 'smartsheet') {
      result = await testSmartsheet(credentials.apiToken || credentials.token);
    } else if (type === 'mongodb') {
      result = await testMongoDB(credentials.connectionString || credentials.uri);
    } else if (type === 'tableau') {
      result = await testTableau(credentials.server, credentials.username, credentials.password, credentials.siteName);
    }

    // 4. Guardar resultado de prueba en base de datos
    const status = result.success ? 'connected' : 'failed';
    await query(
      `UPDATE public.data_connections 
       SET connection_status = $1, last_tested_at = NOW(), updated_at = NOW() 
       WHERE id = $2`,
      [status, id]
    );

    // También actualizar en service_credentials por compatibilidad
    await query(
      `UPDATE public.service_credentials 
       SET connection_status = $1, last_tested_at = NOW(), updated_at = NOW() 
       WHERE connection_id = $2`,
      [status, id]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error probando conexión:', error);
    res.status(500).json({ success: false, message: `Error al probar la conexión: ${error.message}` });
  }
};
