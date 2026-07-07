import { Bot, User, Copy, Check, AlertCircle, Sparkles, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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
};

export default function AIChatMessage({ message, isUser, timestamp, toolCalls, isError, imagePreview }) {
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

                {/* Imagen adjunta (si el usuario subió una) */}
                {imagePreview && (
                    <img
                        src={imagePreview}
                        alt="documento"
                        className="rounded-lg max-w-[180px] max-h-[120px] object-cover border border-zinc-200 dark:border-zinc-700 mb-1"
                    />
                )}

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
                    <div className="whitespace-pre-wrap break-words leading-relaxed">{message}</div>

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
