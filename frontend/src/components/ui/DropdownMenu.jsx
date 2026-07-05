import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export default function DropdownMenu({ children, items = [], placement = 'top' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    function handleDoc(e) {
      if (!open) return;
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleDoc);
    return () => document.removeEventListener('mousedown', handleDoc);
  }, [open]);

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

  const navigate = useNavigate();

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      style={{ left: pos.left, top: pos.top, width: 192, position: 'fixed' }}
      className={clsx('z-50 rounded-md border border-slate-200/80 bg-white text-slate-900 shadow-lg')}
    >
      {items.map((it, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            if (it.to) navigate(it.to);
            it.onClick && it.onClick();
          }}
          className={clsx('w-full px-3 py-2 text-left text-sm', it.danger ? 'text-red-600' : 'hover:bg-slate-50')}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="inline-block">
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        className="inline-flex"
      >
        {typeof children === 'function' ? children({ open }) : children}
      </div>
      {open && createPortal(menu, document.body)}
    </div>
  );
}
