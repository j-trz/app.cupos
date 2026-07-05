import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { MoreHorizontal } from 'lucide-react';

export default function DropdownMenu({ items = [], placement = 'bottom', children, className }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192;
    const initialLeft = Math.max(8, rect.left + rect.width / 2 - menuWidth / 2);
    const initialTop = placement === 'top' ? rect.top - 8 : rect.bottom + 8;
    setPos({ left: initialLeft, top: initialTop });

    // measure actual menu height after it mounts, then adjust position
    requestAnimationFrame(() => {
      const menuRect = menuRef.current?.getBoundingClientRect();
      if (!menuRect) return;
      const computedTop = placement === 'top' ? rect.top - menuRect.height - 8 : rect.bottom + 8;
      const maxLeft = Math.max(8, Math.min(initialLeft, window.innerWidth - menuRect.width - 8));
      setPos({ left: maxLeft, top: Math.max(8, computedTop) });
    });
  }, [open, placement]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const placementClasses = {
    bottom: 'top-full right-0 mt-2',
    top: 'bottom-full right-0 mb-2',
  };

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      style={{ left: pos.left, top: pos.top, width: 192, position: 'fixed' }}
      className={clsx(
        'absolute z-10 min-w-40 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
        placementClasses[placement],
        className
      )}
    >
      <div className="py-1">
        {items.map((item, index) => {
          const isDanger = item.danger;
          return (
            <div key={index}>
              {item.to ? (
                <a
                  href={item.to}
                  className={clsx(
                    'block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100',
                    isDanger ? 'text-red-600 hover:bg-red-50' : ''
                  )}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  className={clsx(
                    'block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100',
                    isDanger ? 'text-red-600 hover:bg-red-50' : ''
                  )}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center rounded-full p-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {children?.({ open }) || <MoreHorizontal className="h-5 w-5" />}
      </button>
      {open && createPortal(menu, document.body)}
    </div>
  );
}
