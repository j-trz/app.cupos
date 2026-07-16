import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ScrollText, Search, RefreshCw, AlertTriangle, XCircle, Globe, Clock3, Mail, Bot, ChevronDown, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import LogService from '../services/logService';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const LEVEL_BADGE = { info: 'info', warning: 'warning', error: 'danger' };
const LEVEL_LABEL = { info: 'Info', warning: 'Warning', error: 'Error' };

// Traduce las fuentes internas (nombres de módulo en inglés) a algo legible
// para un admin sin conocimiento técnico, con un ícono para escanear rápido.
const SOURCE_LABEL = { http: 'Solicitud web', cron: 'Tarea automática', email: 'Envío de email', ai: 'Asistente IA' };
const SOURCE_ICON = { http: Globe, cron: Clock3, email: Mail, ai: Bot };

export default function LogsDelSitio() {
    const { can } = useAuth();
    const isAdmin = can('LOGS_VIEW');

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [levelFilter, setLevelFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (isAdmin) fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, levelFilter, startDate, endDate]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                level: levelFilter || undefined,
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
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los logs del sitio' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchLogs();
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <ScrollText className="h-12 w-12 text-slate-300 mb-3" />
                <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
                <p className="text-sm text-slate-500 mt-1">Esta sección es solo para administradores.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
    const errorCount = logs.filter(l => l.level === 'error').length;
    const warningCount = logs.filter(l => l.level === 'warning').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Logs del sitio"
                description="Errores, avisos y eventos registrados por el sistema"
                icon={ScrollText}
                action={
                    <Button size="sm" onClick={fetchLogs} disabled={loading} title="Refrescar">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                }
            />

            <StatsHero
                stats={[
                    { icon: ScrollText, label: 'Total (página)', value: pagination.total, description: 'Total de registros con los filtros actuales.', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
                    { icon: AlertTriangle, label: 'Warnings (página)', value: warningCount, description: 'Avisos en la página actual.', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
                    { icon: XCircle, label: 'Errores (página)', value: errorCount, description: 'Errores en la página actual.', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
                ]}
            />

            <div className="bg-white rounded-2xl border border-slate-200">
                <form onSubmit={handleSearchSubmit} className="border-b border-slate-200 p-4">
                    <div className="flex flex-col grid-cols-4 sm:flex-row gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar en el mensaje..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <select
                            value={levelFilter}
                            onChange={(e) => { setLevelFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                            className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">Todos los niveles</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                        </select>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                            className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                            className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <Button type="submit" size="sm">Buscar</Button>
                    </div>
                </form>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                ) : (
                    <TableComponent>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Fecha</TableHead>
                                <TableHead className="text-center">Nivel</TableHead>
                                <TableHead className="text-center">Fuente</TableHead>
                                <TableHead className="text-center">Método</TableHead>
                                <TableHead className="text-center">Ruta</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Mensaje</TableHead>
                                <TableHead className="text-center">Duración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell className="text-center py-10" colSpan={8}>
                                        No hay logs para los filtros aplicados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => {
                                    const SourceIcon = SOURCE_ICON[log.source];
                                    const isExpanded = expandedId === log.id;
                                    const hasDetails = !!log.details;
                                    return (
                                        <Fragment key={log.id}>
                                            <TableRow
                                                className={hasDetails ? 'cursor-pointer' : ''}
                                                onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                                            >
                                                <TableCell className="text-center text-sm text-slate-600 whitespace-nowrap">
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={LEVEL_BADGE[log.level] || 'default'}>
                                                        {LEVEL_LABEL[log.level] || log.level}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-600">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {SourceIcon && <SourceIcon className="h-3.5 w-3.5 text-slate-400" />}
                                                        {SOURCE_LABEL[log.source] || log.source || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-600">{log.method || '—'}</TableCell>
                                                <TableCell className="text-center text-sm font-mono text-slate-700 max-w-xs truncate">{log.path || '—'}</TableCell>
                                                <TableCell className="text-center text-sm text-slate-600">{log.status_code || '—'}</TableCell>
                                                <TableCell className="text-left text-sm text-slate-600 max-w-md truncate">
                                                    <span className="inline-flex items-center gap-1">
                                                        {hasDetails && (isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />)}
                                                        <span className="truncate" title={log.message}>{log.message || '—'}</span>
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-600">
                                                    {log.duration_ms != null ? `${log.duration_ms} ms` : '—'}
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="bg-slate-50 text-left">
                                                        <div className="text-xs font-medium text-slate-500 mb-1">Detalle técnico</div>
                                                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">{log.details}</pre>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </TableComponent>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                        <span className="text-sm text-slate-600">
                            Página {pagination.page} de {totalPages} ({pagination.total} registros)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={pagination.page === totalPages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
