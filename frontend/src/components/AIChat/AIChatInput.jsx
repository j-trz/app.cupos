/**
 * Input de Chat IA con auto-resize
 * Campo de entrada que crece automáticamente con el texto
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, Loader2 } from 'lucide-react';

export default function AIChatInput({ onSendMessage, isLoading, placeholder }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);
    const MIN_HEIGHT = 40;
    const MAX_HEIGHT = 120;

    // Auto-resize del textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${MIN_HEIGHT}px`;
            const scrollHeight = textarea.scrollHeight;
            const newHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
            textarea.style.height = `${newHeight}px`;
        }
    }, [message]);

    const handleSubmit = () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || isLoading) return;

        onSendMessage(trimmedMessage);
        setMessage('');

        // Resetear altura
        if (textareaRef.current) {
            textareaRef.current.style.height = `${MIN_HEIGHT}px`;
        }
    };

    const handleKeyDown = (e) => {
        // Enviar con Enter, nueva línea con Shift+Enter
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
                {/* Botón adjuntar (futuro) */}
                <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                    disabled={isLoading}
                    title="Adjuntar archivo (próximamente)"
                >
                    <Paperclip className="w-5 h-5" />
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || 'Escribe tu mensaje...'}
                        disabled={isLoading}
                        rows={1}
                        className="
              w-full resize-none 
              bg-gray-100 dark:bg-gray-700 
              border border-transparent
              focus:border-blue-500 focus:bg-white dark:focus:bg-gray-600
              rounded-2xl 
              px-4 py-2.5 
              text-sm text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              outline-none transition-colors
              disabled:opacity-50
              max-h-[120px] overflow-y-auto
            "
                        style={{ minHeight: `${MIN_HEIGHT}px` }}
                    />

                    {/* Indicador de IA */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Sparkles className={`w-4 h-4 ${message.trim() ? 'text-blue-500' : 'text-gray-400'}`} />
                    </div>
                </div>

                {/* Botón enviar */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!message.trim() || isLoading}
                    className="
            p-2.5 
            bg-blue-500 hover:bg-blue-600 
            disabled:bg-gray-300 dark:disabled:bg-gray-600
            text-white 
            rounded-full 
            transition-all duration-200
            disabled:cursor-not-allowed
            hover:scale-105 active:scale-95
            shadow-sm hover:shadow-md
          "
                    title="Enviar mensaje"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Sugerencias rápidas */}
            {!message && !isLoading && (
                <div className="mt-3 flex flex-wrap gap-2 max-w-4xl mx-auto">
                    <SuggestionButton
                        onClick={() => setMessage('¿Cuántas reservas hay hoy?')}
                        disabled={isLoading}
                    >
                        📊 Reservas de hoy
                    </SuggestionButton>
                    <SuggestionButton
                        onClick={() => setMessage('Buscar vuelos a Cancún para el próximo mes')}
                        disabled={isLoading}
                    >
                        ✈️ Vuelos a Cancún
                    </SuggestionButton>
                    <SuggestionButton
                        onClick={() => setMessage('Crear un nuevo producto')}
                        disabled={isLoading}
                    >
                        ➕ Nuevo producto
                    </SuggestionButton>
                </div>
            )}
        </div>
    );
}

/**
 * Botón de sugerencia rápida
 */
function SuggestionButton({ children, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="
        px-3 py-1.5 
        text-xs 
        bg-gray-100 dark:bg-gray-700
        hover:bg-gray-200 dark:hover:bg-gray-600
        text-gray-600 dark:text-gray-300
        rounded-full 
        border border-gray-200 dark:border-gray-600
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      "
        >
            {children}
        </button>
    );
}