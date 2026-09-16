import clsx from 'clsx';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from './shadcn-dropdown-menu';

// Menú "más acciones" para filas de tabla con más de 2-3 acciones — antes se
// apilaban todas como ActionIconButton sueltos en la misma celda (hasta 7 en
// GestionProductos.jsx), ilegible y con hit-targets apretados. Deja las 1-2
// acciones más frecuentes como ActionIconButton inline y el resto acá.
// Tema claro (a diferencia de shadcn-dropdown-menu.jsx por default, que es
// oscuro — pensado para el menú de perfil del Sidebar, no para una fila de
// tabla clara).
export default function ActionsOverflow({ items, title = 'Más acciones' }) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={title}
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border border-slate-200 bg-white p-1 text-slate-700 shadow-lg backdrop-blur-none">
        {visible.map(({ icon: Icon, label, onClick, danger }, i) => (
          <DropdownMenuItem
            key={i}
            onClick={onClick}
            className={clsx(
              'gap-2 rounded-lg text-sm',
              danger
                ? 'text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
