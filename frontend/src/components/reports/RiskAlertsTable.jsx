import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const getNivelColor = (nivel) => {
    if (nivel === 'alto') return 'bg-red-50 border-red-200';
    if (nivel === 'medio') return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
};

const getNivelBadge = (nivel) => {
    if (nivel === 'alto') return 'destructive';
    if (nivel === 'medio') return 'secondary';
    return 'default';
};

export default function RiskAlertsTable({ data, loading }) {
    if (loading) return <Card><CardContent className="h-[230px]"><Skeleton className="h-full w-full" /></CardContent></Card>;
    if (!data?.length) return <Card><CardContent className="h-[230px] flex items-center justify-center text-slate-400 text-sm">Sin alertas de riesgo</CardContent></Card>;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Alertas de Riesgo
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[230px] overflow-y-auto">
                <div className="space-y-2">
                    {data?.slice(0, 5).map((alert, i) => (
                        <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${getNivelColor(alert.nivel)}`}>
                            <div>
                                <p className="text-xs font-semibold text-slate-900">{alert.codigo_cupo}</p>
                                <p className="text-[10px] text-slate-600">{alert.destino} • {alert.dias_salida || '?'} días</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">${(alert.riesgo / 1000).toFixed(1)}K</p>
                                <Badge variant={getNivelBadge(alert.nivel)} className="text-[9px]">{alert.ocupacion.toFixed(0)}%</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
