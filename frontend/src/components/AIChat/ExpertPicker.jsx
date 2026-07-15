/**
 * Selector de experto para el chat de IA — "Asistente general" o uno de los
 * expertos activos de la propia agencia. Usado tanto en el widget flotante
 * como en la página de chat a pantalla completa.
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import AIService from '../../services/aiService';

export default function ExpertPicker({ selectedExpertId, onSelectExpert, compact = false }) {
    const [experts, setExperts] = useState([]);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        AIService.getExperts()
            .then((response) => setExperts((response.experts || []).filter(e => e.is_active)))
            .catch(() => setExperts([]));
    }, []);

    // Cerrar al hacer clic fuera del selector (el menú, al no ser modal, no
    // debe quedar abierto tapando el chat si el usuario hace clic en otro lado).
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    if (experts.length === 0) return null;

    const selected = experts.find(e => e.id === selectedExpertId);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className={`flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
                    } bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300`}
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate max-w-[140px]">{selected ? selected.name : 'Asistente general'}</span>
                <ChevronDown className="w-3 h-3" />
            </button>

            {open && (
                <div className="absolute z-10 mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
                    <button
                        onClick={() => { onSelectExpert(null); setOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${!selectedExpertId ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-300'
                            }`}
                    >
                        Asistente general
                    </button>
                    {experts.map((expert) => (
                        <button
                            key={expert.id}
                            onClick={() => { onSelectExpert(expert.id); setOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 truncate ${selectedExpertId === expert.id ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-300'
                                }`}
                            title={expert.description}
                        >
                            {expert.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
