import { Card, CardContent } from '../ui/Card';
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle } from 'lucide-react';

const KPICard = ({ title, value, change, icon: Icon, color }) => {
    const isPositive = change >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
    const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2 pt-2">
                    <span className="text-xs font-medium text-slate-500 uppercase">{title}</span>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                            <TrendIcon className="h-3 w-3" />
                            <span>{Math.abs(change).toFixed(1)}% vs mes anterior</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function KPIsRow({ stats }) {
    return (
        <div className="grid grid-cols-4 gap-4">
            <KPICard
                title="Ventas Totales"
                value={`$${(stats.ventas / 1000).toFixed(1)}K`}
                change={stats.ventasChange}
                icon={DollarSign}
                color="text-blue-600"
            />
            <KPICard
                title="Rentabilidad"
                value={`$${(stats.rentabilidad / 1000).toFixed(1)}K`}
                change={stats.rentabilidadChange}
                icon={TrendingUp}
                color="text-green-600"
            />
            <KPICard
                title="Riesgo (Disp.)"
                value={`$${(stats.riesgo / 1000).toFixed(1)}K`}
                change={stats.riesgoChange}
                icon={AlertTriangle}
                color="text-red-600"
            />
            <KPICard
                title="Ocupación"
                value={`${stats.ocupacion.toFixed(0)}%`}
                change={stats.ocupacionChange}
                icon={Percent}
                color="text-purple-600"
            />
        </div>
    );
}
