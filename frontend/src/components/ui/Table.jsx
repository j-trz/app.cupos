import clsx from 'clsx';

export function Table({ className, children }) {
  return <div className={clsx('overflow-x-auto', className)}>{children}</div>;
}

export function TableHeader({ className, children }) {
  return <thead className={clsx('bg-slate-50', className)}>{children}</thead>;
}

export function TableRow({ className, children }) {
  return <tr className={clsx('transition hover:bg-slate-50', className)}>{children}</tr>;
}

export function TableHead({ className, children }) {
  return <th className={clsx('px-4 py-3 text-left text-sm font-semibold text-slate-700', className)}>{children}</th>;
}

export function TableBody({ className, children }) {
  return <tbody className={clsx('divide-y divide-slate-100', className)}>{children}</tbody>;
}

export function TableCell({ className, children }) {
  return <td className={clsx('px-4 py-4 text-sm text-slate-700', className)}>{children}</td>;
}
