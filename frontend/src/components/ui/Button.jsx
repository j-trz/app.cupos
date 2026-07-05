import clsx from 'clsx';

export default function Button({ variant = 'default', size = 'md', className, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-60';
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
    destructive: 'bg-rose-600 text-white hover:bg-rose-500',
  };
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props} />
  );
}
