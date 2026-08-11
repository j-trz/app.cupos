import clsx from 'clsx';

const Badge = ({ className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',

    // Variantes pastel para filtros - Colores únicos y distinguibles
    product: 'bg-sky-50 text-sky-700 border border-sky-200',
    request: 'bg-violet-50 text-violet-700 border border-violet-200',
    confirmation: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    availability: 'bg-amber-50 text-amber-700 border border-amber-200',
    reservation: 'bg-rose-50 text-rose-700 border border-rose-200',
    agency: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    user: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    setting: 'bg-orange-50 text-orange-700 border border-orange-200',
    report: 'bg-teal-50 text-teal-700 border border-teal-200',
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    active: 'bg-lime-50 text-lime-700 border border-lime-200',
    inactive: 'bg-gray-50 text-gray-700 border border-gray-200',
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };
export default Badge;