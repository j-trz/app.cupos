import clsx from 'clsx';

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100',
        className,
      )}
      {...props}
    />
  );
}
