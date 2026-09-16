import clsx from 'clsx';

// Botón de acción de tabla: ícono solo, ghost, mismo diseño en todas las
// columnas "Acciones" de la app (Productos, Reservas, Nóminas, Confirmaciones).
// variant="danger" para acciones destructivas (eliminar).
export default function ActionIconButton({ icon: Icon, variant = 'default', className, ...props }) {
  return (
    <button
      type="button"
      className={clsx(
        'rounded-lg p-1.5 transition-colors',
        variant === 'danger'
          ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
