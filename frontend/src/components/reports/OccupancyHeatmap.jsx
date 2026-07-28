import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const getColor = (ocupacion) => {
    if (ocupacion >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (ocupacion >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (ocupacion >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
};

export default function OccupancyHeatmap({ data, loading }) {
    if (loading) return <Card><CardContent className="h-[230px]"><Skeleton className="h-full w-full" /></CardContent></Card>;
    if (!data?.length) return <Card><CardContent className="h-[230px] flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</CardContent></Card>;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ocupación por Destino/Temporada</CardTitle>
            </CardHeader>
            <CardContent className="h-[230px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {data?.slice(0, 9).map((item, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${getColor(item.ocupacion)}`}>
                            <p className="text-xs font-medium truncate">{item.destino}</p>
                            <p className="text-[10px] text-slate-600 truncate">{item.temporada}</p>
                            <p className="text-lg font-bold mt-1">{item.ocupacion.toFixed(0)}%</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
