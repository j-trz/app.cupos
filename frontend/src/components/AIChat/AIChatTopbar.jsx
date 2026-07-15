/**
 * Topbar de la página de chat de IA a pantalla completa.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot } from 'lucide-react';

export default function AIChatTopbar() {
    const navigate = useNavigate();

    return (
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
                </div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Asistente IA</h1>
            </div>

            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver al sistema de cupos
            </button>
        </header>
    );
}
