import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const SelectContext = createContext();

export const Select = ({ children, value, onValueChange }) => {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const toggleOpen = useCallback(() => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(prev => !prev);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // El contenido del dropdown se renderiza en un portal fuera del trigger
    // (para no quedar recortado por el overflow del modal), así que un click
    // dentro de una opción NO está contenido en triggerRef — hay que
    // excluirlo también, o el mousedown lo cierra antes de que el click
    // en la opción llegue a disparar onValueChange.
    const handleClickOutside = (e) => {
      const insideTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const insideContent = contentRef.current && contentRef.current.contains(e.target);
      if (!insideTrigger && !insideContent) close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, toggleOpen, close, triggerRef, contentRef, dropdownStyle }}>
      <div className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({ children, className, ...props }) => {
  const { open, toggleOpen, triggerRef } = useContext(SelectContext);

  return (
    <div
      ref={triggerRef}
      className={clsx(
        'flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer hover:border-slate-400 transition-colors',
        open && 'ring-2 ring-slate-400 ring-offset-2 border-slate-400',
        className
      )}
      onClick={toggleOpen}
      {...props}
    >
      {children}
      <svg className={clsx('h-4 w-4 ml-2 text-slate-400 transition-transform flex-shrink-0', open && 'rotate-180')} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
};

export const SelectValue = ({ placeholder, children, ...props }) => {
  const { value } = useContext(SelectContext);
  const display = children ?? value;
  return (
    <span className="truncate" {...props}>
      {display || <span className="text-slate-400">{placeholder}</span>}
    </span>
  );
};

export const SelectContent = ({ children, className, ...props }) => {
  const { open, dropdownStyle, contentRef } = useContext(SelectContext);
  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={dropdownStyle}
      className={clsx(
        'rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
};

export const SelectItem = ({ children, value: itemValue, className, ...props }) => {
  const { value, onValueChange, close } = useContext(SelectContext);
  const isSelected = value === itemValue;

  const handleClick = () => {
    if (onValueChange) onValueChange(itemValue);
    close();
  };

  return (
    <div
      className={clsx(
        'relative flex w-full cursor-pointer select-none items-center py-2 px-3 text-sm outline-none hover:bg-slate-100 transition-colors',
        isSelected && 'bg-slate-100 font-medium text-slate-900',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
};
