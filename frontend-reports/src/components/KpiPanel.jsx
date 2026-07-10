export default function KpiPanel({ kpis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      {kpis.map((kpi, idx) => (
        <div key={kpi.label + '-' + idx} className="bg-white rounded-lg shadow p-3 flex flex-col items-center border border-blue-100">
          <span className="text-xs font-semibold text-blue-600 mb-1">{kpi.label}</span>
          <span className="text-2xl font-bold text-blue-700">{kpi.value}</span>
        </div>
      ))}
    </div>
  );
}
