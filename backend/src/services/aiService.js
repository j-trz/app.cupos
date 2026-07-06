/**
 * Servicio de Inteligencia Artificial - Multi-proveedor
 * Soporta: OpenAI, Anthropic, Google AI, Azure OpenAI, Local Models
 */

import { query } from '../db.js';

class AIService {
  constructor() {
    this.providers = {
      openai: this.callOpenAI.bind(this),
      anthropic: this.callAnthropic.bind(this),
      google: this.callGoogle.bind(this),
      azure: this.callAzure.bind(this),
      local: this.callLocal.bind(this)
    };
  }

  /**
   * Obtener el proveedor activo por defecto
   */
  async getActiveProvider() {
    const result = await query(
      `SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Si no hay proveedor por defecto, obtener el primero activo
      const fallback = await query(
        `SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1`
      );
      if (fallback.rows.length === 0) {
        throw new Error('No hay proveedores de IA configurados');
      }
      return fallback.rows[0];
    }

    return result.rows[0];
  }

  /**
   * Obtener proveedor por ID o nombre
   */
  async getProviderById(providerId) {
    const result = await query(
      `SELECT * FROM ai_providers WHERE id = $1 OR name = $1 LIMIT 1`,
      [providerId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Proveedor no encontrado: ${providerId}`);
    }

    return result.rows[0];
  }

  /**
   * Enviar mensaje al proveedor de IA
   */
  async sendMessage(messages, options = {}) {
    const { providerId, tools, temperature, maxTokens } = options;

    // Obtener proveedor
    const provider = providerId
      ? await this.getProviderById(providerId)
      : await this.getActiveProvider();

    if (!provider.api_key_encrypted && provider.name !== 'local') {
      throw new Error(`API key no configurada para el proveedor: ${provider.name}`);
    }

    // Llamar al proveedor correspondiente
    const providerFunction = this.providers[provider.name];
    if (!providerFunction) {
      throw new Error(`Proveedor no soportado: ${provider.name}`);
    }

    const config = {
      model: provider.default_model,
      temperature: temperature || provider.temperature || 0.7,
      maxTokens: maxTokens || provider.max_tokens || 4096,
      tools: tools || []
    };

    return await providerFunction(provider, messages, config);
  }

  /**
   * Llamada a OpenAI API
   */
  async callOpenAI(provider, messages, config) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.api_key_encrypted}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        tools: config.tools.length > 0 ? config.tools : undefined
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls || [],
      usage: data.usage
    };
  }

  /**
   * Llamada a Anthropic API
   */
  async callAnthropic(provider, messages, config) {
    // Convertir formato de mensajes para Anthropic
    const anthropicMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.api_key_encrypted,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        messages: anthropicMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || '',
      toolCalls: [],
      usage: data.usage
    };
  }

  /**
   * Llamada a Google AI (Gemini)
   */
  async callGoogle(provider, messages, config) {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `${provider.base_url}/models/${config.model}:generateContent?key=${provider.api_key_encrypted}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google AI Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      toolCalls: [],
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount,
        completion_tokens: data.usageMetadata?.candidatesTokenCount,
        total_tokens: data.usageMetadata?.totalTokenCount
      }
    };
  }

  /**
   * Llamada a Azure OpenAI
   */
  async callAzure(provider, messages, config) {
    const endpoint = provider.base_url;
    const deployment = config.model;
    const apiVersion = '2024-02-15-preview';

    const response = await fetch(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': provider.api_key_encrypted
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          temperature: config.temperature,
          max_tokens: config.maxTokens
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Azure OpenAI Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls || [],
      usage: data.usage
    };
  }

  /**
   * Llamada a modelo local (simulado - requiere implementación específica)
   */
  async callLocal(provider, messages, config) {
    // Implementación básica para modelos locales (Ollama, LM Studio, etc.)
    const endpoint = provider.base_url || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          stream: false,
          options: {
            temperature: config.temperature
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Local Model Error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        toolCalls: [],
        usage: {
          prompt_tokens: data.prompt_eval_count,
          completion_tokens: data.eval_count,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (error) {
      throw new Error(`Error conectando al modelo local: ${error.message}`);
    }
  }

  /**
   * Guardar sesión de chat
   */
  async createSession(userId, title = 'Nueva conversación') {
    const result = await query(
      `INSERT INTO ai_chat_sessions (user_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, title]
    );

    return result.rows[0];
  }

  /**
   * Guardar mensaje en la base de datos
   */
  async saveMessage(sessionId, userId, role, content, toolCalls = null, toolResult = null) {
    const result = await query(
      `INSERT INTO ai_chat_messages (session_id, user_id, role, content, tool_calls, tool_result)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sessionId, userId, role, content, JSON.stringify(toolCalls), JSON.stringify(toolResult)]
    );

    return result.rows[0];
  }

  /**
   * Obtener historial de una sesión
   */
  async getSessionHistory(sessionId) {
    const result = await query(
      `SELECT * FROM ai_chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return result.rows;
  }

  /**
   * Obtener todas las sesiones de un usuario
   */
  async getUserSessions(userId) {
    const result = await query(
      `SELECT s.*, COUNT(m.id) as message_count
       FROM ai_chat_sessions s
       LEFT JOIN ai_chat_messages m ON s.id = m.session_id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Eliminar sesión
   */
  async deleteSession(sessionId, userId) {
    const result = await query(
      `DELETE FROM ai_chat_sessions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [sessionId, userId]
    );

    return result.rows.length > 0;
  }
}

export default new AIService();
