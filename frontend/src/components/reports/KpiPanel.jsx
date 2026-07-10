import React from 'react';
import { BarChart3 } from 'lucide-react';
import StatCard from '../ui/StatCard.jsx';

export default function KpiPanel({ kpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, idx) => (
        <StatCard
          key={kpi.label + '-' + idx}
          icon={kpi.icon || BarChart3}
          label={kpi.label}
          value={kpi.value}
        />
      ))}
    </div>
  );
}
