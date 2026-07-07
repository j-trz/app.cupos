import clsx from 'clsx';

const Badge = ({ className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-100',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    // Variantes pastel para filtros
    product: 'bg-blue-100 text-blue-800 border border-blue-200',
    request: 'bg-purple-100 text-purple-800 border border-purple-200',
    confirmation: 'bg-green-100 text-green-800 border border-green-200',
    availability: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    reservation: 'bg-pink-100 text-pink-800 border border-pink-200',
    agency: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    user: 'bg-teal-100 text-teal-800 border border-teal-200',
    setting: 'bg-orange-100 text-orange-800 border border-orange-200',
    report: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };
export default Badge;