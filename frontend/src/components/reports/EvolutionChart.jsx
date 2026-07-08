import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const formatCurrency = (value) => `$${(value / 1000).toFixed(1)}K`;

export default function EvolutionChart({ data, loading }) {
    if (loading) return <Card><CardContent className="h-[280px]"><Skeleton className="h-full w-full" /></CardContent></Card>;
    if (!data?.length) return <Card><CardContent className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</CardContent></Card>;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Evolución de Ventas y Rentabilidad</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id="colorRentabilidad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" fontSize={11} tickLine={false} />
                        <YAxis yAxisId="left" fontSize={11} tickLine={false} tickFormatter={formatCurrency} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value, name) => name === 'Ocupación %' ? `${value.toFixed(1)}%` : `$${Number(value).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Area yAxisId="left" type="monotone" dataKey="ventas" stroke="#3b82f6" fill="url(#colorVentas)" name="Ventas" />
                        <Area yAxisId="left" type="monotone" dataKey="rentabilidad" stroke="#10b981" fill="url(#colorRentabilidad)" name="Rentabilidad" />
                        <Line yAxisId="right" type="monotone" dataKey="ocupacion" stroke="#8b5cf6" strokeWidth={2} name="Ocupación %" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
