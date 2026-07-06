import clsx from 'clsx';

// Componente principal de la tabla
const Table = ({ className, ...props }) => {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={clsx(
          'w-full caption-bottom text-sm',
          className
        )}
        {...props}
      />
    </div>
  );
};

// Encabezado de la tabla
const TableHeader = ({ className, ...props }) => {
  return (
    <thead className={clsx('[&_tr]:border-b', className)} {...props} />
  );
};

// Fila de la tabla
const TableRow = ({ className, ...props }) => {
  return (
    <tr
      className={clsx(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
};

// Celda de encabezado de la tabla
const TableHead = ({ className, ...props }) => {
  return (
    <th
      className={clsx(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
};

// Cuerpo de la tabla
const TableBody = ({ className, ...props }) => {
  return (
    <tbody
      className={clsx('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
};

// Celda de la tabla
const TableCell = ({ className, ...props }) => {
  return (
    <td
      className={clsx(
        'p-4 align-middle [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
};

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
export default Table;