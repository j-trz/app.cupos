import React, { createContext, useContext, useState, useRef, useEffect, useCallback, cloneElement, isValidElement } from 'react';
import clsx from 'clsx';

const SelectContext = createContext();

// Componente principal del select
export const Select = ({ children, value, onValueChange }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const toggleOpen = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        close();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, close]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, toggleOpen, close, triggerRef }}>
      <div className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// Componente del trigger del select
export const SelectTrigger = ({ children, className, ...props }) => {
  const { open, toggleOpen, triggerRef } = useContext(SelectContext);

  return (
    <div
      ref={triggerRef}
      className={clsx(
        'flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 cursor-pointer hover:border-slate-400 transition-colors',
        open && 'ring-2 ring-slate-400 ring-offset-2 border-slate-400',
        className
      )}
      onClick={toggleOpen}
      {...props}
    >
      {children}
      {/* Chevron indicador */}
      <svg className={clsx('h-4 w-4 ml-2 text-slate-400 transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
};

// Componente del valor del select
export const SelectValue = ({ placeholder, ...props }) => {
  const { value } = useContext(SelectContext);

  return (
    <span {...props}>
      {value || placeholder}
    </span>
  );
};

// Componente del contenido del select (dropdown)
export const SelectContent = ({ children, className, ...props }) => {
  const { open } = useContext(SelectContext);

  if (!open) return null;

  return (
    <div
      className={clsx(
        'absolute left-0 right-0 top-full mt-1 z-50 min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Componente del item del select
export const SelectItem = ({ children, value: itemValue, className, ...props }) => {
  const { value, onValueChange, close } = useContext(SelectContext);
  const isSelected = value === itemValue;

  const handleClick = () => {
    if (onValueChange) {
      onValueChange(itemValue);
    }
    close();
  };

  return (
    <div
      className={clsx(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100 transition-colors',
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
