import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound, Plus, Trash2, Copy, Check, ShieldAlert, CheckCircle2,
  Clock, Building2, RefreshCw, AlertCircle, Eye, EyeOff, Terminal,
} from 'lucide-react';
import ApiKeyService from '../../services/apiKeyService';
import AgencyService from '../../services/agencyService';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Swal from 'sweetalert2';
import { useAuth } from '../../contexts/AuthContext';

export default function ApiKeyPanel() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';

  const [keys, setKeys] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  // Modal de Creación
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    agency_id: '',
    scopes: ['*'],
  });

  // Modal de Revelación de Token
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiKeyService.getApiKeys();
      setKeys(res.data || []);
    } catch (e) {
      console.error('Error al cargar API Keys:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgencies = useCallback(async () => {
    try {
      const res = await AgencyService.getAgencies();
      setAgencies(res || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchAgencies();
  }, [fetchKeys, fetchAgencies]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire('Atención', 'Ingresá un nombre descriptivo para la API Key', 'warning');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: formData.name.trim(),
        agency_id: formData.agency_id || null,
        scopes: formData.scopes,
      };
      const res = await ApiKeyService.createApiKey(payload);
      setShowModal(false);
      setFormData({ name: '', agency_id: '', scopes: ['*'] });
      setCreatedResult(res.data);
      fetchKeys();
    } catch (e) {
      Swal.fire('Error', e.message || 'No se pudo crear la API Key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id, name) => {
    const confirm = await Swal.fire({
      title: '¿Revocar API Key?',
      text: `La clave "${name}" quedará inactiva inmediatamente. Los sistemas externos que la utilicen perderán acceso.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Sí, revocar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    setRevokingId(id);
    try {
      await ApiKeyService.revokeApiKey(id);
      Swal.fire('Revocada', 'La API Key fue desactivada correctamente', 'success');
      fetchKeys();
    } catch (e) {
      Swal.fire('Error', e.message || 'No se pudo revocar la clave', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopySecret = async () => {
    if (!createdResult?.secret_key) return;
    try {
      await navigator.clipboard.writeText(createdResult.secret_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  return (
    <div className="space-y-6">
      {/* Banner / Card Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-medium border border-white/10 backdrop-blur-sm">
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              <span>Acceso de Integración M2M</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Claves de API para Sistemas Externos
            </h2>
            <p className="text-sm text-slate-350 max-w-2xl leading-relaxed">
              Generá tokens secretos de larga duración (`X-API-Key`) para permitir que sistemas externos, ERPs B2B o bots consulten cupos y gestionen reservas directamente.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Generar nueva API Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Llaves */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Claves Registradas
            </h3>
            <Badge variant="default">{keys.length}</Badge>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchKeys} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refrescar
          </Button>
        </div>

        {loading && keys.length === 0 ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            📭 No hay claves de API creadas. Hacé clic en <span className="font-semibold text-slate-700">"Generar nueva API Key"</span> para autorizar un sistema externo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Prefijo Identificador</th>
                  <th className="text-left px-4 py-3">Agencia Vinculada</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Último uso</th>
                  <th className="text-left px-4 py-3">Creada</th>
                  <th className="text-right px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {k.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                        {k.prefix}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {k.agency ? (
                        <span className="inline-flex items-center gap-1.5 text-indigo-600 font-medium">
                          <Building2 className="h-3.5 w-3.5" /> {k.agency.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Todas / Global</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {k.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldAlert className="h-3 w-3" /> Revocada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {k.last_used_at ? (
                        new Date(k.last_used_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                      ) : (
                        <span className="text-slate-400">Nunca</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(k.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {k.is_active && (
                        <button
                          onClick={() => handleRevoke(k.id, k.name)}
                          disabled={revokingId === k.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                          title="Revocar esta API Key"
                        >
                          {revokingId === k.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span>Revocar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear API Key */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nueva API Key</h3>
                <p className="text-xs text-slate-500">Crear token de acceso para cliente o sistema externo</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Identificador *</label>
                <input
                  type="text"
                  placeholder="ej. Integración ERP Agencia Central"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              {isSuperAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agencia Asociada (Opcional)</label>
                  <select
                    value={formData.agency_id}
                    onChange={(e) => setFormData({ ...formData, agency_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Todas / Acceso global admin</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Si elegís una agencia, la clave solo accederá al contexto de esa empresa.</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Ámbito de acceso acotado:</span>
                  <p className="leading-relaxed">
                    Esta API Key estará vinculada exclusivamente a tu agencia (<strong className="text-indigo-600 font-semibold">{user?.agencia || 'Tu Agencia'}</strong>). Quien consuma la API con este token solo obtendrá y operará sobre información de tu empresa.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>{creating ? 'Generando…' : 'Generar Clave'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Revelación Única de Clave Secreta */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">API Key Generada Exitosamente</h3>
                <p className="text-xs text-emerald-700 font-medium">Copiá esta clave ahora. No podrás volver a verla.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p>Por razones de seguridad, la clave completa solo se muestra en este momento. Guardala en un gestor de secretos seguro o archivo de configuración de tu servidor.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Clave Secreta (`X-API-Key`)</label>
              <div className="relative flex items-center">
                <input
                  type={showSecret ? 'text' : 'password'}
                  readOnly
                  value={createdResult.secret_key}
                  className="w-full pr-24 pl-3.5 py-3 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-800 select-all"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title={showSecret ? 'Ocultar' : 'Mostrar'}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Nombre:</span>
                <span className="font-semibold text-slate-900">{createdResult.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Header de uso:</span>
                <span className="font-mono text-indigo-600">X-API-Key: {createdResult.prefix}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setCreatedResult(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-2xl"
              >
                Entendido, ya la guardé
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
