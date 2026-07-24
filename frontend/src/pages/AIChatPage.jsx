/**
 * Página de chat de IA a pantalla completa — estilo ChatGPT/Claude.
 * Se monta FUERA del <Layout> general (sin sidebar/header del sistema) para
 * maximizar el espacio disponible; tiene su propio topbar con "Volver al
 * sistema de cupos" y una barra lateral con las conversaciones del usuario.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import AIChatTopbar from '../components/AIChat/AIChatTopbar';
import AIChatSessionsSidebar from '../components/AIChat/AIChatSessionsSidebar';
import AIChatMessage from '../components/AIChat/AIChatMessage';
import AIChatInput from '../components/AIChat/AIChatInput';
import Modal from '../components/Modal';
import AIService from '../services/aiService';
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

    const [experts, setExperts] = useState([]);
    // Por debajo de md el <aside> de agentes/conversaciones se oculta (no
    // entra junto al área de chat) y se accede vía un botón en el topbar que
    // lo abre en este modal — reusa el mismo contenido, solo cambia el
    // contenedor.
    const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);

    // Cargar expertos de la agencia para anclarlos al sidebar
    useEffect(() => {
        AIService.getExperts()
            .then((response) => setExperts((response.experts || []).filter(e => e.is_active)))
            .catch(() => setExperts([]));
    }, []);

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

    // Mantiene el ?session= de la URL sincronizado con la sesión activa
    useEffect(() => {
        if (currentSessionId && searchParams.get('session') !== currentSessionId) {
            setSearchParams({ session: currentSessionId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSessionId]);

    const handleSelectSession = (sessionId) => {
        loadSessionMessages(sessionId);
        setSearchParams({ session: sessionId });
        setMobileSessionsOpen(false);
    };

    const handleNewSessionClick = () => {
        handleNewSession();
        setSearchParams({});
        setMobileSessionsOpen(false);
    };

    const handleDeleteSessionClick = (sessionId, e) => {
        const wasCurrent = sessionId === currentSessionId;
        handleDeleteSession(sessionId, e);
        if (wasCurrent) setSearchParams({});
    };

    const activeExpert = selectedExpertId ? experts.find(e => e.id === selectedExpertId) : null;
    const isChatEmpty = messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');

    const getSuggestions = () => {
        if (activeExpert) {
            return [
                {
                    title: `Consultar ${activeExpert.name}`,
                    desc: `Pregúntame sobre el conocimiento cargado de ${activeExpert.name}.`,
                    text: `¿Qué información o manuales tienes cargados?`
                },
                {
                    title: "Ver regulaciones/FAQs",
                    desc: "Obtén los procedimientos detallados de este agente.",
                    text: "¿Cuáles son las directivas o políticas principales de tu conocimiento?"
                },
                {
                    title: "Ejecutar procedimiento",
                    desc: "Pídeme que te guíe en una tarea específica.",
                    text: "¿Qué procedimientos puedo consultar y cómo los aplico paso a paso?"
                }
            ];
        }
        return [
            {
                title: "Buscar cupos disponibles",
                desc: "Consultar disponibilidad de vuelos cargados.",
                text: "¿Qué cupos y vuelos hay disponibles para Cancún o Brasil?"
            },
            {
                title: "Crear una reserva",
                desc: "Reservar cupos indicando los datos de pasajeros.",
                text: "Quiero hacer una reserva individual para un vuelo."
            },
            {
                title: "Solicitar grupo (vuelo a medida)",
                desc: "Pedir cotización de un vuelo a medida grupal.",
                text: "Necesito cotizar un vuelo grupal para 15 personas."
            },
            {
                title: "Extraer datos de pasajero",
                desc: "Subir foto de DNI o Pasaporte para extraer datos.",
                text: "¿Cómo puedo usar la IA para leer los datos de un DNI o pasaporte?"
            }
        ];
    };

    // Contenido de "Agentes de IA" + "Conversaciones" — compartido entre el
    // <aside> de escritorio (siempre visible desde md) y el Modal que lo
    // reemplaza por debajo de md (donde no entra al lado del área de chat).
    const sessionsSidebarContent = (
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
                        {/* Agentes de IA */}
                        <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 px-2 mb-2">
                                Agentes de IA
                            </p>
                            <div className="space-y-1">
                                {/* Asistente General */}
                                <button
                                    onClick={() => {
                                        setSelectedExpertId(null);
                                        handleNewSessionClick();
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                                        selectedExpertId === null
                                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        selectedExpertId === null ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                    }`}>
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs truncate">Asistente general</p>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Soporte y reservas</p>
                                    </div>
                                </button>

                                {/* Lista de Expertos */}
                                {experts.map((exp) => {
                                    const isActive = selectedExpertId === exp.id;
                                    return (
                                        <button
                                            key={exp.id}
                                            onClick={() => {
                                                setSelectedExpertId(exp.id);
                                                handleNewSessionClick();
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                                                isActive
                                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                                                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 uppercase text-xs font-bold ${
                                                isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                            }`}>
                                                {exp.name.slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs truncate">{exp.name}</p>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-550 truncate">{exp.description || 'Experto de conocimiento'}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conversaciones del usuario */}
                        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                            <AIChatSessionsSidebar
                                sessions={sessions}
                                currentSessionId={currentSessionId}
                                onSelectSession={handleSelectSession}
                                onNewSession={handleNewSessionClick}
                                onDeleteSession={handleDeleteSessionClick}
                                onRenameSession={handleRenameSession}
                                compact={true}
                            />
                        </div>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
            <AIChatTopbar onOpenSessions={() => setMobileSessionsOpen(true)} />

            <div className="flex-1 flex flex-row overflow-hidden">
                {/* Barra lateral estilo ChatGPT (Agentes + Conversaciones) —
                    oculta por debajo de md, se accede desde el botón del topbar */}
                <aside className="hidden md:flex w-[290px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col justify-between overflow-hidden">
                    {sessionsSidebarContent}
                </aside>

                {/* Versión móvil: mismo contenido, dentro de un modal */}
                <Modal
                    title="Agentes y conversaciones"
                    open={mobileSessionsOpen}
                    onClose={() => setMobileSessionsOpen(false)}
                    size="sm"
                >
                    <div className="-m-4 sm:-m-6">{sessionsSidebarContent}</div>
                </Modal>

                {/* Área de chat */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header del Agente Activo */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                Agente activo: <span className="font-bold text-zinc-900 dark:text-white">{activeExpert ? activeExpert.name : 'Asistente general'}</span>
                            </p>
                        </div>
                        {activeExpert && (
                            <p className="hidden md:block text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-sm">
                                {activeExpert.description}
                            </p>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-6">
                        {isChatEmpty ? (
                            <div className="flex flex-col items-center justify-center text-center py-12 px-4 max-w-2xl mx-auto space-y-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                                    activeExpert ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                }`}>
                                    {activeExpert ? (
                                        <Sparkles className="w-7 h-7" />
                                    ) : (
                                        <Bot className="w-8 h-8" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                                        {activeExpert ? `Chatea con ${activeExpert.name}` : 'Asistente de IA'}
                                    </h2>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {activeExpert 
                                            ? (activeExpert.description || 'Agente de IA especializado con base de conocimiento propia.') 
                                            : 'Tu copiloto inteligente para buscar cupos, crear reservas, procesar DNI/pasaportes y resolver tus dudas del sistema.'
                                        }
                                    </p>
                                </div>

                                <div className="w-full pt-4">
                                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 text-left">
                                        Preguntas sugeridas
                                    </p>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-left">
                                        {getSuggestions().map((sug, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSendMessage(sug.text)}
                                                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all hover:scale-[1.01] active:scale-95 group shadow-2xs cursor-pointer"
                                            >
                                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {sug.title}
                                                </p>
                                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 leading-tight">
                                                    {sug.desc}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
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
                                                <div className="bg-zinc-100 dark:bg-zinc-850 rounded-xl rounded-tl-none px-4 py-3 border border-zinc-200 dark:border-zinc-700">
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
                        )}
                    </div>

                    <div className="max-w-3xl w-full mx-auto pb-4 px-4">
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
