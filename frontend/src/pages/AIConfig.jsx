/**
 * Página de Configuración de IA
 * Permite a los administradores configurar proveedores y acciones de IA
 */

import { useState, useEffect } from 'react';
import {
    Bot, Plus, Edit2, Trash2, TestTube, Key, Settings,
    Activity, MessageSquare, Save, X, Eye, EyeOff, RefreshCw,
    Zap, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import AIService from '../services/aiService';
import { Card } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Swal from 'sweetalert2';

const PROVIDER_TYPES = [
    { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { value: 'anthropic', label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
    { value: 'google', label: 'Google AI', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'] },
    { value: 'azure', label: 'Azure OpenAI', models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'] },
    { value: 'local', label: 'Local (Ollama)', models: ['llama3', 'mistral', 'codellama', 'phi3'] }
];

const TABS = [
    { id: 'providers', label: 'Proveedores', icon: Key },
    { id: 'actions', label: 'Acciones', icon: Zap },
    { id: 'stats', label: 'Estadísticas', icon: Activity },
    { id: 'logs', label: 'Logs', icon: MessageSquare }
];

export default function AIConfig() {
    const [activeTab, setActiveTab] = useState('providers');
    const [providers, setProviders] = useState([]);
    const [actions, setActions] = useState([]);
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showProviderForm, setShowProviderForm] = useState(false);
    const [showActionForm, setShowActionForm] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);
    const [editingAction, setEditingAction] = useState(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [statsDays, setStatsDays] = useState(30);

    const emptyProvider = {
        name: '',
        provider_type: 'openai',
        api_key: '',
        api_endpoint: '',
        default_model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 4096,
        is_active: true,
        is_default: false
    };

    const emptyAction = {
        name: '',
        description: '',
        action_type: 'api_call',
        endpoint: '',
        method: 'GET',
        parameters: {},
        is_active: true
    };

    const [providerForm, setProviderForm] = useState(emptyProvider);
    const [actionForm, setActionForm] = useState(emptyAction);

    useEffect(() => {
        loadData();
    }, [activeTab, statsDays]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'providers') {
                const response = await AIService.getProviders();
                setProviders(response.providers || []);
            } else if (activeTab === 'actions') {
                const response = await AIService.getActions();
                setActions(response.actions || []);
            } else if (activeTab === 'stats') {
                const response = await AIService.getStats(statsDays);
                setStats(response.stats);
            } else if (activeTab === 'logs') {
                const response = await AIService.getLogs({ limit: 50 });
                setLogs(response.logs || []);
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProvider = async (e) => {
        e.preventDefault();
        try {
            if (editingProvider) {
                await AIService.updateProvider(editingProvider.id, providerForm);
                Swal.fire('Actualizado', 'Proveedor actualizado correctamente', 'success');
            } else {
                await AIService.createProvider(providerForm);
                Swal.fire('Creado', 'Proveedor creado correctamente', 'success');
            }
            setShowProviderForm(false);
            setEditingProvider(null);
            setProviderForm(emptyProvider);
            loadData();
        } catch (error) {
            Swal.fire('Error', error.message || 'Error al guardar proveedor', 'error');
        }
    };

    const handleDeleteProvider = async (provider) => {
        const result = await Swal.fire({
            title: '¿Eliminar proveedor?',
            text: `¿Estás seguro de eliminar ${provider.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await AIService.deleteProvider(provider.id);
                Swal.fire('Eliminado', 'Proveedor eliminado correctamente', 'success');
                loadData();
            } catch (error) {
                Swal.fire('Error', error.message || 'Error al eliminar', 'error');
            }
        }
    };

    const handleTestProvider = async (providerId) => {
        setTestResult({ id: providerId, status: 'testing' });
        try {
            const response = await AIService.testProvider(providerId);
            setTestResult({ id: providerId, status: 'success', message: response.response });
            setTimeout(() => setTestResult(null), 5000);
        } catch (error) {
            setTestResult({ id: providerId, status: 'error', message: error.message });
        }
    };

    const handleSaveAction = async (e) => {
        e.preventDefault();
        try {
            // Parsear parameters si es string
            const formData = {
                ...actionForm,
                parameters: typeof actionForm.parameters === 'string'
                    ? JSON.parse(actionForm.parameters || '{}')
                    : actionForm.parameters
            };

            if (editingAction) {
                await AIService.updateAction(editingAction.id, formData);
                Swal.fire('Actualizado', 'Acción actualizada correctamente', 'success');
            } else {
                await AIService.createAction(formData);
                Swal.fire('Creada', 'Acción creada correctamente', 'success');
            }
            setShowActionForm(false);
            setEditingAction(null);
            setActionForm(emptyAction);
            loadData();
        } catch (error) {
            Swal.fire('Error', error.message || 'Error al guardar acción', 'error');
        }
    };

    const handleDeleteAction = async (action) => {
        const result = await Swal.fire({
            title: '¿Eliminar acción?',
            text: `¿Estás seguro de eliminar ${action.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await AIService.deleteAction(action.id);
                Swal.fire('Eliminada', 'Acción eliminada correctamente', 'success');
                loadData();
            } catch (error) {
                Swal.fire('Error', error.message || 'Error al eliminar', 'error');
            }
        }
    };

    const openEditProvider = (provider) => {
        setEditingProvider(provider);
        setProviderForm({
            ...provider,
            api_key: '' // No cargar API key por seguridad
        });
        setShowProviderForm(true);
    };

    const openEditAction = (action) => {
        setEditingAction(action);
        setActionForm({
            ...action,
            parameters: JSON.stringify(action.parameters, null, 2)
        });
        setShowActionForm(true);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Bot className="w-8 h-8 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Configuración de Inteligencia Artificial
                    </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Configura los proveedores de IA, acciones disponibles y monitorea el uso
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Contenido de tabs */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {/* Tab: Proveedores */}
                    {activeTab === 'providers' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Proveedores de IA</h2>
                                <Button onClick={() => { setShowProviderForm(true); setEditingProvider(null); setProviderForm(emptyProvider); }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar Proveedor
                                </Button>
                            </div>

                            {/* Lista de proveedores */}
                            <div className="grid gap-4">
                                {providers.length === 0 ? (
                                    <Card className="p-6 text-center text-gray-500">
                                        No hay proveedores configurados. Agrega uno para comenzar.
                                    </Card>
                                ) : (
                                    providers.map(provider => (
                                        <Card key={provider.id} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${provider.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        <Bot className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold">{provider.name}</h3>
                                                            {provider.is_default && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                                    Por defecto
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-0.5 text-xs rounded-full ${provider.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {provider.is_active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500">
                                                            {provider.provider_type} • {provider.default_model}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Resultado de test */}
                                                    {testResult?.id === provider.id && (
                                                        <span className={`text-sm ${testResult.status === 'testing' ? 'text-yellow-500' :
                                                            testResult.status === 'success' ? 'text-green-500' : 'text-red-500'
                                                            }`}>
                                                            {testResult.status === 'testing' ? 'Probando...' :
                                                                testResult.status === 'success' ? '✓ Conexión OK' : '✗ Error'}
                                                        </span>
                                                    )}

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleTestProvider(provider.id)}
                                                        disabled={testResult?.id === provider.id && testResult.status === 'testing'}
                                                    >
                                                        <TestTube className="w-4 h-4 mr-1" />
                                                        Probar
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => openEditProvider(provider)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteProvider(provider)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>

                            {/* Formulario de proveedor */}
                            {showProviderForm && (
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">
                                            {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                                        </h3>
                                        <button onClick={() => setShowProviderForm(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSaveProvider} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                                <Input
                                                    required
                                                    value={providerForm.name}
                                                    onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                                                    placeholder="Ej: OpenAI Production"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Tipo de Proveedor</label>
                                                <select
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                    value={providerForm.provider_type}
                                                    onChange={(e) => {
                                                        const type = e.target.value;
                                                        const defaultModel = PROVIDER_TYPES.find(p => p.value === type)?.models[0] || '';
                                                        setProviderForm({ ...providerForm, provider_type: type, default_model: defaultModel });
                                                    }}
                                                >
                                                    {PROVIDER_TYPES.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">API Key</label>
                                                <div className="relative">
                                                    <Input
                                                        type={showApiKey ? 'text' : 'password'}
                                                        value={providerForm.api_key}
                                                        onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                                                        placeholder={editingProvider ? '(dejar vacío para mantener actual)' : 'sk-...'}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowApiKey(!showApiKey)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                                    >
                                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Modelo por defecto</label>
                                                <select
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                    value={providerForm.default_model}
                                                    onChange={(e) => setProviderForm({ ...providerForm, default_model: e.target.value })}
                                                >
                                                    {PROVIDER_TYPES.find(p => p.value === providerForm.provider_type)?.models.map(model => (
                                                        <option key={model} value={model}>{model}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Temperatura ({providerForm.temperature})</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="2"
                                                    step="0.1"
                                                    value={providerForm.temperature}
                                                    onChange={(e) => setProviderForm({ ...providerForm, temperature: parseFloat(e.target.value) })}
                                                    className="w-full"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Max Tokens</label>
                                                <Input
                                                    type="number"
                                                    value={providerForm.max_tokens}
                                                    onChange={(e) => setProviderForm({ ...providerForm, max_tokens: parseInt(e.target.value) })}
                                                />
                                            </div>

                                            {providerForm.provider_type === 'azure' && (
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium mb-1">Azure Endpoint</label>
                                                    <Input
                                                        value={providerForm.api_endpoint}
                                                        onChange={(e) => setProviderForm({ ...providerForm, api_endpoint: e.target.value })}
                                                        placeholder="https://your-resource.openai.azure.com"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={providerForm.is_active}
                                                    onChange={(e) => setProviderForm({ ...providerForm, is_active: e.target.checked })}
                                                />
                                                <span className="text-sm">Activo</span>
                                            </label>

                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={providerForm.is_default}
                                                    onChange={(e) => setProviderForm({ ...providerForm, is_default: e.target.checked })}
                                                />
                                                <span className="text-sm">Proveedor por defecto</span>
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            <Button type="button" variant="outline" onClick={() => setShowProviderForm(false)}>
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
                    )}

                    {/* Tab: Acciones */}
                    {activeTab === 'actions' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Acciones del Agente IA</h2>
                                <Button onClick={() => { setShowActionForm(true); setEditingAction(null); setActionForm(emptyAction); }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar Acción
                                </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {actions.length === 0 ? (
                                    <Card className="p-6 text-center text-gray-500 md:col-span-3">
                                        No hay acciones configuradas.
                                    </Card>
                                ) : (
                                    actions.map(action => (
                                        <Card key={action.id} className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Zap className={`w-5 h-5 ${action.is_active ? 'text-yellow-500' : 'text-gray-400'}`} />
                                                    <h3 className="font-semibold">{action.name}</h3>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditAction(action)} className="p-1 text-gray-400 hover:text-blue-500">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAction(action)} className="p-1 text-gray-400 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">{action.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="px-2 py-0.5 bg-gray-100 rounded">{action.action_type}</span>
                                                <span className="px-2 py-0.5 bg-gray-100 rounded">{action.method}</span>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>

                            {/* Formulario de acción */}
                            {showActionForm && (
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">
                                            {editingAction ? 'Editar Acción' : 'Nueva Acción'}
                                        </h3>
                                        <button onClick={() => setShowActionForm(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSaveAction} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                                <Input
                                                    required
                                                    value={actionForm.name}
                                                    onChange={(e) => setActionForm({ ...actionForm, name: e.target.value })}
                                                    placeholder="Ej: search_reservations"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Tipo</label>
                                                <select
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                    value={actionForm.action_type}
                                                    onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}
                                                >
                                                    <option value="api_call">API Call</option>
                                                    <option value="database_query">Database Query</option>
                                                    <option value="custom_function">Custom Function</option>
                                                </select>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                                <textarea
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                    rows={2}
                                                    value={actionForm.description}
                                                    onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                                                    placeholder="Descripción de lo que hace la acción..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Endpoint</label>
                                                <Input
                                                    value={actionForm.endpoint}
                                                    onChange={(e) => setActionForm({ ...actionForm, endpoint: e.target.value })}
                                                    placeholder="/api/reservations"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1">Método</label>
                                                <select
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                    value={actionForm.method}
                                                    onChange={(e) => setActionForm({ ...actionForm, method: e.target.value })}
                                                >
                                                    <option value="GET">GET</option>
                                                    <option value="POST">POST</option>
                                                    <option value="PUT">PUT</option>
                                                    <option value="DELETE">DELETE</option>
                                                </select>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium mb-1">Parámetros (JSON)</label>
                                                <textarea
                                                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm bg-white dark:bg-gray-800"
                                                    rows={4}
                                                    value={typeof actionForm.parameters === 'string' ? actionForm.parameters : JSON.stringify(actionForm.parameters, null, 2)}
                                                    onChange={(e) => setActionForm({ ...actionForm, parameters: e.target.value })}
                                                    placeholder='{"param1": "description"}'
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={actionForm.is_active}
                                                onChange={(e) => setActionForm({ ...actionForm, is_active: e.target.checked })}
                                            />
                                            <span className="text-sm">Activa</span>
                                        </label>

                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            <Button type="button" variant="outline" onClick={() => setShowActionForm(false)}>
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
                    )}

                    {/* Tab: Estadísticas */}
                    {activeTab === 'stats' && stats && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-semibold">Estadísticas de Uso</h2>
                                <select
                                    className="px-3 py-1 border rounded-lg text-sm"
                                    value={statsDays}
                                    onChange={(e) => setStatsDays(parseInt(e.target.value))}
                                >
                                    <option value={7}>Últimos 7 días</option>
                                    <option value={30}>Últimos 30 días</option>
                                    <option value={90}>Últimos 90 días</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <MessageSquare className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total Sesiones</p>
                                            <p className="text-2xl font-bold">{stats.total_sessions || 0}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Activity className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total Mensajes</p>
                                            <p className="text-2xl font-bold">{stats.total_messages || 0}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Tokens Usados</p>
                                            <p className="text-2xl font-bold">{stats.tokens?.total_tokens || 0}</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Uso por proveedor */}
                            {stats.provider_usage && stats.provider_usage.length > 0 && (
                                <Card className="p-6">
                                    <h3 className="font-semibold mb-4">Uso por Proveedor</h3>
                                    <div className="space-y-3">
                                        {stats.provider_usage.map((usage, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="font-medium">{usage.provider_name}</span>
                                                <div className="flex gap-4 text-sm text-gray-500">
                                                    <span>{usage.message_count} mensajes</span>
                                                    <span>{usage.total_tokens || 0} tokens</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Tab: Logs */}
                    {activeTab === 'logs' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Logs de Chat</h2>
                                <Button variant="outline" onClick={loadData}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Actualizar
                                </Button>
                            </div>

                            <Card className="overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contenido</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    No hay logs disponibles
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString('es-AR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{log.user_email || 'Sistema'}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${log.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                            }`}>
                                                            {log.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm max-w-md truncate">{log.content}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {log.token_usage?.total_tokens || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}