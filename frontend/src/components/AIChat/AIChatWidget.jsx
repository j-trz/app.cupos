/**
 * Widget flotante de Chat IA
 * Botón que abre/cierra la ventana de chat
 */

import { useState, useEffect } from 'react';
import { MessageSquare, X, Bot, Loader2 } from 'lucide-react';
import AIChatWindow from './AIChatWindow';

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastMessage, setLastMessage] = useState(null);

    // Cargar último mensaje no leído
    useEffect(() => {
        if (!isOpen && lastMessage) {
            setUnreadCount(prev => prev + 1);
        }
    }, [lastMessage, isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
            setIsLoaded(true);
        }
    };

    const handleNewMessage = (message) => {
        setLastMessage(message);
    };

    return (
        <>
            {/* Ventana de Chat */}
            {isLoaded && (
                <div
                    className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ease-in-out ${isOpen
                            ? 'opacity-100 translate-y-0 scale-100'
                            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                        }`}
                >
                    <AIChatWindow
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        onNewMessage={handleNewMessage}
                    />
                </div>
            )}

            {/* Botón Flotante */}
            <button
                onClick={handleToggle}
                className="fixed bottom-6 right-6 z-50 group"
                aria-label={isOpen ? 'Cerrar chat IA' : 'Abrir chat IA'}
            >
                {/* Indicador de no leídos */}
                {unreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {/* Preview del último mensaje */}
                {lastMessage && !isOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-start gap-2">
                            <Bot className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                {lastMessage}
                            </p>
                        </div>
                        <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-white dark:bg-gray-800" />
                    </div>
                )}

                {/* Botón principal */}
                <div
                    className={`
            w-14 h-14 rounded-full shadow-lg 
            flex items-center justify-center
            transition-all duration-300
            bg-gradient-to-br from-blue-500 to-blue-600
            hover:from-blue-600 hover:to-blue-700
            hover:shadow-xl hover:scale-105
            active:scale-95
          `}
                >
                    {isOpen ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <MessageSquare className="w-6 h-6 text-white" />
                    )}
                </div>

                {/* Efecto pulse */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
                )}
            </button>
        </>
    );
}