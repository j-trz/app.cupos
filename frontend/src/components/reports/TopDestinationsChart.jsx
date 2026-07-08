import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const formatCurrency = (value) => `$${(value / 1000).toFixed(1)}K`;

export default function TopDestinationsChart({ data, loading }) {
    if (loading) return <Card><CardContent className="h-[230px]"><Skeleton className="h-full w-full" /></CardContent></Card>;
    if (!data?.length) return <Card><CardContent className="h-[230px] flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</CardContent></Card>;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top 5 Destinos por Rentabilidad</CardTitle>
            </CardHeader>
            <CardContent className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" fontSize={10} tickFormatter={formatCurrency} />
                        <YAxis dataKey="destino" type="category" width={100} fontSize={11} />
                        <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                        <Bar dataKey="rentabilidad" name="Rentabilidad" radius={[0, 4, 4, 0]}>
                            {data?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
