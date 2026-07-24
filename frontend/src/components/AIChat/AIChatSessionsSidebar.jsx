/**
 * Lista de conversaciones de IA del usuario — reusada tanto en el panel
 * desplegable del widget flotante como en la barra lateral persistente de
 * la página de chat a pantalla completa (AIChatPage).
 */

import { useState } from 'react';
import { Trash2, Pencil, Check, X, MessageSquarePlus } from 'lucide-react';

export default function AIChatSessionsSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onDeleteSession,
    onNewSession,
    onRenameSession,
    compact = false,
}) {
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    const startRename = (e, session) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditingTitle(session.title || '');
    };

    const commitRename = (e, sessionId) => {
        e.stopPropagation();
        onRenameSession?.(sessionId, editingTitle);
        setEditingId(null);
    };

    const cancelRename = (e) => {
        e.stopPropagation();
        setEditingId(null);
    };

    return (
        <div className="p-2">
            {!compact && (
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-1">
                    Conversaciones
                </p>
            )}
            {compact && (
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-1">
                    Conversaciones recientes
                </p>
            )}

            {onNewSession && (
                <button
                    onClick={onNewSession}
                    className="flex items-center gap-2 w-full px-2 py-2 mb-1 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <MessageSquarePlus className="w-4 h-4" />
                    Nueva conversación
                </button>
            )}

            {sessions.length === 0 ? (
                <p className="text-sm text-zinc-400 px-2 py-3 text-center">Sin conversaciones</p>
            ) : (
                sessions.map(session => (
                    <div
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors my-0.5 ${currentSessionId === session.id
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                    >
                        {editingId === session.id ? (
                            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                    autoFocus
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && commitRename(e, session.id)}
                                    className="flex-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 outline-none"
                                />
                                <button onClick={(e) => commitRename(e, session.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md">
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={cancelRename} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm truncate flex-1">
                                    {session.title || 'Nueva conversación'}
                                </span>
                                {/* opacity-60 en vez de 0: en touch no hay hover, así que
                                    dejarlos completamente ocultos los hacía indescubribles
                                    en celular — quedan tenues y se resaltan al pasar el mouse. */}
                                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                    {onRenameSession && (
                                        <button
                                            onClick={(e) => startRename(e, session)}
                                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
                                            title="Renombrar"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => onDeleteSession(session.id, e)}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-600 rounded-md transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
