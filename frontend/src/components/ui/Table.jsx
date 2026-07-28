import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

// Componente principal de la tabla — envuelve el <table> real en un
// contenedor con scroll horizontal (ya lo tenía) y agrega una sombra a los
// costados cuando hay más contenido para scrollear a ese lado. En escritorio
// casi nunca se nota (la tabla suele entrar entera), pero en un teléfono es
// la única pista de que hay más columnas swipeando a la derecha — sin esto,
// una tabla ancha se ve simplemente "cortada" sin indicar que se puede
// deslizar.
const Table = ({ className, ...props }) => {
  const scrollRef = useRef(null);
  const tableRef = useRef(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const updateShadows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftShadow(el.scrollLeft > 2);
    setShowRightShadow(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    updateShadows();
    // Observa el <table> (no el contenedor con scroll) para detectar cuando
    // su contenido cambia de ancho — ej. datos que llegan async después del
    // mount, o columnas que se agregan/quitan — el contenedor en sí no
    // cambia de tamaño en esos casos, así que un ResizeObserver sobre él no
    // dispararía.
    const tableEl = tableRef.current;
    if (!tableEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateShadows);
    observer.observe(tableEl);
    window.addEventListener('resize', updateShadows);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateShadows);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full">
      {showLeftShadow && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent" />
      )}
      {showRightShadow && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent" />
      )}
      <div ref={scrollRef} onScroll={updateShadows} className="w-full overflow-auto">
        <table
          ref={tableRef}
          className={clsx(
            'w-full caption-bottom text-sm',
            className
          )}
          {...props}
        />
      </div>
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
        'h-12 px-4 text-center align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
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