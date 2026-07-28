import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Modal({ title, open, onClose, children, size = 'md' }) {
  if (!open) return null;

  // El prefijo "sm:" viene ya incluido en cada valor (no interpolado en el
  // className) — Tailwind escanea el texto fuente en busca de nombres de
  // clase literales, así que "sm:max-w-md" tiene que aparecer completo acá
  // para que genere el CSS; un `sm:${maxWidths[size]}` armado en runtime no
  // lo detectaría.
  const maxWidths = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-3xl',
    '2xl': 'sm:max-w-4xl',
    '3xl': 'sm:max-w-5xl',
    '4xl': 'sm:max-w-6xl',
    '5xl': 'sm:max-w-7xl',
    'full': 'sm:max-w-[95vw]',
  };

  return createPortal(
    // Por debajo de sm el modal ocupa toda la pantalla (sin padding de overlay
    // ni bordes redondeados) en vez del ancho fijo por "size" — un modal
    // "xl"/"2xl"/"3xl" centrado con padding queda apretado en un teléfono.
    // Desde sm en adelante se comporta como antes (diálogo centrado).
    <div className="fixed inset-0 z-[60] isolate flex items-start justify-center overflow-y-auto bg-slate-900/50 p-0 sm:p-4 sm:pt-12">
      <div
        className={`w-full h-full sm:h-auto ${maxWidths[size] || maxWidths.md} rounded-none sm:rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-screen sm:max-h-[90vh]`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">{title}</h2>
          <button
            onClick={onClose}
            title="Cerrar"
            className="flex shrink-0 items-center justify-center rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
