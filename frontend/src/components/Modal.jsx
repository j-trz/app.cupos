import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Modal({ title, open, onClose, children, size = 'md' }) {
  if (!open) return null;

  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
    '5xl': 'max-w-7xl',
    'full': 'max-w-[95vw]',
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] isolate flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-8 sm:pt-12">
      <div
        className={`w-full ${maxWidths[size] || maxWidths.md} rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">{title}</h2>
          <button
            onClick={onClose}
            title="Cerrar"
            className="flex shrink-0 items-center justify-center rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
