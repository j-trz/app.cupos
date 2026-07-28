import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ScrollText, Search, RefreshCw, AlertTriangle, XCircle, Globe,
  Clock3, Mail, Bot, ChevronDown, ChevronRight, Download,
  Activity, Database, Server, Wifi, WifiOff, Copy, Check,
  Lock, Unlock, User, ShieldAlert, Info, Zap, Package,
  Users, ClipboardList, AlertCircle, CheckCircle2, TrendingDown,
} from 'lucide-react';
import LogService from '../services/logService';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVEL_BADGE = { info: 'info', warning: 'warning', error: 'danger' };
const LEVEL_LABEL = { info: 'Info', warning: 'Aviso', error: 'Error' };
const SOURCE_LABEL = { http: 'Solicitud web', cron: 'Tarea automática', email: 'Email', ai: 'Asistente IA', admin: 'Admin' };
const SOURCE_ICON = { http: Globe, cron: Clock3, email: Mail, ai: Bot, admin: ShieldAlert };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function timeAgo(d) {
  if (!d) return '—';
  const diff = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.round(diff / 60)}min`;
  return `hace ${Math.round(diff / 3600)}h`;
}

function minutesLeft(expAt) {
  if (!expAt) return null;
  const diff = (new Date(expAt).getTime() - Date.now()) / 60000;
  return diff;
}

// ─── Sub-componentes de Estado ─────────────────────────────────────────────

function StatusDot({ ok, degraded }) {
  if (degraded) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200" />;
  if (ok) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-200" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-rose-200" />;
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1.5 ${colors[color]}`}>
      <div className="flex items-center gap-2 opacity-70">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

// ─── Pestaña Estado del Sistema ──────────────────────────────────────────────

function SystemStatusTab() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [releasingId, setReleasingId] = useState(null);
  const [releaseSuccess, setReleaseSuccess] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await LogService.getSystemStatus();
      setStatus(data);
    } catch (e) {
      console.error('Error al obtener estado del sistema:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Auto-refresh cada 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRelease = async (reservationId) => {
    if (!window.confirm(`¿Liberar el hold #${reservationId} y devolver el stock al producto?`)) return;
    setReleasingId(reservationId);
    try {
      await LogService.releaseHold(reservationId);
      setReleaseSuccess(reservationId);
      setTimeout(() => setReleaseSuccess(null), 3000);
      fetchStatus();
    } catch (e) {
      alert('Error al liberar el hold: ' + (e.message || 'Error desconocido'));
    } finally {
      setReleasingId(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-400" />
          <p className="text-sm">Cargando estado del sistema…</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <AlertCircle className="h-8 w-8 mr-2" />
        <p>No se pudo obtener el estado del sistema.</p>
      </div>
    );
  }

  const dbOk = status.database?.connected;
  const dbLatency = status.database?.latency_ms;

  return (
    <div className="space-y-8">
      {/* Header refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Actualizado: {fmtDate(status.timestamp)} · Auto-refresh cada 30s
        </p>
        <Button size="sm" variant="secondary" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* ── Base de datos ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" /> Base de datos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <StatusDot ok={dbOk} />
            <div>
              <p className="text-xs text-slate-500">Conexión</p>
              <p className={`text-sm font-semibold ${dbOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                {dbOk ? 'Conectada' : 'Sin conexión'}
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-slate-500">Latencia</p>
              <p className="text-sm font-semibold text-blue-700">{fmtMs(dbLatency)}</p>
            </div>
          </div>
          {status.database?.error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-xs text-rose-600">Error</p>
                <p className="text-xs font-mono text-rose-700 break-all">{status.database.error}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Servicios ─────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-slate-500" /> Servicios
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(status.services || []).map((svc) => (
            <div key={svc.name} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <StatusDot ok={svc.status === 'ok'} degraded={svc.status === 'degraded'} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{svc.name}</p>
                <p className={`text-sm font-semibold ${svc.status === 'ok' ? 'text-emerald-600' : svc.status === 'degraded' ? 'text-amber-600' : 'text-rose-600'}`}>
                  {svc.status === 'ok' ? 'Operativo' : svc.status === 'degraded' ? 'Degradado' : 'Error'}
                </p>
                {svc.details && <p className="text-xs text-slate-400 truncate" title={svc.details}>{svc.details}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Conteos ──────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" /> Métricas del sistema
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Package} label="Productos" value={status.counts?.total_products} color="blue" />
          <StatCard icon={ClipboardList} label="Reservas" value={status.counts?.total_reservations} color="slate" />
          <StatCard icon={CheckCircle2} label="Confirmadas" value={status.counts?.total_confirmed} color="emerald" />
          <StatCard icon={Lock} label="Bloqueadas" value={status.counts?.total_blocked} sub="bloqueo_temporal" color="amber" />
          <StatCard icon={Clock3} label="Hold Temp." value={status.counts?.total_hold_temp} sub="hold_temporal" color="violet" />
          <StatCard icon={TrendingDown} label="Expiradas" value={status.counts?.total_expired} color="slate" />
          <StatCard icon={XCircle} label="Canceladas" value={status.counts?.total_cancelled} color="rose" />
          <StatCard icon={Users} label="Usuarios" value={status.counts?.total_users} color="blue" />
          <StatCard icon={ScrollText} label="Logs totales" value={status.counts?.total_logs} color="slate" />
          <StatCard icon={AlertTriangle} label="Logs de error" value={status.counts?.total_error_logs} color="rose" />
        </div>
      </section>

      {/* ── Holds activos ────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-500" />
          Holds activos ({(status.active_holds || []).length})
          <span className="ml-1 text-xs font-normal text-slate-400">— cupos bloqueados sin confirmación</span>
        </h3>
        <HoldsTable holds={status.active_holds || []} onRelease={handleRelease} releasingId={releasingId} releaseSuccess={releaseSuccess} />
      </section>

      {/* ── Holds estancados ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          Holds expirados/estancados ({(status.stuck_holds || []).length})
          <span className="ml-1 text-xs font-normal text-slate-400">— bloqueos que expiraron pero no se cerraron</span>
        </h3>
        <HoldsTable holds={status.stuck_holds || []} onRelease={handleRelease} releasingId={releasingId} releaseSuccess={releaseSuccess} stuck />
      </section>
    </div>
  );
}

function HoldsTable({ holds, onRelease, releasingId, releaseSuccess, stuck = false }) {
  if (!holds || holds.length === 0) {
    return (
      <div className={`rounded-2xl border ${stuck ? 'border-rose-100 bg-rose-50/40' : 'border-slate-100 bg-slate-50/40'} p-6 text-center text-sm text-slate-400`}>
        {stuck ? '✅ No hay holds expirados sin cerrar.' : '📭 No hay holds activos en este momento.'}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {['#', 'Pedido ID', 'Destino', 'Agencia', 'Contacto', 'Pasajeros', 'Estado', 'Expira', 'Creado', 'Acción'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {holds.map((h) => {
            const mins = minutesLeft(h.bloqueo_expira_at);
            const isExpired = h.is_expired || (mins !== null && mins < 0);
            const isReleasing = releasingId === h.reservation_id;
            const wasReleased = releaseSuccess === h.reservation_id;
            return (
              <tr key={h.reservation_id} className={`${isExpired ? 'bg-rose-50/30' : ''} hover:bg-slate-50 transition-colors`}>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{h.reservation_id}</td>
                <td className="px-3 py-2 font-mono text-xs font-medium text-slate-800">{h.pedido_id || '—'}</td>
                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                  {h.destino || '—'}
                  {h.codigo_cupo && <span className="ml-1 text-xs text-slate-400">({h.codigo_cupo})</span>}
                </td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{h.agencia || '—'}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-700 whitespace-nowrap">{h.contacto_nombre || '—'}</div>
                  {h.contacto_email && <div className="text-xs text-slate-400">{h.contacto_email}</div>}
                </td>
                <td className="px-3 py-2 text-center text-slate-700">{h.hold_passengers || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    h.estado === 'hold_temporal' ? 'bg-violet-100 text-violet-700' :
                    isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {h.estado === 'hold_temporal' ? 'Hold temp.' : isExpired ? 'Expirado' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {h.bloqueo_expira_at ? (
                    <span className={`text-xs ${isExpired ? 'text-rose-600 font-medium' : 'text-amber-700'}`}>
                      {isExpired ? `Expiró hace ${Math.abs(Math.round(mins ?? 0))} min` : `${Math.round(mins ?? 0)} min restantes`}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{timeAgo(h.created_at)}</td>
                <td className="px-3 py-2">
                  {wasReleased ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <Check className="h-3.5 w-3.5" /> Liberado
                    </span>
                  ) : (
                    <button
                      onClick={() => onRelease(h.reservation_id)}
                      disabled={isReleasing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                    >
                      {isReleasing ? (
                        <><RefreshCw className="h-3 w-3 animate-spin" /> Liberando…</>
                      ) : (
                        <><Unlock className="h-3 w-3" /> Liberar</>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pestaña Logs Detallados ─────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        level: levelFilter || undefined,
        source: sourceFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        q: searchTerm || undefined,
      };
      const response = await LogService.listLogs(params);
      setLogs(response.data || []);
      if (response.pagination) {
        setPagination(prev => ({ ...prev, total: response.pagination.total || 0 }));
      }
    } catch (error) {
      console.error('Error al cargar logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, levelFilter, sourceFilter, startDate, endDate, searchTerm]);

  useEffect(() => { fetchLogs(); }, [pagination.page, levelFilter, sourceFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filters = {
        level: levelFilter || undefined,
        source: sourceFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        q: searchTerm || undefined,
      };
      const { blob, filename } = await LogService.exportLogsJSON(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error al exportar: ' + (e.message || 'Error desconocido'));
    } finally {
      setExporting(false);
    }
  };

  const handleCopyJson = async (log) => {
    try {
      const text = JSON.stringify(log, null, 2);
      await navigator.clipboard.writeText(text);
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_) {}
  };

  const handleDownloadSingleJson = (log) => {
    const text = JSON.stringify(log, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log_${log.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
  const errorCount = logs.filter(l => l.level === 'error').length;
  const warningCount = logs.filter(l => l.level === 'warning').length;

  return (
    <div className="space-y-5">
      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{pagination.total}</p>
          <p className="text-xs text-blue-500">Registros totales</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-amber-700">{warningCount}</p>
          <p className="text-xs text-amber-500">Avisos (página)</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-rose-700">{errorCount}</p>
          <p className="text-xs text-rose-500">Errores (página)</p>
        </div>
      </div>

      {/* Filtros + Exportar */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="border-b border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap items-end">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar: mensaje, usuario, IP, ruta…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">Todos los niveles</option>
              <option value="info">Info</option>
              <option value="warning">Aviso</option>
              <option value="error">Error</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">Todas las fuentes</option>
              <option value="http">Solicitud web</option>
              <option value="cron">Tarea automática</option>
              <option value="email">Email</option>
              <option value="ai">Asistente IA</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <input
              type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <Button type="submit" size="sm"><Search className="h-4 w-4" /> Buscar</Button>
            <Button
              type="button" size="sm" variant="secondary"
              onClick={handleExport} disabled={exporting}
            >
              {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? 'Exportando…' : 'Descargar JSON'}
            </Button>
          </div>
        </form>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Fecha', 'Nivel', 'Fuente', 'Usuario', 'IP', 'Método', 'Ruta', 'Status', 'Duración', 'Mensaje'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      No hay registros para los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const SourceIcon = SOURCE_ICON[log.source];
                    const isExpanded = expandedId === log.id;
                    const hasDetails = !!(log.details || log.user_name || log.user_email || log.ip || log.request_id);
                    return (
                      <Fragment key={log.id}>
                        <tr
                          className={`hover:bg-slate-50/70 transition-colors ${hasDetails ? 'cursor-pointer' : ''} ${
                            log.level === 'error' ? 'bg-rose-50/30' : log.level === 'warning' ? 'bg-amber-50/20' : ''
                          }`}
                          onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                        >
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={LEVEL_BADGE[log.level] || 'default'}>{LEVEL_LABEL[log.level] || log.level}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              {SourceIcon && <SourceIcon className="h-3.5 w-3.5 text-slate-400" />}
                              {SOURCE_LABEL[log.source] || log.source || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                            {log.user_name && <div className="font-medium">{log.user_name}</div>}
                            {log.user_email && <div className="text-slate-400">{log.user_email}</div>}
                            {!log.user_name && !log.user_email && <span className="text-slate-300">—</span>}
                            {log.agencia && <div className="text-slate-400 text-[11px]">{log.agencia}</div>}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{log.ip || '—'}</td>
                          <td className="px-3 py-2 text-xs font-medium text-slate-600">{log.method || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600 max-w-[180px] truncate" title={log.path}>{log.path || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs font-mono font-semibold ${
                              log.status_code >= 500 ? 'text-rose-600' :
                              log.status_code >= 400 ? 'text-amber-600' :
                              log.status_code >= 200 ? 'text-emerald-600' : 'text-slate-500'
                            }`}>{log.status_code || '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtMs(log.duration_ms)}</td>
                          <td className="px-3 py-2 max-w-[250px]">
                            <span className="inline-flex items-center gap-1">
                              {hasDetails && (
                                isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> :
                                             <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              )}
                              <span className="truncate text-xs text-slate-700" title={log.message}>{log.message || '—'}</span>
                            </span>
                          </td>
                        </tr>

                        {/* Detalle expandible */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="bg-slate-50 border-y border-slate-200 px-4 py-4">
                              <div className="space-y-3">
                                {/* Info rápida */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  {log.request_id && (
                                    <div>
                                      <p className="text-slate-400 font-medium">Request ID</p>
                                      <p className="font-mono text-slate-600">{log.request_id}</p>
                                    </div>
                                  )}
                                  {log.user_id && (
                                    <div>
                                      <p className="text-slate-400 font-medium">User ID</p>
                                      <p className="font-mono text-slate-600">{log.user_id}</p>
                                    </div>
                                  )}
                                  {log.ip && (
                                    <div>
                                      <p className="text-slate-400 font-medium">IP del cliente</p>
                                      <p className="font-mono text-slate-600">{log.ip}</p>
                                    </div>
                                  )}
                                </div>

                                {/* JSON del log completo */}
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs font-semibold text-slate-500">JSON completo del evento</p>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleCopyJson(log)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                      >
                                        {copiedId === log.id ? <><Check className="h-3 w-3 text-emerald-500" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar JSON</>}
                                      </button>
                                      <button
                                        onClick={() => handleDownloadSingleJson(log)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                      >
                                        <Download className="h-3 w-3" /> Descargar
                                      </button>
                                    </div>
                                  </div>
                                  <pre className="text-xs font-mono bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto max-h-64 leading-relaxed">
                                    {JSON.stringify(log, null, 2)}
                                  </pre>
                                </div>

                                {/* Details del log si existe como texto adicional */}
                                {log.details && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Detalles adicionales</p>
                                    <pre className="text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-xl p-3 whitespace-pre-wrap break-all">{log.details}</pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-sm text-slate-500">
              Página {pagination.page} de {totalPages} ({pagination.total} registros)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
                ← Anterior
              </Button>
              <Button variant="secondary" size="sm"
                disabled={pagination.page === totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
                Siguiente →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'status', label: 'Estado del sistema', icon: Activity },
  { id: 'logs', label: 'Registro de logs', icon: ScrollText },
];

export default function LogsDelSitio() {
  const { can } = useAuth();
  const isAdmin = can('LOGS_VIEW');
  const [activeTab, setActiveTab] = useState('status');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estado del sistema"
        description="Monitoreo en tiempo real, diagnóstico, rastreo de bloqueos y registro de eventos"
        icon={Activity}
      />

      {/* Pestañas */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'status' ? <SystemStatusTab /> : <LogsTab />}
    </div>
  );
}
