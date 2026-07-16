/**
 * Panel de documentos de conocimiento de un experto: subida de archivos
 * (PDF/DOCX/TXT/MD) o de una URL, y listado con su estado de conversión a
 * Markdown (processing/ready/error).
 */

import { useState, useEffect, useRef } from 'react';
import { Upload, Link2, Trash2, FileText, Loader2, CheckCircle2, AlertCircle, Pencil, Save } from 'lucide-react';
import AIService from '../../services/aiService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge.jsx';
import Textarea from '../ui/Textarea';
import Modal from '../Modal';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
    ready: { variant: 'success', label: 'Listo', icon: CheckCircle2 },
    processing: { variant: 'pending', label: 'Procesando', icon: Loader2 },
    error: { variant: 'danger', label: 'Error', icon: AlertCircle },
};

export default function ExpertDocumentsPanel({ expertId, onDocumentsChanged }) {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const fileInputRef = useRef(null);
    // Documento en edición manual del contenido ya ingerido (ej. para
    // corregir un error de transcripción de OCR sin resubir el archivo).
    const [editingDoc, setEditingDoc] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const response = await AIService.getExpert(expertId);
            const docs = response.documents || [];
            setDocuments(docs);
            onDocumentsChanged?.(docs.length);
        } catch (error) {
            console.error('Error al cargar documentos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expertId]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            await AIService.uploadExpertDocument(expertId, file);
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo subir el documento', 'error');
        } finally {
            // Recargar siempre: aunque la conversión haya fallado, el
            // documento igual queda guardado con status "error" y su motivo
            // — el usuario tiene que poder verlo en la lista, no solo el
            // popup de error que ya vio.
            await loadDocuments();
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleAddUrl = async () => {
        const url = urlInput.trim();
        if (!url) return;
        setIsUploading(true);
        try {
            await AIService.addExpertDocumentFromUrl(expertId, url);
            setUrlInput('');
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo agregar la URL', 'error');
        } finally {
            await loadDocuments();
            setIsUploading(false);
        }
    };

    const handleDelete = async (doc) => {
        const result = await Swal.fire({
            title: '¿Eliminar documento?',
            text: `Se quitará "${doc.file_name}" del conocimiento del experto.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await AIService.deleteExpertDocument(expertId, doc.id);
            await loadDocuments();
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo eliminar', 'error');
        }
    };

    const openEdit = (doc) => {
        setEditingDoc(doc);
        setEditContent(doc.content_markdown || '');
    };

    const handleSaveEdit = async () => {
        if (!editingDoc) return;
        setIsSavingEdit(true);
        try {
            await AIService.updateExpertDocument(expertId, editingDoc.id, editContent);
            setEditingDoc(null);
            await loadDocuments();
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo guardar el contenido', 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="space-y-3 border-t border-slate-200 pt-3 mt-3">
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.markdown,.html,.htm"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Subir archivo
                </Button>
                <div className="flex flex-1 gap-2">
                    <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://ejemplo.com/faq"
                        disabled={isUploading}
                    />
                    <Button type="button" size="sm" variant="outline" disabled={isUploading || !urlInput.trim()} onClick={handleAddUrl}>
                        <Link2 className="w-4 h-4 mr-1.5" />
                        Agregar URL
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <p className="text-xs text-gray-400">Cargando documentos…</p>
            ) : documents.length === 0 ? (
                <p className="text-xs text-gray-400">Este experto todavía no tiene documentos cargados.</p>
            ) : (
                <ul className="space-y-1.5">
                    {documents.map((doc) => {
                        const status = STATUS_BADGE[doc.status] || STATUS_BADGE.ready;
                        return (
                            <li key={doc.id} className="bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="truncate">{doc.file_name}</span>
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => openEdit(doc)} className="p-1 text-gray-400 hover:text-blue-500" title="Editar contenido">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(doc)} className="p-1 text-gray-400 hover:text-red-500" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {doc.status === 'error' && doc.error_message && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{doc.error_message}</p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <Modal
                title={editingDoc ? `Editar contenido — ${editingDoc.file_name}` : 'Editar contenido'}
                open={!!editingDoc}
                onClose={() => setEditingDoc(null)}
                size="3xl"
            >
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                        Este es el texto en Markdown que el asistente usa como conocimiento — corregilo acá si detectaste un error
                        (por ejemplo, de una transcripción de OCR) sin tener que resubir el archivo entero.
                    </p>
                    <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[50vh] font-mono text-xs"
                        disabled={isSavingEdit}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setEditingDoc(null)} disabled={isSavingEdit}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSaveEdit} disabled={isSavingEdit || !editContent.trim()}>
                            <Save className="w-4 h-4 mr-1.5" />
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
