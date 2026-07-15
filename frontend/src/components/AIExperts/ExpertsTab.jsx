/**
 * Pestaña "Expertos" del panel de Configuración de IA (/config-ia): cada
 * agencia crea y nombra sus propios expertos (agentes con base de
 * conocimiento propia) y les carga documentos, que el asistente puede
 * consultar durante el chat (tool consultar_experto).
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import AIService from '../../services/aiService';
import { Card } from '../ui/Card.jsx';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge.jsx';
import ExpertDocumentsPanel from './ExpertDocumentsPanel';
import Swal from 'sweetalert2';

const emptyExpert = { name: '', description: '', persona: '', is_active: true };

export default function ExpertsTab() {
    const [experts, setExperts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingExpert, setEditingExpert] = useState(null);
    const [form, setForm] = useState(emptyExpert);
    const [expandedId, setExpandedId] = useState(null);
    // Conteo de documentos por experto, refrescado por ExpertDocumentsPanel
    // apenas se sube/borra un documento — evita esperar a un reload completo
    // de la lista de expertos para que la tarjeta refleje el cambio.
    const [docCounts, setDocCounts] = useState({});

    const loadExperts = async () => {
        setIsLoading(true);
        try {
            const response = await AIService.getExperts();
            setExperts(response.experts || []);
        } catch (error) {
            console.error('Error al cargar expertos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadExperts();
    }, []);

    const openCreate = () => {
        setEditingExpert(null);
        setForm(emptyExpert);
        setShowForm(true);
    };

    const openEdit = (expert) => {
        setEditingExpert(expert);
        setForm({
            name: expert.name,
            description: expert.description || '',
            persona: expert.persona || '',
            is_active: expert.is_active,
        });
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingExpert) {
                await AIService.updateExpert(editingExpert.id, form);
                Swal.fire('Actualizado', 'Experto actualizado correctamente', 'success');
            } else {
                await AIService.createExpert(form);
                Swal.fire('Creado', 'Experto creado correctamente', 'success');
            }
            setShowForm(false);
            setEditingExpert(null);
            setForm(emptyExpert);
            loadExperts();
        } catch (error) {
            Swal.fire('Error', error.message || 'Error al guardar el experto', 'error');
        }
    };

    const handleDelete = async (expert) => {
        const result = await Swal.fire({
            title: '¿Eliminar experto?',
            text: `Se eliminará "${expert.name}" y todo su conocimiento cargado.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await AIService.deleteExpert(expert.id);
            Swal.fire('Eliminado', 'Experto eliminado correctamente', 'success');
            loadExperts();
        } catch (error) {
            Swal.fire('Error', error.message || 'Error al eliminar', 'error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Expertos</h2>
                    <p className="text-sm text-gray-500">Agentes con base de conocimiento propia — configuralos y cargales documentos para que el asistente los consulte durante el chat.</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Experto
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : experts.length === 0 ? (
                <Card className="p-6 text-center text-gray-500">
                    Todavía no configuraste ningún experto.
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {experts.map((expert) => (
                        <Card key={expert.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className={`w-5 h-5 ${expert.is_active ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <h3 className="font-semibold">{expert.name}</h3>
                                    <Badge variant={expert.is_active ? 'active' : 'inactive'}>
                                        {expert.is_active ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(expert)} className="p-1 text-gray-400 hover:text-blue-500">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(expert)} className="p-1 text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{expert.description || 'Sin descripción'}</p>
                            {(() => {
                                const count = docCounts[expert.id] ?? (expert.documents || []).length;
                                return (
                                    <div className="text-xs text-gray-400 mb-2">
                                        {count} documento{count === 1 ? '' : 's'}
                                    </div>
                                );
                            })()}

                            <button
                                onClick={() => setExpandedId(expandedId === expert.id ? null : expert.id)}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                                {expandedId === expert.id ? 'Ocultar documentos' : 'Ver documentos'}
                                {expandedId === expert.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {expandedId === expert.id && (
                                <ExpertDocumentsPanel
                                    expertId={expert.id}
                                    onDocumentsChanged={(count) => setDocCounts((prev) => ({ ...prev, [expert.id]: count }))}
                                />
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {showForm && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{editingExpert ? 'Editar Experto' : 'Nuevo Experto'}</h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre</label>
                            <Input
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Ej: Políticas de equipaje"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Descripción</label>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                rows={2}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Qué sabe este experto — se muestra al asistente para decidir cuándo consultarlo"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Personalidad (opcional)</label>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                rows={2}
                                value={form.persona}
                                onChange={(e) => setForm({ ...form, persona: e.target.value })}
                                placeholder="Tono con el que debería responder este experto"
                            />
                        </div>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            />
                            <span className="text-sm">Activo</span>
                        </label>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit">
                                <Save className="w-4 h-4 mr-2" />
                                Guardar
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    );
}
