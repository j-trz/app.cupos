/**
 * Input de Chat IA con auto-resize y soporte de múltiples imágenes (DNI, pasaportes)
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, Loader2, X } from 'lucide-react';

export default function AIChatInput({ onSendMessage, isLoading, placeholder }) {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]); // Array de { id, base64, mime, name, dataUrl }
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const MIN_HEIGHT = 40;
    const MAX_HEIGHT = 120;

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${MIN_HEIGHT}px`;
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT)}px`;
        }
    }, [message]);

    const handleSubmit = () => {
        const trimmedMessage = message.trim();
        if ((!trimmedMessage && attachments.length === 0) || isLoading) return;

        onSendMessage(trimmedMessage || '(documentos adjuntos)', attachments);
        setMessage('');
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = `${MIN_HEIGHT}px`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

        Array.from(files).forEach((file) => {
            if (!allowedMimes.includes(file.type)) {
                alert(`Solo se permiten imágenes (JPG, PNG, WEBP, GIF). El archivo "${file.name}" fue omitido.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target.result; // data:image/jpeg;base64,...
                const base64 = result.split(',')[1];
                setAttachments((prev) => [
                    ...prev,
                    {
                        id: `${file.name}-${Date.now()}-${Math.random()}`,
                        base64,
                        mime: file.type,
                        name: file.name,
                        dataUrl: result,
                    },
                ]);
            };
            reader.readAsDataURL(file);
        });

        // reset input so same file can be selected again
        e.target.value = '';
    };

    return (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
            {/* Preview de imágenes */}
            {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-2 max-h-24 overflow-y-auto">
                    {attachments.map((img) => (
                        <div
                            key={img.id}
                            className="relative flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1 pr-1.5 max-w-[140px] shadow-sm shrink-0"
                        >
                            <img
                                src={img.dataUrl}
                                alt="preview"
                                className="w-8 h-8 object-cover rounded border border-zinc-100 dark:border-zinc-800 shrink-0"
                            />
                            <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1 leading-tight select-none">
                                {img.name}
                            </p>
                            <button
                                type="button"
                                onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== img.id))}
                                className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                                title="Eliminar"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-2">
                {/* Botón adjuntar imágenes */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg transition-colors ${
                        attachments.length > 0
                            ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    disabled={isLoading}
                    title="Adjuntar imágenes (DNI, pasaporte, etc.)"
                >
                    <Paperclip className="w-4 h-4" />
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={attachments.length > 0 ? 'Agrega instrucciones (ej: crear reservas con estos datos)...' : (placeholder || 'Escribe tu mensaje...')}
                        disabled={isLoading}
                        rows={1}
                        className="w-full resize-none bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-colors disabled:opacity-50 overflow-y-auto"
                        style={{ minHeight: `${MIN_HEIGHT}px`, maxHeight: `${MAX_HEIGHT}px` }}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Sparkles className={`w-3.5 h-3.5 ${(message.trim() || attachments.length > 0) ? 'text-blue-500' : 'text-zinc-300'}`} />
                    </div>
                </div>

                {/* Botón enviar */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={(!message.trim() && attachments.length === 0) || isLoading}
                    className="p-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 text-white dark:text-zinc-900 disabled:text-zinc-400 rounded-lg transition-all duration-150 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    title="Enviar"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Sugerencias rápidas */}
            {!message && attachments.length === 0 && !isLoading && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                        { label: '📊 Mis reservas', text: 'Muéstrame mis reservas' },
                        { label: '✈️ Buscar vuelos', text: 'Buscar productos disponibles' },
                        { label: '🪪 Leer DNI', text: 'Voy a subir fotos de documentos de identidad para extraer los datos de los pasajeros' },
                    ].map(s => (
                        <button
                            key={s.label}
                            type="button"
                            onClick={() => setMessage(s.text)}
                            className="px-2.5 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
