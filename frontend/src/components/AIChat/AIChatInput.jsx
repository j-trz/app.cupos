/**
 * Input de Chat IA con auto-resize y soporte de imágenes (DNI, pasaportes)
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, Loader2, X, Image as ImageIcon } from 'lucide-react';

export default function AIChatInput({ onSendMessage, isLoading, placeholder }) {
    const [message, setMessage] = useState('');
    const [imagePreview, setImagePreview] = useState(null); // { base64, mime, name }
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
        if ((!trimmedMessage && !imagePreview) || isLoading) return;

        onSendMessage(trimmedMessage || '(documento adjunto)', imagePreview);
        setMessage('');
        setImagePreview(null);
        if (textareaRef.current) textareaRef.current.style.height = `${MIN_HEIGHT}px`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(file.type)) {
            alert('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target.result; // data:image/jpeg;base64,...
            const base64 = result.split(',')[1];
            setImagePreview({ base64, mime: file.type, name: file.name, dataUrl: result });
        };
        reader.readAsDataURL(file);
        // reset input so same file can be selected again
        e.target.value = '';
    };

    return (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
            {/* Preview de imagen */}
            {imagePreview && (
                <div className="mb-2 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-2">
                    <img
                        src={imagePreview.dataUrl}
                        alt="preview"
                        className="w-12 h-12 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{imagePreview.name}</p>
                        <p className="text-[10px] text-zinc-400">Imagen lista para enviar</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2">
                {/* Botón adjuntar imagen */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg transition-colors ${
                        imagePreview
                            ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    disabled={isLoading}
                    title="Adjuntar imagen (DNI, pasaporte, etc.)"
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
                        placeholder={imagePreview ? 'Agrega instrucciones (ej: crear reserva con estos datos)...' : (placeholder || 'Escribe tu mensaje...')}
                        disabled={isLoading}
                        rows={1}
                        className="w-full resize-none bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-colors disabled:opacity-50 overflow-y-auto"
                        style={{ minHeight: `${MIN_HEIGHT}px`, maxHeight: `${MAX_HEIGHT}px` }}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Sparkles className={`w-3.5 h-3.5 ${(message.trim() || imagePreview) ? 'text-blue-500' : 'text-zinc-300'}`} />
                    </div>
                </div>

                {/* Botón enviar */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={(!message.trim() && !imagePreview) || isLoading}
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
            {!message && !imagePreview && !isLoading && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                        { label: '📊 Mis reservas', text: 'Muéstrame mis reservas' },
                        { label: '✈️ Buscar vuelos', text: 'Buscar productos disponibles' },
                        { label: '🪪 Leer DNI', text: 'Voy a subir una foto de un documento de identidad para extraer los datos del pasajero' },
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
