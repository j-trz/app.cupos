import clsx from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
    outline: 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200',
    ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
    link: 'text-slate-900 underline-offset-4 hover:underline',
    destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
  };
  
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2 text-base',
    lg: 'h-12 px-6 text-lg',
  };
  
  const classes = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    disabled && 'pointer-events-none opacity-50',
    className
  );
  
  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}