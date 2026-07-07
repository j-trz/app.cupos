/**
 * Página de Configuración de IA
 * Permite a los administradores configurar proveedores y acciones de IA
 */

import { useState, useEffect } from 'react';
import {
    Bot, Plus, Edit2, Trash2, TestTube, Key,
    Activity, MessageSquare, Save, X, Eye, EyeOff, RefreshCw,
    Zap, CheckCircle
} from 'lucide-react';
import AIService from '../services/aiService';
import { Card } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import Swal from 'sweetalert2';

// Logos SVG inline para cada proveedor
const ProviderLogo = ({ type, size = 28 }) => {
    const logos = {
        openai: (
            <svg width={size} height={size} viewBox="0 0 41 41" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.212-3.427 10.079 10.079 0 0 0-11.19 4.938 9.964 9.964 0 0 0-6.617 3.399 10.079 10.079 0 0 0-2.49 11.102 9.964 9.964 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.211 3.427 10.079 10.079 0 0 0 11.19-4.938 9.965 9.965 0 0 0 6.617-3.4 10.079 10.079 0 0 0 2.491-11.102zm-15.633 21.324a7.477 7.477 0 0 1-4.801-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.487 7.505zM4.739 33.741a7.474 7.474 0 0 1-.894-5.029c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.738zM3.261 14.269A7.471 7.471 0 0 1 7.17 10.89c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L5.053 24.4a7.505 7.505 0 0 1-1.792-10.13zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l9.008 5.202a7.5 7.5 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.607-1.684zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.499v4.996l-4.331 2.5-4.331-2.5V18.649z"/>
            </svg>
        ),
        anthropic: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017L3.674 20H0L6.57 3.52zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"/>
            </svg>
        ),
        google: (
            <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
        ),
        azure: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.05 4.24L6.56 18.05l-2.09.01L8.5 9.88l-3.76 7.24H2.09L8.56 4.24h4.49zm.7 0h4.19l-5.47 9.41 3.45.01-5.84 6.39 9.82-10.01h-3.7l3.1-5.8H13.75z" fill="#0089D6"/>
            </svg>
        ),
        local: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
        ),
    };

    const bg = {
        openai: 'bg-black text-white',
        anthropic: 'bg-[#D4A574] text-white',
        google: 'bg-white border border-gray-200',
        azure: 'bg-[#0078D4] text-white',
        local: 'bg-gray-700 text-white',
    };

    return (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg[type] || 'bg-gray-100'}`}>
            {logos[type] || <Bot className="w-6 h-6" />}
        </div>
    );
};

const PROVIDER_TYPES = [
    {
        value: 'openai', label: 'OpenAI',
        models: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4-turbo-preview',
            'gpt-4',
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k',
            'o1',
            'o1-mini',
            'o1-preview',
            'o3-mini',
        ]
    },
    {
        value: 'anthropic', label: 'Anthropic',
        models: [
            'claude-opus-4-5',
            'claude-sonnet-4-5',
            'claude-haiku-4-5',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
        ]
    },
    {
        value: 'google', label: 'Google AI',
        models: [
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-pro',
            'gemini-pro-vision',
        ]
    },
    {
        value: 'azure', label: 'Azure OpenAI',
        models: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-35-turbo',
            'gpt-35-turbo-16k',
            'o1',
            'o1-mini',
        ]
    },
    {
        value: 'local', label: 'Local (Ollama)',
        models: [
            'llama3.3',
            'llama3.2',
            'llama3.1',
            'llama3',
            'llama2',
            'mistral',
            'mistral-nemo',
            'mixtral',
            'codellama',
            'phi4',
            'phi3',
            'phi3.5',
            'gemma3',
            'gemma2',
            'qwen2.5',
            'qwen2',
            'deepseek-r1',
            'deepseek-coder-v2',
            'nomic-embed-text',
        ]
    },
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
        <div className="space-y-6">
            <PageHeader
                title="Configuración de IA"
                description="Configura los proveedores de IA, acciones disponibles y monitorea el uso."
                icon={Bot}
                action={
                    <Button
                        size="sm"
                        onClick={loadData}
                        disabled={isLoading}
                        title="Refrescar datos"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={Bot}
                    label="Proveedores"
                    value={providers.length}
                    description="Proveedores de IA configurados."
                />
                <StatCard
                    icon={Zap}
                    label="Acciones"
                    value={actions.length}
                    description="Acciones del agente IA."
                />
                <StatCard
                    icon={MessageSquare}
                    label="Sesiones"
                    value={stats?.total_sessions || 0}
                    description="Total de sesiones de chat."
                />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
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
                                        <Card key={provider.id} className={`p-4 transition-all ${!provider.is_active ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <ProviderLogo type={provider.provider_type} />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                                                            {provider.is_default && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                                    Por defecto
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${provider.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {provider.is_active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                                                            <span className="capitalize">{PROVIDER_TYPES.find(p => p.value === provider.provider_type)?.label || provider.provider_type}</span>
                                                            {provider.default_model && <> &middot; <span className="font-mono text-xs">{provider.default_model}</span></>}
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
                                                <div className="grid grid-cols-5 gap-2">
                                                    {PROVIDER_TYPES.map(type => (
                                                        <button
                                                            key={type.value}
                                                            type="button"
                                                            onClick={() => {
                                                                const defaultModel = type.models[0] || '';
                                                                setProviderForm({ ...providerForm, provider_type: type.value, default_model: defaultModel });
                                                            }}
                                                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${providerForm.provider_type === type.value
                                                                ? 'border-slate-900 bg-slate-50'
                                                                : 'border-gray-200 hover:border-gray-300'}`}
                                                            title={type.label}
                                                        >
                                                            <ProviderLogo type={type.value} size={22} />
                                                            <span className="text-[10px] font-medium text-gray-600 leading-tight text-center">{type.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
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
                                                <input
                                                    list={`models-${providerForm.provider_type}`}
                                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm"
                                                    value={providerForm.default_model}
                                                    onChange={(e) => setProviderForm({ ...providerForm, default_model: e.target.value })}
                                                    placeholder="Selecciona o escribe un modelo..."
                                                />
                                                <datalist id={`models-${providerForm.provider_type}`}>
                                                    {PROVIDER_TYPES.find(p => p.value === providerForm.provider_type)?.models.map(model => (
                                                        <option key={model} value={model} />
                                                    ))}
                                                </datalist>
                                                <p className="text-xs text-gray-400 mt-1">Podés escribir cualquier modelo personalizado</p>
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
                                <h2 className="text-lg font-semibold text-slate-900">Logs de Chat</h2>
                                <Button variant="secondary" size="sm" onClick={loadData} title="Refrescar logs">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>

                            <Card>
                                <TableComponent>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">Fecha</TableHead>
                                            <TableHead className="text-center">Usuario</TableHead>
                                            <TableHead className="text-center">Rol</TableHead>
                                            <TableHead className="text-center">Contenido</TableHead>
                                            <TableHead className="text-center">Tokens</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell className="text-center py-10" colSpan={5}>
                                                    No hay logs disponibles
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-center text-sm whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString('es-AR')}
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm">{log.user_email || 'Sistema'}</TableCell>
                                                    <TableCell className="text-center text-sm">
                                                        <Badge variant={log.role === 'user' ? 'default' : 'success'}>
                                                            {log.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm max-w-md truncate">{log.content}</TableCell>
                                                    <TableCell className="text-center text-sm text-slate-500">
                                                        {log.token_usage?.total_tokens || '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </TableComponent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}