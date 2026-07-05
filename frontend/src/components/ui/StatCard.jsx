import clsx from 'clsx';

export default function StatCard({ icon: Icon, label, value, description, className }) {
  return (
    <div className={clsx('rounded-3xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex items-start gap-4">
        {Icon ? (
          <div className="rounded-3xl bg-slate-100 p-3 text-slate-900">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
      {description ? <p className="mt-4 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
