/**
 * Ventana de Chat IA - Estilo Vercel
 * Usa colores del diseño dinámicamente
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, RotateCcw, Settings, MessageSquarePlus, Bot, Maximize2 } from 'lucide-react';
import AIChatMessage from './AIChatMessage';
import AIChatInput from './AIChatInput';
import AIChatSessionsSidebar from './AIChatSessionsSidebar';
import ExpertPicker from './ExpertPicker';
import useAIChat from '../../hooks/useAIChat';
import { useAuth } from '../../contexts/AuthContext';
import { useAIPageContext } from '../../contexts/AIPageContext.jsx';

export default function AIChatWindow({ isOpen, onClose, onNewMessage }) {
    const { user, can } = useAuth();
    const navigate = useNavigate();
    const { pageContext, dispatchUIActions } = useAIPageContext();
    const [showSessions, setShowSessions] = useState(false);
    const messagesEndRef = useRef(null);

    const {
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
    } = useAIChat();

    // Cargar sesiones al abrir
    useEffect(() => {
        if (isOpen && sessions.length === 0) {
            loadSessions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Auto-scroll cuando hay nuevos mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSelectSession = (sessionId) => {
        loadSessionMessages(sessionId);
        setShowSessions(false);
    };

    const handleNewSessionClick = () => {
        handleNewSession();
        setShowSessions(false);
    };

    // Reacciona a lo que la IA haya pedido ejecutar en pantalla (navegar,
    // abrir el modal de reserva, completar el formulario de pasajeros) —
    // esta lógica vive acá (no en useAIChat) porque depende del router y del
    // contexto de pantalla, ninguno de los cuales le concierne al hook
    // compartido con la página de chat a pantalla completa.
    const handleAIResponse = (response) => {
        const navigateAction = (response.ui_actions || []).find((a) => a?.type === 'navigate' && a.payload?.path);
        if (navigateAction) {
            navigate(navigateAction.payload.path);
        }
        dispatchUIActions(response.ui_actions);
    };

    const handleExpand = () => {
        navigate(currentSessionId ? `/asistente?session=${currentSessionId}` : '/asistente');
    };

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
                        onClick={handleNewSessionClick}
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

                    {/* Expandir a pantalla completa */}
                    <button
                        onClick={handleExpand}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Expandir a pantalla completa"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Configuración (requiere permiso de IA) */}
                    {can('AI_UPDATE') && (
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

            {/* Selector de experto (solo si la agencia configuró alguno) */}
            <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <ExpertPicker selectedExpertId={selectedExpertId} onSelectExpert={setSelectedExpertId} compact />
            </div>

            {/* Panel de sesiones */}
            {showSessions && (
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 max-h-36 overflow-y-auto shrink-0">
                    <AIChatSessionsSidebar
                        sessions={sessions.slice(0, 5)}
                        currentSessionId={currentSessionId}
                        onSelectSession={handleSelectSession}
                        onDeleteSession={handleDeleteSession}
                        compact
                    />
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
                onSendMessage={(content, attachments) => handleSendMessage(content, attachments, {
                    onNewMessage,
                    pageContext,
                    onResponse: handleAIResponse,
                })}
                isLoading={isLoading || isTyping}
                placeholder="Escribe tu mensaje..."
            />
        </div>
    );
}
