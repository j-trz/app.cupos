import clsx from 'clsx';

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
};

export default function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-sm font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
