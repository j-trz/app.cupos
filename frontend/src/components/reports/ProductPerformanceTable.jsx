import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowUpDown, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const formatCurrency = (value) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(value);
const formatPercent = (value) => `${value.toFixed(1)}%`;

const getRiskBadge = (riesgoPercent) => {
    if (riesgoPercent > 50) return { variant: 'destructive', label: 'Alto' };
    if (riesgoPercent > 25) return { variant: 'secondary', label: 'Medio' };
    return { variant: 'default', label: 'Bajo' };
};

const getProfitabilityColor = (rentabilidad) => {
    if (rentabilidad > 20) return 'text-green-600';
    if (rentabilidad > 10) return 'text-yellow-600';
    return 'text-red-600';
};

export default function ProductPerformanceTable({ data, loading }) {
    const [sortField, setSortField] = useState('rentabilidad');
    const [sortDir, setSortDir] = useState('desc');
    const [expanded, setExpanded] = useState(true);

    if (loading) {
        return (
            <Card>
                <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const sortedData = [...(data || [])].sort((a, b) => {
        const multiplier = sortDir === 'asc' ? 1 : -1;
        if (a[sortField] < b[sortField]) return -1 * multiplier;
        if (a[sortField] > b[sortField]) return 1 * multiplier;
        return 0;
    });

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
        return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
    };

    return (
        <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        Rendimiento por Producto
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
            </CardHeader>
            {expanded && (
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Código Cupo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Destino</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Temporada</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('ocupacion')}>
                                        <span className="flex items-center justify-end gap-1">% Venta <SortIcon field="ocupacion" /></span>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('venta_real')}>
                                        <span className="flex items-center justify-end gap-1">Venta <SortIcon field="venta_real" /></span>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('rentabilidad')}>
                                        <span className="flex items-center justify-end gap-1">% Rentab. <SortIcon field="rentabilidad" /></span>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('riesgo')}>
                                        <span className="flex items-center justify-end gap-1">Riesgo <SortIcon field="riesgo" /></span>
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Nivel</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedData.map((product, i) => {
                                    const riesgoPercent = product.riesgo_percent || (product.riesgo / product.venta_total * 100) || 0;
                                    const riskBadge = getRiskBadge(riesgoPercent);
                                    const profitabilityColor = getProfitabilityColor(product.rentabilidad_percent || 0);

                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-900">{product.codigo_cupo}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{product.destino}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{product.temporada}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-semibold text-slate-900">{formatPercent(product.ocupacion || 0)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-semibold text-slate-900">{formatCurrency(product.venta_real || 0)}</span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${profitabilityColor}`}>
                                                {formatPercent(product.rentabilidad_percent || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-slate-700">{formatCurrency(product.riesgo || 0)}</span>
                                                    <AlertTriangle className={`h-3 w-3 ${riesgoPercent > 50 ? 'text-red-500' : riesgoPercent > 25 ? 'text-yellow-500' : 'text-green-500'}`} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={riskBadge.variant} className="text-[10px]">{riskBadge.label}</Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedData.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                                            No hay datos de productos disponibles
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
