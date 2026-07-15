/**
 * Página de chat de IA a pantalla completa — estilo ChatGPT/Claude.
 * Se monta FUERA del <Layout> general (sin sidebar/header del sistema) para
 * maximizar el espacio disponible; tiene su propio topbar con "Volver al
 * sistema de cupos" y una barra lateral con las conversaciones del usuario.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot } from 'lucide-react';
import AIChatTopbar from '../components/AIChat/AIChatTopbar';
import AIChatSessionsSidebar from '../components/AIChat/AIChatSessionsSidebar';
import AIChatMessage from '../components/AIChat/AIChatMessage';
import AIChatInput from '../components/AIChat/AIChatInput';
import ExpertPicker from '../components/AIChat/ExpertPicker';
import useAIChat from '../hooks/useAIChat';

export default function AIChatPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSessionId = searchParams.get('session') || null;
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
        handleRenameSession,
    } = useAIChat({ initialSessionId });

    // Al montar: si vino con ?session=, cargarla puntualmente y traer el
    // resto de la lista sin pisarla; si no, comportamiento habitual (abrir
    // la más reciente o el mensaje de bienvenida si no hay ninguna).
    useEffect(() => {
        if (initialSessionId) {
            loadSessionMessages(initialSessionId);
            loadSessions({ selectLatest: false });
        } else {
            loadSessions({ selectLatest: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Mantiene el ?session= de la URL sincronizado con la sesión activa —
    // cubre el caso de que se cree una sesión nueva recién al enviar el
    // primer mensaje (currentSessionId cambia sin que medie una selección
    // explícita del usuario, que es lo único que actualizaba la URL antes).
    useEffect(() => {
        if (currentSessionId && searchParams.get('session') !== currentSessionId) {
            setSearchParams({ session: currentSessionId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSessionId]);

    const handleSelectSession = (sessionId) => {
        loadSessionMessages(sessionId);
        setSearchParams({ session: sessionId });
    };

    const handleNewSessionClick = () => {
        handleNewSession();
        setSearchParams({});
    };

    const handleDeleteSessionClick = (sessionId, e) => {
        const wasCurrent = sessionId === currentSessionId;
        handleDeleteSession(sessionId, e);
        if (wasCurrent) setSearchParams({});
    };

    return (
        <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
            <AIChatTopbar />

            <div className="flex-1 flex flex-row overflow-hidden">
                {/* Barra lateral de conversaciones */}
                <aside className="w-[280px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
                    <AIChatSessionsSidebar
                        sessions={sessions}
                        currentSessionId={currentSessionId}
                        onSelectSession={handleSelectSession}
                        onNewSession={handleNewSessionClick}
                        onDeleteSession={handleDeleteSessionClick}
                        onRenameSession={handleRenameSession}
                    />
                </aside>

                {/* Área de chat */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-end px-4 pt-3">
                        <ExpertPicker selectedExpertId={selectedExpertId} onSelectExpert={setSelectedExpertId} />
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                        <div className="max-w-3xl mx-auto space-y-4">
                            {isLoading && messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full min-h-[300px]">
                                    <div className="w-10 h-10 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin"></div>
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

                                    {error && (
                                        <div className="text-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-800">
                                            {error}
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="max-w-3xl w-full mx-auto">
                        <AIChatInput
                            onSendMessage={(content, attachments) => handleSendMessage(content, attachments)}
                            isLoading={isLoading || isTyping}
                            placeholder="Escribe tu mensaje..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
