import clsx from 'clsx';

export default function StatCard({ icon: Icon, label, value, description, className, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-slate-100 p-2 text-slate-900">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
        </div>
      </div>
      {description && <p className="mt-2 text-xs text-slate-400">{description}</p>}
    </div>
  );
}