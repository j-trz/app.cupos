import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const formatCurrency = (value) => `$${Number(value).toLocaleString()}`;

export default function AgencyShareChart({ data, loading }) {
    if (loading) return <Card><CardContent className="h-[280px]"><Skeleton className="h-full w-full" /></CardContent></Card>;
    if (!data?.length) return <Card><CardContent className="h-[280px] flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</CardContent></Card>;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Share por Agencia</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="venta"
                            nameKey="agencia"
                            label={({ agencia, percent }) => `${agencia} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={formatCurrency} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
