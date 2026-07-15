import { useState, useEffect } from 'react';
import NotificationTemplatesService from '../services/notificationTemplatesService';
import Swal from 'sweetalert2';
import { Bell, Save, RefreshCw, Eye, Edit2, Lock } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../contexts/AuthContext';

const INPUT_CLASSES = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
const LABEL_CLASSES = "mb-1 block text-xs font-medium text-slate-600";

export default function NotificationTemplates() {
    const { can } = useAuth();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', message: '', extra_emails: '' });
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const response = await NotificationTemplatesService.getTemplates();
            setTemplates(response.templates || []);
        } catch (error) {
            console.error('Error al cargar plantillas de notificaciones:', error);
            Swal.fire('Error', 'No se pudieron cargar las plantillas de notificaciones', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (tpl) => {
        setEditing(tpl);
        setForm({ title: tpl.title || '', message: tpl.message || '', extra_emails: tpl.extra_emails || '' });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await NotificationTemplatesService.updateTemplate(editing.id, form);
            Swal.fire({ icon: 'success', title: 'Guardado', text: 'Plantilla actualizada', timer: 1500, showConfirmButton: false });
            setEditing(null);
            loadTemplates();
        } catch (error) {
            console.error('Error al guardar plantilla:', error);
            Swal.fire('Error', error.message || 'No se pudo guardar la plantilla', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async (tpl) => {
        try {
            setPreviewing(tpl);
            const response = await NotificationTemplatesService.previewTemplate(tpl.id);
            setPreview(response);
        } catch (error) {
            console.error('Error al obtener vista previa:', error);
            Swal.fire('Error', 'No se pudo obtener la vista previa', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!can('NOTIFICATION_TEMPLATES_VIEW')) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Lock className="h-12 w-12 text-slate-300 mb-3" />
                <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
                <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notificaciones internas"
                description="Personaliza el título y el mensaje de las notificaciones que el sistema muestra en la campana (no afecta los emails)"
                icon={Bell}
                action={
                    <Button size="sm" onClick={loadTemplates} disabled={loading} title="Refrescar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                }
            />

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                {templates.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No hay plantillas configuradas</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {templates.map(tpl => (
                            <div key={tpl.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-900">{tpl.name}</div>
                                        <div className="text-xs text-slate-500 font-mono">{tpl.code}</div>
                                        <div className="text-sm text-slate-700 mt-2 truncate">{tpl.title}</div>
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.message}</div>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <Button size="sm" variant="ghost" onClick={() => handlePreview(tpl)} title="Vista previa">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(tpl)} title="Editar">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de edición */}
            <Modal title={`Editar: ${editing?.name || ''}`} open={!!editing} onClose={() => setEditing(null)}>
                <div className="space-y-4">
                    <div>
                        <label className={LABEL_CLASSES}>Título</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                            className={INPUT_CLASSES}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLASSES}>Mensaje</label>
                        <textarea
                            rows={4}
                            value={form.message}
                            onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                            className={INPUT_CLASSES}
                        />
                        <p className="mt-1 text-xs text-muted-foreground text-slate-500">
                            Podés usar placeholders entre llaves dobles (ej. {'{{pedido_id}}'}) — se reemplazan automáticamente con el dato real de cada evento.
                        </p>
                    </div>
                    <div>
                        <label className={LABEL_CLASSES}>Emails adicionales (casillas)</label>
                        <textarea
                            rows={2}
                            value={form.extra_emails}
                            onChange={(e) => setForm(prev => ({ ...prev, extra_emails: e.target.value }))}
                            className={INPUT_CLASSES}
                            placeholder="ops@agencia.com, otra@agencia.com"
                        />
                        <p className="mt-1 text-xs text-muted-foreground text-slate-500">
                            Además de la notificación in-app al rol correspondiente, se manda un email con este mismo título/mensaje a estas direcciones (separadas por coma). Dejalo vacío si no aplica.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de vista previa */}
            <Modal title={`Vista previa: ${previewing?.name || ''}`} open={!!preview} onClose={() => { setPreview(null); setPreviewing(null); }}>
                {preview && (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                            <div className="font-medium text-slate-900">{preview.title}</div>
                            <div className="text-sm text-slate-600 mt-1">{preview.message}</div>
                        </div>
                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => { setPreview(null); setPreviewing(null); }}>Cerrar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
