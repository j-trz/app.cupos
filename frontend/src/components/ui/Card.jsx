import clsx from 'clsx';

export default function Card({ className, children, as = 'div', ...props }) {
  const Component = as;
  return (
    <Component
      className={clsx(
        'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
