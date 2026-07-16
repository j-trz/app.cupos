import { Bot, User, Copy, Check, AlertCircle, Sparkles, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIChatItineraryResult from './AIChatItineraryResult';

// Componentes de Markdown para la respuesta del asistente: la burbuja de
// chat es angosta (max-w-[78%]), así que los headers/listas de un artículo
// largo se ven exagerados acá — se estilizan más chicos y compactos que el
// default de un renderer de Markdown pensado para una página.
const MARKDOWN_COMPONENTS = {
    h1: ({ children }) => <h1 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-[13px] font-semibold mt-1.5 mb-1 first:mt-0">{children}</h3>,
    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mb-1.5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mb-1.5 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="pl-0.5">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    a: ({ children, href }) => (
        <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-blue-600 dark:text-blue-400 hover:text-blue-500">
            {children}
        </a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-zinc-300 dark:border-zinc-600 pl-2 my-1.5 text-zinc-600 dark:text-zinc-400">
            {children}
        </blockquote>
    ),
    // react-markdown v9+ ya no manda un prop "inline" al componente code —
    // se infiere: un bloque con ``` viene con className "language-xxx" (aunque
    // no tenga lenguaje declarado, su contenido de texto igual trae un \n
    // final), mientras que un span inline de una sola línea nunca lo tiene.
    code: ({ className, children }) => {
        const isBlock = /language-/.test(className || '') || String(children).includes('\n');
        return isBlock ? (
            <code className="font-mono text-[13px]">{children}</code>
        ) : (
            <code className="bg-zinc-200 dark:bg-zinc-700 rounded px-1 py-0.5 font-mono text-[13px]">{children}</code>
        );
    },
    pre: ({ children }) => (
        <pre className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 my-1.5 overflow-x-auto">
            {children}
        </pre>
    ),
    hr: () => <hr className="my-2 border-zinc-200 dark:border-zinc-700" />,
    table: ({ children }) => (
        <div className="overflow-x-auto my-1.5">
            <table className="text-[13px] border-collapse">{children}</table>
        </div>
    ),
    th: ({ children }) => <th className="border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border border-zinc-300 dark:border-zinc-600 px-2 py-1">{children}</td>,
};

const TOOL_LABELS = {
    buscar_productos:  '🔍 Buscando productos',
    mis_reservas:      '📋 Consultando tus reservas',
    todas_reservas:    '📋 Consultando todas las reservas',
    crear_reserva:     '➕ Creando reserva',
    detalle_reserva:   '📄 Obteniendo detalle',
    confirmar_reserva: '✅ Confirmando reserva',
    cancelar_reserva:  '🗑️ Cancelando reserva',
    estadisticas:      '📊 Cargando estadísticas',
    buscar_usuarios:   '👤 Buscando usuarios',
    generar_itinerario_pdf: '🧾 Generando itinerario',
    detalle_ruta:           '🗺️ Obteniendo detalle de ruta',
    consultar_experto:      '🧠 Consultando a un experto',
};

export default function AIChatMessage({ message, isUser, timestamp, toolCalls, isError, imagePreview, imagePreviews }) {
    const [copied, setCopied] = useState(false);
    const [showTools, setShowTools] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (_) {}
    };

    const formatTime = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs
                ${isUser
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : isError
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                        : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                }`}>
                {isUser ? <User className="w-3.5 h-3.5" /> : isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Burbuja */}
            <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-end' : 'items-start'} gap-1`}>

                {/* Imágenes adjuntas (si el usuario subió varias) */}
                {imagePreviews && imagePreviews.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-end mb-1 max-w-[280px]">
                        {imagePreviews.map((img, idx) => (
                            <img
                                key={idx}
                                src={img}
                                alt={`documento-${idx}`}
                                className="rounded-lg w-16 h-16 object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm"
                            />
                        ))}
                    </div>
                ) : imagePreview ? (
                    <img
                        src={imagePreview}
                        alt="documento"
                        className="rounded-lg max-w-[180px] max-h-[120px] object-cover border border-zinc-200 dark:border-zinc-700 mb-1"
                    />
                ) : null}

                <div className={`rounded-xl px-3 py-2 text-sm border
                    ${isUser
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent rounded-tr-none'
                        : isError
                            ? 'bg-red-50 text-red-700 border-red-200 rounded-tl-none dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                            : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 rounded-tl-none'
                    }`}>

                    {/* Tool calls ejecutados */}
                    {toolCalls && toolCalls.length > 0 && (
                        <div className="mb-2">
                            <button
                                type="button"
                                onClick={() => setShowTools(p => !p)}
                                className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <Wrench className="w-3 h-3" />
                                <span>{toolCalls.length} acción{toolCalls.length > 1 ? 'es' : ''} ejecutada{toolCalls.length > 1 ? 's' : ''}</span>
                                {showTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {showTools && (
                                <div className="mt-1.5 space-y-1">
                                    {toolCalls.map((tc, i) => (
                                        <div key={i} className="text-[11px] bg-zinc-100 dark:bg-zinc-700/50 rounded-lg px-2 py-1 text-zinc-600 dark:text-zinc-400 font-mono">
                                            {TOOL_LABELS[tc.tool] || tc.tool}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Texto */}
                    {isUser ? (
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{message}</div>
                    ) : (
                        <div className="break-words leading-relaxed [&>*:last-child]:mb-0">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                                {message}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Resultado enriquecido de tools de itinerario (si corresponde) */}
                    {!isUser && <AIChatItineraryResult toolCalls={toolCalls} />}

                    {/* Footer */}
                    {!isUser && (
                        <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{formatTime(timestamp)}</span>
                            <button
                                onClick={handleCopy}
                                className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                title="Copiar"
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
