/**
 * Ventana de Chat IA
 * Contenedor principal del chat que integra mensajes e input
 */

import { useState, useEffect, useRef } from 'react';
import { X, Minus, RotateCcw, Settings, Trash2, MessageSquarePlus } from 'lucide-react';
import AIService from '../../services/aiService';
import AIChatMessage from './AIChatMessage';
import AIChatInput from './AIChatInput';
import { useAuth } from '../../contexts/AuthContext';

export default function AIChatWindow({ isOpen, onClose, onNewMessage }) {
    const { user } = useAuth();
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

    const handleSendMessage = async (content) => {
        // Agregar mensaje del usuario inmediatamente
        const userMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        setError(null);

        try {
            const response = await AIService.sendMessage(content, currentSessionId);

            // Actualizar ID de sesión si es nueva
            if (!currentSessionId && response.sessionId) {
                setCurrentSessionId(response.sessionId);
                loadSessions(); // Recargar lista de sesiones
            }

            // Agregar respuesta del asistente
            const assistantMessage = {
                id: response.id || `resp-${Date.now()}`,
                role: 'assistant',
                content: response.message,
                toolCalls: response.toolCalls,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Notificar al widget padre
            if (onNewMessage) {
                onNewMessage(response.message);
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

    return (
        <div className="w-[400px] h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-lg">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Asistente IA</h3>
                        <p className="text-xs text-white/70">
                            {isTyping ? 'Escribiendo...' : 'En línea'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Nueva conversación */}
                    <button
                        onClick={handleNewSession}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Nueva conversación"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                    </button>

                    {/* Historial */}
                    <button
                        onClick={() => setShowSessions(!showSessions)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Historial de conversaciones"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Configuración (solo admin) */}
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => window.location.href = '/config-ia'}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Configuración IA"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    )}

                    {/* Minimizar */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Minimizar"
                    >
                        <Minus className="w-4 h-4" />
                    </button>

                    {/* Cerrar */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Panel de sesiones */}
            {showSessions && (
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 max-h-40 overflow-y-auto">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 px-2 py-1">Conversaciones recientes</p>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-gray-400 px-2 py-3 text-center">Sin conversaciones</p>
                        ) : (
                            sessions.slice(0, 5).map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSessionMessages(session.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="text-sm truncate flex-1">
                                        {session.title || 'Nueva conversación'}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {isLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                            />
                        ))}

                        {/* Indicador de escritura */}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-sm">🤖</span>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="text-center text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                {error}
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