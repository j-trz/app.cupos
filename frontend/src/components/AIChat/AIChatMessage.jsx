import { Bot, User, Copy, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

export default function AIChatMessage({ message, isUser, timestamp, toolCalls, isError }) {
    const [copied, setCopied] = useState(false);
    const { config } = useWhiteLabel();

    // Colores dinámicos desde WhiteLabelContext
    const primaryColor = config?.colors?.primary || '#3b82f6';
    const textPrimary = config?.colors?.text_primary || '#0f172a';
    const textSecondary = config?.colors?.text_secondary || '#64748b';
    const surfaceColor = config?.colors?.surface || '#ffffff';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
                    ${isUser
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : isError
                            ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    }
        `}
            >
                {isUser ? (
                    <User className="w-4 h-4" />
                ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                ) : (
                    <Bot className="w-4 h-4" />
                )}
            </div>

            {/* Contenido del mensaje */}
            <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                    className={`
            rounded-xl px-4 py-2.5 relative group border transition-colors
            ${isUser
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent rounded-tr-none'
                            : isError
                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-none dark:bg-red-900/20 dark:border-red-800'
                                : 'bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 rounded-tl-none'
                        }
          `}
                >
                    {/* Indicador de tool calls */}
                    {toolCalls && toolCalls.length > 0 && (
                        <div className={`text-xs mb-2 pb-2 border-b flex items-center gap-1.5 ${isUser ? 'border-white/20' : 'border-zinc-200 dark:border-zinc-800'}`}>
                            <Sparkles className="w-3 h-3 opacity-70" />
                            <span className="opacity-70">
                                Ejecutando {toolCalls.length} acción{toolCalls.length > 1 ? 'es' : ''}...
                            </span>
                        </div>
                    )}

                    {/* Texto del mensaje */}
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message}
                    </div>

                    {/* Footer del mensaje con time y copy button */}
                    {!isUser && (
                        <div className="mt-2 flex items-center justify-between pt-2">
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                {formatTime(timestamp)}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                                title="Copiar mensaje"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                    )}
                </div>
                {!isUser && (
                    <button
                        onClick={handleCopy}
                        className="absolute -bottom-8 left-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copiar mensaje"
                    >
                        {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                            <Copy className="w-3.5 h-3.5" />
                        )}
                    </button>
                )}
            </div>

            {/* Timestamp */}
            {timestamp && (
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {formatTime(timestamp)}
                </span>
            )}
        </div>
    );
}