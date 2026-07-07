/**
 * Widget flotante de Chat IA - Estilo Vercel
 * Usa colores de marca blanca dinámicamente
 */

import { useState, useEffect } from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';
import AIChatWindow from './AIChatWindow';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastMessage, setLastMessage] = useState(null);
    const { config } = useWhiteLabel();

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

    // Colores dinámicos desde WhiteLabelContext
    const primaryColor = config?.colors?.primary || '#3b82f6';

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

            {/* Botón Flotante - Estilo Vercel */}
            <button
                onClick={handleToggle}
                className="fixed bottom-6 right-6 z-50 group focus:outline-none"
                aria-label={isOpen ? 'Cerrar chat IA' : 'Abrir chat IA'}
            >
                {/* Indicador de no leídos */}
                {unreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {/* Botón principal - Rediseñado estilo Vercel */}
                <div
                    className={`
                    relative w-12 h-12 rounded-xl shadow-md
                    flex items-center justify-center
                    transition-all duration-200
                    bg-zinc-900 dark:bg-zinc-100
                    hover:shadow-lg hover:scale-105
                    active:scale-95
                  `}
                >
                    <Sparkles className={`w-5 h-5 transition-colors ${isOpen ? 'text-white dark:text-zinc-900' : 'text-white dark:text-zinc-900'}`} />
                </div>

                {/* Tooltip al hacer hover */}
                {!isOpen && (
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        Asistente IA
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45" />
                    </div>
                )}
            </button>
        </>
    );
}