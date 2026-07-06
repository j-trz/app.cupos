/**
 * Componente de Mensaje de Chat IA
 * Renderiza mensajes de usuario y asistente
 */

import { Bot, User, Copy, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function AIChatMessage({ message, isUser, timestamp, toolCalls, isError }) {
    const [copied, setCopied] = useState(false);

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
                className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser
                        ? 'bg-blue-500 text-white'
                        : isError
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
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
            rounded-2xl px-4 py-2.5 relative group
            ${isUser
                            ? 'bg-blue-500 text-white rounded-tr-none'
                            : isError
                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-none'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
                        }
          `}
                >
                    {/* Indicador de tool calls */}
                    {toolCalls && toolCalls.length > 0 && (
                        <div className={`text-xs mb-2 pb-2 border-b ${isUser ? 'border-blue-400' : 'border-gray-200 dark:border-gray-600'}`}>
                            <span className="opacity-70">
                                🔧 Ejecutando {toolCalls.length} acción{toolCalls.length > 1 ? 'es' : ''}...
                            </span>
                        </div>
                    )}

                    {/* Texto del mensaje */}
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message}
                    </div>

                    {/* Botón copiar (solo para mensajes del asistente) */}
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
        </div>
    );
}