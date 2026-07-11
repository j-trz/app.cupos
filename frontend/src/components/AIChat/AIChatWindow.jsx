/**
 * Ventana de Chat IA - Estilo Vercel
 * Usa colores del diseño dinámicamente
 */

import { useState, useEffect, useRef } from 'react';
import { X, Minus, RotateCcw, Settings, Trash2, MessageSquarePlus, Bot } from 'lucide-react';
import AIService from '../../services/aiService';
import AIChatMessage from './AIChatMessage';
import AIChatInput from './AIChatInput';
import { useAuth } from '../../contexts/AuthContext';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';
import { useAIPageContext } from '../../contexts/AIPageContext.jsx';

export default function AIChatWindow({ isOpen, onClose, onNewMessage }) {
    const { user } = useAuth();
    const { pageContext, dispatchUIActions } = useAIPageContext();
    const [messages, setMessages] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);
    const [showSessions, setShowSessions] = useState(false);
    const messagesEndRef = useRef(null);

    // Cargar sesiones al abrir
    useEffect(() => {
        if (isOpen && sessions.length === 0) {
            loadSessions();
        }
    }, [isOpen]);

    // Auto-scroll cuando hay nuevos mensajes
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadSessions = async () => {
        try {
            const response = await AIService.getSessions();
            setSessions(response.sessions || []);

            // Si hay sesiones, cargar la más reciente
            if (response.sessions?.length > 0 && !currentSessionId) {
                const latestSession = response.sessions[0];
                loadSessionMessages(latestSession.id);
            } else if (response.sessions?.length === 0) {
                // Mensaje de bienvenida
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: '¡Hola! 👋 Soy tu asistente de IA para Gestión de Cupos. Puedo ayudarte a:\n\n• Buscar y gestionar reservas\n• Consultar disponibilidad de vuelos y productos\n• Crear nuevos productos\n• Obtener estadísticas\n• Y mucho más...\n\n¿En qué puedo ayudarte hoy?',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (err) {
            console.error('Error al cargar sesiones:', err);
            setError('No se pudieron cargar las sesiones de chat');
        }
    };

    const loadSessionMessages = async (sessionId) => {
        try {
            setIsLoading(true);
            setCurrentSessionId(sessionId);
            const response = await AIService.getSessionMessages(sessionId);
            setMessages(response.messages || []);
            setShowSessions(false);
        } catch (err) {
            console.error('Error al cargar mensajes:', err);
            setError('No se pudieron cargar los mensajes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewSession = () => {
        setCurrentSessionId(null);
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! 👋 Soy tu asistente de IA para Gestión de Cupos. ¿En qué puedo ayudarte hoy?',
            created_at: new Date().toISOString()
        }]);
        setShowSessions(false);
    };

    const handleSendMessage = async (content, attachments = []) => {
        // Normalizar los adjuntos para asegurar que sea un arreglo
        const activeAttachments = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);

        // Agregar mensaje del usuario inmediatamente
        const userMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content,
            imagePreview: activeAttachments[0]?.dataUrl || null, // Retrocompatibilidad
            imagePreviews: activeAttachments.map(img => img.dataUrl), // Soporte para múltiples adjuntos
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        setError(null);

        try {
            const response = await AIService.sendMessage(
                content,
                currentSessionId,
                activeAttachments,
                null,
                pageContext
            );

            // Ejecutar en pantalla lo que la IA haya pedido (abrir el modal
            // de reserva, completar el formulario de pasajeros) — si el
            // usuario ya no está en la pantalla que registró esos handlers,
            // dispatchUIActions simplemente no hace nada.
            dispatchUIActions(response.ui_actions);

            // Actualizar ID de sesión si es nueva
            if (!currentSessionId && response.sessionId) {
                setCurrentSessionId(response.sessionId);
                loadSessions(); // Recargar lista de sesiones
            }

            // Agregar respuesta del asistente
            const responseContent = response.content || response.message || '';
            const assistantMessage = {
                id: response.id || `resp-${Date.now()}`,
                role: 'assistant',
                content: responseContent,
                toolCalls: response.toolCalls,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Notificar al widget padre (para el badge)
            if (onNewMessage && responseContent) {
                onNewMessage(responseContent);
            }
        } catch (err) {
            console.error('Error al enviar mensaje:', err);
            setError(err.message || 'Error al comunicarse con la IA');

            // Agregar mensaje de error
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor intenta de nuevo.',
                isError: true,
                created_at: new Date().toISOString()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleDeleteSession = async (sessionId, e) => {
        e.stopPropagation();
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
    };

    const { config } = useWhiteLabel();

    // Colores dinámicos desde WhiteLabelContext
    const primaryColor = config?.colors?.primary || '#3b82f6';
    const surfaceColor = config?.colors?.surface || '#ffffff';
    const backgroundColor = config?.colors?.background || '#fafafa';

    return (
        <div className="w-[380px] h-[580px] bg-white dark:bg-zinc-900 rounded-xl shadow-xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {/* Header - Estilo Vercel minimalista */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Asistente IA</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {isTyping ? 'Escribiendo...' : 'En línea'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Nueva conversación */}
                    <button
                        onClick={handleNewSession}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Nueva conversación"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                    </button>

                    {/* Historial */}
                    <button
                        onClick={() => setShowSessions(!showSessions)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Historial de conversaciones"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Configuración (solo admin) */}
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => window.location.href = '/config-ia'}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            title="Configuración IA"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}

                    {/* Minimizar */}
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Minimizar"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Panel de sesiones */}
            {showSessions && (
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 max-h-36 overflow-y-auto shrink-0">
                    <div className="p-2">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-1">Conversaciones recientes</p>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-zinc-400 px-2 py-3 text-center">Sin conversaciones</p>
                        ) : (
                            sessions.slice(0, 5).map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSessionMessages(session.id)}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors my-0.5 ${currentSessionId === session.id
                                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                        }`}
                                >
                                    <span className="text-sm truncate flex-1">
                                        {session.title || 'Nueva conversación'}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-600 rounded-md transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-zinc-900">
                {isLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[200px]">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <AIChatMessage
                                key={msg.id}
                                message={msg.content}
                                isUser={msg.role === 'user'}
                                timestamp={msg.created_at}
                                toolCalls={msg.tool_calls || msg.toolCalls}
                                isError={msg.isError}
                                imagePreview={msg.imagePreview}
                                imagePreviews={msg.imagePreviews}
                            />
                        ))}

                        {/* Indicador de escritura */}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
                                </div>
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl rounded-tl-none px-4 py-3 border border-zinc-200 dark:border-zinc-700">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="text-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        {!isTyping && messages.length === 0 && (
                            <div className="flex items-center justify-center h-full min-h-[200px] text-center">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mb-3 mx-auto">
                                        <Bot className="w-6 h-6 text-white dark:text-zinc-900" />
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Soy tu asistente IA. ¿En qué puedo ayudarte hoy?
                                    </p>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <AIChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading || isTyping}
                placeholder="Escribe tu mensaje..."
            />
        </div>
    );
}