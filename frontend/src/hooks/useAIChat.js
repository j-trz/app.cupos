/**
 * Estado y acciones del chat de IA (sesiones, mensajes, envío) — compartido
 * entre el widget flotante (AIChatWindow) y la página de chat a pantalla
 * completa (AIChatPage), para no duplicar esta lógica entre ambos.
 */

import { useState, useCallback } from 'react';
import AIService from '../services/aiService';

const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant',
    content: '¡Hola! 👋 Soy tu asistente de IA para Gestión de Cupos. Puedo ayudarte a:\n\n• Buscar y gestionar reservas\n• Consultar disponibilidad de vuelos y productos\n• Crear nuevos productos\n• Obtener estadísticas\n• Y mucho más...\n\n¿En qué puedo ayudarte hoy?',
    created_at: new Date().toISOString(),
};

export default function useAIChat({ initialSessionId = null } = {}) {
    const [messages, setMessages] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [selectedExpertId, setSelectedExpertId] = useState(null);

    const loadSessionMessages = useCallback(async (sessionId) => {
        try {
            setIsLoading(true);
            setCurrentSessionId(sessionId);
            const response = await AIService.getSessionMessages(sessionId);
            setMessages(response.messages || []);
        } catch (err) {
            console.error('Error al cargar mensajes:', err);
            setError('No se pudieron cargar los mensajes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // selectLatest: si no hay sesión activa, abre automáticamente la más
    // reciente de la lista (comportamiento histórico del widget). La página
    // a pantalla completa lo desactiva cuando ya vino con un ?session= propio.
    // Además de `selectLatest`, siempre se exige que no haya ya una sesión
    // activa (`!currentSessionId`) — así el salto automático nunca puede
    // pisar una conversación que el usuario ya tiene abierta, sin depender
    // de que cada caller recuerde pasar `selectLatest: false` correctamente.
    const loadSessions = useCallback(async ({ selectLatest = true } = {}) => {
        try {
            const response = await AIService.getSessions();
            const list = response.sessions || [];
            setSessions(list);

            if (selectLatest && !currentSessionId && list.length > 0) {
                await loadSessionMessages(list[0].id);
            } else if (list.length === 0) {
                setMessages([WELCOME_MESSAGE]);
            }
        } catch (err) {
            console.error('Error al cargar sesiones:', err);
            setError('No se pudieron cargar las sesiones de chat');
        }
    }, [loadSessionMessages, currentSessionId]);

    const handleNewSession = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([{ ...WELCOME_MESSAGE, created_at: new Date().toISOString() }]);
    }, []);

    // options: { onNewMessage, pageContext, onResponse }
    // - onNewMessage(content): se llama con el texto de la respuesta, para
    //   que el widget flotante actualice su badge de "no leído".
    // - pageContext: contexto efímero de la pantalla actual (ver
    //   AIPageContext.jsx) — se reenvía tal cual al backend para que la IA
    //   pueda responder sobre lo que el usuario ve y resolver referencias
    //   posicionales ("la primera opción").
    // - onResponse(response): se llama con la respuesta cruda del backend
    //   ANTES de tocar el estado de mensajes, para que el llamador pueda
    //   reaccionar a cosas ajenas al chat en sí (ej. `response.ui_actions` —
    //   navegar de pantalla, abrir un modal) sin que este hook tenga que
    //   saber nada de React Router ni del contexto de pantalla.
    const handleSendMessage = useCallback(async (content, attachments = [], options = {}) => {
        const { onNewMessage, pageContext, onResponse } = options;
        const activeAttachments = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);

        const userMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content,
            imagePreview: activeAttachments[0]?.dataUrl || null,
            imagePreviews: activeAttachments.map(img => img.dataUrl),
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        setError(null);

        try {
            const response = await AIService.sendMessage(content, currentSessionId, activeAttachments, null, selectedExpertId, pageContext);

            if (onResponse) {
                onResponse(response);
            }

            if (!currentSessionId && response.sessionId) {
                setCurrentSessionId(response.sessionId);
                loadSessions();
            }

            const responseContent = response.content || response.message || '';
            const assistantMessage = {
                id: response.id || `resp-${Date.now()}`,
                role: 'assistant',
                content: responseContent,
                // El backend devuelve tool_calls (snake_case); antes se leía
                // toolCalls (camelCase) acá y siempre llegaba undefined en el
                // turno recién enviado — el resultado de las tools solo se
                // veía si se recargaba la sesión desde el historial guardado.
                toolCalls: response.tool_calls || response.toolCalls,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, assistantMessage]);

            if (onNewMessage && responseContent) {
                onNewMessage(responseContent);
            }
        } catch (err) {
            console.error('Error al enviar mensaje:', err);
            setError(err.message || 'Error al comunicarse con la IA');
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor intenta de nuevo.',
                isError: true,
                created_at: new Date().toISOString(),
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [currentSessionId, loadSessions, selectedExpertId]);

    const handleDeleteSession = useCallback(async (sessionId, e) => {
        e?.stopPropagation?.();
        if (!confirm('¿Eliminar esta conversación?')) return;

        try {
            await AIService.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));

            if (currentSessionId === sessionId) {
                handleNewSession();
            }
        } catch (err) {
            console.error('Error al eliminar sesión:', err);
        }
    }, [currentSessionId, handleNewSession]);

    const handleRenameSession = useCallback(async (sessionId, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        try {
            await AIService.updateSessionTitle(sessionId, trimmed);
            setSessions(prev => prev.map(s => (s.id === sessionId ? { ...s, title: trimmed } : s)));
        } catch (err) {
            console.error('Error al renombrar sesión:', err);
        }
    }, []);

    return {
        messages,
        sessions,
        currentSessionId,
        isLoading,
        isTyping,
        error,
        selectedExpertId,
        setSelectedExpertId,
        loadSessions,
        loadSessionMessages,
        handleNewSession,
        handleSendMessage,
        handleDeleteSession,
        handleRenameSession,
    };
}
