import clsx from 'clsx';

export default function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={clsx('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return (
    <thead className={clsx('[&_tr]:border-b', className)} {...props} />
  );
}

export function TableBody({ className, ...props }) {
  return (
    <tbody className={clsx('[&_tr:last-child]:border-0', className)} {...props} />
  );
}

export function TableFooter({ className, ...props }) {
  return (
    <tfoot
      className={clsx('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={clsx(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={clsx(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={clsx('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }) {
  return (
    <caption
      className={clsx('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}