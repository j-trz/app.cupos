/**
 * Controlador de Inteligencia Artificial
 * Maneja chat, sesiones, proveedores y acciones del agente IA
 */

import { query } from '../db.js';
import aiService from '../services/aiService.js';
import { getSystemPrompt } from '../config/aiInstructions.js';
import { productToolDefinitions, executeProductTool } from '../tools/productTools.js';
import { reservationToolDefinitions, executeReservationTool } from '../tools/reservationTools.js';
import { userToolDefinitions, executeUserTool } from '../tools/userTools.js';

// Usar directamente la instancia importada
const aiServiceInstance = aiService;

/**
 * Enviar mensaje al asistente IA
 * POST /api/ai/chat
 */
export const chat = async (req, res) => {
  try {
    const { message, sessionId, providerId, imageBase64, imageMime } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    // Crear o recuperar sesión
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = await aiServiceInstance.createSession(userId, message.substring(0, 50));
      currentSessionId = session.id;
    }

    // Guardar mensaje del usuario en la base de datos (texto plano para no romper la estructura de la base de datos)
    await aiServiceInstance.saveMessage(currentSessionId, userId, 'user', message);

    // Obtener historial de la sesión para contexto
    const history = await aiServiceInstance.getSessionHistory(currentSessionId);

    // Inyectar el SYSTEM_PROMPT parametrizado según el rol y la agencia del usuario
    const systemPrompt = getSystemPrompt({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      agencia: req.user.agencia
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((row, idx) => {
        const msg = {
          role: row.role,
          content: row.content
        };

        // Si es el último mensaje del usuario en el historial y se envió una imagen,
        // lo convertimos a formato multimodal para que la IA (como OpenAI/GPT-4o) la procese.
        if (row.role === 'user' && idx === history.length - 1 && imageBase64 && imageMime) {
          msg.content = [
            { type: 'text', text: row.content },
            { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } }
          ];
        }

        if (row.role === 'assistant' && row.tool_calls) {
          msg.tool_calls = typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls;
        }

        if (row.role === 'tool') {
          // Reconstruir tool_call_id y name desde el campo tool_result guardado
          const toolResult = typeof row.tool_result === 'string' ? JSON.parse(row.tool_result) : row.tool_result;
          if (toolResult) {
            msg.tool_call_id = toolResult.tool_call_id;
            msg.name = toolResult.name;
            // Para mensajes de tipo tool, el content debe ser la respuesta en string
            msg.content = typeof toolResult.result === 'string' ? toolResult.result : JSON.stringify(toolResult.result);
          }
        }

        return msg;
      })
    ];

    // Configurar herramientas según el rol de usuario para no darle acceso a herramientas restringidas
    const tools = [
      ...productToolDefinitions,
      ...reservationToolDefinitions
    ];

    if (req.user.role === 'admin') {
      tools.push(...userToolDefinitions);
    }

    const userContext = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      agencia: req.user.agencia
    };

    let loopCount = 0;
    const maxLoops = 5;
    let currentAIResponse = null;
    const executedToolsLog = [];

    // Loop de Function Calling (Bucle de Ejecución de Tools)
    while (loopCount < maxLoops) {
      loopCount++;

      console.log(`[Agente IA] Llamando a modelo IA (Iteración ${loopCount}). Cantidad de mensajes: ${messages.length}`);

      currentAIResponse = await aiServiceInstance.sendMessage(messages, {
        providerId,
        tools: tools
      });

      // Si la IA requiere llamar a una o más herramientas
      if (currentAIResponse.toolCalls && currentAIResponse.toolCalls.length > 0) {
        console.log(`[Agente IA] La IA solicitó ejecutar ${currentAIResponse.toolCalls.length} tool(s).`);

        // 1. Guardar mensaje del asistente que contiene las toolCalls en la base de datos
        await aiServiceInstance.saveMessage(
          currentSessionId,
          null,
          'assistant',
          currentAIResponse.content || '',
          currentAIResponse.toolCalls
        );

        // 2. Agregar al array en memoria para continuar la conversación con el proveedor de IA
        messages.push({
          role: 'assistant',
          content: currentAIResponse.content || '',
          tool_calls: currentAIResponse.toolCalls
        });

        // 3. Ejecutar cada una de las tools solicitadas
        for (const toolCall of currentAIResponse.toolCalls) {
          const toolName = toolCall.function.name;
          let args = {};
          try {
            args = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } catch (e) {
            console.error('[Agente IA] Error parseando argumentos:', e);
          }

          console.log(`[Agente IA] Ejecutando tool: ${toolName} con args:`, args);
          let result;

          try {
            // Ejecutar la herramienta en base a su categoría
            if (toolName.startsWith('search_products') || toolName.startsWith('get_product') || toolName.startsWith('create_product') || toolName.startsWith('update_product') || toolName.startsWith('search_availability')) {
              result = await executeProductTool(toolName, args, userContext);
            } else if (toolName.startsWith('search_reservations') || toolName.startsWith('get_reservation') || toolName.startsWith('create_reservation') || toolName.startsWith('update_reservation') || toolName.startsWith('confirm_reservation') || toolName.startsWith('cancel_reservation') || toolName.startsWith('check_availability')) {
              result = await executeReservationTool(toolName, args, userContext);
            } else if (toolName.startsWith('search_users') || toolName.startsWith('get_user') || toolName.startsWith('create_user') || toolName.startsWith('update_user') || toolName.startsWith('unlock_user') || toolName.startsWith('reset_user') || toolName.startsWith('get_user_stats')) {
              result = await executeUserTool(toolName, args, userContext);
            } else {
              result = { success: false, error: `Herramienta ${toolName} no implementada.` };
            }
          } catch (error) {
            console.error(`[Agente IA] Error ejecutando tool ${toolName}:`, error);
            result = { success: false, error: error.message };
          }

          // Registrar en el log que se ejecutó esta herramienta
          executedToolsLog.push({
            tool: toolName,
            arguments: args
          });

          // 4. Guardar respuesta del mensaje 'tool' en la base de datos
          // Mapeamos tool_call_id y name en tool_result para poder cargarlos adecuadamente
          await aiServiceInstance.saveMessage(
            currentSessionId,
            null,
            'tool',
            typeof result === 'string' ? result : JSON.stringify(result),
            null,
            { tool_call_id: toolCall.id, name: toolName, result: result }
          );

          // 5. Agregar la respuesta al historial en memoria
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          });
        }
      } else {
        // Si no hay toolCalls, guardamos la respuesta de texto final en la base de datos y terminamos
        console.log('[Agente IA] Respuesta final de texto generada por la IA.');
        await aiServiceInstance.saveMessage(
          currentSessionId,
          null,
          'assistant',
          currentAIResponse.content
        );
        break;
      }
    }

    res.status(200).json({
      sessionId: currentSessionId,
      message: currentAIResponse.content,
      // Retornamos el log de todas las tools ejecutadas en esta petición para el frontend
      toolCalls: executedToolsLog,
      usage: currentAIResponse.usage
    });
  } catch (error) {
    console.error('Error en chat IA:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener sesiones de chat del usuario
 * GET /api/ai/sessions
 */
export const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await aiServiceInstance.getUserSessions(userId);

    res.status(200).json({
      sessions
    });
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener historial de mensajes de una sesión
 * GET /api/ai/sessions/:id/messages
 */
export const getSessionMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que la sesión pertenece al usuario
    const sessionCheck = await query(
      `SELECT id FROM ai_chat_sessions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const history = await aiServiceInstance.getSessionHistory(id);

    res.status(200).json({
      messages: history
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Eliminar una sesión de chat
 * DELETE /api/ai/sessions/:id
 */
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await aiServiceInstance.deleteSession(id, userId);

    res.status(200).json({
      message: 'Sesión eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Actualizar título de sesión
 * PUT /api/ai/sessions/:id/title
 */
export const updateSessionTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const result = await query(
      `UPDATE ai_chat_sessions 
       SET title = $1, updated_at = NOW() 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, title`,
      [title, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.status(200).json({
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar título:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener lista de proveedores IA (solo admin)
 * GET /api/ai/providers
 */
export const getProviders = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, display_name, default_model, is_active, is_default, 
              temperature, max_tokens, created_at, updated_at
       FROM ai_providers 
       ORDER BY is_default DESC, name ASC`
    );

    // No devolver API keys en la respuesta
    const providers = result.rows.map(p => ({
      ...p,
      has_api_key: !!p.api_key_encrypted
    }));

    res.status(200).json({
      providers
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener un proveedor específico (solo admin)
 * GET /api/ai/providers/:id
 */
export const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, display_name, default_model, base_url, 
              is_active, is_default, temperature, max_tokens, created_at, updated_at
       FROM ai_providers 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const provider = result.rows[0];
    provider.has_api_key = !!provider.api_key_encrypted;

    res.status(200).json({
      provider
    });
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crear nuevo proveedor IA (solo admin)
 * POST /api/ai/providers
 */
export const createProvider = async (req, res) => {
  try {
    const {
      name,
      display_name,
      api_key,
      base_url,
      default_model,
      temperature,
      max_tokens,
      is_active,
      is_default
    } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Nombre y nombre para mostrar son requeridos' });
    }

    // Si es el proveedor por defecto, desactivar otros
    if (is_default) {
      await query(`UPDATE ai_providers SET is_default = false WHERE is_default = true`);
    }

    const result = await query(
      `INSERT INTO ai_providers (
        name, display_name, api_key_encrypted, base_url, 
        default_model, temperature, max_tokens, is_active, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, display_name, default_model, base_url, 
                is_active, is_default, temperature, max_tokens, created_at`,
      [
        name,
        display_name,
        api_key,
        base_url,
        default_model || 'gpt-4o',
        temperature || 0.7,
        max_tokens || 4096,
        is_active !== false,
        is_default || false
      ]
    );

    const provider = result.rows[0];
    provider.has_api_key = !!api_key;

    res.status(201).json({
      message: 'Proveedor creado correctamente',
      provider
    });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Actualizar proveedor IA (solo admin)
 * PUT /api/ai/providers/:id
 */
export const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      display_name,
      api_key,
      base_url,
      default_model,
      temperature,
      max_tokens,
      is_active,
      is_default
    } = req.body;

    // Si se establece como default, desactivar otros
    if (is_default) {
      await query(`UPDATE ai_providers SET is_default = false WHERE is_default = true AND id != $1`, [id]);
    }

    // Construir query dinámicamente para no sobrescribir API key si no se envía
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(display_name);
    }
    if (api_key !== undefined) {
      updates.push(`api_key_encrypted = $${paramIndex++}`);
      values.push(api_key);
    }
    if (base_url !== undefined) {
      updates.push(`base_url = $${paramIndex++}`);
      values.push(base_url);
    }
    if (default_model !== undefined) {
      updates.push(`default_model = $${paramIndex++}`);
      values.push(default_model);
    }
    if (temperature !== undefined) {
      updates.push(`temperature = $${paramIndex++}`);
      values.push(temperature);
    }
    if (max_tokens !== undefined) {
      updates.push(`max_tokens = $${paramIndex++}`);
      values.push(max_tokens);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`);
      values.push(is_default);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE ai_providers 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, name, display_name, default_model, base_url, 
                 is_active, is_default, temperature, max_tokens, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const provider = result.rows[0];
    provider.has_api_key = !!provider.api_key_encrypted;

    res.status(200).json({
      message: 'Proveedor actualizado correctamente',
      provider
    });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Eliminar proveedor IA (solo admin)
 * DELETE /api/ai/providers/:id
 */
export const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si es el proveedor por defecto
    const provider = await query(`SELECT is_default FROM ai_providers WHERE id = $1`, [id]);
    
    if (provider.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    if (provider.rows[0].is_default) {
      return res.status(400).json({ error: 'No se puede eliminar el proveedor por defecto' });
    }

    await query(`DELETE FROM ai_providers WHERE id = $1`, [id]);

    res.status(200).json({
      message: 'Proveedor eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Probar conexión con proveedor IA
 * POST /api/ai/providers/:id/test
 */
export const testProvider = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await aiServiceInstance.getProviderById(id);

    const testMessages = [
      { role: 'user', content: 'Responde brevemente: "Conexión exitosa"' }
    ];

    const response = await aiServiceInstance.sendMessage(testMessages, {
      providerId: provider.id
    });

    res.status(200).json({
      success: true,
      message: 'Conexión exitosa',
      response: response.content,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error al probar proveedor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Obtener acciones disponibles del agente IA
 * GET /api/ai/actions
 */
export const getActions = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description, category, endpoint, 
              method, parameters_schema, is_active, created_at
       FROM ai_actions 
       WHERE is_active = true
       ORDER BY name ASC`
    );

    res.status(200).json({
      actions: result.rows
    });
  } catch (error) {
    console.error('Error al obtener acciones:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Crear nueva acción para el agente IA (solo admin)
 * POST /api/ai/actions
 */
export const createAction = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      endpoint,
      method,
      parameters_schema,
      is_active
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Nombre y categoría son requeridos' });
    }

    const result = await query(
      `INSERT INTO ai_actions (
        name, description, category, endpoint, method, parameters_schema, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, category, endpoint, method, 
                parameters_schema, is_active, created_at`,
      [
        name,
        description,
        category,
        endpoint,
        method || 'GET',
        parameters_schema || {},
        is_active !== false
      ]
    );

    res.status(201).json({
      message: 'Acción creada correctamente',
      action: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear acción:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Actualizar acción del agente IA (solo admin)
 * PUT /api/ai/actions/:id
 */
export const updateAction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      endpoint,
      method,
      parameters_schema,
      is_active
    } = req.body;

    const result = await query(
      `UPDATE ai_actions 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           endpoint = COALESCE($4, endpoint),
           method = COALESCE($5, method),
           parameters_schema = COALESCE($6, parameters_schema),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, name, description, category, endpoint, method, 
                 parameters_schema, is_active, created_at, updated_at`,
      [name, description, category, endpoint, method, parameters_schema, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acción no encontrada' });
    }

    res.status(200).json({
      message: 'Acción actualizada correctamente',
      action: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar acción:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Eliminar acción del agente IA (solo admin)
 * DELETE /api/ai/actions/:id
 */
export const deleteAction = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`DELETE FROM ai_actions WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acción no encontrada' });
    }

    res.status(200).json({
      message: 'Acción eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar acción:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener estadísticas de uso del agente IA (solo admin)
 * GET /api/ai/stats
 */
export const getStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Total de sesiones
    const sessionsResult = await query(
      `SELECT COUNT(*) as total 
       FROM ai_chat_sessions 
       WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'`
    );

    // Total de mensajes
    const messagesResult = await query(
      `SELECT COUNT(*) as total 
       FROM ai_chat_messages 
       WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'`
    );

    // Total de tokens usados
    const tokensResult = await query(
      `SELECT 
         SUM((token_usage->>'prompt_tokens')::int) as prompt_tokens,
         SUM((token_usage->>'completion_tokens')::int) as completion_tokens,
         SUM((token_usage->>'total_tokens')::int) as total_tokens
       FROM ai_chat_messages 
       WHERE token_usage IS NOT NULL 
       AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`
    );

    // Uso por proveedor
    const providerUsageResult = await query(
      `SELECT 
         p.display_name as provider_name,
         COUNT(m.id) as message_count,
         SUM((m.token_usage->>'total_tokens')::int) as total_tokens
       FROM ai_chat_messages m
       JOIN ai_chat_sessions s ON m.session_id = s.id
       JOIN ai_providers p ON s.provider_id = p.id
       WHERE m.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY p.display_name
       ORDER BY message_count DESC`
    );

    res.status(200).json({
      stats: {
        total_sessions: parseInt(sessionsResult.rows[0].total),
        total_messages: parseInt(messagesResult.rows[0].total),
        tokens: tokensResult.rows[0],
        provider_usage: providerUsageResult.rows,
        period_days: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener logs de chat (solo admin)
 * GET /api/ai/logs
 */
export const getLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0, userId, sessionId } = req.query;

    let queryText = `
      SELECT 
        m.id,
        m.session_id,
        m.role,
        m.content,
        m.tool_calls,
        m.tool_result,
        m.token_usage,
        m.created_at,
        s.title as session_title,
        u.email as user_email
      FROM ai_chat_messages m
      JOIN ai_chat_sessions s ON m.session_id = s.id
      LEFT JOIN auth.users u ON s.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (userId) {
      queryText += ` AND s.user_id = $${paramIndex++}`;
      values.push(userId);
    }

    if (sessionId) {
      queryText += ` AND m.session_id = $${paramIndex++}`;
      values.push(sessionId);
    }

    queryText += ` ORDER BY m.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, values);

    // Count total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM ai_chat_messages m
      JOIN ai_chat_sessions s ON m.session_id = s.id
      WHERE 1=1
    `;

    const countValues = [];
    let countParamIndex = 1;

    if (userId) {
      countQuery += ` AND s.user_id = $${countParamIndex++}`;
      countValues.push(userId);
    }

    if (sessionId) {
      countQuery += ` AND m.session_id = $${countParamIndex++}`;
      countValues.push(sessionId);
    }

    const countResult = await query(countQuery, countValues);

    res.status(200).json({
      logs: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  chat,
  getSessions,
  getSessionMessages,
  deleteSession,
  updateSessionTitle,
  getProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  getActions,
  createAction,
  updateAction,
  deleteAction,
  getStats,
  getLogs
};