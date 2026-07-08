import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const formatCurrency = (value) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD' }).format(value);

export default function DestinationDetailTable({ data, loading }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Detalle por Destino y Temporada</span>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
            </CardHeader>
            {expanded && (
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : !data?.length ? (
                        <p className="text-sm text-slate-400 text-center py-4">Sin datos disponibles</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3">Destino</th>
                                        <th className="px-4 py-3">Temporada</th>
                                        <th className="px-4 py-3 text-right">Venta Real</th>
                                        <th className="px-4 py-3 text-right">Costo Real</th>
                                        <th className="px-4 py-3 text-right">Rentabilidad</th>
                                        <th className="px-4 py-3 text-right text-red-600">Riesgo (Disp)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data?.map((dest, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{dest.destino}</td>
                                            <td className="px-4 py-3">{dest.temporada}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(dest.venta_real)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(dest.costo_real)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(dest.rentabilidad)}</td>
                                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(dest.riesgo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
